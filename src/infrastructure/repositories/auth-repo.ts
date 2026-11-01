import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import crypto from 'crypto';

export interface AuthPinItem {
  id: string;
  label: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function hashPin(pin: string): string {
  return crypto.createHash('sha256').update(pin.trim()).digest('hex');
}

export async function verifyPin(pin: string): Promise<{ success: boolean; label?: string; pinId?: string }> {
  const db = getFirestoreDb();
  const inputHash = hashPin(pin);

  const snapshot = await db.collection('auth_pins')
    .where('pin_hash', '==', inputHash)
    .where('is_active', 'in', [1, true])
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const doc = snapshot.docs[0];
    const data = doc.data();
    return {
      success: true,
      label: data.label,
      pinId: doc.id,
    };
  }

  return { success: false };
}

export async function listAuthPins(): Promise<AuthPinItem[]> {
  const db = getFirestoreDb();
  const snapshot = await db.collection('auth_pins').orderBy('created_at', 'asc').get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      label: data.label,
      isActive: Boolean(data.is_active === 1 || data.is_active === true),
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  });
}

export async function createAuthPin(label: string, pin: string): Promise<{ id: string; label: string }> {
  if (!label.trim()) {
    throw new Error('Label is required');
  }
  const cleanPin = pin.trim();
  if (cleanPin.length < 4 || cleanPin.length > 8 || !/^\d+$/.test(cleanPin)) {
    throw new Error('PIN must be 4 to 8 digits');
  }

  const db = getFirestoreDb();
  const id = `pin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const pinHash = hashPin(cleanPin);

  await db.collection('auth_pins').doc(id).set({
    id,
    label: label.trim(),
    pin_hash: pinHash,
    is_active: 1,
    created_at: now,
    updated_at: now,
  });

  return { id, label: label.trim() };
}

export async function toggleAuthPin(id: string, isActive: boolean): Promise<boolean> {
  const db = getFirestoreDb();
  const now = new Date().toISOString();
  const docRef = db.collection('auth_pins').doc(id);
  const doc = await docRef.get();
  if (!doc.exists) return false;

  await docRef.update({
    is_active: isActive ? 1 : 0,
    updated_at: now,
  });

  return true;
}

export async function deleteAuthPin(id: string): Promise<boolean> {
  const db = getFirestoreDb();
  const snapshot = await db.collection('auth_pins').where('is_active', 'in', [1, true]).get();
  
  const targetDoc = await db.collection('auth_pins').doc(id).get();
  if (!targetDoc.exists) return false;

  const targetData = targetDoc.data();
  const isTargetActive = targetData?.is_active === 1 || targetData?.is_active === true;

  if (isTargetActive && snapshot.size <= 1) {
    throw new Error('Cannot delete the only active PIN. Please add or activate another PIN first.');
  }

  await db.collection('auth_pins').doc(id).delete();
  return true;
}
