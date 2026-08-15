const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getReviews=async(req,res)=>{try{
 const field=req.params.entrepreneurId?"r.entrepreneur_id":"r.product_id";
 const value=id(req.params.entrepreneurId||req.params.productId);
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT r.*,u.full_name FROM reviews r JOIN users u ON u.id=r.customer_id WHERE ${field}=$1 ORDER BY r.created_at DESC`,
  [value])).rows);
 res.json({success:true,reviews:rows});
}catch(e){sendError(res,e)}};

const createReview=async(req,res)=>{try{
 const {entrepreneur_id,product_id,service_request_id,rating,comment}=req.body;
 if(!entrepreneur_id||!rating)throw httpError("entrepreneur_id and rating are required");
 if(Number(rating)<1||Number(rating)>5)throw httpError("Rating must be 1-5");
 const row=await withTransaction(async c=>{
  if(product_id){
   const p=await c.query("SELECT id,entrepreneur_id FROM products WHERE id=$1",[product_id]);
   if(!p.rowCount||Number(p.rows[0].entrepreneur_id)!==Number(entrepreneur_id))throw httpError("Invalid product",400);
   const purchased=await c.query(
    `SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id=o.id
     WHERE o.customer_id=$1 AND oi.product_id=$2 AND o.status='COMPLETED' LIMIT 1`,
    [req.user.id,product_id]);
   if(!purchased.rowCount)throw httpError("You can review a product only after a completed order",409);
  }
  if(service_request_id){
   const s=await c.query(
    "SELECT id,customer_id,entrepreneur_id,status FROM service_requests WHERE id=$1",
    [service_request_id]);
   if(!s.rowCount||s.rows[0].customer_id!==req.user.id||Number(s.rows[0].entrepreneur_id)!==Number(entrepreneur_id)||s.rows[0].status!=="COMPLETED")
    throw httpError("Invalid completed service request",409);
  }
  const duplicate=await c.query(
   `SELECT id FROM reviews WHERE customer_id=$1 AND entrepreneur_id=$2
    AND COALESCE(product_id,0)=COALESCE($3,0) AND COALESCE(service_request_id,0)=COALESCE($4,0)`,
   [req.user.id,entrepreneur_id,product_id||null,service_request_id||null]);
  if(duplicate.rowCount)throw httpError("Review already exists",409);

  const r=await c.query(
   `INSERT INTO reviews(customer_id,entrepreneur_id,product_id,service_request_id,rating,comment)
    VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
   [req.user.id,entrepreneur_id,product_id||null,service_request_id||null,rating,comment||null]);
  const avg=await c.query("SELECT ROUND(AVG(rating),2) avg,COUNT(*)::int count FROM reviews WHERE entrepreneur_id=$1",[entrepreneur_id]);
  await c.query("UPDATE entrepreneur_profiles SET average_rating=$1,total_reviews=$2,updated_at=CURRENT_TIMESTAMP WHERE id=$3",
   [avg.rows[0].avg||0,avg.rows[0].count,entrepreneur_id]);
  return r.rows[0];
 });
 res.status(201).json({success:true,review:row});
}catch(e){sendError(res,e)}};

const getReviewById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  `SELECT r.*,u.full_name FROM reviews r JOIN users u ON u.id=r.customer_id WHERE r.id=$1`,
  [id(req.params.id)]);if(!r.rowCount)throw httpError("Review not found",404);return r.rows[0]});
 res.json({success:true,review:row});
}catch(e){sendError(res,e)}};

const updateReview=async(req,res)=>{try{
 const row=await withTransaction(async c=>{
  const old=await c.query("SELECT * FROM reviews WHERE id=$1 FOR UPDATE",[id(req.params.id)]);
  if(!old.rowCount)throw httpError("Review not found",404);
  if(old.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
  const r=await c.query("UPDATE reviews SET rating=COALESCE($1,rating),comment=COALESCE($2,comment) WHERE id=$3 RETURNING *",
   [req.body.rating??null,req.body.comment??null,id(req.params.id)]);
  const avg=await c.query("SELECT ROUND(AVG(rating),2) avg,COUNT(*)::int count FROM reviews WHERE entrepreneur_id=$1",[old.rows[0].entrepreneur_id]);
  await c.query("UPDATE entrepreneur_profiles SET average_rating=$1,total_reviews=$2 WHERE id=$3",[avg.rows[0].avg||0,avg.rows[0].count,old.rows[0].entrepreneur_id]);
  return r.rows[0];
 });
 res.json({success:true,review:row});
}catch(e){sendError(res,e)}};

const deleteReview=async(req,res)=>{try{
 await withTransaction(async c=>{
  const old=await c.query("SELECT * FROM reviews WHERE id=$1 FOR UPDATE",[id(req.params.id)]);
  if(!old.rowCount)throw httpError("Review not found",404);
  if(req.user.role!=="ADMIN"&&old.rows[0].customer_id!==req.user.id)throw httpError("Access denied",403);
  await c.query("DELETE FROM reviews WHERE id=$1",[id(req.params.id)]);
  const avg=await c.query("SELECT ROUND(AVG(rating),2) avg,COUNT(*)::int count FROM reviews WHERE entrepreneur_id=$1",[old.rows[0].entrepreneur_id]);
  await c.query("UPDATE entrepreneur_profiles SET average_rating=COALESCE($1,0),total_reviews=$2 WHERE id=$3",[avg.rows[0].avg||0,avg.rows[0].count,old.rows[0].entrepreneur_id]);
 });
 res.json({success:true,message:"Review deleted"});
}catch(e){sendError(res,e)}};

module.exports={createReview,getReviews,getReviewById,updateReview,deleteReview};
