const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

// Load environment variables locally
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Mongoose schema definition in case MongoDB is used
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    socialProvider: { type: String }, // 'google', 'github'
    socialId: { type: String },
    resetToken: { type: String },
    resetTokenExpiry: { type: Date },
    createdAt: { type: Date, default: Date.now }
});

let UserModel;
if (MONGODB_URI) {
    try {
        UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
    } catch (e) {
        UserModel = mongoose.model('User', UserSchema);
    }
}

// Connect to MongoDB
async function connectMongo() {
    if (mongoose.connection.readyState >= 1) return;
    await mongoose.connect(MONGODB_URI);
}

// Local JSON DB Helper functions
function readLocalDb() {
    try {
        if (!fs.existsSync(DB_FILE)) {
            fs.writeFileSync(DB_FILE, JSON.stringify({ users: [] }, null, 2));
        }
        const data = fs.readFileSync(DB_FILE, 'utf8');
        return JSON.parse(data);
    } catch (e) {
        console.error("Local database read error:", e);
        return { users: [] };
    }
}

function writeLocalDb(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Local database write error:", e);
    }
}

// Unified Database Adapter
const dbAdapter = {
    findUserByEmail: async (email) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findOne({ email: email.toLowerCase() });
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
            return user ? { ...user, _id: user.id } : null; // Map id to _id for unified access
        }
    },

    findUserById: async (id) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findById(id);
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.id === id);
            return user ? { ...user, _id: user.id } : null;
        }
    },

    findUserByResetToken: async (token) => {
        if (MONGODB_URI) {
            await connectMongo();
            return await UserModel.findOne({
                resetToken: token,
                resetTokenExpiry: { $gt: new Date() }
            });
        } else {
            const db = readLocalDb();
            const user = db.users.find(u => u.resetToken === token && new Date(u.resetTokenExpiry) > new Date());
            return user ? { ...user, _id: user.id } : null;
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
                resetToken: null,
                resetTokenExpiry: null,
                createdAt: new Date().toISOString()
            };
            db.users.push(newUser);
            writeLocalDb(db);
            return { ...newUser, _id: newUser.id };
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
            
            // Format dates if mapping resetTokenExpiry
            if (updates.resetTokenExpiry instanceof Date) {
                updates.resetTokenExpiry = updates.resetTokenExpiry.toISOString();
            }
            
            db.users[idx] = { ...db.users[idx], ...updates };
            writeLocalDb(db);
            return { ...db.users[idx], _id: db.users[idx].id };
        }
    }
};

module.exports = dbAdapter;
