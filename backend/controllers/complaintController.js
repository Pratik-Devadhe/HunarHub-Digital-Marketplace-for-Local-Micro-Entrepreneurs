const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const createComplaint=async(req,res)=>{try{
 const {entrepreneur_id,order_id,service_request_id,subject,description}=req.body;
 if(!subject||!description)throw httpError("subject and description are required");
 const row=await withTransaction(async c=>{
  if(order_id){
   const r=await c.query("SELECT id,customer_id,entrepreneur_id FROM orders WHERE id=$1",[order_id]);
   if(!r.rowCount)throw httpError("Order not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id&&req.user.role!=="ENTREPRENEUR")throw httpError("Access denied",403);
  }
  if(service_request_id){
   const r=await c.query("SELECT id,customer_id,entrepreneur_id FROM service_requests WHERE id=$1",[service_request_id]);
   if(!r.rowCount)throw httpError("Service request not found",404);
   if(req.user.role!=="ADMIN"&&r.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
  }
  return (await c.query(
   `INSERT INTO complaints(customer_id,entrepreneur_id,order_id,service_request_id,subject,description)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
   [req.user.role==="CUSTOMER"?req.user.id:null,entrepreneur_id||null,order_id||null,service_request_id||null,subject,description])).rows[0];
 });
 res.status(201).json({success:true,complaint:row});
}catch(e){sendError(res,e)}};

const getMyComplaints=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT * FROM complaints WHERE customer_id=$1 OR entrepreneur_id IN
   (SELECT id FROM entrepreneur_profiles WHERE user_id=$1) ORDER BY created_at DESC`,[req.user.id])).rows);
 res.json({success:true,complaints:rows});
}catch(e){sendError(res,e)}};

const getComplaintById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query("SELECT * FROM complaints WHERE id=$1",[id(req.params.id)]);if(!r.rowCount)throw httpError("Complaint not found",404);return r.rows[0]});
 res.json({success:true,complaint:row});
}catch(e){sendError(res,e)}};

module.exports={createComplaint,getMyComplaints,getComplaintById};
