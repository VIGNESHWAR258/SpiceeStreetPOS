import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export async function GET() {
  try {
    const result = await query('SELECT * FROM spiceestreet.dining_tables ORDER BY name');
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, capacity = 4, active = true } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'name required' }, { status: 400 });
    }

    const id = `table-${randomUUID().slice(0, 8)}`;
    const result = await query(
      `INSERT INTO spiceestreet.dining_tables (id, name, capacity, active)
       VALUES ($1,$2,$3,$4)
       RETURNING *`,
      [id, String(name).trim(), Number(capacity) || 4, Boolean(active)]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
