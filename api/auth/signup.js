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
        const { name, email, password } = req.body;

        // Basic validations
        if (!name || !email || !password) {
            return error(res, 'Please fill in all required fields.', 400);
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return error(res, 'Please provide a valid email address.', 400);
        }

        if (password.length < 6) {
            return error(res, 'Password must be at least 6 characters long.', 400);
        }

        // Check if duplicate user exists
        const existingUser = await db.findUserByEmail(email);
        if (existingUser) {
            return error(res, 'An account with this email address already exists.', 409);
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user record
        const user = await db.createUser({
            name,
            email: email.toLowerCase(),
            password: hashedPassword
        });

        // Sign JSON Web Token (valid for 7 days)
        const token = jwt.sign({ userId: user._id.toString() }, JWT_SECRET, { expiresIn: '7d' });

        return success(res, {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        }, 'Account created successfully! Welcome 🎉', 201);

    } catch (err) {
        console.error('Signup error:', err);
        return error(res, 'Internal server error. Please try again.', 500);
    }
};
