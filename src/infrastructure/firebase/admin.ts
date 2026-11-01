import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import path from 'path';
import fs from 'fs';

let firebaseApp: App | undefined;
let firestoreDb: Firestore | undefined;
let storageBucket: ReturnType<Storage['bucket']> | undefined;

export function getFirebaseApp(): App {
  if (firebaseApp) return firebaseApp;

  if (getApps().length > 0) {
    firebaseApp = getApps()[0];
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || 'kiosk-central-77c22';
  const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'kiosk-central-77c22.firebasestorage.app';

  // 1. Try local service account key file
  const localServiceAccountPath = path.resolve(process.cwd(), 'firebase-service-account.json');
  if (fs.existsSync(localServiceAccountPath)) {
    try {
      const serviceAccount = JSON.parse(fs.readFileSync(localServiceAccountPath, 'utf8'));
      firebaseApp = initializeApp({
        credential: cert(serviceAccount),
        projectId,
        storageBucket: bucketName,
      });
      return firebaseApp;
    } catch (e) {
      console.warn('Failed to parse local serviceAccountKey, falling back to default:', e);
    }
  }

  // 2. Fall back to Application Default Credentials (e.g. on Firebase App Hosting / Cloud Run)
  firebaseApp = initializeApp({
    projectId,
    storageBucket: bucketName,
  });

  return firebaseApp;
}

export function getFirestoreDb(): Firestore {
  if (!firestoreDb) {
    const app = getFirebaseApp();
    firestoreDb = getFirestore(app);
  }
  return firestoreDb;
}

export function getFirebaseStorageBucket() {
  if (!storageBucket) {
    const app = getFirebaseApp();
    const storage = getStorage(app);
    const bucketName = process.env.FIREBASE_STORAGE_BUCKET || 'kiosk-central-77c22.firebasestorage.app';
    storageBucket = storage.bucket(bucketName);
  }
  return storageBucket;
}

