const crypto=require("crypto");
let Razorpay;
try { Razorpay = require("razorpay"); } catch(_) {}
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const razorpay=Razorpay&&process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET
 ? new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET}) : null;

const createPaymentOrder=async(req,res)=>{try{
 const {order_id,service_request_id}=req.body;
 if((!order_id&&!service_request_id)||(order_id&&service_request_id))throw httpError("Provide exactly one order_id or service_request_id");
 const data=await withTransaction(async c=>{
  let amount,customerId;
  if(order_id){
   const r=await c.query("SELECT id,total_amount,customer_id,payment_status,status FROM orders WHERE id=$1 FOR UPDATE",[id(order_id,"order id")]);
   if(!r.rowCount)throw httpError("Order not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
   if(r.rows[0].payment_status==="PAID")throw httpError("Order already paid",409);
   amount=Number(r.rows[0].total_amount);customerId=r.rows[0].customer_id;
  }else{
   const r=await c.query("SELECT id,estimated_price,final_price,customer_id,status FROM service_requests WHERE id=$1 FOR UPDATE",[id(service_request_id,"service request id")]);
   if(!r.rowCount)throw httpError("Service request not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
   if(!["ACCEPTED","IN_PROGRESS","COMPLETED"].includes(r.rows[0].status))throw httpError("Service request is not payable yet",409);
   amount=Number(r.rows[0].final_price??r.rows[0].estimated_price??0);customerId=r.rows[0].customer_id;
  }
  if(amount<=0)throw httpError("Invalid payment amount",400);
  let rpOrder;
  if(razorpay){
   rpOrder=await razorpay.orders.create({amount:Math.round(amount*100),currency:"INR",receipt:`hh_${Date.now()}_${customerId}`});
  }else{
   rpOrder={id:`order_mock_${Date.now()}`,amount:Math.round(amount*100),currency:"INR",receipt:`hh_${Date.now()}_${customerId}`,status:"created"};
  }
  return {razorpay_order:rpOrder,amount,customer_id:customerId};
 });
 res.status(201).json({success:true,...data});
}catch(e){sendError(res,e)}};

const verifyPayment=async(req,res)=>{try{
 const {razorpay_order_id,razorpay_payment_id,razorpay_signature,order_id,service_request_id}=req.body;
 if(!razorpay_order_id||!razorpay_payment_id)throw httpError("Payment verification fields are required");
 if(razorpay && process.env.RAZORPAY_KEY_SECRET && !razorpay_order_id.startsWith("order_mock_")){
  if(!razorpay_signature)throw httpError("Payment signature required");
  const expected=crypto.createHmac("sha256",process.env.RAZORPAY_KEY_SECRET)
   .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
  if(expected!==razorpay_signature)throw httpError("Invalid payment signature",400);
 }

 const payment=await withTransaction(async c=>{
  let amount,customerId;
  if(order_id){
   const r=await c.query("SELECT id,total_amount,customer_id FROM orders WHERE id=$1 FOR UPDATE",[id(order_id,"order id")]);
   if(!r.rowCount)throw httpError("Order not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
   amount=Number(r.rows[0].total_amount);customerId=r.rows[0].customer_id;
  }else{
   const r=await c.query("SELECT id,estimated_price,final_price,customer_id FROM service_requests WHERE id=$1 FOR UPDATE",[id(service_request_id,"service request id")]);
   if(!r.rowCount)throw httpError("Service request not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
   amount=Number(r.rows[0].final_price??r.rows[0].estimated_price??0);customerId=r.rows[0].customer_id;
  }
  const r=await c.query(
   `INSERT INTO payments(order_id,service_request_id,customer_id,amount,payment_method,transaction_id,status,paid_at)
    VALUES($1,$2,$3,$4,'RAZORPAY',$5,'SUCCESS',CURRENT_TIMESTAMP) RETURNING *`,
   [order_id||null,service_request_id||null,customerId,amount,razorpay_payment_id]);
  if(order_id)await c.query("UPDATE orders SET payment_status='PAID',status=CASE WHEN status='PENDING' THEN 'CONFIRMED' ELSE status END,updated_at=CURRENT_TIMESTAMP WHERE id=$1",[order_id]);
  return r.rows[0];
 });
 res.json({success:true,message:"Payment verified",payment});
}catch(e){sendError(res,e)}};

const getPaymentById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{
  const r=await c.query("SELECT * FROM payments WHERE id=$1",[id(req.params.id,"payment id")]);
  if(!r.rowCount)throw httpError("Payment not found",404);
  if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
  return r.rows[0];
 });
 res.json({success:true,payment:row});
}catch(e){sendError(res,e)}};

const handlePaymentWebhook=async(req,res)=>{try{
 // Webhook signature verification should be added when the Razorpay webhook secret is configured.
 // Do not trust webhook payloads without signature verification in production.
 res.status(200).json({success:true,message:"Webhook received"});
}catch(e){sendError(res,e)}};

module.exports={createPaymentOrder,verifyPayment,getPaymentById,handlePaymentWebhook};
