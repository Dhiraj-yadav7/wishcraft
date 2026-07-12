const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

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
    const { id } = req.body;

    if (!id) {
        return error(res, 'Missing page identifier parameter in body.', 400);
    }

    try {
        const page = await db.findPageById(id);
        if (!page) {
            return error(res, 'Source birthday page not found.', 404);
        }

        // Ownership verify
        if (page.userId.toString() !== userId) {
            return error(res, 'Access denied.', 403);
        }

        // Clone details
        const duplicatedPage = await db.createPage({
            userId,
            name: `Copy of ${page.name}`,
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
            status: 'draft' // Duplicate resets to Draft state
        });

        return success(res, duplicatedPage, 'Surprise card layout duplicated successfully! 📋', 201);

    } catch (err) {
        console.error('Page duplication error:', err);
        return error(res, 'Internal server error.', 500);
    }
};
