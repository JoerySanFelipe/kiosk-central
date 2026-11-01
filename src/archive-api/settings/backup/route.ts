import { NextResponse } from 'next/server';
import { getFirestoreDb } from '@/infrastructure/firebase/admin';

export async function GET() {
  try {
    const db = getFirestoreDb();
    const collections = [
      'machines',
      'import_batches',
      'system_settings',
      'auth_pins',
      'transactions',
      'cash_harvests',
      'cash_harvest_adjustments',
      'wallet_replenishments',
      'deposited_collections',
    ];

    const backupData: Record<string, any[]> = {};

    for (const col of collections) {
      const snap = await db.collection(col).get();
      backupData[col] = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }

    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `kiosk_central_firestore_backup_${dateStr}.json`;
    const jsonString = JSON.stringify(backupData, null, 2);

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
