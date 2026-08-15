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
