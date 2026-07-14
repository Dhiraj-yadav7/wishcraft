const admin = require('firebase-admin');

const fs = require('fs');
const path = require('path');

let isFirebaseInitialized = false;

// 1. Try to load from local service account JSON first
const localJsonPath = path.resolve(process.cwd(), 'firebase-service-account.json');

if (fs.existsSync(localJsonPath)) {
    try {
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
            isFirebaseInitialized = true;
            console.log('Firebase Admin SDK initialized successfully using local JSON.');
        }
    } catch (e) {
        console.error('Error initializing Firebase Admin SDK using local JSON:', e);
    }
}

// 2. Fall back to environment variables if JSON initialization is not available
if (!isFirebaseInitialized) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    })
                });
                isFirebaseInitialized = true;
                console.log('Firebase Admin SDK initialized successfully using environment variables.');
            }
        } catch (e) {
            console.error('Error initializing Firebase Admin SDK using environment variables:', e);
        }
    } else {
        console.warn('Firebase Admin SDK credentials missing in both local JSON and environment variables. Verification will fail.');
    }
}

async function verifyFirebaseIdToken(idToken) {
    if (!isFirebaseInitialized) {
        throw new Error('Firebase Admin SDK is not initialized. Check your environment variables.');
    }
    
    return await admin.auth().verifyIdToken(idToken);
}

module.exports = {
    verifyFirebaseIdToken
};
