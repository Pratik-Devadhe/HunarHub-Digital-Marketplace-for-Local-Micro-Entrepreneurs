from pathlib import Path
import zipfile, textwrap, os, json

root = Path(__file__).resolve().parent.parent
(root / "controllers").mkdir(parents=True, exist_ok=True)
(root / "middleware").mkdir(parents=True, exist_ok=True)
(root / "utils").mkdir(parents=True, exist_ok=True)
(root / "routes").mkdir(parents=True, exist_ok=True)
(root / "database").mkdir(parents=True, exist_ok=True)

files = {}

files["utils/transaction.js"] = r'''
const pool = require("../config/db");

async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try { await client.query("ROLLBACK"); } catch (_) {}
        throw error;
    } finally {
        client.release();
    }
}

module.exports = { withTransaction };
'''

files["utils/http.js"] = r'''
function httpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function sendError(res, error) {
    console.error(error);
    return res.status(error.status || 500).json({
        success: false,
        message: error.status ? error.message : "Internal server error"
    });
}

function id(value, name = "id") {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw httpError(`Invalid ${name}`, 400);
    return n;
}

module.exports = { httpError, sendError, id };
'''

files["middleware/authMiddleware.js"] = r'''
const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
    try {
        const header = req.headers.authorization || "";
        const [type, token] = header.split(" ");

        if (type !== "Bearer" || !token) {
            return res.status(401).json({ success: false, message: "Authentication required" });
        }

        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }
};

module.exports = { authenticateUser };
'''

files["middleware/roleMiddleware.js"] = r'''
const allowRoles = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: "Access denied" });
    }
    next();
};

const requireCustomer = allowRoles("CUSTOMER");
const requireEntrepreneur = allowRoles("ENTREPRENEUR");
const requireAdmin = allowRoles("ADMIN");

module.exports = {
    allowRoles,
    requireCustomer,
    requireEntrepreneur,
    requireAdmin
};
'''

files["controllers/authController.js"] = r'''
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const signToken = user => jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
);

const register = async (req, res) => {
    try {
        const { full_name, email, phone, password, role = "CUSTOMER" } = req.body;
        if (!full_name || !email || !password) throw httpError("full_name, email and password are required");
        if (!["CUSTOMER", "ENTREPRENEUR"].includes(role)) throw httpError("Invalid registration role");
        if (password.length < 6) throw httpError("Password must contain at least 6 characters");

        const result = await withTransaction(async client => {
            const exists = await client.query(
                "SELECT id FROM users WHERE LOWER(email)=LOWER($1) OR ($2::text IS NOT NULL AND phone=$2)",
                [email.trim(), phone || null]
            );
            if (exists.rowCount) throw httpError("Email or phone already registered", 409);

            const passwordHash = await bcrypt.hash(password, 12);
            const user = await client.query(
                `INSERT INTO users(full_name,email,phone,password_hash,role)
                 VALUES($1,$2,$3,$4,$5)
                 RETURNING id,full_name,email,phone,role,profile_image,is_active,created_at`,
                [full_name.trim(), email.trim().toLowerCase(), phone || null, passwordHash, role]
            );

            if (role === "ENTREPRENEUR") {
                await client.query(
                    `INSERT INTO entrepreneur_profiles(user_id)
                     VALUES($1)`,
                    [user.rows[0].id]
                );
            }
            return user.rows[0];
        });

        res.status(201).json({ success: true, message: "Registration successful", token: signToken(result), user: result });
    } catch (error) { sendError(res, error); }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) throw httpError("Email and password are required");

        const user = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id,full_name,email,phone,password_hash,role,profile_image,is_active
                 FROM users WHERE LOWER(email)=LOWER($1)`,
                [email.trim()]
            );
            if (!r.rowCount) throw httpError("Invalid email or password", 401);
            if (!r.rows[0].is_active) throw httpError("Account is inactive", 403);
            const ok = await bcrypt.compare(password, r.rows[0].password_hash);
            if (!ok) throw httpError("Invalid email or password", 401);
            delete r.rows[0].password_hash;
            return r.rows[0];
        });

        res.json({ success: true, message: "Login successful", token: signToken(user), user });
    } catch (error) { sendError(res, error); }
};

const getCurrentUser = async (req, res) => {
    try {
        const user = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id,full_name,email,phone,role,profile_image,is_active,created_at,updated_at
                 FROM users WHERE id=$1`,
                [id(req.user.id, "user id")]
            );
            if (!r.rowCount) throw httpError("User not found", 404);
            return r.rows[0];
        });
        res.json({ success: true, user });
    } catch (error) { sendError(res, error); }
};

const updateProfile = async (req, res) => {
    try {
        const { full_name, phone, profile_image, password } = req.body;
        const user = await withTransaction(async client => {
            const fields = [];
            const values = [];
            let i = 1;
            if (full_name !== undefined) { fields.push(`full_name=$${i++}`); values.push(full_name.trim()); }
            if (phone !== undefined) { fields.push(`phone=$${i++}`); values.push(phone || null); }
            if (profile_image !== undefined) { fields.push(`profile_image=$${i++}`); values.push(profile_image || null); }
            if (password !== undefined) {
                if (password.length < 6) throw httpError("Password must contain at least 6 characters");
                fields.push(`password_hash=$${i++}`); values.push(await bcrypt.hash(password, 12));
            }
            if (!fields.length) throw httpError("No fields to update");
            fields.push("updated_at=CURRENT_TIMESTAMP");
            values.push(id(req.user.id, "user id"));
            const r = await client.query(
                `UPDATE users SET ${fields.join(", ")} WHERE id=$${i}
                 RETURNING id,full_name,email,phone,role,profile_image,is_active,created_at,updated_at`,
                values
            );
            if (!r.rowCount) throw httpError("User not found", 404);
            return r.rows[0];
        });
        res.json({ success: true, message: "Profile updated", user });
    } catch (error) { sendError(res, error); }
};

module.exports = { register, login, getCurrentUser, updateProfile };
'''

files["controllers/userController.js"] = r'''
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getUser = async (req,res) => {
    try {
        const user = await withTransaction(async client => {
            const r = await client.query(
                `SELECT id,full_name,email,phone,role,profile_image,is_active,created_at
                 FROM users WHERE id=$1`, [id(req.params.id)]
            );
            if (!r.rowCount) throw httpError("User not found",404);
            if (req.user.role !== "ADMIN" && req.user.id !== r.rows[0].id) throw httpError("Access denied",403);
            return r.rows[0];
        });
        res.json({success:true,user});
    } catch(e){sendError(res,e);}
};

const updateUser = async (req,res) => {
    try {
        if (req.user.role !== "ADMIN" && Number(req.params.id)!==Number(req.user.id)) throw httpError("Access denied",403);
        const {full_name,phone,profile_image} = req.body;
        const user = await withTransaction(async client => {
            const r = await client.query(
                `UPDATE users SET full_name=COALESCE($1,full_name),
                 phone=COALESCE($2,phone), profile_image=COALESCE($3,profile_image),
                 updated_at=CURRENT_TIMESTAMP WHERE id=$4
                 RETURNING id,full_name,email,phone,role,profile_image,is_active,created_at,updated_at`,
                [full_name ?? null,phone ?? null,profile_image ?? null,id(req.params.id)]
            );
            if(!r.rowCount) throw httpError("User not found",404);
            return r.rows[0];
        });
        res.json({success:true,user});
    } catch(e){sendError(res,e);}
};

const deleteUser = async (req,res) => {
    try {
        const target=id(req.params.id);
        if(req.user.role!=="ADMIN" && req.user.id!==target) throw httpError("Access denied",403);
        await withTransaction(async client => {
            const r=await client.query("DELETE FROM users WHERE id=$1 RETURNING id",[target]);
            if(!r.rowCount) throw httpError("User not found",404);
        });
        res.json({success:true,message:"User deleted"});
    } catch(e){sendError(res,e);}
};

module.exports={getUser,updateUser,deleteUser};
'''

files["controllers/categoryController.js"] = r'''
const { withTransaction } = require("../utils/transaction");
const { httpError, sendError, id } = require("../utils/http");

const getCategories=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT id,name,description,image_url,is_active,created_at FROM categories
   WHERE is_active=true ORDER BY name`)).rows);
 res.json({success:true,categories:rows});
}catch(e){sendError(res,e)}};

const getCategoryById=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const r=await c.query(`SELECT * FROM categories WHERE id=$1`,[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Category not found",404);
  return r.rows[0];
 });
 res.json({success:true,category:data});
}catch(e){sendError(res,e)}};

const createCategory=async(req,res)=>{try{
 const {name,description,image_url}=req.body;
 if(!name) throw httpError("name is required");
 const data=await withTransaction(async c=>{
  const r=await c.query(
   `INSERT INTO categories(name,description,image_url) VALUES($1,$2,$3)
    RETURNING *`,[name.trim(),description||null,image_url||null]);
  return r.rows[0];
 });
 res.status(201).json({success:true,category:data});
}catch(e){sendError(res,e)}};

const updateCategory=async(req,res)=>{try{
 const {name,description,image_url,is_active}=req.body;
 const data=await withTransaction(async c=>{
  const r=await c.query(
   `UPDATE categories SET name=COALESCE($1,name),description=COALESCE($2,description),
    image_url=COALESCE($3,image_url),is_active=COALESCE($4,is_active)
    WHERE id=$5 RETURNING *`,
   [name??null,description??null,image_url??null,is_active??null,id(req.params.id)]);
  if(!r.rowCount) throw httpError("Category not found",404); return r.rows[0];
 });
 res.json({success:true,category:data});
}catch(e){sendError(res,e)}};

const deleteCategory=async(req,res)=>{try{
 await withTransaction(async c=>{
  const r=await c.query("DELETE FROM categories WHERE id=$1 RETURNING id",[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Category not found",404);
 });
 res.json({success:true,message:"Category deleted"});
}catch(e){sendError(res,e)}};

module.exports={getCategories,getCategoryById,createCategory,updateCategory,deleteCategory};
'''

files["controllers/skillController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getSkills=async(req,res)=>{try{
 const params=[]; let where="";
 if(req.query.category_id){params.push(id(req.query.category_id,"category id"));where="WHERE s.category_id=$1";}
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT s.id,s.category_id,c.name category_name,s.name,s.description,s.created_at
   FROM skills s JOIN categories c ON c.id=s.category_id ${where} ORDER BY s.name`,params)).rows);
 res.json({success:true,skills:rows});
}catch(e){sendError(res,e)}};

const getSkillById=async(req,res)=>{try{
 const data=await withTransaction(async c=>{
  const r=await c.query(`SELECT s.*,c.name category_name FROM skills s JOIN categories c ON c.id=s.category_id WHERE s.id=$1`,[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Skill not found",404); return r.rows[0];
 });
 res.json({success:true,skill:data});
}catch(e){sendError(res,e)}};

const getSkillsByCategory=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT id,category_id,name,description FROM skills WHERE category_id=$1 ORDER BY name`,
  [id(req.params.categoryId,"category id")])).rows);
 res.json({success:true,skills:rows});
}catch(e){sendError(res,e)}};

const createSkill=async(req,res)=>{try{
 const {category_id,name,description}=req.body;
 if(!category_id||!name) throw httpError("category_id and name are required");
 const data=await withTransaction(async c=>{
  const cat=await c.query("SELECT id FROM categories WHERE id=$1",[id(category_id,"category id")]);
  if(!cat.rowCount) throw httpError("Category not found",404);
  const r=await c.query(`INSERT INTO skills(category_id,name,description) VALUES($1,$2,$3) RETURNING *`,
   [category_id,name.trim(),description||null]); return r.rows[0];
 });
 res.status(201).json({success:true,skill:data});
}catch(e){sendError(res,e)}};

const updateSkill=async(req,res)=>{try{
 const {category_id,name,description}=req.body;
 const data=await withTransaction(async c=>{
  const r=await c.query(
   `UPDATE skills SET category_id=COALESCE($1,category_id),name=COALESCE($2,name),
    description=COALESCE($3,description) WHERE id=$4 RETURNING *`,
   [category_id??null,name??null,description??null,id(req.params.id)]);
  if(!r.rowCount) throw httpError("Skill not found",404); return r.rows[0];
 });
 res.json({success:true,skill:data});
}catch(e){sendError(res,e)}};

const deleteSkill=async(req,res)=>{try{
 await withTransaction(async c=>{
  const r=await c.query("DELETE FROM skills WHERE id=$1 RETURNING id",[id(req.params.id)]);
  if(!r.rowCount) throw httpError("Skill not found",404);
 });
 res.json({success:true,message:"Skill deleted"});
}catch(e){sendError(res,e)}};

module.exports={getSkills,getSkillById,getSkillsByCategory,createSkill,updateSkill,deleteSkill};
'''

files["controllers/entrepreneurController.js"] = r'''
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
'''

files["controllers/serviceController.js"] = r'''
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
'''

files["controllers/productController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const epId=async(c,userId)=>{const r=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[userId]);if(!r.rowCount)throw httpError("Entrepreneur profile not found",404);return r.rows[0].id};

const getProducts=async(req,res)=>{try{
 const vals=[];const w=["p.is_available=true"];let n=1;
 if(req.query.category_id){w.push(`p.category_id=$${n++}`);vals.push(id(req.query.category_id,"category id"))}
 if(req.query.entrepreneur_id){w.push(`p.entrepreneur_id=$${n++}`);vals.push(id(req.query.entrepreneur_id,"entrepreneur id"))}
 if(req.query.min_price){w.push(`p.price >= $${n++}`);vals.push(Number(req.query.min_price))}
 if(req.query.max_price){w.push(`p.price <= $${n++}`);vals.push(Number(req.query.max_price))}
 if(req.query.search){w.push(`(p.name ILIKE $${n} OR p.description ILIKE $${n})`);vals.push(`%${req.query.search}%`);n++}
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT p.*,ep.business_name,u.full_name,
   COALESCE(json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'is_primary',pi.is_primary))
   FILTER(WHERE pi.id IS NOT NULL),'[]') images
   FROM products p JOIN entrepreneur_profiles ep ON ep.id=p.entrepreneur_id JOIN users u ON u.id=ep.user_id
   LEFT JOIN product_images pi ON pi.product_id=p.id
   WHERE ${w.join(" AND ")} GROUP BY p.id,ep.business_name,u.full_name ORDER BY p.created_at DESC`,vals)).rows);
 res.json({success:true,products:rows});
}catch(e){sendError(res,e)}};

const getProductById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  `SELECT p.*,ep.business_name,u.full_name,
   COALESCE(json_agg(json_build_object('id',pi.id,'image_url',pi.image_url,'is_primary',pi.is_primary))
   FILTER(WHERE pi.id IS NOT NULL),'[]') images
   FROM products p JOIN entrepreneur_profiles ep ON ep.id=p.entrepreneur_id JOIN users u ON u.id=ep.user_id
   LEFT JOIN product_images pi ON pi.product_id=p.id WHERE p.id=$1 GROUP BY p.id,ep.business_name,u.full_name`,
  [id(req.params.id)]);if(!r.rowCount)throw httpError("Product not found",404);return r.rows[0]});
 res.json({success:true,product:row});
}catch(e){sendError(res,e)}};

const getMyProducts=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT p.* FROM products p JOIN entrepreneur_profiles ep ON ep.id=p.entrepreneur_id WHERE ep.user_id=$1 ORDER BY p.created_at DESC`,
  [req.user.id])).rows);
 res.json({success:true,products:rows});
}catch(e){sendError(res,e)}};

const createProduct=async(req,res)=>{try{
 const {category_id,name,description,price,stock_quantity=0,is_available=true}=req.body;
 if(!name||price===undefined)throw httpError("name and price are required");
 if(Number(price)<0||Number(stock_quantity)<0)throw httpError("Invalid price or stock");
 const row=await withTransaction(async c=>{
  const eid=await epId(c,req.user.id);
  if(category_id){const r=await c.query("SELECT id FROM categories WHERE id=$1 AND is_active=true",[category_id]);if(!r.rowCount)throw httpError("Invalid category",400)}
  const r=await c.query(
   `INSERT INTO products(entrepreneur_id,category_id,name,description,price,stock_quantity,is_available)
    VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
   [eid,category_id||null,name.trim(),description||null,price,stock_quantity,is_available]);
  return r.rows[0];
 });
 res.status(201).json({success:true,product:row});
}catch(e){sendError(res,e)}};

const updateProduct=async(req,res)=>{try{
 const b=req.body;
 const row=await withTransaction(async c=>{
  const eid=await epId(c,req.user.id);
  const r=await c.query(
   `UPDATE products SET category_id=COALESCE($1,category_id),name=COALESCE($2,name),
    description=COALESCE($3,description),price=COALESCE($4,price),
    stock_quantity=COALESCE($5,stock_quantity),is_available=COALESCE($6,is_available),
    updated_at=CURRENT_TIMESTAMP WHERE id=$7 AND entrepreneur_id=$8 RETURNING *`,
   [b.category_id??null,b.name??null,b.description??null,b.price??null,b.stock_quantity??null,b.is_available??null,
    id(req.params.id),eid]);
  if(!r.rowCount)throw httpError("Product not found or not owned by you",404);return r.rows[0];
 });
 res.json({success:true,product:row});
}catch(e){sendError(res,e)}};

const deleteProduct=async(req,res)=>{try{
 await withTransaction(async c=>{
  const eid=await epId(c,req.user.id);
  const r=await c.query("DELETE FROM products WHERE id=$1 AND entrepreneur_id=$2 RETURNING id",[id(req.params.id),eid]);
  if(!r.rowCount)throw httpError("Product not found or not owned by you",404);
 });
 res.json({success:true,message:"Product deleted"});
}catch(e){sendError(res,e)}};

const addProductImage=async(req,res)=>{try{
 const {image_url,is_primary=false}=req.body;if(!image_url)throw httpError("image_url is required");
 const row=await withTransaction(async c=>{
  const eid=await epId(c,req.user.id);
  const p=await c.query("SELECT id FROM products WHERE id=$1 AND entrepreneur_id=$2",[id(req.params.id),eid]);
  if(!p.rowCount)throw httpError("Product not found or not owned by you",404);
  if(is_primary)await c.query("UPDATE product_images SET is_primary=false WHERE product_id=$1",[p.rows[0].id]);
  return (await c.query("INSERT INTO product_images(product_id,image_url,is_primary) VALUES($1,$2,$3) RETURNING *",
   [p.rows[0].id,image_url,is_primary])).rows[0];
 });
 res.status(201).json({success:true,image:row});
}catch(e){sendError(res,e)}};

const deleteProductImage=async(req,res)=>{try{
 await withTransaction(async c=>{
  const eid=await epId(c,req.user.id);
  const r=await c.query(
   `DELETE FROM product_images pi USING products p WHERE pi.id=$1 AND pi.product_id=p.id AND p.entrepreneur_id=$2 RETURNING pi.id`,
   [id(req.params.imageId,"image id"),eid]);
  if(!r.rowCount)throw httpError("Image not found or not owned by you",404);
 });
 res.json({success:true,message:"Image deleted"});
}catch(e){sendError(res,e)}};

module.exports={getProducts,getProductById,getMyProducts,createProduct,updateProduct,deleteProduct,addProductImage,deleteProductImage};
'''

files["controllers/availabilityController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getEid=async(c,userId)=>{const r=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[userId]);if(!r.rowCount)throw httpError("Entrepreneur profile not found",404);return r.rows[0].id};

const getAvailability=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT ea.* FROM entrepreneur_availability ea JOIN entrepreneur_profiles ep ON ep.id=ea.entrepreneur_id
   WHERE ep.user_id=$1 ORDER BY day_of_week,start_time`,[req.user.id])).rows);
 res.json({success:true,availability:rows});
}catch(e){sendError(res,e)}};

const addAvailability=async(req,res)=>{try{
 const {day_of_week,start_time,end_time,is_available=true}=req.body;
 if(day_of_week===undefined||!start_time||!end_time)throw httpError("day_of_week,start_time,end_time required");
 const row=await withTransaction(async c=>{
  const eid=await getEid(c,req.user.id);
  if(Number(day_of_week)<0||Number(day_of_week)>6)throw httpError("day_of_week must be 0-6");
  if(start_time>=end_time)throw httpError("end_time must be after start_time");
  const overlap=await c.query(
   `SELECT 1 FROM entrepreneur_availability WHERE entrepreneur_id=$1 AND day_of_week=$2
    AND is_available=true AND $3::time < end_time AND $4::time > start_time`,
   [eid,day_of_week,start_time,end_time]);
  if(overlap.rowCount)throw httpError("Availability overlaps an existing slot",409);
  return (await c.query(
   `INSERT INTO entrepreneur_availability(entrepreneur_id,day_of_week,start_time,end_time,is_available)
    VALUES($1,$2,$3,$4,$5) RETURNING *`,[eid,day_of_week,start_time,end_time,is_available])).rows[0];
 });
 res.status(201).json({success:true,availability:row});
}catch(e){sendError(res,e)}};

const updateAvailability=async(req,res)=>{try{
 const b=req.body;
 const row=await withTransaction(async c=>{
  const eid=await getEid(c,req.user.id);
  const r=await c.query(
   `UPDATE entrepreneur_availability SET day_of_week=COALESCE($1,day_of_week),
    start_time=COALESCE($2,start_time),end_time=COALESCE($3,end_time),is_available=COALESCE($4,is_available)
    WHERE id=$5 AND entrepreneur_id=$6 RETURNING *`,
   [b.day_of_week??null,b.start_time??null,b.end_time??null,b.is_available??null,id(req.params.id),eid]);
  if(!r.rowCount)throw httpError("Availability not found",404);
  if(r.rows[0].start_time>=r.rows[0].end_time)throw httpError("Invalid time range");
  return r.rows[0];
 });
 res.json({success:true,availability:row});
}catch(e){sendError(res,e)}};

const deleteAvailability=async(req,res)=>{try{
 await withTransaction(async c=>{
  const eid=await getEid(c,req.user.id);
  const r=await c.query("DELETE FROM entrepreneur_availability WHERE id=$1 AND entrepreneur_id=$2 RETURNING id",[id(req.params.id),eid]);
  if(!r.rowCount)throw httpError("Availability not found",404);
 });
 res.json({success:true,message:"Availability deleted"});
}catch(e){sendError(res,e)}};

module.exports={getAvailability,addAvailability,updateAvailability,deleteAvailability};
'''

files["controllers/serviceRequestController.js"] = r'''
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
'''

files["controllers/orderController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

/*
IMPORTANT:
For the current schema, an order should contain products from ONE entrepreneur.
This avoids conflicting order-level statuses. A schema patch is included separately.
*/

const createOrder=async(req,res)=>{try{
 const {items,shipping_address}=req.body;
 if(!Array.isArray(items)||!items.length)throw httpError("items array is required");
 const row=await withTransaction(async c=>{
  const ids=items.map(x=>id(x.product_id,"product id"));
  const unique=[...new Set(ids)];
  const products=await c.query(
   `SELECT p.*,ep.user_id entrepreneur_user_id FROM products p
    JOIN entrepreneur_profiles ep ON ep.id=p.entrepreneur_id
    WHERE p.id=ANY($1::bigint[]) AND p.is_available=true FOR UPDATE`,[unique]);
  if(products.rowCount!==unique.length)throw httpError("One or more products are unavailable",409);
  const entrepreneurs=[...new Set(products.rows.map(p=>p.entrepreneur_id))];
  if(entrepreneurs.length!==1)throw httpError("An order must contain products from one entrepreneur");
  const map=new Map(products.rows.map(p=>[Number(p.id),p]));
  let total=0;
  const prepared=items.map(x=>{
   const p=map.get(Number(x.product_id));const q=Number(x.quantity);
   if(!Number.isInteger(q)||q<=0)throw httpError("Invalid quantity");
   if(p.stock_quantity<q)throw httpError(`Insufficient stock for ${p.name}`,409);
   const subtotal=Number(p.price)*q;total+=subtotal;return {p,q,subtotal};
  });
  const order=(await c.query(
   `INSERT INTO orders(customer_id,entrepreneur_id,total_amount,status,payment_status,shipping_address)
    VALUES($1,$2,$3,'PENDING','PENDING',$4) RETURNING *`,
   [req.user.id,entrepreneurs[0],total,shipping_address||null])).rows[0];

  for(const x of prepared){
   await c.query(
    `INSERT INTO order_items(order_id,product_id,entrepreneur_id,quantity,unit_price,subtotal,status)
     VALUES($1,$2,$3,$4,$5,$6,'PENDING')`,
    [order.id,x.p.id,x.p.entrepreneur_id,x.q,x.p.price,x.subtotal]);
   await c.query(
    `UPDATE products SET stock_quantity=stock_quantity-$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2`,
    [x.q,x.p.id]);
  }
  const epUser=(await c.query("SELECT user_id FROM entrepreneur_profiles WHERE id=$1",[entrepreneurs[0]])).rows[0].user_id;
  await c.query("INSERT INTO notifications(user_id,title,message,type) VALUES($1,$2,$3,$4)",
    [epUser,"New order",`Order #${order.id} has been placed`,"ORDER"]);
  return order;
 });
 res.status(201).json({success:true,order:row});
}catch(e){sendError(res,e)}};

const getMyOrders=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT o.*,ep.business_name,COALESCE(json_agg(json_build_object(
    'id',oi.id,'product_id',oi.product_id,'quantity',oi.quantity,'unit_price',oi.unit_price,
    'subtotal',oi.subtotal,'status',oi.status,'product_name',p.name
  ) ORDER BY oi.id) items
   FROM orders o JOIN entrepreneur_profiles ep ON ep.id=o.entrepreneur_id
   JOIN order_items oi ON oi.order_id=o.id JOIN products p ON p.id=oi.product_id
   WHERE o.customer_id=$1 GROUP BY o.id,ep.business_name ORDER BY o.created_at DESC`,
  [req.user.id])).rows);
 res.json({success:true,orders:rows});
}catch(e){sendError(res,e)}};

const getReceivedOrders=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT o.*,u.full_name customer_name,COALESCE(json_agg(json_build_object(
    'id',oi.id,'product_id',oi.product_id,'quantity',oi.quantity,'unit_price',oi.unit_price,
    'subtotal',oi.subtotal,'status',oi.status,'product_name',p.name
  ) ORDER BY oi.id) items
   FROM orders o JOIN users u ON u.id=o.customer_id JOIN order_items oi ON oi.order_id=o.id
   JOIN products p ON p.id=oi.product_id JOIN entrepreneur_profiles ep ON ep.id=o.entrepreneur_id
   WHERE ep.user_id=$1 GROUP BY o.id,u.full_name ORDER BY o.created_at DESC`,
  [req.user.id])).rows);
 res.json({success:true,orders:rows});
}catch(e){sendError(res,e)}};

const getOrderById=async(req,res)=>{try{
 const row=await withTransaction(async c=>{
  const r=await c.query(
   `SELECT o.*,u.full_name customer_name,ep.business_name,
    COALESCE(json_agg(json_build_object('id',oi.id,'product_id',oi.product_id,'quantity',oi.quantity,
    'unit_price',oi.unit_price,'subtotal',oi.subtotal,'status',oi.status,'product_name',p.name)),'[]') items
    FROM orders o JOIN users u ON u.id=o.customer_id JOIN entrepreneur_profiles ep ON ep.id=o.entrepreneur_id
    LEFT JOIN order_items oi ON oi.order_id=o.id LEFT JOIN products p ON p.id=oi.product_id
    WHERE o.id=$1 GROUP BY o.id,u.full_name,ep.business_name`,
   [id(req.params.id)]);
  if(!r.rowCount)throw httpError("Order not found",404);
  const x=r.rows[0];
  const isOwner=req.user.id===x.customer_id;
  const isEntrepreneur=await c.query("SELECT 1 FROM entrepreneur_profiles WHERE id=$1 AND user_id=$2",[x.entrepreneur_id,req.user.id]);
  if(req.user.role!=="ADMIN"&&!isOwner&&!isEntrepreneur.rowCount)throw httpError("Access denied",403);
  return x;
 });
 res.json({success:true,order:row});
}catch(e){sendError(res,e)}};

const transitionOrder=async(req,res,nextStatus,allowed,actor)=>{try{
 const row=await withTransaction(async c=>{
  const orderId=id(req.params.id,"order id");
  let r;
  if(actor==="customer")r=await c.query("SELECT * FROM orders WHERE id=$1 AND customer_id=$2 FOR UPDATE",[orderId,req.user.id]);
  else r=await c.query(`SELECT o.* FROM orders o JOIN entrepreneur_profiles ep ON ep.id=o.entrepreneur_id
                         WHERE o.id=$1 AND ep.user_id=$2 FOR UPDATE`,[orderId,req.user.id]);
  if(!r.rowCount)throw httpError("Order not found or access denied",404);
  const o=r.rows[0];
  if(!allowed.includes(o.status))throw httpError(`Cannot change order from ${o.status}`,409);

  if(nextStatus==="CANCELLED"){
   const items=await c.query("SELECT product_id,quantity FROM order_items WHERE order_id=$1 FOR UPDATE",[orderId]);
   for(const item of items.rows)await c.query(
    "UPDATE products SET stock_quantity=stock_quantity+$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2",
    [item.quantity,item.product_id]);
  }
  const updated=(await c.query("UPDATE orders SET status=$1,updated_at=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *",[nextStatus,orderId])).rows[0];
  const target=actor==="customer"
    ? (await c.query("SELECT u.id FROM entrepreneur_profiles ep JOIN users u ON u.id=ep.user_id WHERE ep.id=$1",[o.entrepreneur_id])).rows[0].id
    : o.customer_id;
  await c.query("UPDATE order_items SET status=$1 WHERE order_id=$2",[nextStatus,orderId]);
  await c.query("INSERT INTO notifications(user_id,title,message,type) VALUES($1,$2,$3,$4)",
    [target,"Order updated",`Order #${orderId} is now ${nextStatus}`,"ORDER"]);
  return updated;
 });
 res.json({success:true,order:row});
}catch(e){sendError(res,e)}};

const cancelOrder=(req,res)=>transitionOrder(req,res,"CANCELLED",["PENDING","CONFIRMED"],"customer");
const confirmOrder=(req,res)=>transitionOrder(req,res,"CONFIRMED",["PENDING"],"entrepreneur");
const processOrder=(req,res)=>transitionOrder(req,res,"PROCESSING",["CONFIRMED"],"entrepreneur");
const markOrderReady=(req,res)=>transitionOrder(req,res,"READY",["PROCESSING"],"entrepreneur");
const completeOrder=(req,res)=>transitionOrder(req,res,"COMPLETED",["READY"],"entrepreneur");

module.exports={createOrder,getMyOrders,getReceivedOrders,getOrderById,cancelOrder,confirmOrder,processOrder,markOrderReady,completeOrder};
'''

files["controllers/paymentController.js"] = r'''
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
'''

files["controllers/reviewController.js"] = r'''
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
'''

files["controllers/favoriteController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getFavorites=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  `SELECT f.*,p.name product_name,ep.business_name
   FROM favorites f LEFT JOIN products p ON p.id=f.product_id
   LEFT JOIN entrepreneur_profiles ep ON ep.id=f.entrepreneur_id
   WHERE f.user_id=$1 ORDER BY f.created_at DESC`,[req.user.id])).rows);
 res.json({success:true,favorites:rows});
}catch(e){sendError(res,e)}};

const addFavorite=async(req,res)=>{try{
 const {entrepreneur_id,product_id}=req.body;
 if((entrepreneur_id&&product_id)||(!entrepreneur_id&&!product_id))throw httpError("Provide exactly one favorite target");
 const row=await withTransaction(async c=>{
  if(entrepreneur_id){const r=await c.query("SELECT id FROM entrepreneur_profiles WHERE id=$1",[entrepreneur_id]);if(!r.rowCount)throw httpError("Entrepreneur not found",404)}
  if(product_id){const r=await c.query("SELECT id FROM products WHERE id=$1",[product_id]);if(!r.rowCount)throw httpError("Product not found",404)}
  const dup=await c.query(
   `SELECT id FROM favorites WHERE user_id=$1 AND entrepreneur_id IS NOT DISTINCT FROM $2 AND product_id IS NOT DISTINCT FROM $3`,
   [req.user.id,entrepreneur_id||null,product_id||null]);
  if(dup.rowCount)throw httpError("Already in favorites",409);
  return (await c.query("INSERT INTO favorites(user_id,entrepreneur_id,product_id) VALUES($1,$2,$3) RETURNING *",
   [req.user.id,entrepreneur_id||null,product_id||null])).rows[0];
 });
 res.status(201).json({success:true,favorite:row});
}catch(e){sendError(res,e)}};

const removeFavorite=async(req,res)=>{try{
 await withTransaction(async c=>{
  const r=await c.query("DELETE FROM favorites WHERE id=$1 AND user_id=$2 RETURNING id",[id(req.params.id),req.user.id]);
  if(!r.rowCount)throw httpError("Favorite not found",404);
 });
 res.json({success:true,message:"Favorite removed"});
}catch(e){sendError(res,e)}};

module.exports={getFavorites,addFavorite,removeFavorite};
'''

files["controllers/notificationController.js"] = r'''
const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getNotifications=async(req,res)=>{try{
 const rows=await withTransaction(async c=>(await c.query(
  "SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC",[req.user.id])).rows);
 res.json({success:true,notifications:rows});
}catch(e){sendError(res,e)}};

const markNotificationRead=async(req,res)=>{try{
 const row=await withTransaction(async c=>{const r=await c.query(
  "UPDATE notifications SET is_read=true WHERE id=$1 AND user_id=$2 RETURNING *",[id(req.params.id),req.user.id]);
  if(!r.rowCount)throw httpError("Notification not found",404);return r.rows[0]});
 res.json({success:true,notification:row});
}catch(e){sendError(res,e)}};

const markAllNotificationsRead=async(req,res)=>{try{
 await withTransaction(async c=>{await c.query("UPDATE notifications SET is_read=true WHERE user_id=$1",[req.user.id])});
 res.json({success:true,message:"All notifications marked as read"});
}catch(e){sendError(res,e)}};

const deleteNotification=async(req,res)=>{try{
 await withTransaction(async c=>{const r=await c.query("DELETE FROM notifications WHERE id=$1 AND user_id=$2 RETURNING id",[id(req.params.id),req.user.id]);if(!r.rowCount)throw httpError("Notification not found",404)});
 res.json({success:true,message:"Notification deleted"});
}catch(e){sendError(res,e)}};

module.exports={getNotifications,markNotificationRead,markAllNotificationsRead,deleteNotification};
'''

files["controllers/complaintController.js"] = r'''
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
'''

files["controllers/adminController.js"] = r'''
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

module.exports={getDashboard,getEntrepreneurs,getEntrepreneurById,approveEntrepreneur,rejectEntrepreneur,getUsers,deactivateUser,
getOrders,getServiceRequests,getComplaints,resolveComplaint,getAnalytics};
'''

# Schema patch required by order controller.
files["database/feasibility_patch.sql"] = r'''
-- Required because the original order schema has no entrepreneur_id and
-- order_items has no per-item status. The order controller intentionally
-- enforces one entrepreneur per order.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS entrepreneur_id BIGINT;

ALTER TABLE orders
DROP CONSTRAINT IF EXISTS order_entrepreneur_fk;

ALTER TABLE orders
ADD CONSTRAINT order_entrepreneur_fk
FOREIGN KEY (entrepreneur_id)
REFERENCES entrepreneur_profiles(id)
ON DELETE RESTRICT;

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'PENDING';

ALTER TABLE order_items
DROP CONSTRAINT IF EXISTS order_item_status_check;

ALTER TABLE order_items
ADD CONSTRAINT order_item_status_check
CHECK (status IN (
    'PENDING',
    'CONFIRMED',
    'PROCESSING',
    'READY',
    'COMPLETED',
    'CANCELLED'
));

-- Strongly recommended consistency indexes/constraints:
CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_user_entrepreneur
ON favorites(user_id, entrepreneur_id)
WHERE entrepreneur_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_favorite_user_product
ON favorites(user_id, product_id)
WHERE product_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_entrepreneur
ON orders(entrepreneur_id);

CREATE INDEX IF NOT EXISTS idx_order_items_status
ON order_items(status);
'''

# Minimal route templates matching the controllers, with base endpoints in app.js.
route_map = {
"authRoutes.js": [("register","register"),("login","login"),("me","getCurrentUser"),("profile","updateProfile")],
"userRoutes.js": [(":id","getUser"),(":id","updateUser"),(":id","deleteUser")],
"categoryRoutes.js": [("","getCategories"),(":id","getCategoryById"),("","createCategory"),(":id","updateCategory"),(":id","deleteCategory")],
"skillRoutes.js": [("","getSkills"),(":id","getSkillById"),("category/:categoryId","getSkillsByCategory"),("","createSkill"),(":id","updateSkill"),(":id","deleteSkill")],
"serviceRoutes.js": [("","getServices"),("my","getMyServices"),(":id","getServiceById"),("","createService"),(":id","updateService"),(":id","deleteService")],
"productRoutes.js": [("","getProducts"),("my","getMyProducts"),(":id","getProductById"),("","createProduct"),(":id","updateProduct"),(":id","deleteProduct"),(":id/images","addProductImage"),(":id/images/:imageId","deleteProductImage")],
"availabilityRoutes.js": [("","getAvailability"),("","addAvailability"),(":id","updateAvailability"),(":id","deleteAvailability")],
"serviceRequestRoutes.js": [("","createServiceRequest"),("my","getMyRequests"),("received","getReceivedRequests"),(":id","getRequestById"),(":id/cancel","cancelServiceRequest"),(":id/accept","acceptServiceRequest"),(":id/reject","rejectServiceRequest"),(":id/start","startServiceRequest"),(":id/complete","completeServiceRequest")],
"orderRoutes.js": [("","createOrder"),("my","getMyOrders"),("received","getReceivedOrders"),(":id","getOrderById"),(":id/cancel","cancelOrder"),(":id/confirm","confirmOrder"),(":id/process","processOrder"),(":id/ready","markOrderReady"),(":id/complete","completeOrder")],
"paymentRoutes.js": [("create-order","createPaymentOrder"),("verify","verifyPayment"),(":id","getPaymentById"),("webhook","handlePaymentWebhook")],
"reviewRoutes.js": [("entrepreneur/:entrepreneurId","getReviews"),("product/:productId","getReviews"),("","createReview"),(":id","getReviewById"),(":id","updateReview"),(":id","deleteReview")],
"favoriteRoutes.js": [("","getFavorites"),("","addFavorite"),(":id","removeFavorite")],
"notificationRoutes.js": [("","getNotifications"),(":id/read","markNotificationRead"),("read-all","markAllNotificationsRead"),(":id","deleteNotification")],
"complaintRoutes.js": [("","createComplaint"),("my","getMyComplaints"),(":id","getComplaintById")],
"adminRoutes.js": [("dashboard","getDashboard"),("entrepreneurs","getEntrepreneurs"),("entrepreneurs/:id","getEntrepreneurById"),("entrepreneurs/:id/approve","approveEntrepreneur"),("entrepreneurs/:id/reject","rejectEntrepreneur"),("users","getUsers"),("users/:id/deactivate","deactivateUser"),("orders","getOrders"),("service-requests","getServiceRequests"),("complaints","getComplaints"),("complaints/:id/resolve","resolveComplaint"),("analytics","getAnalytics")]
}
controller_names = {
"authRoutes.js":"authController","userRoutes.js":"userController","categoryRoutes.js":"categoryController","skillRoutes.js":"skillController",
"serviceRoutes.js":"serviceController","productRoutes.js":"productController","availabilityRoutes.js":"availabilityController",
"serviceRequestRoutes.js":"serviceRequestController","orderRoutes.js":"orderController","paymentRoutes.js":"paymentController","reviewRoutes.js":"reviewController",
"favoriteRoutes.js":"favoriteController","notificationRoutes.js":"notificationController","complaintRoutes.js":"complaintController","adminRoutes.js":"adminController"
}
for fn, routes in route_map.items():
    ctrl=controller_names[fn]
    names=[]
    for _,name in routes:
        if name not in names:names.append(name)
    imports=", ".join(names)
    body=[f'const express = require("express");', f'const {{ {imports} }} = require("../controllers/{ctrl}");',
          'const { authenticateUser } = require("../middleware/authMiddleware");',
          'const { requireAdmin, requireCustomer, requireEntrepreneur } = require("../middleware/roleMiddleware");',
          'const router = express.Router();', '', '/* Routes are mounted from app.js without /api. */']
    for path,name in routes:
        method = "get" if name.startswith("get") else "post" if name.startswith(("create","register","login","add","handle")) else "delete" if name.startswith("delete") or name=="removeFavorite" else "put"
        auth = "" if name in ["register","login","getCategories","getCategoryById","getSkills","getSkillById","getSkillsByCategory","getServices","getServiceById","getProducts","getProductById","getReviews"] else "authenticateUser, "
        role = ""
        if name in ["createCategory","updateCategory","deleteCategory","createSkill","updateSkill","deleteSkill","getDashboard","getEntrepreneurs","getEntrepreneurById","approveEntrepreneur","rejectEntrepreneur","getUsers","deactivateUser","getOrders","getServiceRequests","getComplaints","resolveComplaint","getAnalytics"]:
            role="requireAdmin, "
        elif name in ["createService","updateService","deleteService","getMyServices","createProduct","updateProduct","deleteProduct","getMyProducts","addProductImage","deleteProductImage","getAvailability","addAvailability","updateAvailability","deleteAvailability","getReceivedRequests","acceptServiceRequest","rejectServiceRequest","startServiceRequest","completeServiceRequest","getReceivedOrders","confirmOrder","processOrder","markOrderReady","completeOrder"]:
            role="requireEntrepreneur, "
        elif name in ["createServiceRequest","getMyRequests","cancelServiceRequest","createOrder","getMyOrders","cancelOrder"]:
            role="requireCustomer, "
        if name=="handlePaymentWebhook": auth=""
        body.append(f'// {method.upper()} {path or "/"}')
        body.append(f'router.{method}("/{path}", {auth}{role}{name});')
    body.append('\nmodule.exports = router;')
    files[f"routes/{fn}"] = "\n".join(body)

# Fix duplicate/conflicting route order manually for files where :id would swallow named routes.
files["routes/serviceRoutes.js"] = r'''
const express = require("express");
const { getServices,getServiceById,getMyServices,createService,updateService,deleteService } = require("../controllers/serviceController");
const { authenticateUser } = require("../middleware/authMiddleware");
const { requireEntrepreneur } = require("../middleware/roleMiddleware");
const router=express.Router();

/*
GET    /services
GET    /services/my
GET    /services/:id
POST   /services
PUT    /services/:id
DELETE /services/:id
*/
router.get("/",getServices);
router.get("/my",authenticateUser,requireEntrepreneur,getMyServices);
router.get("/:id",getServiceById);
router.post("/",authenticateUser,requireEntrepreneur,createService);
router.put("/:id",authenticateUser,requireEntrepreneur,updateService);
router.delete("/:id",authenticateUser,requireEntrepreneur,deleteService);
module.exports=router;
'''
files["routes/productRoutes.js"] = files["routes/productRoutes.js"].replace(
    'router.get("/:id", authenticateUser, requireEntrepreneur, getMyProducts);' if False else 'router.get("/my", authenticateUser, requireEntrepreneur, getMyProducts);',
    'router.get("/my", authenticateUser, requireEntrepreneur, getMyProducts);'
)

# app.js
files["app.js"] = r'''
const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (req,res)=>res.json({success:true,message:"Welcome to HunarHub API"}));

app.use("/health", require("./routes/healthRoutes"));
app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/entrepreneurs", require("./routes/entrepreneurRoutes"));
app.use("/categories", require("./routes/categoryRoutes"));
app.use("/skills", require("./routes/skillRoutes"));
app.use("/services", require("./routes/serviceRoutes"));
app.use("/products", require("./routes/productRoutes"));
app.use("/availability", require("./routes/availabilityRoutes"));
app.use("/service-requests", require("./routes/serviceRequestRoutes"));
app.use("/orders", require("./routes/orderRoutes"));
app.use("/payments", require("./routes/paymentRoutes"));
app.use("/reviews", require("./routes/reviewRoutes"));
app.use("/favorites", require("./routes/favoriteRoutes"));
app.use("/notifications", require("./routes/notificationRoutes"));
app.use("/complaints", require("./routes/complaintRoutes"));
app.use("/admin", require("./routes/adminRoutes"));

app.use((req,res)=>res.status(404).json({success:false,message:"Endpoint not found"}));

module.exports=app;
'''

files["routes/entrepreneurRoutes.js"] = r'''
const express=require("express");
const {getEntrepreneurs,getNearbyEntrepreneurs,getEntrepreneurById,getMyProfile,createProfile,updateProfile,deleteProfile,
getEntrepreneurServices,getEntrepreneurProducts,getEntrepreneurReviews,getEntrepreneurDashboard}=require("../controllers/entrepreneurController");
const {authenticateUser}=require("../middleware/authMiddleware");
const {requireEntrepreneur}=require("../middleware/roleMiddleware");
const router=express.Router();

/*
GET    /entrepreneurs
GET    /entrepreneurs/nearby
GET    /entrepreneurs/profile
GET    /entrepreneurs/dashboard
GET    /entrepreneurs/:id
GET    /entrepreneurs/:id/services
GET    /entrepreneurs/:id/products
GET    /entrepreneurs/:id/reviews
POST   /entrepreneurs/profile
PUT    /entrepreneurs/profile
DELETE /entrepreneurs/profile
*/
router.get("/",getEntrepreneurs);
router.get("/nearby",getNearbyEntrepreneurs);
router.get("/profile",authenticateUser,requireEntrepreneur,getMyProfile);
router.get("/dashboard",authenticateUser,requireEntrepreneur,getEntrepreneurDashboard);
router.get("/:id/services",getEntrepreneurServices);
router.get("/:id/products",getEntrepreneurProducts);
router.get("/:id/reviews",getEntrepreneurReviews);
router.get("/:id",getEntrepreneurById);
router.post("/profile",authenticateUser,requireEntrepreneur,createProfile);
router.put("/profile",authenticateUser,requireEntrepreneur,updateProfile);
router.delete("/profile",authenticateUser,requireEntrepreneur,deleteProfile);
module.exports=router;
'''

files["routes/healthRoutes.js"] = r'''
const express=require("express");
const pool=require("../config/db");
const router=express.Router();

router.get("/",async(req,res)=>{
 try{
  const r=await pool.query("SELECT NOW() AS current_time");
  res.json({success:true,message:"HunarHub backend and database are working",database_time:r.rows[0].current_time});
 }catch(e){res.status(500).json({success:false,message:"Database connection failed"});}
});
module.exports=router;
'''

files["server.js"] = r'''
require("dotenv").config();
const app=require("./app");
const pool=require("./config/db");
const PORT=process.env.PORT||5000;

(async()=>{
 try{
  await pool.query("SELECT 1");
  console.log("PostgreSQL connected");
  app.listen(PORT,()=>console.log(`HunarHub server running on port ${PORT}`));
 }catch(e){
  console.error("Database connection failed:",e.message);
  process.exit(1);
 }
})();
'''

files["README.md"] = r'''
# HunarHub MVC Controller Pack

## Important
1. Apply `database/feasibility_patch.sql` before using the order controller.
2. Install `razorpay` for payment routes:
   `npm install razorpay`
3. Keep `.env` outside Git and provide:
   `JWT_SECRET`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`.
4. The project intentionally does not use `/api` at the beginning of endpoints.
5. Every controller database operation uses `withTransaction()`, including reads.
6. Order creation intentionally allows products from only one entrepreneur because the current order-level status model cannot safely represent multi-entrepreneur fulfillment.

## Flow
Route -> Auth/Role Middleware -> Controller -> PostgreSQL transaction

## Next work
Add request validation (Joi/Zod), centralized error middleware, upload storage, Razorpay webhook signature verification, pagination, and automated integration tests.
'''

# Write files
for rel, content in files.items():
    p=root/rel
    p.parent.mkdir(parents=True,exist_ok=True)
    p.write_text(textwrap.dedent(content).lstrip(), encoding="utf-8")

# Add a placeholder config/db.js if the existing project is copied/merged.
(root/"config").mkdir(exist_ok=True)
(root/"config/db.js").write_text(r'''
const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

pool.on("error",(err)=>console.error("Unexpected PostgreSQL error:",err));
module.exports=pool;
'''.lstrip(), encoding="utf-8")

# Create a route/controller inventory.
inventory = []
for rel in sorted(files):
    inventory.append(rel)
(root/"FILE_INVENTORY.txt").write_text("\n".join(inventory), encoding="utf-8")

try:
    zip_path=root/"hunarhub-backend-mvc-controller-pack.zip"
    with zipfile.ZipFile(zip_path,"w",zipfile.ZIP_DEFLATED) as z:
        for p in root.rglob("*"):
            if p.is_file() and p.name != zip_path.name:
                z.write(p,p.relative_to(root))
    print(f"Created {zip_path}")
except Exception as e:
    print(f"Skipped zip creation: {e}")

print(f"Files generated: {len(list(root.rglob('*')))}")
