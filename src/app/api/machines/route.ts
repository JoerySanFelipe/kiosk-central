import { NextRequest, NextResponse } from 'next/server';
import { listMachines, createMachine, updateMachine } from '@/infrastructure/repositories/machine-repo';

export async function GET() {
  try {
    const machines = await listMachines();
    return NextResponse.json(machines);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to list machines';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Machine name is required' }, { status: 400 });
    }

    const created = await createMachine(body.name.trim(), body.contactNumber?.trim(), body.location?.trim());
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to create machine';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'Machine ID is required' }, { status: 400 });
    }
    if (!body.name || !body.name.trim()) {
      return NextResponse.json({ error: 'Machine name is required' }, { status: 400 });
    }

    const updated = await updateMachine(body.id, {
      name: body.name.trim(),
      contactNumber: body.contactNumber?.trim(),
      location: body.location?.trim(),
    });

    return NextResponse.json(updated);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update machine';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
