const {withTransaction}=require("../utils/transaction");
const {httpError,sendError,id}=require("../utils/http");

const getEid=async(c,userId)=>{const r=await c.query("SELECT id FROM entrepreneur_profiles WHERE user_id=$1",[userId]);if(!r.rowCount)throw httpError("Entrepreneur profile not found",404);return r.rows[0].id};

const getAvailabilityByEntrepreneurId = async (req, res) => {
  try {
    const epId = id(req.params.id, "entrepreneur id");
    const rows = await withTransaction(async (c) =>
      (await c.query(
        "SELECT * FROM entrepreneur_availability WHERE entrepreneur_id = $1 ORDER BY day_of_week, start_time",
        [epId]
      )).rows
    );
    res.json({ success: true, availability: rows });
  } catch (e) {
    sendError(res, e);
  }
};

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

module.exports={getAvailabilityByEntrepreneurId,getAvailability,addAvailability,updateAvailability,deleteAvailability};
