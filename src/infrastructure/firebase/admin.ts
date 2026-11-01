import { getClientDb, getClientStorage } from './client';

export function getFirestoreDb(): any {
  return getClientDb();
}

export function getFirebaseStorageBucket(): any {
  return getClientStorage();
}
