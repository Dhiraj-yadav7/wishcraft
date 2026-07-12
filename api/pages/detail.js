const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
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
    const { id } = req.query;

    if (!id) {
        return error(res, 'Missing page identifier parameter.', 400);
    }

    try {
        // Fetch page details
        const page = await db.findPageById(id);
        if (!page) {
            return error(res, 'Surprise page not found.', 404);
        }

        // Enforce ownership check
        if (page.userId.toString() !== userId) {
            return error(res, 'Access denied. You do not own this card.', 403);
        }

        if (req.method === 'GET') {
            return success(res, page, 'Page details retrieved.', 200);
        } 
        
        else if (req.method === 'PUT' || req.method === 'POST') {
            const updates = req.body;
            
            // Enforce basic fields if they are updated
            if (updates.name === '' || updates.senderName === '' || updates.message === '') {
                return error(res, 'Core fields cannot be empty.', 400);
            }

            const updatedPage = await db.updatePage(id, updates);
            return success(res, updatedPage, 'Birthday surprise saved successfully! 💾', 200);
        } 
        
        else if (req.method === 'DELETE') {
            await db.deletePage(id);
            return success(res, null, 'Birthday surprise deleted successfully.', 200);
        } 
        
        else {
            return error(res, 'Method not allowed', 405);
        }

    } catch (err) {
        console.error('Page detail operation error:', err);
        return error(res, 'Internal server error.', 500);
    }
};
