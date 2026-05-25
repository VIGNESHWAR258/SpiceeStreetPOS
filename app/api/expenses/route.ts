import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const result = await query("SELECT * FROM expenses ORDER BY created_at DESC");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { description, amount, category, submittedBy, status = "pending" } = body;
    if (!description || !amount || !category || !submittedBy)
      return NextResponse.json({ error: "description, amount, category, submittedBy required" }, { status: 400 });

    const id = "exp-" + randomUUID().slice(0, 8);
    const result = await query(
      `INSERT INTO expenses (id, description, amount, category, status, submitted_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, description, amount, category, status, submittedBy]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
