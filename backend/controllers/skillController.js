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
