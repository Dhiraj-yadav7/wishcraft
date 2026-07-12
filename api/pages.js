const jwt = require('jsonwebtoken');
const db = require('./utils/db');
const { success, error } = require('./utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

// Helper to authenticate session token in protected routes
function authenticate(req) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new Error('Unauthenticated. Token missing.');
    }
    const token = authHeader.split(' ')[1];
    return jwt.verify(token, JWT_SECRET);
}

module.exports = async function handler(req, res) {
    const { action } = req.query;

    try {
        // ====================================================
        // PUBLIC RETRIEVAL ACTION (Open to everyone)
        // ====================================================
        if (action === 'public') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const { id } = req.query;
            if (!id) return error(res, 'Missing card page identifier.', 400);

            const page = await db.findPageById(id);
            if (!page) return error(res, 'Surprise birthday card not found.', 404);

            // Access control for draft/private pages
            if (page.status === 'private' || page.status === 'draft') {
                const authHeader = req.headers.authorization;
                let authenticated = false;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        const token = authHeader.split(' ')[1];
                        const decoded = jwt.verify(token, JWT_SECRET);
                        if (decoded.userId === page.userId.toString()) {
                            authenticated = true;
                        }
                    } catch (e) {}
                }
                if (!authenticated) {
                    return error(res, 'This surprise card is private or in draft mode. Access denied.', 403);
                }
            }

            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            await db.incrementViews(id, ip);

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
        }

        // ====================================================
        // COMMENT POST ACTION (Open to everyone)
        // ====================================================
        else if (action === 'comment') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { pageId, author, text, avatarIndex } = req.body;
            if (!pageId || !author || !text) return error(res, 'Missing comment fields.', 400);

            const page = await db.findPageById(pageId);
            if (!page) return error(res, 'Birthday page not found.', 404);

            const comment = await db.createComment({ pageId, author, text, avatarIndex });
            
            // Notify creator
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Comment Left 💬',
                message: `${author} commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, comment, 'Comment added successfully.', 201);
        }

        // ====================================================
        // GUESTBOOK POST ACTION (Open to everyone)
        // ====================================================
        else if (action === 'guestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { pageId, author, text, avatarIndex } = req.body;
            if (!pageId || !author || !text) return error(res, 'Missing wish book inputs.', 400);

            const page = await db.findPageById(pageId);
            if (!page) return error(res, 'Birthday page not found.', 404);

            const entry = await db.createGuestbookEntry({ pageId, author, text, avatarIndex });
            
            // Notify creator
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Guestbook Wish ✍️',
                message: `${author} signed the Guestbook: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, entry, 'Guestbook wish signed successfully.', 201);
        }

        // ====================================================
        // PROTECTED ACTIONS (Requires authentication)
        // ====================================================
        else {
            const decoded = authenticate(req);
            const userId = decoded.userId;

            // List or Create Page
            if (!action || action === 'list') {
                if (req.method === 'GET') {
                    const { status, search } = req.query;
                    let pages = await db.findPagesByUserId(userId);

                    if (status && status !== 'all') {
                        pages = pages.filter(p => p.status === status);
                    }
                    if (search) {
                        const term = search.toLowerCase();
                        pages = pages.filter(p => 
                            (p.name && p.name.toLowerCase().includes(term)) ||
                            (p.relationship && p.relationship.toLowerCase().includes(term)) ||
                            (p.senderName && p.senderName.toLowerCase().includes(term))
                        );
                    }
                    return success(res, pages, 'Pages retrieved successfully.', 200);
                } 
                
                else if (req.method === 'POST') {
                    const { 
                        name, date, relationship, senderName, message, 
                        photos, videoUrl, voiceMessage, theme, background, 
                        music, font, confettiStyle, fireworksStyle, cakeStyle, 
                        greetingStyle, status 
                    } = req.body;

                    if (!name || !date || !relationship || !senderName || !message) {
                        return error(res, 'Please fill in all core requirements.', 400);
                    }

                    const page = await db.createPage({
                        userId, name, date, relationship, senderName, message,
                        photos: photos || [], videoUrl: videoUrl || '', voiceMessage: voiceMessage || '',
                        theme: theme || 'romantic', background: background || '', music: music || '',
                        font: font || '', confettiStyle: confettiStyle || '', fireworksStyle: fireworksStyle || '',
                        cakeStyle: cakeStyle || '', greetingStyle: greetingStyle || '', status: status || 'draft'
                    });
                    return success(res, page, 'Birthday card created successfully! 🎉', 201);
                } else {
                    return error(res, 'Method not allowed', 405);
                }
            }

            // Edit / Details / Delete Page
            else if (action === 'detail') {
                const { id } = req.query;
                if (!id) return error(res, 'Missing page identifier parameter.', 400);

                const page = await db.findPageById(id);
                if (!page) return error(res, 'Surprise page not found.', 404);
                if (page.userId.toString() !== userId) return error(res, 'Access denied.', 403);

                if (req.method === 'GET') {
                    return success(res, page, 'Page details retrieved.', 200);
                } 
                
                else if (req.method === 'PUT' || req.method === 'POST') {
                    const updates = req.body;
                    if (updates.name === '' || updates.senderName === '' || updates.message === '') {
                        return error(res, 'Core fields cannot be empty.', 400);
                    }
                    const updatedPage = await db.updatePage(id, updates);
                    return success(res, updatedPage, 'Birthday surprise saved successfully! 💾', 200);
                } 
                
                else if (req.method === 'DELETE') {
                    await db.deletePage(id);
                    return success(res, null, 'Birthday surprise deleted successfully.', 200);
                } else {
                    return error(res, 'Method not allowed', 405);
                }
            }

            // Duplicate layout Clones
            else if (action === 'duplicate') {
                if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
                const { id } = req.body;
                if (!id) return error(res, 'Missing page identifier parameter.', 400);

                const page = await db.findPageById(id);
                if (!page) return error(res, 'Source birthday page not found.', 404);
                if (page.userId.toString() !== userId) return error(res, 'Access denied.', 403);

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
                    status: 'draft'
                });
                return success(res, duplicatedPage, 'Surprise card layout duplicated successfully! 📋', 201);
            }

            // Invalid action
            else {
                return error(res, 'Action not found', 404);
            }
        }

    } catch (err) {
        console.error(`Pages API error on action ${action}:`, err.message);
        if (err.message.includes('Unauthenticated') || err.message.includes('token')) {
            return error(res, err.message, 401);
        }
        return error(res, 'Internal server error.', 500);
    }
};
