import { NextRequest, NextResponse } from 'next/server';
import {
  listReplenishments,
  createReplenishment,
  getReplenishmentTotal,
} from '@/infrastructure/repositories/replenishment-repo';

export async function GET() {
  try {
    const list = await listReplenishments();
    const total = await getReplenishmentTotal();
    return NextResponse.json({ replenishments: list, total });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch replenishments';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const amount = Number(body.amount);

    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Valid positive amount is required' }, { status: 400 });
    }

    const created = await createReplenishment({
      amount,
      source: body.source,
      referenceNo: body.referenceNo,
      receiptImageUrl: body.receiptImageUrl,
      replenishedAt: body.replenishedAt,
      notes: body.notes,
      linkedDepositIds: Array.isArray(body.linkedDepositIds) ? body.linkedDepositIds : undefined,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create replenishment';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
