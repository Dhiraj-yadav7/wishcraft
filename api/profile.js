const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./utils/db');
const { success, error } = require('./utils/response');
const cloudinary = require('cloudinary').v2;

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

// Configure Cloudinary if credentials are provided
if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_URL.split('@')[1].split('/')[0],
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET
    });
}

module.exports = async function handler(req, res) {
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
    const action = req.query.action || '';

    try {
        // ====================================================
        // GET USER PROFILE & SaaS STATISTICS OVERVIEW
        // ====================================================
        if (req.method === 'GET' && !action) {
            const user = await db.findUserById(userId);
            if (!user) return error(res, 'User record not found.', 404);

            // Fetch SaaS metrics overview
            const pages = await db.findPagesByUserId(userId);
            let viewsCount = 0;
            let wishesCount = 0;
            let sharesCount = 0;
            let qrScansCount = 0;
            let draftCount = 0;
            let publicCount = 0;
            let privateCount = 0;
            let scheduledCount = 0;

            for (const p of pages) {
                if (p.status === 'draft') draftCount++;
                else if (p.status === 'public') publicCount++;
                else if (p.status === 'private') privateCount++;
                else if (p.status === 'scheduled') scheduledCount++;

                const anal = await db.findAnalyticsByPageId(p._id.toString());
                if (anal) {
                    viewsCount += (anal.views || 0);
                    sharesCount += (anal.sharesCount || 0);
                    qrScansCount += (anal.qrScans || 0);
                }
                const wishes = await db.findGuestbookByPageId(p._id.toString());
                wishesCount += (wishes ? wishes.length : 0);
            }

            // Exclude password hash from response
            const profile = user.toObject ? user.toObject() : JSON.parse(JSON.stringify(user));
            delete profile.password;

            return success(res, {
                profile,
                stats: {
                    totalPages: pages.length,
                    draftCount,
                    publicCount,
                    privateCount,
                    scheduledCount,
                    viewsCount,
                    wishesCount,
                    sharesCount,
                    qrScansCount,
                    memberSince: user.createdAt
                }
            }, 'User profile retrieved.', 200);
        }

        // ====================================================
        // UPDATE PERSONAL INFORMATION DETAILS
        // ====================================================
        else if (req.method === 'PUT' && !action) {
            const { name, username, email, phone, bio, birthday, gender, country, city, timezone, language } = req.body;
            if (!name || !email) {
                return error(res, 'Name and Email are required.', 400);
            }

            const currentUser = await db.findUserById(userId);
            if (!currentUser) return error(res, 'User not found.', 404);

            // Email check if changed
            if (email.toLowerCase() !== currentUser.email.toLowerCase()) {
                const dupEmail = await db.findUserByEmail(email);
                if (dupEmail) return error(res, 'Email address is already in use.', 409);
            }

            // Username check if changed
            if (username && (!currentUser.username || username.toLowerCase() !== currentUser.username.toLowerCase())) {
                const dupUsername = await db.findUserByUsername(username);
                if (dupUsername) return error(res, 'Username is already taken.', 409);
            }

            const updates = {
                name,
                email: email.toLowerCase(),
                username: username ? username.toLowerCase() : currentUser.username,
                phone: phone || '',
                bio: bio || '',
                birthday: birthday ? new Date(birthday) : null,
                gender: gender || '',
                country: country || '',
                city: city || '',
                timezone: timezone || 'UTC',
                language: language || 'en'
            };

            const updatedUser = await db.updateUser(userId, updates);
            const responseData = updatedUser.toObject ? updatedUser.toObject() : JSON.parse(JSON.stringify(updatedUser));
            delete responseData.password;

            return success(res, responseData, 'Personal settings saved successfully.', 200);
        }

        // ====================================================
        // CHANGE ACCOUNT PASSWORD
        // ====================================================
        else if (action === 'password') {
            if (req.method !== 'PUT' && req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                return error(res, 'Please provide current and new passwords.', 400);
            }

            const user = await db.findUserById(userId);
            if (!user) return error(res, 'User not found.', 404);

            // Verify current password
            const isMatch = await bcrypt.compare(currentPassword, user.password);
            if (!isMatch) return error(res, 'Incorrect current password.', 400);

            // Hash new password
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(newPassword, salt);

            await db.updateUser(userId, { password: hashedPassword });
            return success(res, null, 'Password updated successfully.', 200);
        }

        // ====================================================
        // CONNECT CUSTOM BRAND DOMAIN
        // ====================================================
        else if (action === 'domain') {
            if (req.method !== 'PUT' && req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { customDomain } = req.body;

            const domain = customDomain ? customDomain.trim().toLowerCase() : '';
            const updatedUser = await db.updateUser(userId, {
                customDomain: domain,
                customDomainDnsVerified: domain ? Math.random() > 0.5 : false // Simulated verification checks
            });
            return success(res, {
                customDomain: updatedUser.customDomain,
                customDomainDnsVerified: updatedUser.customDomainDnsVerified
            }, 'Custom domain configuration saved.', 200);
        }

        // ====================================================
        // UPDATE APPEARANCE SETTINGS
        // ====================================================
        else if (action === 'theme') {
            if (req.method !== 'PUT' && req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { theme, accentColor, fontSize } = req.body;

            const updatedUser = await db.updateUser(userId, {
                appearance: {
                    theme: theme || 'system',
                    accentColor: accentColor || 'pink',
                    fontSize: fontSize || 'medium'
                }
            });
            return success(res, updatedUser.appearance, 'Appearance preferences updated.', 200);
        }

        // ====================================================
        // UPDATE NOTIFICATION ALERTS PREFERENCES
        // ====================================================
        else if (action === 'preferences') {
            if (req.method !== 'PUT' && req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const {
                birthdayEmails, guestbookNotifications, qrScanNotifications,
                shareNotifications, weeklySummary, marketingEmails, systemUpdates,
                pushNotifications, desktopNotifications
            } = req.body;

            const updatedUser = await db.updateUser(userId, {
                preferences: {
                    birthdayEmails: birthdayEmails !== undefined ? birthdayEmails : true,
                    guestbookNotifications: guestbookNotifications !== undefined ? guestbookNotifications : true,
                    qrScanNotifications: qrScanNotifications !== undefined ? qrScanNotifications : true,
                    shareNotifications: shareNotifications !== undefined ? shareNotifications : true,
                    weeklySummary: weeklySummary !== undefined ? weeklySummary : false,
                    marketingEmails: marketingEmails !== undefined ? marketingEmails : false,
                    systemUpdates: systemUpdates !== undefined ? systemUpdates : true,
                    pushNotifications: pushNotifications !== undefined ? pushNotifications : false,
                    desktopNotifications: desktopNotifications !== undefined ? desktopNotifications : false
                }
            });
            return success(res, updatedUser.preferences, 'Notification preferences updated.', 200);
        }

        // ====================================================
        // GET ACCOUNT LOGIN SECURITY LOGS
        // ====================================================
        else if (action === 'activity') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const user = await db.findUserById(userId);
            if (!user) return error(res, 'User not found.', 404);

            return success(res, user.loginHistory || [], 'Login activity logs retrieved.', 200);
        }

        // ====================================================
        // POST PROFILE PHOTO UPLOAD (Cloudinary with Compressed base64 fallback)
        // ====================================================
        else if (action === 'upload-photo') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { photo } = req.body; // base64 string
            if (!photo) return error(res, 'Missing base64 photo data.', 400);

            let photoUrl = photo; // Fallback to base64 if Cloudinary is not configured

            if (process.env.CLOUDINARY_URL || (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)) {
                try {
                    const result = await cloudinary.uploader.upload(photo, {
                        folder: 'profile_photos',
                        transformation: [{ width: 250, height: 250, crop: 'limit', quality: 'auto' }]
                    });
                    photoUrl = result.secure_url;
                } catch (cloudinaryError) {
                    console.warn('Cloudinary upload warning (using base64 fallback):', cloudinaryError);
                }
            }

            await db.updateUser(userId, { profilePhoto: photoUrl });
            return success(res, { profilePhoto: photoUrl }, 'Profile photo uploaded successfully.', 200);
        }

        // ====================================================
        // DATA EXPORT (JSON / CSV compiled records)
        // ====================================================
        else if (action === 'export') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const user = await db.findUserById(userId);
            if (!user) return error(res, 'User not found.', 404);

            const pages = await db.findPagesByUserId(userId);
            const exportedData = {
                profile: {
                    name: user.name,
                    email: user.email,
                    username: user.username,
                    phone: user.phone,
                    bio: user.bio,
                    country: user.country,
                    city: user.city,
                    timezone: user.timezone,
                    language: user.language,
                    createdAt: user.createdAt
                },
                birthdayPages: pages.map(p => ({
                    name: p.name,
                    relationship: p.relationship,
                    date: p.date,
                    theme: p.theme,
                    status: p.status,
                    createdAt: p.createdAt
                }))
            };

            return success(res, exportedData, 'Profile data exported.', 200);
        }

        // ====================================================
        // DELETE USER ACCOUNT & ALL DEPENDENT COLLECTIONS
        // ====================================================
        else if (req.method === 'DELETE') {
            const { deleteConfirm } = req.body || {};
            if (deleteConfirm !== 'DELETE') {
                return error(res, 'Please confirm account deletion by typing DELETE.', 400);
            }

            const deleted = await db.deleteUser(userId);
            if (deleted) {
                return success(res, null, 'Account deleted permanently from MongoDB database.', 200);
            } else {
                return error(res, 'Failed to complete profile deletion request.', 500);
            }
        }

        // Action not supported
        else {
            return error(res, 'Invalid profile settings action path.', 404);
        }

    } catch (err) {
        console.error(`Profile settings error on action ${action}:`, err);
        return error(res, 'Internal server error.', 500);
    }
};
