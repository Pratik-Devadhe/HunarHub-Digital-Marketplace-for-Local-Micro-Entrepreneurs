const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const profileByUser=async(c,userId)=>{
 const r=await c.query("SELECT * FROM entrepreneur_profiles WHERE user_id=$1",[userId]);
 if(!r.rowCount) throw httpError("Entrepreneur profile not found",404);
 return r.rows[0];
};

const getEntrepreneurs=async(req,res)=>{try{
 const {category_id,skill_id,city,min_price,max_price,search}=req.query;
 const vals=[]; const where=["ep.verification_status='APPROVED'","ep.is_available=true"]; let n=1;
 if(city){where.push(`LOWER(ep.city)=LOWER($${n++})`);vals.push(city)}
 if(category_id){where.push(`EXISTS(SELECT 1 FROM entrepreneur_skills es JOIN skills s ON s.id=es.skill_id WHERE es.entrepreneur_id=ep.id AND s.category_id=$${n++})`);vals.push(id(category_id,"category id"))}
 if(skill_id){where.push(`EXISTS(SELECT 1 FROM entrepreneur_skills es WHERE es.entrepreneur_id=ep.id AND es.skill_id=$${n++})`);vals.push(id(skill_id,"skill id"))}
 if(search){where.push(`(ep.business_name ILIKE $${n} OR ep.bio ILIKE $${n})`);vals.push(`%${search}%`);n++}
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT ep.id,ep.user_id,u.full_name,ep.business_name,ep.bio,ep.experience_years,
   ep.city,ep.state,ep.average_rating,ep.total_reviews,ep.is_available
   FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id
   WHERE ${where.join(" AND ")} ORDER BY ep.average_rating DESC,ep.id DESC`,vals)).rows);
 res.json({success:true,entrepreneurs:rows});
}catch(e){sendError(res,e)}};

const getNearbyEntrepreneurs=async(req,res)=>{try{
 const lat=Number(req.query.lat),lng=Number(req.query.lng),radius=Number(req.query.radius||10000);
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180||radius<=0) throw httpError("Valid lat, lng and positive radius are required");
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT ep.id,ep.user_id,u.full_name,ep.business_name,ep.city,ep.state,
   ep.average_rating,ST_Distance(ep.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) distance_m
   FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id
   WHERE ep.verification_status='APPROVED' AND ep.is_available=true AND ep.location IS NOT NULL
   AND ST_DWithin(ep.location,ST_SetSRID(ST_MakePoint($1,$2),4326)::geography,$3)
   ORDER BY distance_m`,[lng,lat,radius])).rows);
 res.json({success:true,entrepreneurs:rows});
}catch(e){sendError(res,e)}};

const getEntrepreneurById=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const r=await c.query(
   `SELECT ep.*,u.full_name,u.email,u.phone,u.profile_image
    FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id WHERE ep.id=$1`,[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Entrepreneur not found",404);
  return r.rows[0];
 });
 res.json({success:true,entrepreneur:data});
}catch(e){sendError(res,e)}};

const createProfile=async(req,res)=>{try{
 const {business_name,bio,experience_years,phone,address,city,state,pincode,latitude,longitude}=req.body;
 const data=await withTransaction(async c=>{
  const existing=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[req.user.id]);
  if(existing.rowCount) throw httpError("Entrepreneur profile already exists",409);
  const r=await c.query(
   `INSERT INTO entrepreneur_profiles(user_id,business_name,bio,experience_years,phone,address,city,state,pincode,location)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,
      CASE WHEN $10::double precision IS NOT NULL AND $11::double precision IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint($11,$10),4326)::geography ELSE NULL END)
    RETURNING *`,
   [req.user.id,business_name||null,bio||null,experience_years||0,phone||null,address||null,city||null,state||null,pincode||null,
    latitude??null,longitude??null]);
  return r.rows[0];
 });
 res.status(201).json({success:true,entrepreneur:data});
}catch(e){sendError(res,e)}};

const updateProfile=async(req,res)=>{try{
 const {business_name,bio,experience_years,phone,address,city,state,pincode,is_available,latitude,longitude}=req.body;
 const data=await withTransaction(async c=>{
  const ep=await profileByUser(c,req.user.id);
  const r=await c.query(
   `UPDATE entrepreneur_profiles SET
    business_name=COALESCE($1,business_name),bio=COALESCE($2,bio),
    experience_years=COALESCE($3,experience_years),phone=COALESCE($4,phone),
    address=COALESCE($5,address),city=COALESCE($6,city),state=COALESCE($7,state),
    pincode=COALESCE($8,pincode),is_available=COALESCE($9,is_available),
    location=CASE WHEN $10::double precision IS NOT NULL AND $11::double precision IS NOT NULL
      THEN ST_SetSRID(ST_MakePoint($11,$10),4326)::geography ELSE location END,
    updated_at=CURRENT_TIMESTAMP WHERE id=$12 RETURNING *`,
   [business_name??null,bio??null,experience_years??null,phone??null,address??null,city??null,state??null,pincode??null,
    is_available??null,latitude??null,longitude??null,ep.id]);
  return r.rows[0];
 });
 res.json({success:true,entrepreneur:data});
}catch(e){sendError(res,e)}};

const deleteProfile=async(req,res)=>{try{
 await withTransaction(async c=>{
  const ep=await profileByUser(c,req.user.id);
  await c.query("DELETE FROM entrepreneur_profiles WHERE id=$1",[ep.id]);
  await c.query("UPDATE users SET role='CUSTOMER',updated_at=CURRENT_TIMESTAMP WHERE id=$1",[req.user.id]);
 });
 res.json({success:true,message:"Entrepreneur profile deleted"});
}catch(e){sendError(res,e)}};

const getEntrepreneurServices=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT * FROM services WHERE entrepreneur_id=$1 AND is_active=true ORDER BY created_at DESC`,
  [id(req.params.id,"entrepreneur id")])).rows);
 res.json({success:true,services:rows});
}catch(e){sendError(res,e)}};

const getEntrepreneurProducts=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT p.*,COALESCE(json_agg(pi.image_url) FILTER(WHERE pi.id IS NOT NULL),'[]') images
   FROM products p LEFT JOIN product_images pi ON pi.product_id=p.id
   WHERE p.entrepreneur_id=$1 AND p.is_available=true
   GROUP BY p.id ORDER BY p.created_at DESC`,[id(req.params.id,"entrepreneur id")])).rows);
 res.json({success:true,products:rows});
}catch(e){sendError(res,e)}};

const getEntrepreneurReviews=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT r.*,u.full_name FROM reviews r JOIN users u ON u.id=r.customer_id
   WHERE r.entrepreneur_id=$1 ORDER BY r.created_at DESC`,[id(req.params.id,"entrepreneur id")])).rows);
 res.json({success:true,reviews:rows});
}catch(e){sendError(res,e)}};

const getEntrepreneurDashboard=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const ep=await profileByUser(c,req.user.id);
  const [services,products,requests,orders,earnings]=await Promise.all([
   c.query("SELECT COUNT(*)::int count FROM services WHERE entrepreneur_id=$1 AND is_active=true",[ep.id]),
   c.query("SELECT COUNT(*)::int count FROM products WHERE entrepreneur_id=$1 AND is_available=true",[ep.id]),
   c.query("SELECT COUNT(*)::int count FROM service_requests WHERE entrepreneur_id=$1 AND status='PENDING'",[ep.id]),
   c.query(`SELECT COUNT(DISTINCT oi.order_id)::int count FROM order_items oi JOIN orders o ON o.id=oi.order_id
            WHERE oi.entrepreneur_id=$1 AND o.status NOT IN ('CANCELLED')`,[ep.id]),
   c.query(`SELECT COALESCE(SUM(oi.subtotal),0)::numeric earnings FROM order_items oi
            JOIN orders o ON o.id=oi.order_id WHERE oi.entrepreneur_id=$1 AND o.status='COMPLETED'`,[ep.id])
  ]);
  return {entrepreneur:ep,counts:{services:services.rows[0].count,products:products.rows[0].count,
    pending_requests:requests.rows[0].count,orders:orders.rows[0].count,earnings:earnings.rows[0].earnings}};
 });
 res.json({success:true,dashboard:data});
}catch(e){sendError(res,e)}};

const getMyProfile=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const ep=await profileByUser(c,req.user.id);
  const r=await c.query(
   `SELECT ep.*,u.full_name,u.email,u.phone,u.profile_image
    FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id WHERE ep.id=$1`,[ep.id]);
  return r.rows[0];
 });
 res.json({success:true,entrepreneur:data});
}catch(e){sendError(res,e)}};

module.exports={getEntrepreneurs,getNearbyEntrepreneurs,getEntrepreneurById,getMyProfile,createProfile,updateProfile,deleteProfile,
getEntrepreneurServices,getEntrepreneurProducts,getEntrepreneurReviews,getEntrepreneurDashboard};
