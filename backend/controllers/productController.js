const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const epId=async(c,userId)=>{const r=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[userId]);if(!r.rowCount)throw httpError("Entrepreneur profile not found",404);return r.rows[0].id};

const getProducts = async (req, res) => {
  try {
    const vals = [];
    const w = ["p.is_available = true"];
    let n = 1;

    if (req.query.category_id) {
      w.push(`p.category_id = $${n++}`);
      vals.push(id(req.query.category_id, "category id"));
    }
    if (req.query.entrepreneur_id) {
      w.push(`p.entrepreneur_id = $${n++}`);
      vals.push(id(req.query.entrepreneur_id, "entrepreneur id"));
    }
    if (req.query.min_price) {
      w.push(`p.price >= $${n++}`);
      vals.push(Number(req.query.min_price));
    }
    if (req.query.max_price) {
      w.push(`p.price <= $${n++}`);
      vals.push(Number(req.query.max_price));
    }
    if (req.query.search) {
      w.push(`(p.name ILIKE $${n} OR p.description ILIKE $${n})`);
      vals.push(`%${req.query.search}%`);
      n++;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const data = await withTransaction(async (c) => {
      const countRes = await c.query(
        `SELECT COUNT(*)::int as total FROM products p WHERE ${w.join(" AND ")}`,
        vals
      );
      const total = countRes.rows[0]?.total || 0;

      const productsRes = await c.query(
        `SELECT p.*, ep.business_name, u.full_name,
         COALESCE(json_agg(json_build_object('id', pi.id, 'image_url', pi.image_url, 'is_primary', pi.is_primary))
         FILTER(WHERE pi.id IS NOT NULL), '[]') images
         FROM products p
         JOIN entrepreneur_profiles ep ON ep.id = p.entrepreneur_id
         JOIN users u ON u.id = ep.user_id
         LEFT JOIN product_images pi ON pi.product_id = p.id
         WHERE ${w.join(" AND ")}
         GROUP BY p.id, ep.business_name, u.full_name
         ORDER BY p.created_at DESC
         LIMIT $${n} OFFSET $${n + 1}`,
        [...vals, limit, offset]
      );

      return {
        products: productsRes.rows,
        pagination: {
          total,
          page,
          limit,
          total_pages: Math.ceil(total / limit)
        }
      };
    });

    res.json({ success: true, ...data });
  } catch (e) {
    sendError(res, e);
  }
};

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
