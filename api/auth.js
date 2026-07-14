const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });
require('dotenv').config();

const jwt = require('jsonwebtoken');
const db = require('./utils/db');
const { success, error } = require('./utils/response');
const { getUserIdFromRequest, JWT_SECRET } = require('./utils/auth');
const { verifyFirebaseIdToken } = require('./utils/firebase');

// Common helper to register session history and set backend JWT cookie
async function loginUserAndSetCookie(req, res, user, message = 'Welcome back! Logged in successfully 🎉') {
    const userAgent = req.headers['user-agent'] || 'Unknown User-Agent';
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const country = req.headers['x-vercel-ip-country'] || 'US';
    const city = req.headers['x-vercel-ip-city'] || 'Localhost';
    
    let os = 'Unknown OS';
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Macintosh')) os = 'macOS';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Linux')) os = 'Linux';
    
    let browser = 'Unknown Browser';
    if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    const newHistoryItem = {
        timestamp: new Date().toISOString(),
        browser,
        os,
        ip: clientIp.split(',')[0].trim(),
        location: `${city}, ${country}`
    };
    
    const history = user.loginHistory || [];
    history.unshift(newHistoryItem);
    if (history.length > 10) history.pop();
    
    await db.updateUser(user._id.toString(), { loginHistory: history });

    const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
    
    res.setHeader('Set-Cookie', [
        `auth_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${7 * 24 * 60 * 60}`
    ]);

    return success(res, {
        user: { id: user._id, name: user.name, email: user.email }
    }, message, 200);
}

export default async function handler(req, res) {
    const { action } = req.query;

    try {
        // ====================================================
        // CONFIG ACTION (Exposes public Firebase Client Config)
        // ====================================================
        if (action === 'config') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            return success(res, {
                firebaseConfig: {
                    apiKey: process.env.FIREBASE_API_KEY || '',
                    authDomain: process.env.FIREBASE_AUTH_DOMAIN || '',
                    projectId: process.env.FIREBASE_PROJECT_ID || '',
                    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || '',
                    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || '',
                    appId: process.env.FIREBASE_APP_ID || ''
                }
            }, 'Config loaded successfully.', 200);
        }

        // ====================================================
        // SIGNUP ACTION
        // ====================================================
        else if (action === 'signup') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { idToken, name } = req.body;

            if (!idToken) return error(res, 'Firebase ID Token is required.', 400);

            let decoded;
            try {
                decoded = await verifyFirebaseIdToken(idToken);
            } catch (err) {
                console.error('Firebase token verification error during signup:', err);
                return error(res, 'Firebase authentication failed: ' + err.message, 401);
            }

            const email = decoded.email;
            const uid = decoded.uid;
            const finalName = name || decoded.name || email.split('@')[0];

            let user = await db.findUserByEmail(email);
            if (!user) {
                user = await db.createUser({
                    name: finalName,
                    email: email.toLowerCase(),
                    socialProvider: 'firebase',
                    socialId: uid
                });
            } else {
                if (!user.socialId) {
                    await db.updateUser(user._id.toString(), {
                        socialProvider: 'firebase',
                        socialId: uid
                    });
                }
            }

            return await loginUserAndSetCookie(req, res, user, 'Account registered successfully! Welcome 🎉');
        }

        // ====================================================
        // LOGIN ACTION
        // ====================================================
        else if (action === 'login') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { idToken } = req.body;

            if (!idToken) return error(res, 'Firebase ID Token is required.', 400);

            let decoded;
            try {
                decoded = await verifyFirebaseIdToken(idToken);
            } catch (err) {
                console.error('Firebase token verification error during login:', err);
                return error(res, 'Firebase authentication failed: ' + err.message, 401);
            }

            const email = decoded.email;
            const uid = decoded.uid;

            let user = await db.findUserByEmail(email);
            if (!user) {
                // Autocreate user record in MongoDB if validated by Firebase but missing in db
                user = await db.createUser({
                    name: decoded.name || email.split('@')[0],
                    email: email.toLowerCase(),
                    socialProvider: 'firebase',
                    socialId: uid
                });
            } else {
                if (!user.socialId) {
                    await db.updateUser(user._id.toString(), {
                        socialProvider: 'firebase',
                        socialId: uid
                    });
                }
            }

            return await loginUserAndSetCookie(req, res, user, 'Logged in successfully! Welcome back 🎉');
        }

        // ====================================================
        // GOOGLE AUTHENTICATION ACTION
        // ====================================================
        else if (action === 'google') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { idToken } = req.body;

            if (!idToken) return error(res, 'Firebase ID Token is required.', 400);

            let decoded;
            try {
                decoded = await verifyFirebaseIdToken(idToken);
            } catch (err) {
                console.error('Firebase Google verification error:', err);
                return error(res, 'Firebase Google verification failed: ' + err.message, 401);
            }

            const email = decoded.email;
            const uid = decoded.uid;
            const picture = decoded.picture || '';

            let user = await db.findUserByEmail(email);
            if (!user) {
                user = await db.createUser({
                    name: decoded.name || email.split('@')[0],
                    email: email.toLowerCase(),
                    socialProvider: 'google',
                    socialId: uid,
                    profilePhoto: picture
                });
            } else {
                if (user.socialProvider !== 'google') {
                    await db.updateUser(user._id.toString(), {
                        socialProvider: 'google',
                        socialId: uid,
                        profilePhoto: picture || user.profilePhoto
                    });
                }
            }

            return await loginUserAndSetCookie(req, res, user, 'Welcome! Google authentication successful 🎉');
        }

        // ====================================================
        // SESSION VERIFICATION USER ACTION
        // ====================================================
        else if (action === 'user') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const userId = getUserIdFromRequest(req);
            if (!userId) {
                return error(res, 'Session expired or invalid token. Please log in again.', 401);
            }

            const user = await db.findUserById(userId);
            if (!user) return error(res, 'User account not found.', 404);

            return success(res, {
                user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt }
            }, 'Session verified successfully.', 200);
        }

        // ====================================================
        // LOGOUT ACTION
        // ====================================================
        else if (action === 'logout') {
            res.setHeader('Set-Cookie', [
                `auth_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0`
            ]);
            return success(res, null, 'Logged out successfully', 200);
        }

        // Default
        else {
            return error(res, 'Invalid action parameter.', 404);
        }

    } catch (err) {
        console.error(`Auth api action ${action} error:`, err);
        return error(res, 'Internal server error.', 500);
    }
};
