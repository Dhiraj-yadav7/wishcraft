function success(res, data = null, message = "Success", status = 200) {
    return res.status(status).json({
        success: true,
        message,
        data
    });
}

function error(res, message = "An error occurred", status = 400) {
    return res.status(status).json({
        success: false,
        message
    });
}

module.exports = { success, error };
