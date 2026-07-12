const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return error(res, 'Authorization token missing or invalid.', 401);
        }

        const token = authHeader.split(' ')[1];
        let decoded;

        try {
            decoded = jwt.verify(token, JWT_SECRET);
        } catch (e) {
            return error(res, 'Session expired or invalid token. Please log in again.', 401);
        }

        const user = await db.findUserById(decoded.userId);
        if (!user) {
            return error(res, 'User account not found.', 404);
        }

        return success(res, {
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                createdAt: user.createdAt
            }
        }, 'Session verified successfully.', 200);

    } catch (err) {
        console.error('Verify user session error:', err);
        return error(res, 'Internal server error.', 500);
    }
};
