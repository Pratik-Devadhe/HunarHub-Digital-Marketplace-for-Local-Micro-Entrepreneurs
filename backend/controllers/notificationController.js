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
