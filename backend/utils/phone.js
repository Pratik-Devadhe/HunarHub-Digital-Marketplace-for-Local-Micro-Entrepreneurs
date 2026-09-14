const { httpError } = require("./http");

const normalizePhone = (phone, required = false) => {
    if (phone === undefined || phone === null || !String(phone).trim()) {
        if (required) throw httpError("Phone number is required", 400);
        return null;
    }
    let digits = String(phone).replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("0")) {
        digits = digits.slice(1);
    } else if (digits.length === 12 && digits.startsWith("91")) {
        digits = digits.slice(2);
    } else if (digits.length === 13 && (digits.startsWith("091") || digits.startsWith("910"))) {
        digits = digits.slice(3);
    }
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
        return digits;
    }
    throw httpError("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210)", 400);
};

module.exports = { normalizePhone };
