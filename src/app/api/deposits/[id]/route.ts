import { NextRequest, NextResponse } from 'next/server';
import {
  getDepositedCollectionById,
  deleteDepositedCollection,
  toggleDepositReplenished,
} from '@/infrastructure/repositories/deposit-repo';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deposit = await getDepositedCollectionById(id);

    if (!deposit) {
      return NextResponse.json({ error: 'Deposit record not found' }, { status: 404 });
    }

    return NextResponse.json({ deposit });
  } catch (error) {
    console.error('Failed to get deposit by ID:', error);
    return NextResponse.json({ error: 'Failed to retrieve deposit' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteDepositedCollection(id);

    if (!success) {
      return NextResponse.json({ error: 'Deposit record not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete deposit:', error);
    return NextResponse.json({ error: 'Failed to delete deposit record' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await toggleDepositReplenished(
      id,
      body.isReplenished,
      body.walletReplenishmentId
    );

    if (!updated) {
      return NextResponse.json({ error: 'Deposit record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, deposit: updated });
  } catch (error) {
    console.error('Failed to update deposit replenished status:', error);
    return NextResponse.json({ error: 'Failed to update deposit record' }, { status: 500 });
  }
}
