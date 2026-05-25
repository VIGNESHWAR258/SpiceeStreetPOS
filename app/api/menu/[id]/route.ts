import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, price, category, dietaryType = "veg", available, image } = body;
    if (!["veg", "non-veg"].includes(String(dietaryType)))
      return NextResponse.json({ error: "dietaryType must be veg or non-veg" }, { status: 400 });
    const result = await query(
      `UPDATE spiceestreet.menu_items SET name=$1, description=$2, price=$3, category=$4, dietary_type=$5, available=$6, image=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [name, description, price, category, dietaryType, available, image ?? null, id]
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
    await query("DELETE FROM spiceestreet.menu_items WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
