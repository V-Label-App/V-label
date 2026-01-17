import { firebaseAdmin } from '../config/firebase-admin.js';
import { logger } from '../utils/logger.js';

import { auth } from 'firebase-admin';

export const verifyFirebaseToken = async (idToken: string): Promise<auth.DecodedIdToken> => {
    try {
        const decodedToken = await firebaseAdmin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        logger.error('FIREBASE_AUTH', 'Error verifying Firebase ID token:', error);
        throw new Error('Invalid or expired token');
    }
};
