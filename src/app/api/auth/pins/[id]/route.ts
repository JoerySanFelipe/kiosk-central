import { NextRequest, NextResponse } from 'next/server';
import { toggleAuthPin, deleteAuthPin } from '@/infrastructure/repositories/auth-repo';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { isActive } = body;

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ success: false, error: 'isActive must be a boolean' }, { status: 400 });
    }

    const updated = await toggleAuthPin(id, isActive);
    return NextResponse.json({ success: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteAuthPin(id);
    return NextResponse.json({ success: deleted });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
