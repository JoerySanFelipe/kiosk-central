import { NextRequest, NextResponse } from 'next/server';
import { verifyPin } from '@/infrastructure/repositories/auth-repo';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pin } = body;

    if (!pin || typeof pin !== 'string') {
      return NextResponse.json({ success: false, error: 'PIN is required' }, { status: 400 });
    }

    const result = await verifyPin(pin);
    if (!result.success) {
      return NextResponse.json({ success: false, error: 'Incorrect PIN code' }, { status: 401 });
    }

    // Set auth cookie
    const response = NextResponse.json({
      success: true,
      label: result.label,
    });

    response.cookies.set('kc_session', 'authenticated', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    });

    return response;
  } catch (err: any) {
    console.error('PIN verification error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Verification failed' }, { status: 500 });
  }
}
