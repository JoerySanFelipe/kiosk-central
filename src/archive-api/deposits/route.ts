import { NextRequest, NextResponse } from 'next/server';
import {
  getDepositedCollections,
  getPendingHarvests,
  getDepositSummary,
  getUnreplenishedDeposits,
  recordDepositedCollection,
} from '@/infrastructure/repositories/deposit-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const isPendingOnly = searchParams.get('pending') === 'true';
    const isUnreplenishedOnly = searchParams.get('unreplenished') === 'true';
    const includeSummary = searchParams.get('summary') === 'true';

    if (isPendingOnly) {
      const pendingHarvests = await getPendingHarvests();
      return NextResponse.json({ pendingHarvests });
    }

    if (isUnreplenishedOnly) {
      const deposits = await getUnreplenishedDeposits();
      return NextResponse.json({ deposits });
    }

    const deposits = await getDepositedCollections();
    const summary = includeSummary ? await getDepositSummary() : undefined;

    return NextResponse.json({
      deposits,
      summary,
    });
  } catch (error) {
    console.error('Failed to get deposits:', error);
    return NextResponse.json({ error: 'Failed to retrieve deposits' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.depositType) {
      return NextResponse.json({ error: 'Deposit type is required' }, { status: 400 });
    }
    if (body.actualAmount === undefined || isNaN(Number(body.actualAmount))) {
      return NextResponse.json({ error: 'Actual amount is required and must be a valid number' }, { status: 400 });
    }
    if (!body.depositedBy || !body.depositedBy.trim()) {
      return NextResponse.json({ error: 'Deposited by is required' }, { status: 400 });
    }

    const record = await recordDepositedCollection({
      depositDate: body.depositDate,
      depositType: body.depositType,
      referenceNo: body.referenceNo,
      harvestIds: Array.isArray(body.harvestIds) ? body.harvestIds : [],
      actualAmount: Number(body.actualAmount),
      depositedBy: body.depositedBy,
      receivedBy: body.receivedBy,
      slipImageUrl: body.slipImageUrl,
      notes: body.notes,
    });

    return NextResponse.json({ success: true, deposit: record }, { status: 201 });
  } catch (error) {
    console.error('Failed to record deposit:', error);
    return NextResponse.json({ error: 'Failed to record deposited collection' }, { status: 500 });
  }
}
