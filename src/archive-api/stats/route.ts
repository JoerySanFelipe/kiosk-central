import { NextRequest, NextResponse } from 'next/server';
import { computeFinancialSummary } from '@/infrastructure/repositories/transaction-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId') || undefined;
    const timeRange = searchParams.get('timeRange') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;

    const summary = await computeFinancialSummary(machineId, timeRange, startDate, endDate);
    return NextResponse.json(summary);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch financial summary';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
