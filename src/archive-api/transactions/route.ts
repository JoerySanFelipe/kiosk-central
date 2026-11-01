import { NextRequest, NextResponse } from 'next/server';
import { queryTransactions } from '@/infrastructure/repositories/transaction-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId') || undefined;
    const serviceType = searchParams.get('serviceType') || undefined;
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') || undefined;
    const category = searchParams.get('category') || undefined;
    const timeRange = searchParams.get('timeRange') || undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await queryTransactions({
      machineId,
      serviceType,
      search,
      status,
      category,
      timeRange,
      startDate,
      endDate,
      page,
      pageSize,
    });

    return NextResponse.json(result);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to query transactions';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
