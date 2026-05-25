import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const result = await query("SELECT * FROM spiceestreet.menu_items ORDER BY category, name");
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description = "", price, category, dietaryType = "veg", available = true, image } = body;
    if (!name || !price || !category)
      return NextResponse.json({ error: "name, price, category required" }, { status: 400 });
    if (!["veg", "non-veg"].includes(String(dietaryType)))
      return NextResponse.json({ error: "dietaryType must be veg or non-veg" }, { status: 400 });

    const id = "menu-" + randomUUID().slice(0, 8);
    const result = await query(
      `INSERT INTO spiceestreet.menu_items (id, name, description, price, category, dietary_type, available, image)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, name, description, price, category, dietaryType, available, image ?? null]
    );
    return NextResponse.json(result.rows[0], { status: 201 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
