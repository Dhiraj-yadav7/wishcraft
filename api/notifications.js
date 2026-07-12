const jwt = require('jsonwebtoken');
const db = require('./utils/db');
const { success, error } = require('./utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    // Authenticate user session
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return error(res, 'Unauthenticated. Token missing.', 401);
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET);
    } catch (e) {
        return error(res, 'Invalid session token.', 401);
    }

    const userId = decoded.userId;

    if (req.method === 'GET') {
        try {
            const notifications = await db.findNotificationsByUserId(userId);
            return success(res, notifications, 'Notifications loaded successfully.', 200);
        } catch (err) {
            console.error('Fetch notifications error:', err);
            return error(res, 'Failed to fetch notifications.', 500);
        }
    } 
    
    else if (req.method === 'POST' || req.method === 'PUT') {
        try {
            const { id } = req.body;
            if (!id) {
                return error(res, 'Missing notification identifier in body.', 400);
            }

            const updated = await db.markNotificationRead(id);
            return success(res, updated, 'Notification marked as read.', 200);
        } catch (err) {
            console.error('Update notification error:', err);
            return error(res, 'Failed to update notification.', 500);
        }
    } 
    
    else {
        return error(res, 'Method not allowed', 405);
    }
};
