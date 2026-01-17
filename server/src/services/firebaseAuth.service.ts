import { firebaseAdmin } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';

export const verifyFirebaseToken = async (idToken: string) => {
    try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        logger.error('Error verifying Firebase ID token:', error);
        throw new Error('Invalid or expired token');
    }
};
