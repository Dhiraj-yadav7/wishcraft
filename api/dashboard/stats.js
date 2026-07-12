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

        // Fetch all pages created by the user
        const pages = await db.findPagesByUserId(userId);
        
        let activePages = 0;
        let draftPages = 0;
        let scheduledPages = 0;
        let privatePages = 0;
        let totalViews = 0;
        let totalWishes = 0;

        for (const page of pages) {
            // Count states
            if (page.status === 'public') activePages++;
            else if (page.status === 'draft') draftPages++;
            else if (page.status === 'scheduled') scheduledPages++;
            else if (page.status === 'private') privatePages++;

            // Sum views from analytics
            const analytics = await db.findAnalyticsByPageId(page._id.toString());
            if (analytics) {
                totalViews += (analytics.views || 0);
            }

            // Sum guestbook wishes
            const wishes = await db.findGuestbookByPageId(page._id.toString());
            totalWishes += (wishes ? wishes.length : 0);
        }

        return success(res, {
            totalPages: pages.length,
            activePages,
            draftPages,
            scheduledPages,
            privatePages,
            totalViews,
            totalWishes
        }, 'Dashboard stats computed successfully.', 200);

    } catch (err) {
        console.error('Stats endpoint error:', err);
        return error(res, 'Internal server error.', 500);
    }
};
