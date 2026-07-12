const db = require('../utils/db');
const { success, error } = require('../utils/response');

module.exports = async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { pageId, author, text, avatarIndex } = req.body;

            if (!pageId || !author || !text) {
                return error(res, 'Missing comment fields.', 400);
            }

            const page = await db.findPageById(pageId);
            if (!page) {
                return error(res, 'Birthday page not found.', 404);
            }

            // Create comment
            const comment = await db.createComment({
                pageId,
                author,
                text,
                avatarIndex: avatarIndex || 0
            });

            // Create a notification for the card creator
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Comment Left 💬',
                message: `${author} commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, comment, 'Comment added successfully.', 201);

        } catch (err) {
            console.error('Create comment error:', err);
            return error(res, 'Internal server error.', 500);
        }
    } 
    
    else {
        return error(res, 'Method not allowed', 405);
    }
};
