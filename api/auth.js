const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./utils/db');
const { success, error } = require('./utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    const { action } = req.query;

    try {
        // ====================================================
        // SIGNUP ACTION
        // ====================================================
        if (action === 'signup') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { name, email, password } = req.body;

            if (!name || !email || !password) return error(res, 'Please fill in all required fields.', 400);
            
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) return error(res, 'Please provide a valid email address.', 400);
            if (password.length < 6) return error(res, 'Password must be at least 6 characters long.', 400);

            const existingUser = await db.findUserByEmail(email);
            if (existingUser) return error(res, 'An account with this email address already exists.', 409);

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const user = await db.createUser({
                name,
                email: email.toLowerCase(),
                password: hashedPassword
            });

            const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
            return success(res, {
                token,
                user: { id: user._id, name: user.name, email: user.email }
            }, 'Account created successfully! Welcome 🎉', 201);
        }

        // ====================================================
        // LOGIN ACTION
        // ====================================================
        else if (action === 'login') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { email, password } = req.body;

            if (!email || !password) return error(res, 'Please provide both email and password.', 400);

            const user = await db.findUserByEmail(email);
            if (!user) return error(res, 'Invalid credentials. Please try again.', 401);

            if (!user.password) {
                return error(res, `This account is linked via ${user.socialProvider}. Please use social login.`, 400);
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) return error(res, 'Invalid credentials. Please try again.', 401);

            // Log session history details
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
            return success(res, {
                token,
                user: { id: user._id, name: user.name, email: user.email }
            }, 'Welcome back! Logged in successfully 🎉', 200);
        }

        // ====================================================
        // FORGOT PASSWORD ACTION
        // ====================================================
        else if (action === 'forgot') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { email } = req.body;

            if (!email) return error(res, 'Please provide an email address.', 400);

            const user = await db.findUserByEmail(email);
            if (!user) return error(res, 'No account found with this email address.', 404);

            const resetToken = Math.random().toString(36).substring(2, 15) + 
                               Math.random().toString(36).substring(2, 15);
            const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

            await db.updateUser(user._id.toString(), { resetToken, resetTokenExpiry });
            return success(res, { resetToken }, 'Password recovery token generated successfully! Link sent ✉️', 200);
        }

        // ====================================================
        // RESET PASSWORD ACTION
        // ====================================================
        else if (action === 'reset') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { token, password } = req.body;

            if (!token || !password) return error(res, 'Reset token and password are required.', 400);
            if (password.length < 6) return error(res, 'Password must be at least 6 characters long.', 400);

            const user = await db.findUserByResetToken(token);
            if (!user) return error(res, 'Invalid or expired recovery token. Please try again.', 400);

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            await db.updateUser(user._id.toString(), {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            });
            return success(res, null, 'Password reset successfully! You can now log in 🔐', 200);
        }

        // ====================================================
        // SESSION VERIFICATION USER ACTION
        // ====================================================
        else if (action === 'user') {
            if (req.method !== 'GET') return error(res, 'Method not allowed', 405);
            const authHeader = req.headers.authorization;
            
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                return error(res, 'Authorization token missing or invalid.', 401);
            }

            const token = authHeader.split(' ')[1];
            let decoded;
            try {
                decoded = jwt.verify(token, JWT_SECRET);
            } catch (e) {
                return error(res, 'Session expired or invalid token. Please log in again.', 401);
            }

            const user = await db.findUserById(decoded.userId);
            if (!user) return error(res, 'User account not found.', 404);

            return success(res, {
                user: { id: user._id, name: user.name, email: user.email, createdAt: user.createdAt }
            }, 'Session verified successfully.', 200);
        }

        // ====================================================
        // SOCIAL LOGIN ACTION
        // ====================================================
        else if (action === 'social') {
            if (req.method !== 'POST') return error(res, 'Method not allowed', 405);
            const { email, name, provider, providerId } = req.body;

            if (!email || !name || !provider || !providerId) {
                return error(res, 'Missing required social login details.', 400);
            }

            let user = await db.findUserByEmail(email);
            if (!user) {
                user = await db.createUser({
                    name,
                    email: email.toLowerCase(),
                    socialProvider: provider,
                    socialId: providerId
                });
            } else {
                if (!user.socialProvider) {
                    await db.updateUser(user._id.toString(), {
                        socialProvider: provider,
                        socialId: providerId
                    });
                }
            }

            const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });
            return success(res, {
                token,
                user: { id: user._id, name: user.name, email: user.email }
            }, `Welcome! Logged in via ${provider.charAt(0).toUpperCase() + provider.slice(1)} 🎉`, 200);
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
