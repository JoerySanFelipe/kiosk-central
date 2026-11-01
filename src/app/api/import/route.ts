import { NextRequest, NextResponse } from 'next/server';
import { autoDetectAndParse } from '@/infrastructure/parsers/auto-detector';
import { upsertTransactions } from '@/infrastructure/repositories/transaction-repo';
import { recordImportBatch } from '@/infrastructure/repositories/machine-repo';
import { ImportBatch } from '@/domain/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const targetMachineId = (formData.get('machineId') as string) || 'm1';
    const files = formData.getAll('files') as File[];

    if (!files || files.length === 0) {
      return NextResponse.json({ error: 'No files provided' }, { status: 400 });
    }

    const results: Array<{
      fileName: string;
      detectedService: string;
      total: number;
      inserted: number;
      updated: number;
      skipped: number;
    }> = [];

    let overallInserted = 0;
    let overallUpdated = 0;
    let overallSkipped = 0;
    let overallTotal = 0;

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const batchId = 'batch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      try {
        const parseResult = autoDetectAndParse(file.name, buffer, targetMachineId, batchId);
        const upsertResult = await upsertTransactions(parseResult.transactions);

        const batchRecord: ImportBatch = {
          id: batchId,
          fileName: file.name,
          serviceType: parseResult.detectedService,
          targetMachineId,
          totalRows: upsertResult.total,
          insertedRows: upsertResult.inserted,
          updatedRows: upsertResult.updated,
          skippedRows: upsertResult.skipped,
          importedAt: new Date().toISOString(),
        };

        await recordImportBatch(batchRecord);

        results.push({
          fileName: file.name,
          detectedService: parseResult.detectedService,
          ...upsertResult,
        });

        overallInserted += upsertResult.inserted;
        overallUpdated += upsertResult.updated;
        overallSkipped += upsertResult.skipped;
        overallTotal += upsertResult.total;
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown parsing error';
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

    return NextResponse.json({
      success: true,
      summary: {
        total: overallTotal,
        inserted: overallInserted,
        updated: overallUpdated,
        skipped: overallSkipped,
      },
      files: results,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to process import';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
