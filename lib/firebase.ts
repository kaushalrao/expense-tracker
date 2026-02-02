import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, collection, CollectionReference, DocumentData, Firestore } from "firebase/firestore";

// --- Global Declarations ---
declare const __firebase_config: string | undefined;
declare const __app_id: string | undefined;

// --- Firebase Initialization ---
const getFirebaseConfig = () => {
    if (typeof __firebase_config !== 'undefined') {
        const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const sanitizedAppId = rawAppId.replace(/[^a-zA-Z0-9_-]/g, '_');
        return {
            config: JSON.parse(__firebase_config),
            appId: sanitizedAppId
        };
    }

    try {
        if (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
            return {
                config: {
                    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
                    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
                    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
                    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
                    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
                    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
                },
                appId: 'farm-voice-app-v1'
            };
        }
    } catch (e) {
        // Ignore errors
    }

    return {
        config: {
            apiKey: "AIzaSyDummyKeyForLocalBuildAndDev",
            authDomain: "dummy.firebaseapp.com",
            projectId: "dummy-project",
            storageBucket: "dummy.appspot.com",
            messagingSenderId: "00000000000",
            appId: "1:00000000000:web:00000000000000"
        },
        appId: 'default-app-id'
    };
};

const { config: firebaseConfig, appId } = getFirebaseConfig();
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const getSmartCollection = (dbInstance: Firestore, baseAppId: string, collectionName: string): CollectionReference<DocumentData> => {
    const basePath = `artifacts/${baseAppId}/public/data/${collectionName}`;
    const segments = basePath.split('/').filter(s => s.length > 0);
    if (segments.length % 2 === 0) {
        return collection(dbInstance, basePath, 'records');
    } else {
        return collection(dbInstance, basePath);
    }
};

export { app, auth, db, appId };
