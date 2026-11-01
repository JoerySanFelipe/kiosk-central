import { NextRequest, NextResponse } from 'next/server';
import { listAuthPins, createAuthPin } from '@/infrastructure/repositories/auth-repo';

export async function GET() {
  try {
    const pins = await listAuthPins();
    return NextResponse.json({ success: true, pins });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { label, pin } = body;

    if (!label || !pin) {
      return NextResponse.json({ success: false, error: 'Label and PIN code are required' }, { status: 400 });
    }

    const created = await createAuthPin(label, pin);
    return NextResponse.json({ success: true, pin: created }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
