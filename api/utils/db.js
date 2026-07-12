const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_FILE = path.join(process.cwd(), 'db.json');

// ========================================================
// MONGOOSE SCHEMAS
// ========================================================
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    socialProvider: { type: String },
    socialId: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

const BirthdayPageSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    date: { type: Date, required: true },
    relationship: { type: String, required: true },
    senderName: { type: String, required: true },
    message: { type: String, required: true },
    photos: { type: [String], default: [] }, // Array of base64 data URLs
    videoUrl: { type: String, default: '' },
    voiceMessage: { type: String, default: '' }, // Base64 audio URL
    theme: { type: String, default: 'romantic' },
    background: { type: String, default: '' },
    music: { type: String, default: '' },
    font: { type: String, default: '' },
    confettiStyle: { type: String, default: '' },
    fireworksStyle: { type: String, default: '' },
    cakeStyle: { type: String, default: '' },
    greetingStyle: { type: String, default: '' },
    status: { type: String, enum: ['draft', 'public', 'private', 'scheduled'], default: 'draft' },
    
    // Premium Configuration additions
    password: { type: String, default: '' },
    expiresAt: { type: Date, default: null },
    timeline: { type: [Object], default: [] }, // Array of { date, title, text, photo }
    aiWishes: { type: [Object], default: [] }, // Array of { category, text, favorite }

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const AnalyticsSchema = new mongoose.Schema({
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'BirthdayPage', required: true },
    views: { type: Number, default: 0 },
    clicks: { type: Number, default: 0 },
    visitorIps: { type: [String], default: [] },
    lastViewedAt: { type: Date, default: Date.now },
    
    // Detailed Analytics additions
    sharesCount: { type: Number, default: 0 },
    visitDurations: { type: [Number], default: [] }, // session lengths in seconds
    referrals: { type: [Object], default: [] } // Array of { source: 'whatsapp', count: 1 }
});

const CommentSchema = new mongoose.Schema({
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'BirthdayPage', required: true },
    author: { type: String, required: true },
    text: { type: String, required: true },
    avatarIndex: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const GuestbookSchema = new mongoose.Schema({
    pageId: { type: mongoose.Schema.Types.ObjectId, ref: 'BirthdayPage', required: true },
    author: { type: String, required: true },
    text: { type: String, required: true },
    avatarIndex: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const NotificationSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

let UserModel, BirthdayPageModel, AnalyticsModel, CommentModel, GuestbookModel, NotificationModel;

if (MONGODB_URI) {
    UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    BirthdayPageModel = mongoose.models.BirthdayPage || mongoose.model('BirthdayPage', BirthdayPageSchema);
    AnalyticsModel = mongoose.models.Analytics || mongoose.model('Analytics', AnalyticsSchema);
    CommentModel = mongoose.models.Comment || mongoose.model('Comment', CommentSchema);
    GuestbookModel = mongoose.models.Guestbook || mongoose.model('Guestbook', GuestbookSchema);
    NotificationModel = mongoose.models.Notification || mongoose.model('Notification', NotificationSchema);
}

// Connect helper
async function connectMongo() {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI);
}

// ========================================================
// LOCAL JSON DATABASE MOCK
// ========================================================
function readLocalDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({ 
                users: [], 
                pages: [],
                analytics: [],
                comments: [],
                guestbook: [],
                notifications: []
            }, null, 2));
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (!parsed.pages) parsed.pages = [];
        if (!parsed.analytics) parsed.analytics = [];
        if (!parsed.comments) parsed.comments = [];
        if (!parsed.guestbook) parsed.guestbook = [];
        if (!parsed.notifications) parsed.notifications = [];
        return parsed;
    } catch (e) {
        console.error("Local database read error:", e);
        return { users: [], pages: [], analytics: [], comments: [], guestbook: [], notifications: [] };
    }
}

function writeLocalDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Local database write error:", e);
    }
}

const mapDoc = (obj) => {
    if (!obj) return null;
    return { ...obj, _id: obj.id };
};

// ========================================================
// UNIFIED DB ADAPTER METHODS
// ========================================================
const dbAdapter = {
    // USERS COLLECTION
    findUserByEmail: async (email) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findOne({ email: email.toLowerCase() });
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            return mapDoc(user);
        }
    },
    findUserById: async (id) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findById(id);
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.id === id);
            return mapDoc(user);
        }
    },
    findUserByResetToken: async (token) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findOne({ resetToken: token, resetTokenExpiry: { $gt: new Date() } });
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.resetToken === token && new Date(u.resetTokenExpiry) > new Date());
            return mapDoc(user);
        }
    },
    createUser: async (userData) => {
        if (MONGODB_URI) {
            await connectMongo();
            const user = new UserModel(userData);
            return await user.save();
        } else {
            const db = readLocalDb();
            const newUser = {
                id: Math.random().toString(36).substring(2, 11),
                name: userData.name,
                email: userData.email.toLowerCase(),
                password: userData.password || null,
                socialProvider: userData.socialProvider || null,
                socialId: userData.socialId || null,
                createdAt: new Date().toISOString()
            };
            db.users.push(newUser);
            writeLocalDb(db);
            return mapDoc(newUser);
        }
    },
    updateUser: async (id, updates) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findByIdAndUpdate(id, updates, { new: true });
        } else {
            const db = readLocalDb();
            const idx = db.users.findIndex(u => u.id === id);
            if (idx === -1) return null;
            if (updates.resetTokenExpiry instanceof Date) {
                updates.resetTokenExpiry = updates.resetTokenExpiry.toISOString();
            }
            db.users[idx] = { ...db.users[idx], ...updates };
            writeLocalDb(db);
            return mapDoc(db.users[idx]);
        }
    },

    // BIRTHDAY PAGES COLLECTION
    findPagesByUserId: async (userId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await BirthdayPageModel.find({ userId }).sort({ createdAt: -1 });
        } else {
            const db = readLocalDb();
            const userPages = db.pages.filter(p => p.userId === userId);
            userPages.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            return userPages.map(mapDoc);
        }
    },
    findPageById: async (id) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await BirthdayPageModel.findById(id);
        } else {
            const db = readLocalDb();
            const page = db.pages.find(p => p.id === id);
            return mapDoc(page);
        }
    },
    createPage: async (pageData) => {
        if (MONGODB_URI) {
            await connectMongo();
            const page = new BirthdayPageModel(pageData);
            return await page.save();
        } else {
            const db = readLocalDb();
            const newPage = {
                id: Math.random().toString(36).substring(2, 11),
                userId: pageData.userId,
                name: pageData.name,
                date: new Date(pageData.date).toISOString(),
                relationship: pageData.relationship,
                senderName: pageData.senderName,
                message: pageData.message,
                photos: pageData.photos || [],
                videoUrl: pageData.videoUrl || '',
                voiceMessage: pageData.voiceMessage || '',
                theme: pageData.theme || 'romantic',
                background: pageData.background || '',
                music: pageData.music || '',
                font: pageData.font || '',
                confettiStyle: pageData.confettiStyle || '',
                fireworksStyle: pageData.fireworksStyle || '',
                cakeStyle: pageData.cakeStyle || '',
                greetingStyle: pageData.greetingStyle || '',
                status: pageData.status || 'draft',
                
                // premium variables mappings
                password: pageData.password || '',
                expiresAt: pageData.expiresAt ? new Date(pageData.expiresAt).toISOString() : null,
                timeline: pageData.timeline || [],
                aiWishes: pageData.aiWishes || [],

                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            db.pages.push(newPage);
            writeLocalDb(db);
            return mapDoc(newPage);
        }
    },
    updatePage: async (id, updates) => {
        if (MONGODB_URI) {
            await connectMongo();
            updates.updatedAt = new Date();
            return await BirthdayPageModel.findByIdAndUpdate(id, updates, { new: true });
        } else {
            const db = readLocalDb();
            const idx = db.pages.findIndex(p => p.id === id);
            if (idx === -1) return null;
            if (updates.date && updates.date instanceof Date) {
                updates.date = updates.date.toISOString();
            }
            if (updates.expiresAt && updates.expiresAt instanceof Date) {
                updates.expiresAt = updates.expiresAt.toISOString();
            }
            updates.updatedAt = new Date().toISOString();
            db.pages[idx] = { ...db.pages[idx], ...updates };
            writeLocalDb(db);
            return mapDoc(db.pages[idx]);
        }
    },
    deletePage: async (id) => {
        if (MONGODB_URI) {
            await connectMongo();
            await BirthdayPageModel.findByIdAndDelete(id);
            await AnalyticsModel.deleteMany({ pageId: id });
            await CommentModel.deleteMany({ pageId: id });
            await GuestbookModel.deleteMany({ pageId: id });
            return true;
        } else {
            const db = readLocalDb();
            db.pages = db.pages.filter(p => p.id !== id);
            db.analytics = db.analytics.filter(a => a.pageId !== id);
            db.comments = db.comments.filter(c => c.pageId !== id);
            db.guestbook = db.guestbook.filter(g => g.pageId !== id);
            writeLocalDb(db);
            return true;
        }
    },

    // ANALYTICS & VISIT METRICS
    findAnalyticsByPageId: async (pageId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await AnalyticsModel.findOne({ pageId });
        } else {
            const db = readLocalDb();
            const analytic = db.analytics.find(a => a.pageId === pageId);
            return mapDoc(analytic);
        }
    },
    incrementViews: async (pageId, visitorIp = '127.0.0.1') => {
        if (MONGODB_URI) {
            await connectMongo();
            let analytics = await AnalyticsModel.findOne({ pageId });
            if (!analytics) {
                analytics = new AnalyticsModel({ pageId, views: 0, clicks: 0, visitorIps: [], sharesCount: 0, visitDurations: [], referrals: [] });
            }
            analytics.views += 1;
            if (!analytics.visitorIps.includes(visitorIp)) {
                analytics.visitorIps.push(visitorIp);
            }
            analytics.lastViewedAt = new Date();
            return await analytics.save();
        } else {
            const db = readLocalDb();
            let idx = db.analytics.findIndex(a => a.pageId === pageId);
            if (idx === -1) {
                const newAnalytic = {
                    id: Math.random().toString(36).substring(2, 11),
                    pageId,
                    views: 0,
                    clicks: 0,
                    visitorIps: [],
                    lastViewedAt: new Date().toISOString(),
                    sharesCount: 0,
                    visitDurations: [],
                    referrals: []
                };
                db.analytics.push(newAnalytic);
                idx = db.analytics.length - 1;
            }
            db.analytics[idx].views += 1;
            if (!db.analytics[idx].visitorIps.includes(visitorIp)) {
                db.analytics[idx].visitorIps.push(visitorIp);
            }
            db.analytics[idx].lastViewedAt = new Date().toISOString();
            writeLocalDb(db);
            return mapDoc(db.analytics[idx]);
        }
    },
    incrementShares: async (pageId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await AnalyticsModel.findOneAndUpdate(
                { pageId },
                { $inc: { sharesCount: 1 } },
                { upsert: true, new: true }
            );
        } else {
            const db = readLocalDb();
            let idx = db.analytics.findIndex(a => a.pageId === pageId);
            if (idx === -1) {
                db.analytics.push({
                    id: Math.random().toString(36).substring(2, 11),
                    pageId,
                    views: 0,
                    clicks: 0,
                    visitorIps: [],
                    lastViewedAt: new Date().toISOString(),
                    sharesCount: 0,
                    visitDurations: [],
                    referrals: []
                });
                idx = db.analytics.length - 1;
            }
            db.analytics[idx].sharesCount += 1;
            writeLocalDb(db);
            return mapDoc(db.analytics[idx]);
        }
    },
    logVisitDuration: async (pageId, duration) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await AnalyticsModel.findOneAndUpdate(
                { pageId },
                { $push: { visitDurations: duration } },
                { upsert: true, new: true }
            );
        } else {
            const db = readLocalDb();
            let idx = db.analytics.findIndex(a => a.pageId === pageId);
            if (idx === -1) {
                db.analytics.push({
                    id: Math.random().toString(36).substring(2, 11),
                    pageId,
                    views: 0,
                    clicks: 0,
                    visitorIps: [],
                    lastViewedAt: new Date().toISOString(),
                    sharesCount: 0,
                    visitDurations: [],
                    referrals: []
                });
                idx = db.analytics.length - 1;
            }
            if (!db.analytics[idx].visitDurations) db.analytics[idx].visitDurations = [];
            db.analytics[idx].visitDurations.push(duration);
            writeLocalDb(db);
            return mapDoc(db.analytics[idx]);
        }
    },
    logReferral: async (pageId, source = 'direct') => {
        if (MONGODB_URI) {
            await connectMongo();
            let analytics = await AnalyticsModel.findOne({ pageId });
            if (!analytics) {
                analytics = new AnalyticsModel({ pageId, views: 0, clicks: 0, visitorIps: [], sharesCount: 0, visitDurations: [], referrals: [] });
            }
            
            let refObj = analytics.referrals.find(r => r.source === source);
            if (refObj) {
                refObj.count += 1;
            } else {
                analytics.referrals.push({ source, count: 1 });
            }
            analytics.markModified('referrals');
            return await analytics.save();
        } else {
            const db = readLocalDb();
            let idx = db.analytics.findIndex(a => a.pageId === pageId);
            if (idx === -1) {
                db.analytics.push({
                    id: Math.random().toString(36).substring(2, 11),
                    pageId,
                    views: 0,
                    clicks: 0,
                    visitorIps: [],
                    lastViewedAt: new Date().toISOString(),
                    sharesCount: 0,
                    visitDurations: [],
                    referrals: []
                });
                idx = db.analytics.length - 1;
            }
            if (!db.analytics[idx].referrals) db.analytics[idx].referrals = [];
            let refObj = db.analytics[idx].referrals.find(r => r.source === source);
            if (refObj) {
                refObj.count += 1;
            } else {
                db.analytics[idx].referrals.push({ source, count: 1 });
            }
            writeLocalDb(db);
            return mapDoc(db.analytics[idx]);
        }
    },

    // COMMENTS & GUESTBOOK COLLECTIONS
    findCommentsByPageId: async (pageId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await CommentModel.find({ pageId }).sort({ createdAt: -1 });
        } else {
            const db = readLocalDb();
            const pageComments = db.comments.filter(c => c.pageId === pageId);
            pageComments.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            return pageComments.map(mapDoc);
        }
    },
    createComment: async (commentData) => {
        if (MONGODB_URI) {
            await connectMongo();
            const comment = new CommentModel(commentData);
            return await comment.save();
        } else {
            const db = readLocalDb();
            const newComment = {
                id: Math.random().toString(36).substring(2, 11),
                pageId: commentData.pageId,
                author: commentData.author,
                text: commentData.text,
                avatarIndex: commentData.avatarIndex || 0,
                createdAt: new Date().toISOString()
            };
            db.comments.push(newComment);
            writeLocalDb(db);
            return mapDoc(newComment);
        }
    },
    findGuestbookByPageId: async (pageId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await GuestbookModel.find({ pageId }).sort({ createdAt: -1 });
        } else {
            const db = readLocalDb();
            const pageEntries = db.guestbook.filter(g => g.pageId === pageId);
            pageEntries.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            return pageEntries.map(mapDoc);
        }
    },
    createGuestbookEntry: async (entryData) => {
        if (MONGODB_URI) {
            await connectMongo();
            const entry = new GuestbookModel(entryData);
            return await entry.save();
        } else {
            const db = readLocalDb();
            const newEntry = {
                id: Math.random().toString(36).substring(2, 11),
                pageId: entryData.pageId,
                author: entryData.author,
                text: entryData.text,
                avatarIndex: entryData.avatarIndex || 0,
                createdAt: new Date().toISOString()
            };
            db.guestbook.push(newEntry);
            writeLocalDb(db);
            return mapDoc(newEntry);
        }
    },

    // NOTIFICATIONS COLLECTION
    findNotificationsByUserId: async (userId) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await NotificationModel.find({ userId }).sort({ createdAt: -1 }).limit(20);
        } else {
            const db = readLocalDb();
            const notifs = db.notifications.filter(n => n.userId === userId);
            notifs.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
            return notifs.slice(0, 20).map(mapDoc);
        }
    },
    createNotification: async (notifData) => {
        if (MONGODB_URI) {
            await connectMongo();
            const notif = new NotificationModel(notifData);
            return await notif.save();
        } else {
            const db = readLocalDb();
            const newNotif = {
                id: Math.random().toString(36).substring(2, 11),
                userId: notifData.userId,
                title: notifData.title,
                message: notifData.message,
                read: false,
                createdAt: new Date().toISOString()
            };
            db.notifications.push(newNotif);
            writeLocalDb(db);
            return mapDoc(newNotif);
        }
    },
    markNotificationRead: async (id) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await NotificationModel.findByIdAndUpdate(id, { read: true }, { new: true });
        } else {
            const db = readLocalDb();
            const idx = db.notifications.findIndex(n => n.id === id);
            if (idx === -1) return null;
            db.notifications[idx].read = true;
            writeLocalDb(db);
            return mapDoc(db.notifications[idx]);
        }
    }
};

module.exports = dbAdapter;
