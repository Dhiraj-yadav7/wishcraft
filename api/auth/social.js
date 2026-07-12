const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const { email, name, provider, providerId } = req.body;

        if (!email || !name || !provider || !providerId) {
            return error(res, 'Missing required social login details.', 400);
        }

        // Find existing user by email
        let user = await db.findUserByEmail(email);

        if (!user) {
            // Register new social login user
            user = await db.createUser({
                name,
                email: email.toLowerCase(),
                socialProvider: provider,
                socialId: providerId
            });
        } else {
            // Update social provider mapping if not mapped already
            if (!user.socialProvider) {
                await db.updateUser(user._id.toString(), {
                    socialProvider: provider,
                    socialId: providerId
                });
            }
        }

        // Sign JWT token
        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        return success(res, {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        }, `Welcome! Logged in via ${provider.charAt(0).toUpperCase() + provider.slice(1)} 🎉`, 200);

    } catch (err) {
        console.error('Social auth handler error:', err);
        return error(res, 'Internal server error.', 500);
    }
};
