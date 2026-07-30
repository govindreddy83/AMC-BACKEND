const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK safely using Service Account credentials.
 */
function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  try {
    let credential = null;

    // Option 1: FIREBASE_SERVICE_ACCOUNT env variable (JSON string or file path)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const rawEnv = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (rawEnv.startsWith('{')) {
        const serviceAccount = JSON.parse(rawEnv);
        credential = admin.credential.cert(serviceAccount);
      } else if (fs.existsSync(rawEnv)) {
        const serviceAccount = JSON.parse(fs.readFileSync(rawEnv, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      }
    }

    // Option 2: firebase-service-account.json in backend directory
    if (!credential) {
      const localKeyPath = path.join(__dirname, '../firebase-service-account.json');
      if (fs.existsSync(localKeyPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
        credential = admin.credential.cert(serviceAccount);
      }
    }

    // Option 3: GOOGLE_APPLICATION_CREDENTIALS path fallback
    if (!credential && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      const gCredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (fs.existsSync(gCredPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(gCredPath, 'utf8'));
        // Check if service account has firebase fields or project_id
        if (serviceAccount.project_id) {
          credential = admin.credential.cert(serviceAccount);
        }
      }
    }

    // Option 4: Application Default Credentials fallback
    if (!credential) {
      credential = admin.credential.applicationDefault();
    }

    firebaseApp = admin.initializeApp({
      credential,
    });

    console.log('✅ Firebase Admin SDK initialized successfully.');
    return firebaseApp;
  } catch (error) {
    console.warn('⚠️ Firebase Admin SDK initialization notice:', error.message);
    console.warn('👉 Place firebase-service-account.json in backend folder to enable FCM push notifications.');
    return null;
  }
}

const getMessaging = () => {
  if (admin.apps.length === 0) {
    initFirebaseAdmin();
  }
  if (admin.apps.length === 0) {
    throw new Error('Firebase Admin SDK is not initialized. Please configure firebase-service-account.json.');
  }
  return admin.messaging();
};

module.exports = {
  initFirebaseAdmin,
  getMessaging,
  admin,
};
