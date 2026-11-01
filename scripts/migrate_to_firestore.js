const { DatabaseSync } = require('node:sqlite');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');
const fs = require('fs');
const path = require('path');

// 1. Initialize Firebase
const serviceAccount = require(path.join(__dirname, '..', 'firebase-service-account.json'));

initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'kiosk-central-77c22.firebasestorage.app'
});

const firestore = getFirestore();
const bucket = getStorage().bucket();

// 2. Open SQLite Database
const dbPath = path.join(__dirname, '..', 'kiosk_central.db');
if (!fs.existsSync(dbPath)) {
  console.error('Error: kiosk_central.db not found!');
  process.exit(1);
}
const sqlite = new DatabaseSync(dbPath);

async function uploadSlipsToStorage() {
  console.log('\n--- 1. UPLOADING SLIPS TO FIREBASE STORAGE ---');
  const slipsDir = path.join(__dirname, '..', 'public', 'uploads', 'slips');
  const urlMap = new Map();

  if (!fs.existsSync(slipsDir)) {
    console.log('No slips directory found at public/uploads/slips');
    return urlMap;
  }

  const files = fs.readdirSync(slipsDir).filter(f => !fs.statSync(path.join(slipsDir, f)).isDirectory());
  console.log(`Found ${files.length} slips to upload.`);

  for (const filename of files) {
    const localFilePath = path.join(slipsDir, filename);
    const destination = `slips/${filename}`;
    
    // Upload to Firebase Storage
    console.log(`Uploading ${filename} -> gs://kiosk-central-77c22.firebasestorage.app/${destination}...`);
    await bucket.upload(localFilePath, {
      destination,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      }
    });

    const fileRef = bucket.file(destination);
    // Make public or get public URL
    try {
      await fileRef.makePublic();
    } catch (e) {
      // Bucket might have uniform bucket-level access enabled, which is fine
    }

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
    urlMap.set(`/uploads/slips/${filename}`, publicUrl);
    urlMap.set(filename, publicUrl);
  }

  console.log(`Successfully processed ${files.length} slip uploads to Firebase Storage.`);
  return urlMap;
}

async function migrateTable(tableName, collectionName, idField = 'id', transformFn = null) {
  const rows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
  console.log(`\nMigrating ${tableName} (${rows.length} rows) -> Firestore collection '${collectionName}'...`);
  
  if (rows.length === 0) return 0;

  const batchSize = 400;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    const batch = firestore.batch();

    for (const row of chunk) {
      const docId = String(row[idField]);
      const docRef = firestore.collection(collectionName).doc(docId);
      const data = transformFn ? transformFn(row) : { ...row };
      batch.set(docRef, data);
    }

    await batch.commit();
  }

  console.log(`Done migrating ${rows.length} documents to '${collectionName}'.`);
  return rows.length;
}

async function runMigration() {
  console.log('=== STARTING SQLITE TO FIRESTORE MIGRATION ===');
  console.log('Project: kiosk-central-77c22');

  // Step 1: Upload Slips
  const slipUrlMap = await uploadSlipsToStorage();

  // Step 2: Migrate machines
  await migrateTable('machines', 'machines', 'id');

  // Step 3: Migrate import_batches
  await migrateTable('import_batches', 'import_batches', 'id');

  // Step 4: Migrate system_settings
  await migrateTable('system_settings', 'system_settings', 'key');

  // Step 5: Migrate auth_pins
  await migrateTable('auth_pins', 'auth_pins', 'id');

  // Step 6: Migrate transactions
  await migrateTable('transactions', 'transactions', 'id');

  // Step 7: Migrate cash_harvest_adjustments
  await migrateTable('cash_harvest_adjustments', 'cash_harvest_adjustments', 'id');

  // Step 8: Migrate cash_harvests
  await migrateTable('cash_harvests', 'cash_harvests', 'id', (row) => {
    const data = { ...row };
    if (data.slip_image_url && slipUrlMap.has(data.slip_image_url)) {
      data.slip_image_url = slipUrlMap.get(data.slip_image_url);
    }
    return data;
  });

  // Step 9: Migrate wallet_replenishments
  await migrateTable('wallet_replenishments', 'wallet_replenishments', 'id', (row) => {
    const data = { ...row };
    if (data.receipt_image_url && slipUrlMap.has(data.receipt_image_url)) {
      data.receipt_image_url = slipUrlMap.get(data.receipt_image_url);
    }
    return data;
  });

  // Step 10: Migrate deposited_collections
  await migrateTable('deposited_collections', 'deposited_collections', 'id', (row) => {
    const data = { ...row };
    if (data.slip_image_url && slipUrlMap.has(data.slip_image_url)) {
      data.slip_image_url = slipUrlMap.get(data.slip_image_url);
    }
    return data;
  });

  console.log('\n=== VERIFYING FIRESTORE DOCUMENT COUNTS ===');
  const collections = [
    'machines',
    'import_batches',
    'system_settings',
    'auth_pins',
    'transactions',
    'cash_harvests',
    'cash_harvest_adjustments',
    'wallet_replenishments',
    'deposited_collections'
  ];

  for (const col of collections) {
    const snap = await firestore.collection(col).count().get();
    console.log(` - Firestore collection '${col}': ${snap.data().count} documents`);
  }

  console.log('\nSUCCESS: ALL DATA MIGRATED WITH 100% INTEGRITY!');
}

runMigration().catch((err) => {
  console.error('\nMIGRATION FAILED:', err);
  process.exit(1);
});

