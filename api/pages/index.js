const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    // Authenticate user
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
            const { status, search } = req.query;
            let pages = await db.findPagesByUserId(userId);

            // Filter by status if specified
            if (status && status !== 'all') {
                pages = pages.filter(p => p.status === status);
            }

            // Filter by search query if specified (matches name, relationship, or sender name)
            if (search) {
                const term = search.toLowerCase();
                pages = pages.filter(p => 
                    (p.name && p.name.toLowerCase().includes(term)) ||
                    (p.relationship && p.relationship.toLowerCase().includes(term)) ||
                    (p.senderName && p.senderName.toLowerCase().includes(term))
                );
            }

            return success(res, pages, 'Pages retrieved successfully.', 200);
        } catch (err) {
            console.error('List pages error:', err);
            return error(res, 'Failed to retrieve pages.', 500);
        }
    } 
    
    else if (req.method === 'POST') {
        try {
            const { 
                name, date, relationship, senderName, message, 
                photos, videoUrl, voiceMessage, theme, background, 
                music, font, confettiStyle, fireworksStyle, cakeStyle, 
                greetingStyle, status 
            } = req.body;

            // Enforce basic fields validation
            if (!name || !date || !relationship || !senderName || !message) {
                return error(res, 'Please fill in all core requirements (name, date, relation, sender, and message).', 400);
            }

            const page = await db.createPage({
                userId,
                name,
                date,
                relationship,
                senderName,
                message,
                photos: photos || [],
                videoUrl: videoUrl || '',
                voiceMessage: voiceMessage || '',
                theme: theme || 'romantic',
                background: background || '',
                music: music || '',
                font: font || '',
                confettiStyle: confettiStyle || '',
                fireworksStyle: fireworksStyle || '',
                cakeStyle: cakeStyle || '',
                greetingStyle: greetingStyle || '',
                status: status || 'draft'
            });

            return success(res, page, 'Birthday card created successfully! 🎉', 201);
        } catch (err) {
            console.error('Create page error:', err);
            return error(res, 'Failed to create page.', 500);
        }
    } 
    
    else {
        return error(res, 'Method not allowed', 405);
    }
};
