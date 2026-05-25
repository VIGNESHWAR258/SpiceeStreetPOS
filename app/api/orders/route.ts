import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { randomUUID } from "crypto";

async function ensureOrderItemStatusColumn(client: { query: (text: string, params?: unknown[]) => Promise<{ rows: Array<{ exists?: boolean }> }> }) {
  const hasStatusRes = await client.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'spiceestreet'
        AND table_name = 'order_items'
        AND column_name = 'status'
    )`
  );
  const hasStatus = Boolean(hasStatusRes.rows[0]?.exists);
  if (!hasStatus) {
    await client.query(`ALTER TABLE spiceestreet.order_items ADD COLUMN status text NOT NULL DEFAULT 'pending'`);
  }
}

export async function GET() {
  try {
    const client = await pool.connect();
    try {
      await ensureOrderItemStatusColumn(client);
      const ordersRes = await client.query("SELECT * FROM spiceestreet.orders ORDER BY created_at DESC");
      const itemsRes  = await client.query("SELECT * FROM spiceestreet.order_items");
      const orders = ordersRes.rows.map((o) => ({
        ...o,
        items: itemsRes.rows.filter((i) => i.order_id === o.id),
      }));
      return NextResponse.json(orders);
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const { orderType = "dining", tableId = null, tableNumber = null, items, notes } = body;
    if (!items?.length) return NextResponse.json({ error: "items required" }, { status: 400 });
    if (!["dining", "takeaway"].includes(String(orderType))) {
      return NextResponse.json({ error: "orderType must be dining or takeaway" }, { status: 400 });
    }
    if (orderType === "dining" && !tableNumber) {
      return NextResponse.json({ error: "tableNumber required for dining orders" }, { status: 400 });
    }

    const subtotal = items.reduce((s: number, i: { price: number; quantity: number }) => s + i.price * i.quantity, 0);
    const orderId = "order-" + randomUUID().slice(0, 8);

    await client.query("BEGIN");
    await ensureOrderItemStatusColumn(client);
    await client.query(
      `INSERT INTO spiceestreet.orders
        (id, order_type, table_id, table_number, status, subtotal, total, payment_status, notes)
       VALUES ($1,$2,$3,$4,'pending',$5,$5,'unpaid',$6)`,
      [orderId, orderType, tableId ?? null, orderType === "takeaway" ? "Takeaway" : tableNumber, subtotal, notes ?? null]
    );
    for (const item of items) {
      const itemId = "oi-" + randomUUID().slice(0, 8);
      await client.query(
        `INSERT INTO spiceestreet.order_items (id, order_id, menu_item_id, name, price, quantity, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')`,
        [itemId, orderId, item.menuItemId, item.name, item.price, item.quantity]
      );
    }
    await client.query("COMMIT");

    const result = await client.query("SELECT * FROM spiceestreet.orders WHERE id=$1", [orderId]);
    const orderItems = await client.query("SELECT * FROM spiceestreet.order_items WHERE order_id=$1", [orderId]);
    return NextResponse.json({ ...result.rows[0], items: orderItems.rows }, { status: 201 });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
