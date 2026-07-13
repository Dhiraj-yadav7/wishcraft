const jwt = require('jsonwebtoken');
const db = require('./utils/db');
const { success, error } = require('./utils/response');
const { checkRateLimit } = require('./utils/rateLimiter');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

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
        // PUBLIC RETRIEVAL ACTION WITH SECURITY & CAPSULE GATES
        // ====================================================
        if (action === 'public') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const { id, password, ref } = req.query;
            if (!id) return error(res, 'Missing card page identifier.', 400);

            const page = await db.findPageById(id);
            if (!page) return error(res, 'Surprise birthday card not found.', 404);

            // 1. Gating check: link expiration
            if (page.expiresAt && new Date(page.expiresAt) < new Date()) {
                return error(res, 'This surprise link has expired! ⌛', 410);
            }

            // 2. Gating check: Digital Time Capsule Time Lock (Secure redact)
            if (page.capsuleLocked && page.unlockDate && new Date(page.unlockDate) > new Date()) {
                // Check if visitors is the owner (allow previewing even if locked)
                const authHeader = req.headers.authorization;
                let isOwner = false;
                if (authHeader && authHeader.startsWith('Bearer ')) {
                    try {
                        const token = authHeader.split(' ')[1];
                        const decoded = jwt.verify(token, JWT_SECRET);
                        if (decoded.userId === page.userId.toString()) {
                            isOwner = true;
                        }
                    } catch (e) {}
                }

                if (!isOwner) {
                    // RETURN SECURELY REDACTED METADATA ONLY
                    return success(res, {
                        isCapsuleLocked: true,
                        unlockDate: page.unlockDate,
                        page: {
                            id: page._id,
                            name: page.name,
                            relationship: page.relationship,
                            theme: page.theme || 'romantic',
                            themePreset: page.themePreset || 'romantic',
                            background: page.background || '',
                            font: page.font || '',
                            music: page.music || '',
                            status: page.status,
                            createdAt: page.createdAt
                        }
                    }, 'This birthday capsule is locked until the set unlock time.', 200);
                }
            }

            // 3. Gating check: password gate
            if (page.password && page.password.trim() !== '') {
                if (!password || password.trim() !== page.password.trim()) {
                    return success(res, {
                        isGated: true,
                        page: {
                            id: page._id,
                            name: page.name,
                            relationship: page.relationship,
                            theme: page.theme || 'romantic',
                            themePreset: page.themePreset || 'romantic',
                            background: page.background || '',
                            font: page.font || ''
                        }
                    }, 'Password protection gate triggered.', 200);
                }
            }

            // 4. Visibility check: draft/private
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

            // 5. Track referral sources
            if (ref) {
                await db.logReferral(id, ref);
            } else {
                await db.logReferral(id, 'direct');
            }

            // 6. Log views analytics
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
            await db.incrementViews(id, ip);

            const comments = await db.findCommentsByPageId(id);
            const guestbook = await db.findGuestbookByPageId(id);
            const analytics = await db.findAnalyticsByPageId(id);
            const creator = await db.findUserById(page.userId.toString());
            const creatorData = creator ? {
                name: creator.name,
                profilePhoto: creator.profilePhoto || ''
            } : null;

            return success(res, {
                creator: creatorData,
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
                    
                    // premium specs
                    timeline: page.timeline || [],
                    aiWishes: page.aiWishes || [],
                    expiresAt: page.expiresAt,
                    hasPassword: !!page.password,

                    // saas capsule parameters
                    capsuleLocked: page.capsuleLocked,
                    unlockDate: page.unlockDate,
                    customDomain: page.customDomain,
                    themePreset: page.themePreset || 'romantic',
                    favoriteTemplate: page.favoriteTemplate,

                    status: page.status,
                    createdAt: page.createdAt
                },
                comments: comments || [],
                guestbook: guestbook || [],
                viewsCount: analytics ? analytics.views : 1
            }, 'Surprise card details loaded.', 200);
        }

        // ====================================================
        // ANALYTICS TRACKERS
        // ====================================================
        else if (action === 'logShare') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { id } = req.body;
            if (!id) return error(res, 'Missing page ID.', 400);

            await db.incrementShares(id);
            return success(res, null, 'Share transaction recorded.', 200);
        }

        else if (action === 'logQrScan') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { id } = req.body;
            if (!id) return error(res, 'Missing page ID.', 400);

            await db.incrementQrScans(id);
            return success(res, null, 'QR Scan transaction recorded.', 200);
        }

        else if (action === 'logDuration') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { id, duration } = req.body;
            if (!id || duration === undefined) return error(res, 'Missing inputs.', 400);

            await db.logVisitDuration(id, Number(duration));
            return success(res, null, 'Visit duration recorded.', 200);
        }

        // ====================================================
        // COMMENT POST ACTION
        // ====================================================
        else if (action === 'comment') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { pageId, author, text, avatarIndex } = req.body;
            if (!pageId || !author || !text) return error(res, 'Missing comment fields.', 400);

            const page = await db.findPageById(pageId);
            if (!page) return error(res, 'Birthday page not found.', 404);

            const comment = await db.createComment({ pageId, author, text, avatarIndex });
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Comment Left 💬',
                message: `${author} commented: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, comment, 'Comment added successfully.', 201);
        }

        // ====================================================
        // GUESTBOOK POST ACTION
        // ====================================================
        else if (action === 'guestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
            if (!checkRateLimit(ip, 8)) {
                return error(res, 'Too many comments posted. Please try again in a minute.', 429);
            }
            const { pageId, author, text, avatarIndex, visitorKey } = req.body;
            if (!pageId || !author || !text) return error(res, 'Missing wish book inputs.', 400);

            const page = await db.findPageById(pageId);
            if (!page) return error(res, 'Birthday page not found.', 404);

            const entry = await db.createGuestbookEntry({ pageId, author, text, avatarIndex, visitorKey });
            await db.createNotification({
                userId: page.userId.toString(),
                title: 'New Guestbook Wish ✍️',
                message: `${author} signed the Guestbook: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}" on your card for ${page.name}.`
            });

            return success(res, entry, 'Guestbook wish signed successfully.', 201);
        }

        else if (action === 'likeGuestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { entryId } = req.body;
            if (!entryId) return error(res, 'Missing parameters.', 400);

            const entry = await db.likeGuestbookEntry(entryId);
            if (!entry) return error(res, 'Guestbook entry not found.', 404);

            return success(res, entry, 'Guestbook entry liked.', 200);
        }

        else if (action === 'reactGuestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { entryId, reaction } = req.body;
            if (!entryId || !reaction) return error(res, 'Missing parameters.', 400);

            const entry = await db.reactGuestbookEntry(entryId, reaction);
            if (!entry) return error(res, 'Guestbook entry not found.', 404);

            return success(res, entry, 'Guestbook entry reaction saved.', 200);
        }

        else if (action === 'reportGuestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { entryId } = req.body;
            if (!entryId) return error(res, 'Missing parameters.', 400);

            const entry = await db.reportGuestbookEntry(entryId);
            if (!entry) return error(res, 'Guestbook entry not found.', 404);

            return success(res, entry, 'Guestbook entry reported for spam.', 200);
        }

        else if (action === 'deleteGuestbook') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { entryId, pageId, visitorKey } = req.body;
            if (!entryId || !pageId) return error(res, 'Missing parameters.', 400);

            let isAuthorized = false;
            try {
                const decoded = authenticate(req);
                const page = await db.findPageById(pageId);
                if (page && page.userId.toString() === decoded.userId) {
                    isAuthorized = true;
                }
            } catch (e) {
                // Not authenticated as owner
            }

            if (!isAuthorized && visitorKey) {
                const entry = await db.findGuestbookEntryById(entryId);
                if (entry && entry.visitorKey === visitorKey) {
                    isAuthorized = true;
                }
            }

            if (!isAuthorized) {
                return error(res, 'Unauthorized to delete this guestbook entry.', 403);
            }

            await db.deleteGuestbookEntry(entryId);
            return success(res, null, 'Guestbook entry deleted successfully.', 200);
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

                    const enrichedPages = [];
                    for (const page of pages) {
                        const pageObj = page.toObject ? page.toObject() : JSON.parse(JSON.stringify(page));
                        const pageIdStr = pageObj._id ? pageObj._id.toString() : pageObj.id;
                        
                        const analytics = await db.findAnalyticsByPageId(pageIdStr);
                        pageObj.views = analytics ? (analytics.views || 0) : 0;
                        pageObj.sharesCount = analytics ? (analytics.sharesCount || 0) : 0;
                        pageObj.qrScans = analytics ? (analytics.qrScans || 0) : 0;
                        
                        const wishes = await db.findGuestbookByPageId(pageIdStr);
                        pageObj.wishesCount = wishes ? wishes.length : 0;
                        
                        enrichedPages.push(pageObj);
                    }

                    return success(res, enrichedPages, 'Pages retrieved successfully.', 200);
                } 
                
                else if (req.method === 'POST') {
                    const { 
                        name, date, relationship, senderName, message, 
                        photos, videoUrl, voiceMessage, theme, background, 
                        music, font, confettiStyle, fireworksStyle, cakeStyle, 
                        greetingStyle, status,
                        
                        password, expiresAt, timeline, aiWishes,
                        
                        // saas parameters
                        capsuleLocked, unlockDate, customDomain, themePreset, favoriteTemplate
                    } = req.body;

                    if (!name || !date || !relationship || !senderName || !message) {
                        return error(res, 'Please fill in all core requirements.', 400);
                    }

                    const page = await db.createPage({
                        userId, name, date, relationship, senderName, message,
                        photos: photos || [], videoUrl: videoUrl || '', voiceMessage: voiceMessage || '',
                        theme: theme || 'romantic', background: background || '', music: music || '',
                        font: font || '', confettiStyle: confettiStyle || '', fireworksStyle: fireworksStyle || '',
                        cakeStyle: cakeStyle || '', greetingStyle: greetingStyle || '', status: status || 'draft',
                        
                        password: password || '',
                        expiresAt: expiresAt || null,
                        timeline: timeline || [],
                        aiWishes: aiWishes || [],

                        capsuleLocked: capsuleLocked || false,
                        unlockDate: unlockDate || null,
                        customDomain: customDomain || '',
                        themePreset: themePreset || 'romantic',
                        favoriteTemplate: favoriteTemplate || false
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
                    const analytics = await db.findAnalyticsByPageId(id);
                    return success(res, {
                        page,
                        analytics: analytics || { views: 0, sharesCount: 0, visitDurations: [], referrals: [] }
                    }, 'Page details retrieved.', 200);
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
                    
                    password: page.password || '',
                    expiresAt: page.expiresAt || null,
                    timeline: page.timeline || [],
                    aiWishes: page.aiWishes || [],

                    capsuleLocked: page.capsuleLocked || false,
                    unlockDate: page.unlockDate || null,
                    customDomain: page.customDomain || '',
                    themePreset: page.themePreset || 'romantic',
                    favoriteTemplate: page.favoriteTemplate || false,

                    status: 'draft'
                });
                return success(res, duplicatedPage, 'Surprise card duplicated.', 201);
            }

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
