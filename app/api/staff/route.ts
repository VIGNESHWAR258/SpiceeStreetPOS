import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const result = await query("SELECT * FROM staff ORDER BY name");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, role, phone, status = "active" } = body;
    if (!name || !email || !role)
      return NextResponse.json({ error: "name, email, role required" }, { status: 400 });

    const id = "staff-" + randomUUID().slice(0, 8);
    const result = await query(
      `INSERT INTO staff (id, name, email, role, status, phone) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, name, email, role, status, phone ?? null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
