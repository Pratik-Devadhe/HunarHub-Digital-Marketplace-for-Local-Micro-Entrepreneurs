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
