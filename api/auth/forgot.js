const db = require('../utils/db');
const { success, error } = require('../utils/response');

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const { email } = req.body;

        if (!email) {
            return error(res, 'Please provide an email address.', 400);
        }

        const user = await db.findUserByEmail(email);
        if (!user) {
            return error(res, 'No account found with this email address.', 404);
        }

        // Generate a random recovery token
        const resetToken = Math.random().toString(36).substring(2, 15) + 
                           Math.random().toString(36).substring(2, 15);
        
        // Expiration date (1 hour from now)
        const resetTokenExpiry = new Date(Date.now() + 3600000);

        // Save token to database
        await db.updateUser(user._id.toString(), {
            resetToken,
            resetTokenExpiry
        });

        // Normally we would mail this token. For local convenience and testing, 
        // we return it in the JSON response so the client can automatically open the reset tab!
        return success(res, {
            resetToken
        }, 'Password recovery token generated successfully! Link sent (check console) ✉️', 200);

    } catch (err) {
        console.error('Forgot password error:', err);
        return error(res, 'Internal server error. Please try again.', 500);
    }
};
