const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const createServiceRequest=async(req,res)=>{try{
 const {entrepreneur_id,service_id,description,requested_date,requested_time,address,customer_note}=req.body;
 if(!entrepreneur_id||!service_id)throw httpError("entrepreneur_id and service_id are required");
 const row=await withTransaction(async c=>{
  const svc=await c.query(
   `SELECT s.*,ep.user_id FROM services s JOIN entrepreneur_profiles ep ON ep.id=s.entrepreneur_id
    WHERE s.id=$1 AND s.entrepreneur_id=$2 AND s.is_active=true AND ep.verification_status='APPROVED'`,
   [id(service_id,"service id"),id(entrepreneur_id,"entrepreneur id")]);
  if(!svc.rowCount)throw httpError("Service not available",404);
  if(svc.rows[0].user_id===req.user.id)throw httpError("You cannot request your own service");
  const r=await c.query(
   `INSERT INTO service_requests(customer_id,entrepreneur_id,service_id,description,requested_date,requested_time,address,customer_note,estimated_price)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
   [req.user.id,entrepreneur_id,service_id,description||null,requested_date||null,requested_time||null,address||null,customer_note||null,svc.rows[0].price]);
  await c.query(
   `INSERT INTO notifications(user_id,title,message,type) VALUES($1,$2,$3,$4)`,
   [svc.rows[0].user_id,"New service request",`You received a new request for ${svc.rows[0].title}`,"SERVICE_REQUEST"]);
  return r.rows[0];
 });
 res.status(201).json({success:true,request:row});
}catch(e){sendError(res,e)}};

const getMyRequests=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT sr.*,s.title service_title,ep.business_name,u.full_name entrepreneur_name
   FROM service_requests sr JOIN services s ON s.id=sr.service_id
   JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id JOIN users u ON u.id=ep.user_id
   WHERE sr.customer_id=$1 ORDER BY sr.created_at DESC`,[req.user.id])).rows);
 res.json({success:true,requests:rows});
}catch(e){sendError(res,e)}};

const getReceivedRequests=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT sr.*,s.title service_title,u.full_name customer_name
   FROM service_requests sr JOIN services s ON s.id=sr.service_id
   JOIN users u ON u.id=sr.customer_id JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id
   WHERE ep.user_id=$1 ORDER BY sr.created_at DESC`,[req.user.id])).rows);
 res.json({success:true,requests:rows});
}catch(e){sendError(res,e)}};

const getRequestById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  `SELECT sr.*,s.title service_title,ep.business_name,ep.user_id entrepreneur_user_id,cu.full_name customer_name,eu.full_name entrepreneur_name
   FROM service_requests sr JOIN services s ON s.id=sr.service_id
   JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id JOIN users cu ON cu.id=sr.customer_id
   JOIN users eu ON eu.id=ep.user_id WHERE sr.id=$1`,[id(req.params.id)]);
  if(!r.rowCount)throw httpError("Request not found",404);
  const x=r.rows[0];
  if(req.user.role!=="ADMIN"&&x.customer_id!==req.user.id&&x.entrepreneur_user_id!==req.user.id)throw httpError("Access denied",403);
  return x;
 });
 res.json({success:true,request:row});
}catch(e){sendError(res,e)}};

const transition=async(req,res,nextStatus,allowedFrom,actor)=>{try{
 const row=await withTransaction(async c=>{
  let r;
  if(actor==="customer"){
   r=await c.query("SELECT * FROM service_requests WHERE id=$1 AND customer_id=$2 FOR UPDATE",[id(req.params.id),req.user.id]);
  }else{
   r=await c.query(
    `SELECT sr.* FROM service_requests sr JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id
     WHERE sr.id=$1 AND ep.user_id=$2 FOR UPDATE`,[id(req.params.id),req.user.id]);
  }
  if(!r.rowCount)throw httpError("Request not found or access denied",404);
  if(!allowedFrom.includes(r.rows[0].status))throw httpError(`Cannot change status from ${r.rows[0].status}`,409);
  const updated=await c.query(
   `UPDATE service_requests SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,
   [nextStatus,r.rows[0].id]);
  const target=actor==="customer" ? (await c.query(
    `SELECT ep.user_id FROM service_requests sr JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id WHERE sr.id=$1`,[r.rows[0].id])).rows[0].user_id
    : r.rows[0].customer_id;
  await c.query("INSERT INTO notifications(user_id,title,message,type) VALUES($1,$2,$3,$4)",
    [target,"Service request updated",`Request #${r.rows[0].id} is now ${nextStatus}`,"SERVICE_REQUEST"]);
  return updated.rows[0];
 });
 res.json({success:true,request:row});
}catch(e){sendError(res,e)}};

const cancelServiceRequest=(req,res)=>transition(req,res,"CANCELLED",["PENDING","ACCEPTED"],"customer");
const acceptServiceRequest=(req,res)=>transition(req,res,"ACCEPTED",["PENDING"],"entrepreneur");
const rejectServiceRequest=(req,res)=>transition(req,res,"REJECTED",["PENDING"],"entrepreneur");
const startServiceRequest=(req,res)=>transition(req,res,"IN_PROGRESS",["ACCEPTED"],"entrepreneur");
const completeServiceRequest=(req,res)=>transition(req,res,"COMPLETED",["IN_PROGRESS"],"entrepreneur");

module.exports={createServiceRequest,getMyRequests,getReceivedRequests,getRequestById,cancelServiceRequest,acceptServiceRequest,rejectServiceRequest,startServiceRequest,completeServiceRequest};
