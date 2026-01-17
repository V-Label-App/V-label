import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

try {
    const serviceAccount = {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    };

    if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
        logger.warn('FIREBASE', 'Firebase Admin credentials not found. Google Login will not work.');
    } else {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccount.projectId,
                clientEmail: serviceAccount.clientEmail,
                privateKey: serviceAccount.privateKey,
            }),
        });
        logger.info('FIREBASE', 'Firebase Admin initialized successfully');
    }
} catch (error) {
    logger.error('FIREBASE', 'Error initializing Firebase Admin:', error);
}

export const firebaseAdmin = admin;
