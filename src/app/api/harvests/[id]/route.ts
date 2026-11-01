import { NextRequest, NextResponse } from 'next/server';
import {
  getHarvestById,
  updateHarvest,
  deleteHarvest,
  getTransactionsForHarvest,
} from '@/infrastructure/repositories/harvest-repo';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const includeTransactions = searchParams.get('includeTransactions') === 'true';

    if (includeTransactions) {
      const data = await getTransactionsForHarvest(id);
      if (!data) {
        return NextResponse.json({ error: 'Harvest record not found' }, { status: 404 });
      }
      return NextResponse.json(data);
    }

    const harvest = await getHarvestById(id);
    if (!harvest) {
      return NextResponse.json({ error: 'Harvest record not found' }, { status: 404 });
    }

    return NextResponse.json(harvest);
  } catch (error) {
    console.error('Failed to get harvest by id:', error);
    return NextResponse.json({ error: 'Failed to retrieve harvest record' }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      baseAmount,
      adjustments,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    } = body;

    if (!collectedBy || !collectedBy.trim()) {
      return NextResponse.json({ error: 'Collector / Staff name is required' }, { status: 400 });
    }

    const updated = await updateHarvest(id, {
      baseAmount: baseAmount !== undefined && baseAmount !== null ? Number(baseAmount) : undefined,
      adjustments: Array.isArray(adjustments) ? adjustments : undefined,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update harvest:', error);
    return NextResponse.json({ error: 'Failed to update harvest' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteHarvest(id);

    if (!success) {
      return NextResponse.json({ error: 'Harvest not found or failed to delete' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete harvest:', error);
    return NextResponse.json({ error: 'Failed to delete harvest' }, { status: 500 });
  }
}
