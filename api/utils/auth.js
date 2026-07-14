const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

function getUserIdFromRequest(req) {
    // 1. Check if Vercel middleware already authenticated and set x-user-id header
    const middlewareUserId = req.headers['x-user-id'];
    if (middlewareUserId) {
        return middlewareUserId;
    }

    // 2. Check Cookie
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
        const cookies = {};
        cookieHeader.split(';').forEach(cookie => {
            let [name, ...val] = cookie.split('=');
            name = name.trim();
            let value = val.join('=');
            if (value) {
                cookies[name] = decodeURIComponent(value);
            }
        });
        if (cookies['auth_token']) {
            try {
                const decoded = jwt.verify(cookies['auth_token'], JWT_SECRET);
                return decoded.userId;
            } catch (e) {
                // Ignore and try authorization header
            }
        }
    }

    // 3. Fallback to Authorization Header
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        if (token && token !== 'null' && token !== 'undefined') {
            try {
                const decoded = jwt.verify(token, JWT_SECRET);
                return decoded.userId;
            } catch (e) {
                // Invalid token
            }
        }
    }

    return null;
}

module.exports = {
    getUserIdFromRequest,
    JWT_SECRET
};
