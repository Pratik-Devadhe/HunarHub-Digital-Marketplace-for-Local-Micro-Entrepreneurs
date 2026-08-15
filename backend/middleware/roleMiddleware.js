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
