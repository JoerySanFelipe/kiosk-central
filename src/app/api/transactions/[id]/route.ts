import { NextRequest, NextResponse } from 'next/server';
import { getTransactionById, updateTransaction } from '@/infrastructure/repositories/transaction-repo';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await getTransactionById(id);

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    return NextResponse.json(transaction);
  } catch (error) {
    console.error('Failed to get transaction:', error);
    return NextResponse.json({ error: 'Failed to retrieve transaction' }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const updated = await updateTransaction(id, body);

    if (!updated) {
      return NextResponse.json({ error: 'Transaction not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      transaction: updated,
    });
  } catch (error) {
    console.error('Failed to update transaction:', error);
    return NextResponse.json({ error: 'Failed to update transaction' }, { status: 500 });
  }
}
