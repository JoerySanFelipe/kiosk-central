import { getFirestoreDb } from '@/infrastructure/firebase/admin';
import { Machine, ImportBatch } from '@/domain/types';

export async function listMachines(): Promise<Machine[]> {
  const db = getFirestoreDb();
  const snapshot = await db.collection('machines').get();
  
  const machines: Machine[] = snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: data.name,
      contactNumber: data.contact_number || data.contactNumber || null,
      location: data.location || null,
      stationName: data.station_name || data.stationName || data.name,
      isDefault: Boolean(data.is_default === 1 || data.is_default === true || data.isDefault),
      createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    };
  });

  return machines.sort((a, b) => {
    if (a.isDefault === b.isDefault) {
      return a.name.localeCompare(b.name);
    }
    return a.isDefault ? -1 : 1;
  });
}

export async function createMachine(name: string, contactNumber?: string, location?: string): Promise<Machine> {
  const db = getFirestoreDb();
  const id = 'm_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();

  const machineData = {
    id,
    name,
    contact_number: contactNumber || null,
    location: location || null,
    station_name: name,
    is_default: 0,
    created_at: now,
  };

  await db.collection('machines').doc(id).set(machineData);

  return {
    id,
    name,
    contactNumber: contactNumber || null,
    location: location || null,
    stationName: name,
    isDefault: false,
    createdAt: now,
  };
}

export async function updateMachine(id: string, params: { name: string; contactNumber?: string; location?: string }): Promise<Machine> {
  const db = getFirestoreDb();
  const docRef = db.collection('machines').doc(id);

  await docRef.update({
    name: params.name,
    contact_number: params.contactNumber || null,
    location: params.location || null,
  });

  const updatedDoc = await docRef.get();
  const data = updatedDoc.data() || {};

  return {
    id,
    name: data.name || params.name,
    contactNumber: data.contact_number || params.contactNumber || null,
    location: data.location || params.location || null,
    stationName: data.station_name || params.name,
    isDefault: Boolean(data.is_default === 1 || data.is_default === true),
    createdAt: data.created_at || new Date().toISOString(),
  };
}

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = getFirestoreDb();
  const doc = await db.collection('system_settings').doc(key).get();
  if (doc.exists) {
    const data = doc.data();
    return data?.value !== undefined ? String(data.value) : defaultValue;
  }
  return defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getFirestoreDb();
  await db.collection('system_settings').doc(key).set({
    key,
    value,
  });
}

export async function recordImportBatch(batch: ImportBatch): Promise<void> {
  const db = getFirestoreDb();
  await db.collection('import_batches').doc(batch.id).set({
    id: batch.id,
    file_name: batch.fileName,
    service_type: batch.serviceType,
    target_machine_id: batch.targetMachineId,
    total_rows: batch.totalRows,
    inserted_rows: batch.insertedRows,
    updated_rows: batch.updatedRows,
    skipped_rows: batch.skippedRows,
    imported_at: batch.importedAt,
  });
}

export async function listImportBatches(): Promise<ImportBatch[]> {
  const db = getFirestoreDb();
  const snapshot = await db.collection('import_batches').orderBy('imported_at', 'desc').limit(50).get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      fileName: data.file_name || data.fileName,
      serviceType: data.service_type || data.serviceType,
      targetMachineId: data.target_machine_id || data.targetMachineId,
      totalRows: data.total_rows ?? data.totalRows ?? 0,
      insertedRows: data.inserted_rows ?? data.insertedRows ?? 0,
      updatedRows: data.updated_rows ?? data.updatedRows ?? 0,
      skippedRows: data.skipped_rows ?? data.skippedRows ?? 0,
      importedAt: data.imported_at || data.importedAt,
    };
  });
}
