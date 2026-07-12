const db = require('../utils/db');
const { success, error } = require('../utils/response');

module.exports = async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const { pageId, author, text, avatarIndex } = req.body;

            if (!pageId || !author || !text) {
                return error(res, 'Missing wish book inputs.', 400);
            }

            const page = await db.findPageById(pageId);
            if (!page) {
                return error(res, 'Birthday page not found.', 404);
            }

            // Create guestbook signature entry
            const entry = await db.createGuestbookEntry({
                pageId,
                author,
                text,
                avatarIndex: avatarIndex || 0
            });

            // Notify card owner
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Guestbook Wish ✍️',
                message: `${author} signed the Guestbook: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, entry, 'Guestbook wish signed successfully.', 201);

        } catch (err) {
            console.error('Sign guestbook error:', err);
            return error(res, 'Internal server error.', 500);
        }
    } 
    
    else {
        return error(res, 'Method not allowed', 405);
    }
};
