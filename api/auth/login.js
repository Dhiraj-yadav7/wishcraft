const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../utils/db');
const { success, error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'birthday-surprise-secret-key-12345';

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return error(res, 'Method not allowed', 405);
    }

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return error(res, 'Please provide both email and password.', 400);
        }

        // Find user by email
        const user = await db.findUserByEmail(email);
        if (!user) {
            return error(res, 'Invalid credentials. Please try again.', 401);
        }

        // Check if user registered via social login and doesn't have password
        if (!user.password) {
            return error(res, `This account is linked via ${user.socialProvider}. Please use social login.`, 400);
        }

        // Compare password hashes
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return error(res, 'Invalid credentials. Please try again.', 401);
        }

        // Sign JWT
        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        return success(res, {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        }, 'Welcome back! Logged in successfully 🎉', 200);

    } catch (err) {
        console.error('Login error:', err);
        return error(res, 'Internal server error. Please try again.', 500);
    }
};
