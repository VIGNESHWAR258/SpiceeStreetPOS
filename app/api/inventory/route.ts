import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const result = await query("SELECT * FROM inventory_items ORDER BY name");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, quantity, unit, minThreshold = 0, costPerUnit = 0, supplier } = body;
    if (!name || quantity == null || !unit)
      return NextResponse.json({ error: "name, quantity, unit required" }, { status: 400 });

    const id = "inv-" + randomUUID().slice(0, 8);
    const result = await query(
      `INSERT INTO inventory_items (id, name, quantity, unit, min_threshold, cost_per_unit, supplier)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [id, name, quantity, unit, minThreshold, costPerUnit, supplier ?? null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
