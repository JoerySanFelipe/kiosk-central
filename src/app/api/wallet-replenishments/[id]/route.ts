import { NextRequest, NextResponse } from 'next/server';
import { deleteReplenishment } from '@/infrastructure/repositories/replenishment-repo';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const success = await deleteReplenishment(id);

    if (!success) {
      return NextResponse.json({ error: 'Replenishment record not found or could not be deleted' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete replenishment:', error);
    return NextResponse.json({ error: 'Failed to delete replenishment record' }, { status: 500 });
  }
}
