const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getDashboard=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const q=async(sql)=> (await c.query(sql)).rows[0];
  return {
   users:await q("SELECT COUNT(*)::int count FROM users"),
   entrepreneurs:await q("SELECT COUNT(*)::int count FROM entrepreneur_profiles"),
   approved_entrepreneurs:await q("SELECT COUNT(*)::int count FROM entrepreneur_profiles WHERE verification_status='APPROVED'"),
   products:await q("SELECT COUNT(*)::int count FROM products"),
   services:await q("SELECT COUNT(*)::int count FROM services"),
   orders:await q("SELECT COUNT(*)::int count FROM orders"),
   requests:await q("SELECT COUNT(*)::int count FROM service_requests"),
   complaints:await q("SELECT COUNT(*)::int count FROM complaints WHERE status IN ('OPEN','UNDER_REVIEW')")
  };
 });
 res.json({success:true,dashboard:data});
}catch(e){sendError(res,e)}};

const getEntrepreneurs=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT ep.*,u.full_name,u.email,u.phone FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id ORDER BY ep.created_at DESC`)).rows);
 res.json({success:true,entrepreneurs:rows});
}catch(e){sendError(res,e)}};

const getEntrepreneurById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  `SELECT ep.*,u.full_name,u.email,u.phone FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id WHERE ep.id=$1`,
  [id(req.params.id,"entrepreneur id")]);if(!r.rowCount)throw httpError("Entrepreneur not found",404);return r.rows[0]});
 res.json({success:true,entrepreneur:row});
}catch(e){sendError(res,e)}};

const setVerification=async(req,res,status)=>{try{
 const row=await withTransaction(async c=>{
  const r=await c.query(
   `UPDATE entrepreneur_profiles SET verification_status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *`,
   [status,id(req.params.id,"entrepreneur id")]);
  if(!r.rowCount)throw httpError("Entrepreneur not found",404);
  await c.query("INSERT INTO notifications(user_id,title,message,type) VALUES($1,$2,$3,$4)",
   [r.rows[0].user_id,`Verification ${status.toLowerCase()}`,`Your entrepreneur profile has been ${status.toLowerCase()}.`,"ADMIN"]);
  return r.rows[0];
 });
 res.json({success:true,entrepreneur:row});
}catch(e){sendError(res,e)}};

const approveEntrepreneur=(req,res)=>setVerification(req,res,"APPROVED");
const rejectEntrepreneur=(req,res)=>setVerification(req,res,"REJECTED");

const updateVerificationBadges = async (req, res) => {
  try {
    const epId = id(req.params.id, "entrepreneur id");
    const { is_identity_verified, is_phone_verified, is_artisan_verified, is_business_verified, verification_status } = req.body;

    const row = await withTransaction(async (c) => {
      const r = await c.query(
        `UPDATE entrepreneur_profiles SET
           is_identity_verified = COALESCE($1, is_identity_verified),
           is_phone_verified = COALESCE($2, is_phone_verified),
           is_artisan_verified = COALESCE($3, is_artisan_verified),
           is_business_verified = COALESCE($4, is_business_verified),
           verification_status = COALESCE($5, verification_status),
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $6 RETURNING *`,
        [is_identity_verified, is_phone_verified, is_artisan_verified, is_business_verified, verification_status, epId]
      );
      if (!r.rowCount) throw httpError("Entrepreneur not found", 404);

      await c.query(
        `INSERT INTO notifications (user_id, title, message, type) VALUES ($1, 'Verification Badges Updated', 'Your verification status and badges have been updated by admin.', 'ADMIN')`,
        [r.rows[0].user_id]
      );
      return r.rows[0];
    });

    res.json({ success: true, entrepreneur: row });
  } catch (e) {
    sendError(res, e);
  }
};

const getUsers=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT id,full_name,email,phone,role,profile_image,is_active,created_at FROM users ORDER BY created_at DESC`)).rows);
 res.json({success:true,users:rows});
}catch(e){sendError(res,e)}};

const deactivateUser=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  "UPDATE users SET is_active=false,updated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING id,is_active",[id(req.params.id)]);
  if(!r.rowCount)throw httpError("User not found",404);return r.rows[0]});
 res.json({success:true,user:row});
}catch(e){sendError(res,e)}};

const getOrders=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT o.*,u.full_name customer_name,ep.business_name FROM orders o
   JOIN users u ON u.id=o.customer_id JOIN entrepreneur_profiles ep ON ep.id=o.entrepreneur_id
   ORDER BY o.created_at DESC`)).rows);
 res.json({success:true,orders:rows});
}catch(e){sendError(res,e)}};

const getServiceRequests=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT sr.*,cu.full_name customer_name,ep.business_name,s.title service_title
   FROM service_requests sr JOIN users cu ON cu.id=sr.customer_id
   JOIN entrepreneur_profiles ep ON ep.id=sr.entrepreneur_id JOIN services s ON s.id=sr.service_id
   ORDER BY sr.created_at DESC`)).rows);
 res.json({success:true,requests:rows});
}catch(e){sendError(res,e)}};

const getComplaints=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query("SELECT * FROM complaints ORDER BY created_at DESC")).rows);
 res.json({success:true,complaints:rows});
}catch(e){sendError(res,e)}};

const resolveComplaint=async(req,res)=>{try{
 const {status="RESOLVED",admin_response}=req.body;
 if(!["RESOLVED","REJECTED","UNDER_REVIEW"].includes(status))throw httpError("Invalid complaint status");
 const row=await withTransaction(async c=>{const r=await c.query(
  `UPDATE complaints SET status=$1,admin_response=$2,resolved_at=CASE WHEN $1 IN ('RESOLVED','REJECTED') THEN CURRENT_TIMESTAMP ELSE NULL END
   WHERE id=$3 RETURNING *`,[status,admin_response||null,id(req.params.id,"complaint id")]);
  if(!r.rowCount)throw httpError("Complaint not found",404);return r.rows[0]});
 res.json({success:true,complaint:row});
}catch(e){sendError(res,e)}};

const getAnalytics=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const monthly=await c.query(
   `SELECT DATE_TRUNC('month',created_at) month,COUNT(*)::int orders,COALESCE(SUM(total_amount),0)::numeric sales
    FROM orders WHERE status='COMPLETED' GROUP BY 1 ORDER BY 1 DESC LIMIT 12`);
  const ratings=await c.query("SELECT ROUND(AVG(rating),2) average_rating,COUNT(*)::int total_reviews FROM reviews");
  const earnings=await c.query("SELECT COALESCE(AVG(total),0)::numeric avg_order_value FROM (SELECT customer_id,SUM(total_amount) total FROM orders WHERE status='COMPLETED' GROUP BY customer_id)x");
  return {monthly_sales:monthly.rows,ratings:ratings.rows[0],average_customer_order_value:earnings.rows[0].avg_order_value};
 });
 res.json({success:true,analytics:data});
}catch(e){sendError(res,e)}};

module.exports={getDashboard,getEntrepreneurs,getEntrepreneurById,approveEntrepreneur,rejectEntrepreneur,updateVerificationBadges,getUsers,deactivateUser,
getOrders,getServiceRequests,getComplaints,resolveComplaint,getAnalytics};
