const admin = require('firebase-admin');

let isFirebaseInitialized = false;

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
            console.log('Firebase Admin SDK initialized successfully.');
        }
    } catch (e) {
        console.error('Error initializing Firebase Admin SDK:', e);
    }
} else {
    console.warn('Firebase Admin SDK credentials missing in environment variables. Verification will fail.');
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
