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
