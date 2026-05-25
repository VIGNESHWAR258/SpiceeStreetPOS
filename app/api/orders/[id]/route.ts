import { NextRequest, NextResponse } from "next/server";
import { query, pool } from "@/lib/db";
import { randomUUID } from "crypto";

type KitchenItemStatus = "pending" | "preparing" | "completed";

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

function deriveOrderStatusFromItems(itemStatuses: KitchenItemStatus[]): "pending" | "preparing" | "ready" {
  if (itemStatuses.length > 0 && itemStatuses.every((status) => status === "completed")) return "ready";
  if (itemStatuses.some((status) => status === "preparing")) return "preparing";
  return "pending";
}

function canModifyBeforePreparing(itemStatuses: KitchenItemStatus[]) {
  return itemStatuses.length > 0 && itemStatuses.every((status) => status === "pending");
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const client = await pool.connect();
    try {
      await ensureOrderItemStatusColumn(client);
      const orderRes = await client.query("SELECT * FROM spiceestreet.orders WHERE id=$1", [id]);
      if (!orderRes.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
      const itemsRes = await client.query("SELECT * FROM spiceestreet.order_items WHERE order_id=$1", [id]);
      return NextResponse.json({ ...orderRes.rows[0], items: itemsRes.rows });
    } finally {
      client.release();
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH supports either:
// 1) append items to existing order, or
// 2) update one item kitchen status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      items,
      itemId,
      itemStatus,
      cancelItemId,
      cancelOrder,
      cancelReason,
      requestCancelItemId,
      requestCancelOrder,
      requestReason,
    } = body as {
      items?: { menuItemId: string; name: string; price: number; quantity: number }[];
      itemId?: string;
      itemStatus?: KitchenItemStatus;
      cancelItemId?: string;
      cancelOrder?: boolean;
      cancelReason?: string;
      requestCancelItemId?: string;
      requestCancelOrder?: boolean;
      requestReason?: string;
    };

    await ensureOrderItemStatusColumn(client);
    const orderRes = await client.query("SELECT * FROM spiceestreet.orders WHERE id=$1", [id]);
    if (!orderRes.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const order = orderRes.rows[0];
    if (order.payment_status === "paid") return NextResponse.json({ error: "Order already paid" }, { status: 409 });
    if (order.status === "cancelled") return NextResponse.json({ error: "Order already cancelled" }, { status: 409 });

    const currentStatusesRes = await client.query(
      "SELECT status FROM spiceestreet.order_items WHERE order_id=$1",
      [id]
    );
    const currentStatuses = currentStatusesRes.rows.map((row: { status: KitchenItemStatus }) => row.status);
    const modifiableBeforePreparing = canModifyBeforePreparing(currentStatuses);
    let forceOrderStatus: "cancelled" | null = null;

    await client.query("BEGIN");
    if (requestCancelItemId || requestCancelOrder) {
      const reasonText = String(requestReason ?? "Out of stock").trim() || "Out of stock";
      let requestMessage = "";

      if (requestCancelItemId) {
        const itemRes = await client.query(
          "SELECT id, name, menu_item_id FROM spiceestreet.order_items WHERE id=$1 AND order_id=$2",
          [requestCancelItemId, id]
        );
        if (!itemRes.rowCount) {
          await client.query("ROLLBACK");
          return NextResponse.json({ error: "Item not found" }, { status: 404 });
        }
        const item = itemRes.rows[0] as { name: string; menu_item_id?: string | null };
        if (item.menu_item_id) {
          await client.query(
            "UPDATE spiceestreet.menu_items SET available=false, updated_at=NOW() WHERE id=$1",
            [item.menu_item_id]
          );
        }
        requestMessage = `CHEF REQUEST: Cancel item '${item.name}' (${reasonText}). Menu marked unavailable.`;
      }

      if (requestCancelOrder) {
        requestMessage = requestMessage
          ? `${requestMessage} | CHEF REQUEST: Cancel full order (${reasonText}).`
          : `CHEF REQUEST: Cancel full order (${reasonText}).`;
      }

      await client.query(
        `UPDATE spiceestreet.orders
         SET notes = CASE
           WHEN notes IS NULL OR notes = '' THEN $1
           ELSE notes || E'\n' || $1
         END,
         updated_at = NOW()
         WHERE id=$2`,
        [requestMessage, id]
      );
    } else if (cancelOrder) {
      if (!modifiableBeforePreparing) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Order can be cancelled only before kitchen starts preparing" }, { status: 409 });
      }
      await client.query(
        "UPDATE spiceestreet.orders SET status='cancelled', notes=COALESCE($1, notes), updated_at=NOW() WHERE id=$2",
        [cancelReason ? `Cancelled: ${String(cancelReason).trim()}` : null, id]
      );
      forceOrderStatus = "cancelled";
    } else if (cancelItemId) {
      if (!modifiableBeforePreparing) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Items can be cancelled only before kitchen starts preparing" }, { status: 409 });
      }
      const deleteRes = await client.query(
        "DELETE FROM spiceestreet.order_items WHERE id=$1 AND order_id=$2 RETURNING id",
        [cancelItemId, id]
      );
      if (!deleteRes.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    } else if (itemId && itemStatus) {
      if (!["pending", "preparing", "completed"].includes(itemStatus)) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "invalid itemStatus" }, { status: 400 });
      }
      const updateItemRes = await client.query(
        "UPDATE spiceestreet.order_items SET status=$1 WHERE id=$2 AND order_id=$3 RETURNING id",
        [itemStatus, itemId, id]
      );
      if (!updateItemRes.rowCount) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }
    } else if (items?.length) {
      if (!modifiableBeforePreparing) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Order can be modified only before kitchen starts preparing" }, { status: 409 });
      }
      for (const item of items) {
        const existing = await client.query(
          "SELECT id FROM spiceestreet.order_items WHERE order_id=$1 AND menu_item_id=$2 AND status='pending'",
          [id, item.menuItemId]
        );
        if (existing.rowCount && existing.rowCount > 0) {
          await client.query(
            "UPDATE spiceestreet.order_items SET quantity = quantity + $1 WHERE id=$2",
            [item.quantity, existing.rows[0].id]
          );
        } else {
          const newItemId = "oi-" + randomUUID().slice(0, 8);
          await client.query(
            "INSERT INTO spiceestreet.order_items (id, order_id, menu_item_id, name, price, quantity, status) VALUES ($1,$2,$3,$4,$5,$6,'pending')",
            [newItemId, id, item.menuItemId, item.name, item.price, item.quantity]
          );
        }
      }
    } else {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "items or itemId+itemStatus required" }, { status: 400 });
    }

    // recalculate subtotal from all items
    const totals = await client.query(
      "SELECT SUM(price * quantity) AS subtotal FROM spiceestreet.order_items WHERE order_id=$1",
      [id]
    );
    const statusesRes = await client.query(
      "SELECT status FROM spiceestreet.order_items WHERE order_id=$1",
      [id]
    );
    const itemStatuses = statusesRes.rows.map((row: { status: KitchenItemStatus }) => row.status);
    const nextStatus = forceOrderStatus ?? (itemStatuses.length === 0 ? "cancelled" : deriveOrderStatusFromItems(itemStatuses));
    const newSubtotal = parseFloat(totals.rows[0].subtotal ?? "0");
    await client.query(
      "UPDATE spiceestreet.orders SET subtotal=$1, total=$1 + COALESCE(misc_amount,0), status=$2, updated_at=NOW() WHERE id=$3",
      [newSubtotal, nextStatus, id]
    );
    await client.query("COMMIT");

    const updated = await client.query("SELECT * FROM spiceestreet.orders WHERE id=$1", [id]);
    const updatedItems = await client.query("SELECT * FROM spiceestreet.order_items WHERE order_id=$1", [id]);
    return NextResponse.json({ ...updated.rows[0], items: updatedItems.rows });
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  } finally {
    client.release();
  }
}
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      status,
      paymentMethod,
      paymentStatus,
      miscLabel,
      miscAmount,
      billingNote,
      paidAt,
    } = body;

    const ensureClient = await pool.connect();
    try {
      await ensureOrderItemStatusColumn(ensureClient);
    } finally {
      ensureClient.release();
    }

    // Billing can be settled only when all kitchen items are completed
    if (paymentStatus === "paid") {
      const itemsRes = await query("SELECT status FROM spiceestreet.order_items WHERE order_id=$1", [id]);
      const allCompleted =
        itemsRes.rows.length > 0 &&
        itemsRes.rows.every((row: { status?: string }) => (row.status ?? "pending") === "completed");
      if (!allCompleted) {
        return NextResponse.json({ error: "All items must be completed before settling bill" }, { status: 409 });
      }
    }

    const result = await query(
      `UPDATE spiceestreet.orders SET
         status = COALESCE($1, status),
         payment_method = COALESCE($2, payment_method),
         payment_status = COALESCE($3, payment_status),
         misc_label = COALESCE($4, misc_label),
         misc_amount = COALESCE($5, misc_amount),
         billing_note = COALESCE($6, billing_note),
         paid_at = CASE
           WHEN $3 = 'paid' THEN COALESCE($7::timestamptz, NOW())
           ELSE paid_at
         END,
         total = subtotal + COALESCE($5, misc_amount),
         updated_at = NOW()
       WHERE id=$8 RETURNING *`,
      [
        status ?? null,
        paymentMethod ?? null,
        paymentStatus ?? null,
        miscLabel ?? null,
        miscAmount ?? null,
        billingNote ?? null,
        paidAt ?? null,
        id,
      ]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
