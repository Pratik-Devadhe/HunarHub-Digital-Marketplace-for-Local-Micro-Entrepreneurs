const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getServices=async(req,res)=>{try{
 const vals=[];const w=["s.is_active=true"];let n=1;
 if(req.query.category_id){w.push(`s.category_id=$${n++}`);vals.push(id(req.query.category_id,"category id"))}
 if(req.query.entrepreneur_id){w.push(`s.entrepreneur_id=$${n++}`);vals.push(id(req.query.entrepreneur_id,"entrepreneur id"))}
 if(req.query.search){w.push(`(s.title ILIKE $${n} OR s.description ILIKE $${n})`);vals.push(`%${req.query.search}%`);n++}
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT s.*,ep.business_name,u.full_name FROM services s
   JOIN entrepreneur_profiles ep ON ep.id=s.entrepreneur_id JOIN users u ON u.id=ep.user_id
   WHERE ${w.join(" AND ")} ORDER BY s.created_at DESC`,vals)).rows);
 res.json({success:true,services:rows});
}catch(e){sendError(res,e)}};

const getServiceById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  `SELECT s.*,ep.business_name,u.full_name FROM services s JOIN entrepreneur_profiles ep ON ep.id=s.entrepreneur_id
   JOIN users u ON u.id=ep.user_id WHERE s.id=$1`,[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Service not found",404);return r.rows[0]});
 res.json({success:true,service:row});
}catch(e){sendError(res,e)}};

const getMyServices=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT s.* FROM services s JOIN entrepreneur_profiles ep ON ep.id=s.entrepreneur_id
   WHERE ep.user_id=$1 ORDER BY s.created_at DESC`,[req.user.id])).rows);
 res.json({success:true,services:rows});
}catch(e){sendError(res,e)}};

const createService=async(req,res)=>{try{
 const {category_id,skill_id,title,description,price,price_type="FIXED",estimated_duration}=req.body;
 if(!title) throw httpError("title is required");
 const row=await withTransaction(async c=>{
  const ep=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[req.user.id]);
  if(!ep.rowCount) throw httpError("Entrepreneur profile not found",404);
  if(category_id){const r=await c.query("SELECT id FROM categories WHERE id=$1 AND is_active=true",[category_id]);if(!r.rowCount)throw httpError("Invalid category",400)}
  if(skill_id){const r=await c.query("SELECT id FROM skills WHERE id=$1 AND ($2::bigint IS NULL OR category_id=$2)",[skill_id,category_id||null]);if(!r.rowCount)throw httpError("Invalid skill/category",400)}
  const r=await c.query(
   `INSERT INTO services(entrepreneur_id,category_id,skill_id,title,description,price,price_type,estimated_duration)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
   [ep.rows[0].id,category_id||null,skill_id||null,title.trim(),description||null,price??null,price_type,estimated_duration??null]);
  return r.rows[0];
 });
 res.status(201).json({success:true,service:row});
}catch(e){sendError(res,e)}};

const updateService=async(req,res)=>{try{
 const {category_id,skill_id,title,description,price,price_type,estimated_duration,is_active}=req.body;
 const row=await withTransaction(async c=>{
  const ep=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[req.user.id]);
  if(!ep.rowCount)throw httpError("Entrepreneur profile not found",404);
  const r=await c.query(
   `UPDATE services SET category_id=COALESCE($1,category_id),skill_id=COALESCE($2,skill_id),
    title=COALESCE($3,title),description=COALESCE($4,description),price=COALESCE($5,price),
    price_type=COALESCE($6,price_type),estimated_duration=COALESCE($7,estimated_duration),
    is_active=COALESCE($8,is_active),updated_at=CURRENT_TIMESTAMP
    WHERE id=$9 AND entrepreneur_id=$10 RETURNING *`,
   [category_id??null,skill_id??null,title??null,description??null,price??null,price_type??null,estimated_duration??null,
    is_active??null,id(req.params.id),ep.rows[0].id]);
  if(!r.rowCount)throw httpError("Service not found or not owned by you",404);return r.rows[0];
 });
 res.json({success:true,service:row});
}catch(e){sendError(res,e)}};

const deleteService=async(req,res)=>{try{
 await withTransaction(async c=>{
  const ep=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[req.user.id]);
  const r=await c.query("DELETE FROM services WHERE id=$1 AND entrepreneur_id=$2 RETURNING id",[id(req.params.id),ep.rows[0]?.id]);
  if(!r.rowCount)throw httpError("Service not found or not owned by you",404);
 });
 res.json({success:true,message:"Service deleted"});
}catch(e){sendError(res,e)}};

module.exports={getServices,getServiceById,getMyServices,createService,updateService,deleteService};
