const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

let isFirebaseInitialized = false;

// Attempt to initialize Firebase Admin SDK
const serviceAccountPath = path.join(__dirname, '../config/firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
    try {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        isFirebaseInitialized = true;
        console.log('Firebase Admin SDK initialized successfully.');
    } catch (error) {
        console.error('Error initializing Firebase Admin SDK:', error);
    }
} else {
    console.warn('Firebase service account file not found. Push notifications will be disabled.');
}

/**
 * Send push notification to specific tokens
 * @param {Array} tokens - Array of FCM tokens
 * @param {Object} payload - Notification payload { title, body, data }
 */
const sendPushNotification = async (tokens, payload) => {
    if (!isFirebaseInitialized) {
        console.warn('Cannot send push notification: Firebase not initialized.');
        return;
    }

    if (!tokens || tokens.length === 0) {
        return;
    }

    const message = {
        notification: {
            title: payload.title,
            body: payload.body,
        },
        data: payload.data || {},
        tokens: tokens,
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log(`${response.successCount} messages were sent successfully.`);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(tokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
        }
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = {
    sendPushNotification,
    isFirebaseInitialized,
};
