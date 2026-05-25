import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, email, role, status, phone } = body;

    const existingStaffRes = await query<{ email: string }>("SELECT email FROM staff WHERE id=$1", [id]);
    if (!existingStaffRes.rowCount) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const previousEmail = existingStaffRes.rows[0].email;

    const result = await query(
      `UPDATE staff SET name=$1, email=$2, role=$3, status=$4, phone=$5 WHERE id=$6 RETURNING *`,
      [name, email, role, status, phone ?? null, id]
    );

    // Keep auth user identity in sync with staff edits for matching account email
    const normalizedRole = String(role);
    const updatableLoginRole = ["admin", "accountant", "chef"].includes(normalizedRole);
    await query(
      `UPDATE spiceestreet.users
       SET
         name = COALESCE($1, name),
         email = COALESCE($2, email),
         status = COALESCE($3, status),
         role = CASE WHEN $4 THEN $5 ELSE role END
       WHERE LOWER(email) = LOWER($6)`,
      [name ?? null, email ?? null, status ?? null, updatableLoginRole, normalizedRole, previousEmail]
    );

    return NextResponse.json(result.rows[0]);
  } catch (e: unknown) {
    const err = e as { code?: string };
    if (err.code === "23505") return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await query("DELETE FROM staff WHERE id=$1", [id]);
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
