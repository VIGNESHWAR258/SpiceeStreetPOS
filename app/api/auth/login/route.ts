import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const result = await query<{
      id: string;
      name: string;
      display_name: string;
      email: string;
      password_hash: string;
      role: string;
      status: string;
    }>(
      `SELECT
         u.id,
         u.name,
         COALESCE(s.name, u.name) AS display_name,
         u.email,
         u.password_hash,
         u.role,
         u.status
       FROM spiceestreet.users u
       LEFT JOIN staff s ON LOWER(s.email) = LOWER(u.email)
       WHERE LOWER(u.email) = LOWER($1)
       LIMIT 1`,
      [email.toLowerCase()]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = result.rows[0];

    if (user.status !== 'active') {
      return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    return NextResponse.json({
      id: user.id,
      name: user.display_name,
      email: user.email,
      role: user.role,
    });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
