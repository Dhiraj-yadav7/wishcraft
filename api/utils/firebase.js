const { initializeApp, getApps, cert } = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');
const fs = require('fs');
const path = require('path');

let isFirebaseInitialized = false;

// 1. Try to load from local service account JSON first
const localJsonPath = path.resolve(process.cwd(), 'firebase-service-account.json');

if (fs.existsSync(localJsonPath)) {
    try {
        if (!getApps().length) {
            const serviceAccount = JSON.parse(fs.readFileSync(localJsonPath, 'utf8'));
            initializeApp({
                credential: cert(serviceAccount)
            });
            isFirebaseInitialized = true;
            console.log('Firebase Admin SDK initialized successfully using local JSON.');
        } else {
            isFirebaseInitialized = true;
        }
    } catch (e) {
        console.error('Error initializing Firebase Admin SDK using local JSON:', e);
    }
}

// 2. Fall back to environment variables if JSON initialization is not available
if (!isFirebaseInitialized) {
    if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
        try {
            if (!getApps().length) {
                initializeApp({
                    credential: cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                    })
                });
                isFirebaseInitialized = true;
                console.log('Firebase Admin SDK initialized successfully using environment variables.');
            } else {
                isFirebaseInitialized = true;
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
        throw new Error('Firebase Admin SDK is not initialized. Check your configurations.');
    }
    
    return await getAuth().verifyIdToken(idToken);
}

module.exports = {
    verifyFirebaseIdToken
};
