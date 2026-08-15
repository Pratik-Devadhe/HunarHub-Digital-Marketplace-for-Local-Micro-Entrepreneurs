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
