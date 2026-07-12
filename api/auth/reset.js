const bcrypt = require('bcryptjs');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return error(res, 'Reset token and password are required.', 400);
        }

        if (password.length < 6) {
            return error(res, 'Password must be at least 6 characters long.', 400);
        }

        // Find user by valid reset token
        const user = await db.findUserByResetToken(token);
        if (!user) {
            return error(res, 'Invalid or expired recovery token. Please try again.', 400);
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Update database (remove token values)
        await db.updateUser(user._id.toString(), {
            password: hashedPassword,
            resetToken: null,
            resetTokenExpiry: null
        });

        return success(res, null, 'Password reset successfully! You can now log in 🔐', 200);

    } catch (err) {
        console.error('Reset password error:', err);
        return error(res, 'Internal server error. Please try again.', 500);
    }
};
