import { getClientStorage } from '../firebase/client';
import { listMachines, createMachine, updateMachine, getSetting, setSetting, recordImportBatch } from '../repositories/machine-repo';
import { queryTransactions, getTransactionById, updateTransaction, computeFinancialSummary, upsertTransactions } from '../repositories/transaction-repo';
import { getHarvestsByMachine, getHarvestById, recordHarvest, updateHarvest, deleteHarvest, computeUncollectedCashInVault, getMachineVaultSummary, getTransactionsForHarvest } from '../repositories/harvest-repo';
import { getDepositedCollections, getDepositedCollectionById, recordDepositedCollection, deleteDepositedCollection, toggleDepositReplenished, getPendingHarvests, getUnreplenishedDeposits, getDepositSummary } from '../repositories/deposit-repo';
import { listReplenishments, createReplenishment, deleteReplenishment, getReplenishmentTotal } from '../repositories/replenishment-repo';
import { verifyPin, listAuthPins, createAuthPin, toggleAuthPin, deleteAuthPin } from '../repositories/auth-repo';
import { computeSalesAuditReport } from '../repositories/audit-repo';
import { autoDetectAndParse } from '../parsers/auto-detector';
import { getFirestoreDb } from '../firebase/admin';

let isInterceptorInstalled = false;

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export function installClientApiRouter() {
  if (typeof window === 'undefined' || isInterceptorInstalled) return;
  isInterceptorInstalled = true;

  const originalFetch = window.fetch;

  window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const urlString = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

    if (!urlString.startsWith('/api/') && !urlString.includes('://') && !urlString.startsWith('/api')) {
      return originalFetch.apply(this, [input, init]);
    }

    try {
      const url = new URL(urlString, window.location.origin);
      if (!url.pathname.startsWith('/api/')) {
        return originalFetch.apply(this, [input, init]);
      }

      const method = (init?.method || 'GET').toUpperCase();
      const pathname = url.pathname;
      const searchParams = url.searchParams;

      // 1. Auth: Verify PIN
      if (pathname === '/api/auth/verify-pin' && method === 'POST') {
        const body = init?.body ? JSON.parse(init.body as string) : {};
        const result = await verifyPin(body.pin || '');
        if (!result.success) {
          return jsonResponse({ success: false, error: 'Incorrect PIN code' }, 401);
        }
        return jsonResponse({ success: true, label: result.label });
      }

      // 2. Auth: Pins list and create
      if (pathname === '/api/auth/pins') {
        if (method === 'GET') {
          const pins = await listAuthPins();
          return jsonResponse({ success: true, pins });
        }
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const created = await createAuthPin(body.label, body.pin);
          return jsonResponse({ success: true, pin: created }, 201);
        }
      }

      // 3. Auth: Pin [id]
      const pinIdMatch = pathname.match(/^\/api\/auth\/pins\/([^/]+)$/);
      if (pinIdMatch) {
        const id = pinIdMatch[1];
        if (method === 'PATCH') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const updated = await toggleAuthPin(id, body.isActive);
          return jsonResponse({ success: updated });
        }
        if (method === 'DELETE') {
          const deleted = await deleteAuthPin(id);
          return jsonResponse({ success: deleted });
        }
      }

      // 4. Machines
      if (pathname === '/api/machines') {
        if (method === 'GET') {
          const machines = await listMachines();
          return jsonResponse(machines);
        }
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const created = await createMachine(body.name, body.contactNumber, body.location);
          return jsonResponse(created, 201);
        }
        if (method === 'PUT') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const updated = await updateMachine(body.id, {
            name: body.name,
            contactNumber: body.contactNumber,
            location: body.location,
          });
          return jsonResponse(updated);
        }
      }

      // 5. Settings
      if (pathname === '/api/settings') {
        if (method === 'GET') {
          const currency = await getSetting('currency', '₱');
          return jsonResponse({ currency });
        }
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          if (body.currency) {
            await setSetting('currency', body.currency);
          }
          return jsonResponse({ success: true, currency: body.currency });
        }
      }

      // 6. Settings Backup
      if (pathname === '/api/settings/backup' && method === 'GET') {
        const db = getFirestoreDb();
        const collections = [
          'machines', 'import_batches', 'system_settings', 'auth_pins',
          'transactions', 'cash_harvests', 'cash_harvest_adjustments',
          'wallet_replenishments', 'deposited_collections'
        ];
        const backupData: Record<string, any[]> = {};
        for (const col of collections) {
          const snap = await db.collection(col).get();
          backupData[col] = snap.docs.map((d: any) => ({ id: d.id, ...d.data() }));
        }
        const jsonStr = JSON.stringify(backupData, null, 2);
        const dateStr = new Date().toISOString().split('T')[0];
        return new Response(jsonStr, {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Content-Disposition': `attachment; filename="kiosk_central_backup_${dateStr}.json"`,
          },
        });
      }

      // 7. Stats
      if (pathname === '/api/stats' && method === 'GET') {
        const machineId = searchParams.get('machineId') || undefined;
        const timeRange = searchParams.get('timeRange') || undefined;
        const startDate = searchParams.get('startDate') || undefined;
        const endDate = searchParams.get('endDate') || undefined;
        const summary = await computeFinancialSummary(machineId, timeRange, startDate, endDate);
        return jsonResponse(summary);
      }

      // 8. Transactions: query
      if (pathname === '/api/transactions' && method === 'GET') {
        const result = await queryTransactions({
          machineId: searchParams.get('machineId') || undefined,
          serviceType: searchParams.get('serviceType') || undefined,
          search: searchParams.get('search') || undefined,
          status: searchParams.get('status') || undefined,
          category: searchParams.get('category') || undefined,
          timeRange: searchParams.get('timeRange') || undefined,
          startDate: searchParams.get('startDate') || undefined,
          endDate: searchParams.get('endDate') || undefined,
          page: parseInt(searchParams.get('page') || '1', 10),
          pageSize: parseInt(searchParams.get('pageSize') || '20', 10),
        });
        return jsonResponse(result);
      }

      // 9. Transaction [id]
      const txIdMatch = pathname.match(/^\/api\/transactions\/([^/]+)$/);
      if (txIdMatch) {
        const id = txIdMatch[1];
        if (method === 'GET') {
          const transaction = await getTransactionById(id);
          if (!transaction) return jsonResponse({ error: 'Transaction not found' }, 404);
          return jsonResponse(transaction);
        }
        if (method === 'PATCH') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const updated = await updateTransaction(id, body);
          return jsonResponse({ success: true, transaction: updated });
        }
      }

      // 10. Harvests: list, preview, create, update, delete
      if (pathname === '/api/harvests') {
        if (method === 'GET') {
          const machineId = searchParams.get('machineId') || undefined;
          const isPreview = searchParams.get('preview') === 'true';
          const upToTime = searchParams.get('upToTime') || undefined;
          const excludeId = searchParams.get('excludeId') || undefined;
          const includeSummary = searchParams.get('summary') === 'true';

          if (isPreview && machineId) {
            const previewData = await computeUncollectedCashInVault(machineId, upToTime, excludeId);
            return jsonResponse(previewData);
          }

          const harvests = await getHarvestsByMachine(machineId);
          let vaultSummary: any = null;
          if (includeSummary && machineId && machineId !== 'ALL') {
            vaultSummary = await getMachineVaultSummary(machineId);
          }
          return jsonResponse({ harvests, vaultSummary });
        }

        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const harvest = await recordHarvest(body);
          return jsonResponse(harvest, 201);
        }

        if (method === 'PUT') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const harvest = await updateHarvest(body.id, body);
          return jsonResponse(harvest);
        }

        if (method === 'DELETE') {
          const id = searchParams.get('id');
          if (!id) return jsonResponse({ error: 'Harvest ID required' }, 400);
          const success = await deleteHarvest(id);
          return jsonResponse({ success });
        }
      }

      // 11. Harvest [id]
      const harvestIdMatch = pathname.match(/^\/api\/harvests\/([^/]+)$/);
      if (harvestIdMatch) {
        const id = harvestIdMatch[1];
        if (method === 'GET') {
          if (searchParams.get('includeTransactions') === 'true') {
            const data = await getTransactionsForHarvest(id);
            return jsonResponse(data || { error: 'Not found' }, data ? 200 : 404);
          }
          const harvest = await getHarvestById(id);
          return jsonResponse(harvest || { error: 'Not found' }, harvest ? 200 : 404);
        }
        if (method === 'PUT') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const updated = await updateHarvest(id, body);
          return jsonResponse(updated);
        }
        if (method === 'DELETE') {
          const success = await deleteHarvest(id);
          return jsonResponse({ success });
        }
      }

      // 12. Deposits
      if (pathname === '/api/deposits') {
        if (method === 'GET') {
          if (searchParams.get('pending') === 'true') {
            const pendingHarvests = await getPendingHarvests();
            return jsonResponse({ pendingHarvests });
          }
          if (searchParams.get('unreplenished') === 'true') {
            const deposits = await getUnreplenishedDeposits();
            return jsonResponse({ deposits });
          }
          const deposits = await getDepositedCollections();
          const summary = searchParams.get('summary') === 'true' ? await getDepositSummary() : undefined;
          return jsonResponse({ deposits, summary });
        }
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const record = await recordDepositedCollection(body);
          return jsonResponse({ success: true, deposit: record }, 201);
        }
      }

      // 13. Deposit [id]
      const depIdMatch = pathname.match(/^\/api\/deposits\/([^/]+)$/);
      if (depIdMatch) {
        const id = depIdMatch[1];
        if (method === 'GET') {
          const dep = await getDepositedCollectionById(id);
          return jsonResponse(dep ? { deposit: dep } : { error: 'Not found' }, dep ? 200 : 404);
        }
        if (method === 'DELETE') {
          const success = await deleteDepositedCollection(id);
          return jsonResponse({ success });
        }
        if (method === 'PATCH') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const updated = await toggleDepositReplenished(id, body.isReplenished, body.walletReplenishmentId);
          return jsonResponse({ success: true, deposit: updated });
        }
      }

      // 14. Wallet Replenishments
      if (pathname === '/api/wallet-replenishments') {
        if (method === 'GET') {
          const replenishments = await listReplenishments();
          const total = await getReplenishmentTotal();
          return jsonResponse({ replenishments, total });
        }
        if (method === 'POST') {
          const body = init?.body ? JSON.parse(init.body as string) : {};
          const created = await createReplenishment(body);
          return jsonResponse(created, 201);
        }
      }

      const repIdMatch = pathname.match(/^\/api\/wallet-replenishments\/([^/]+)$/);
      if (repIdMatch) {
        const id = repIdMatch[1];
        if (method === 'DELETE') {
          const success = await deleteReplenishment(id);
          return jsonResponse({ success });
        }
      }

      // 15. Uploads: Upload directly to Firebase Storage bucket!
      if (pathname === '/api/uploads' && method === 'POST') {
        const formData = init?.body as FormData;
        const file = formData.get('file') as File;
        if (!file) return jsonResponse({ error: 'No file' }, 400);

        const storage = getClientStorage();
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filename = `slip_${Date.now()}_${safeOriginalName}`;
        const storageRef = storage.ref(`slips/${filename}`);

        const bytes = await file.arrayBuffer();
        const uploadTask = await storageRef.put(bytes, {
          contentType: file.type || 'image/jpeg',
          cacheControl: 'public, max-age=31536000',
        });

        const downloadUrl = await uploadTask.ref.getDownloadURL();
        return jsonResponse({ success: true, url: downloadUrl });
      }

      // 16. Import files
      if (pathname === '/api/import' && method === 'POST') {
        const formData = init?.body as FormData;
        const targetMachineId = (formData.get('machineId') as string) || 'm1';
        const files = formData.getAll('files') as File[];

        let overallInserted = 0;
        let overallUpdated = 0;
        let overallSkipped = 0;
        let overallTotal = 0;
        const results: any[] = [];

        for (const file of files) {
          const arrayBuffer = await file.arrayBuffer();
          const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

          try {
            const parseResult = autoDetectAndParse(file.name, arrayBuffer, targetMachineId, batchId);
            const upsertResult = await upsertTransactions(parseResult.transactions);

            await recordImportBatch({
              id: batchId,
              fileName: file.name,
              serviceType: parseResult.detectedService,
              targetMachineId,
              totalRows: upsertResult.total,
              insertedRows: upsertResult.inserted,
              updatedRows: upsertResult.updated,
              skippedRows: upsertResult.skipped,
              importedAt: new Date().toISOString(),
            });

            results.push({
              fileName: file.name,
              detectedService: parseResult.detectedService,
              ...upsertResult,
            });

            overallInserted += upsertResult.inserted;
            overallUpdated += upsertResult.updated;
            overallSkipped += upsertResult.skipped;
            overallTotal += upsertResult.total;
          } catch (err: any) {
            results.push({
              fileName: file.name,
              detectedService: 'ERROR',
              total: 0,
              inserted: 0,
              updated: 0,
              skipped: 0,
            });
          }
        }

        return jsonResponse({
          success: true,
          summary: {
            total: overallTotal,
            inserted: overallInserted,
            updated: overallUpdated,
            skipped: overallSkipped,
          },
          files: results,
        });
      }

      // 17. Sales Audit Report
      if (pathname === '/api/audit' && method === 'GET') {
        const report = await computeSalesAuditReport();
        return jsonResponse(report);
      }

      // Fallback
      return originalFetch.apply(this, [input, init]);
    } catch (err: any) {
      console.error('Client API Router Error:', err);
      return jsonResponse({ error: err.message || 'Client router error' }, 500);
    }
  };
}

if (typeof window !== 'undefined') {
  installClientApiRouter();
}
