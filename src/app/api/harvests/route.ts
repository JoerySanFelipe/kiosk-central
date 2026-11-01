import { NextRequest, NextResponse } from 'next/server';
import {
  getHarvestsByMachine,
  recordHarvest,
  updateHarvest,
  getMachineVaultSummary,
  computeUncollectedCashInVault,
  deleteHarvest,
} from '@/infrastructure/repositories/harvest-repo';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const machineId = searchParams.get('machineId') || undefined;
    const includeSummary = searchParams.get('summary') === 'true';
    const isPreview = searchParams.get('preview') === 'true';
    const upToTime = searchParams.get('upToTime') || undefined;
    const excludeId = searchParams.get('excludeId') || undefined;

    if (isPreview && machineId) {
      const previewData = await computeUncollectedCashInVault(machineId, upToTime, excludeId);
      return NextResponse.json(previewData);
    }

    const harvests = await getHarvestsByMachine(machineId);

    let vaultSummary = null;
    if (includeSummary && machineId && machineId !== 'ALL') {
      vaultSummary = await getMachineVaultSummary(machineId);
    }

    return NextResponse.json({
      harvests,
      vaultSummary,
    });
  } catch (error) {
    console.error('Failed to get harvests:', error);
    return NextResponse.json({ error: 'Failed to retrieve harvests' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      machineId,
      baseAmount,
      adjustments,
      actualAmount,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    } = body;

    if (!machineId) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }

    if (!collectedBy || !collectedBy.trim()) {
      return NextResponse.json({ error: 'Collector / Staff name is required' }, { status: 400 });
    }

    const harvest = await recordHarvest({
      machineId,
      baseAmount: baseAmount !== undefined && baseAmount !== null ? Number(baseAmount) : undefined,
      adjustments: Array.isArray(adjustments) ? adjustments : undefined,
      actualAmount: actualAmount !== undefined ? Number(actualAmount) : undefined,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    });

    return NextResponse.json(harvest, { status: 201 });
  } catch (error) {
    console.error('Failed to record harvest:', error);
    return NextResponse.json({ error: 'Failed to record cash harvest' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      baseAmount,
      adjustments,
      actualAmount,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Harvest ID is required' }, { status: 400 });
    }

    if (!collectedBy || !collectedBy.trim()) {
      return NextResponse.json({ error: 'Collector / Staff name is required' }, { status: 400 });
    }

    const harvest = await updateHarvest(id, {
      baseAmount: baseAmount !== undefined && baseAmount !== null ? Number(baseAmount) : undefined,
      adjustments: Array.isArray(adjustments) ? adjustments : undefined,
      collectedBy,
      harvestedAt,
      reportingDate,
      reportName,
      slipImageUrl,
      notes,
    });

    return NextResponse.json(harvest);
  } catch (error) {
    console.error('Failed to update harvest:', error);
    return NextResponse.json({ error: 'Failed to update cash harvest' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Harvest ID is required' }, { status: 400 });
    }

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
