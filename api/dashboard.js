const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const db = require('./utils/db');
const { success, error } = require('./utils/response');
const { getUserIdFromRequest } = require('./utils/auth');

module.exports = async function handler(req, res) {
    const userId = getUserIdFromRequest(req);
    if (!userId) {
        return error(res, 'Session expired or invalid token. Please log in again.', 401);
    }
    const { action } = req.query;

    try {
        // ====================================================
        // COMPUTING DASHBOARD STATS
        // ====================================================
        if (action === 'stats') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);

            const pages = await db.findPagesByUserId(userId);
            
            let activePages = 0;
            let draftPages = 0;
            let scheduledPages = 0;
            let privatePages = 0;
            let totalViews = 0;
            let totalWishes = 0;
            let totalShares = 0;
            let totalQrScans = 0;
            let upcomingBirthdays = 0;

            const now = new Date();
            const currentYear = now.getFullYear();

            for (const page of pages) {
                if (page.status === 'public') activePages++;
                else if (page.status === 'draft') draftPages++;
                else if (page.status === 'scheduled') scheduledPages++;
                else if (page.status === 'private') privatePages++;

                const analytics = await db.findAnalyticsByPageId(page._id.toString());
                if (analytics) {
                    totalViews += (analytics.views || 0);
                    totalShares += (analytics.sharesCount || 0);
                    totalQrScans += (analytics.qrScans || 0);
                }

                const wishes = await db.findGuestbookByPageId(page._id.toString());
                totalWishes += (wishes ? wishes.length : 0);

                if (page.date) {
                    const bdate = new Date(page.date);
                    const thisYearBday = new Date(currentYear, bdate.getMonth(), bdate.getDate());
                    let diffTime = thisYearBday - now;
                    if (diffTime < 0) {
                        const nextYearBday = new Date(currentYear + 1, bdate.getMonth(), bdate.getDate());
                        diffTime = nextYearBday - now;
                    }
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    if (diffDays <= 30) {
                        upcomingBirthdays++;
                    }
                }
            }

            return success(res, {
                totalPages: pages.length,
                activePages,
                draftPages,
                scheduledPages,
                privatePages,
                totalViews,
                totalWishes,
                totalShares,
                totalQrScans,
                upcomingBirthdays
            }, 'Dashboard stats computed successfully.', 200);
        }

        // ====================================================
        // USER NOTIFICATIONS ACTIONS
        // ====================================================
        else if (action === 'notifications') {
            if (req.method === 'GET') {
                const notifications = await db.findNotificationsByUserId(userId);
                return success(res, notifications, 'Notifications loaded successfully.', 200);
            } 
            
            else if (req.method === 'POST' || req.method === 'PUT') {
                const { id } = req.body;
                if (!id) return error(res, 'Missing notification identifier in body.', 400);

                const updated = await db.markNotificationRead(id);
                return success(res, updated, 'Notification marked as read.', 200);
            } else {
                return error(res, 'Method not allowed', 405);
            }
        }

        // Invalid Action
        else {
            return error(res, 'Invalid dashboard action.', 404);
        }

    } catch (err) {
        console.error(`Dashboard API action ${action} error:`, err);
        return error(res, 'Internal server error.', 500);
    }
}
