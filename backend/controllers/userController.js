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
