import { NextRequest, NextResponse } from 'next/server';
import { getSetting, setSetting } from '@/infrastructure/repositories/machine-repo';

export async function GET() {
  try {
    const currency = await getSetting('currency', '₱');
    return NextResponse.json({ currency });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to fetch settings';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (body.currency) {
      await setSetting('currency', body.currency);
    }
    return NextResponse.json({ success: true, currency: body.currency });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update settings';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
