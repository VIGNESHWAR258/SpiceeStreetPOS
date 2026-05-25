import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body;
    const role = req.headers.get("x-user-role");
    if (!status) return NextResponse.json({ error: "status required" }, { status: 400 });
    if ((status === "approved" || status === "rejected") && role !== "admin") {
      return NextResponse.json({ error: "Only admin can approve or reject expenses" }, { status: 403 });
    }
    const result = await query(
      `UPDATE expenses SET status=$1 WHERE id=$2 RETURNING *`,
      [status, id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { description, amount, category, status, submittedBy } = body;
    const result = await query(
      `UPDATE expenses SET description=$1, amount=$2, category=$3, status=$4, submitted_by=$5
       WHERE id=$6 RETURNING *`,
      [description, amount, category, status, submittedBy, id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(result.rows[0]);
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = _.headers.get("x-user-role") || "accountant";
    const { id } = await params;
    const current = await query("SELECT status FROM expenses WHERE id=$1", [id]);
    if (!current.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (current.rows[0].status === "approved" && role !== "admin") {
      return NextResponse.json({ error: "Only admin can delete approved expenses" }, { status: 403 });
    }
    await query("DELETE FROM expenses WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
