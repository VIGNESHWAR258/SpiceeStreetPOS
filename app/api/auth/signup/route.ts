import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, role } = await req.json();

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'name, email, password and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'chef', 'accountant'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be admin, chef, or accountant' }, { status: 400 });
    }

    // Check duplicate email
    const existing = await query(`SELECT id FROM spiceestreet.users WHERE email = $1`, [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = `user-${Date.now()}`;

    const result = await query<{ id: string; name: string; email: string; role: string }>(
      `INSERT INTO spiceestreet.users (id, name, email, password_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, email, role`,
      [id, name, email.toLowerCase(), passwordHash, role]
    );

    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
