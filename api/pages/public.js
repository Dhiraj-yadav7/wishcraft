const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return error(res, 'Method not allowed', 405);
    }

    const { id } = req.query;
    if (!id) {
        return error(res, 'Missing card page identifier.', 400);
    }

    try {
        const page = await db.findPageById(id);
        if (!page) {
            return error(res, 'Surprise birthday card not found.', 404);
        }

        // Check if page visibility is restricted
        if (page.status === 'private' || page.status === 'draft') {
            // Check authentication to see if visitor is the owner
            const authHeader = req.headers.authorization;
            let authenticated = false;
            
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    if (decoded.userId === page.userId.toString()) {
                        authenticated = true;
                    }
                } catch (e) {
                    // Ignore decoding error
                }
            }

            if (!authenticated) {
                return error(res, 'This surprise card is private or in draft mode. Access denied.', 403);
            }
        }

        // Gather visitor IP address
        const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
        
        // Log view analytics
        await db.incrementViews(id, ip);

        // Fetch related guest details
        const comments = await db.findCommentsByPageId(id);
        const guestbook = await db.findGuestbookByPageId(id);
        const analytics = await db.findAnalyticsByPageId(id);

        return success(res, {
            page: {
                id: page._id,
                name: page.name,
                date: page.date,
                relationship: page.relationship,
                senderName: page.senderName,
                message: page.message,
                photos: page.photos || [],
                videoUrl: page.videoUrl || '',
                voiceMessage: page.voiceMessage || '',
                theme: page.theme || 'romantic',
                background: page.background || '',
                music: page.music || '',
                font: page.font || '',
                confettiStyle: page.confettiStyle || '',
                fireworksStyle: page.fireworksStyle || '',
                cakeStyle: page.cakeStyle || '',
                greetingStyle: page.greetingStyle || '',
                status: page.status,
                createdAt: page.createdAt
            },
            comments: comments || [],
            guestbook: guestbook || [],
            viewsCount: analytics ? analytics.views : 1
        }, 'Surprise card details loaded.', 200);

    } catch (err) {
        console.error('Fetch public page details error:', err);
        return error(res, 'Failed to load surprise details.', 500);
    }
};
