import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.restock != null) {
      const result = await query(
        `UPDATE inventory_items SET quantity = quantity + $1, last_restocked = NOW(), updated_at = NOW()
         WHERE id=$2 RETURNING *`,
        [body.restock, id]
      );
      if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json(result.rows[0]);
    }

    const { name, quantity, unit, minThreshold, costPerUnit, supplier } = body;
    const result = await query(
      `UPDATE inventory_items SET name=$1, quantity=$2, unit=$3, min_threshold=$4, cost_per_unit=$5, supplier=$6, updated_at=NOW()
       WHERE id=$7 RETURNING *`,
      [name, quantity, unit, minThreshold, costPerUnit, supplier ?? null, id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM inventory_items WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
