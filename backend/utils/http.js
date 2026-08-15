function httpError(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function sendError(res, error) {
    console.error(error);
    return res.status(error.status || 500).json({
        success: false,
        message: error.status ? error.message : "Internal server error"
    });
}

function id(value, name = "id") {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0) throw httpError(`Invalid ${name}`, 400);
    return n;
}

module.exports = { httpError, sendError, id };
