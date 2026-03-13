import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseAvailable } from "@/lib/db";

// GET - Get draft by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const { id } = await params;
    const draft = await db.draftLaporan.findUnique({
      where: { id },
    });

    if (!draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: draft.id,
      judul: draft.judul,
      tempat: draft.tempat,
      tanggal: draft.tanggal,
      waktu: draft.waktu,
      pimpinan: draft.pimpinan,
      peserta: JSON.parse(draft.peserta),
      pelaksanaan: JSON.parse(draft.pelaksanaan),
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error fetching draft:", error);
    return NextResponse.json({ error: "Failed to fetch draft" }, { status: 500 });
  }
}

// PUT - Update draft
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const { id } = await params;
    const body = await request.json();

    const draft = await db.draftLaporan.update({
      where: { id },
      data: {
        judul: body.judul,
        tempat: body.tempat,
        tanggal: body.tanggal,
        waktu: body.waktu,
        pimpinan: body.pimpinan,
        peserta: JSON.stringify(body.peserta),
        pelaksanaan: JSON.stringify(body.pelaksanaan),
      },
    });

    return NextResponse.json({
      id: draft.id,
      judul: draft.judul,
      tempat: draft.tempat,
      tanggal: draft.tanggal,
      waktu: draft.waktu,
      pimpinan: draft.pimpinan,
      peserta: JSON.parse(draft.peserta),
      pelaksanaan: JSON.parse(draft.pelaksanaan),
      createdAt: draft.createdAt.toISOString(),
      updatedAt: draft.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Error updating draft:", error);
    return NextResponse.json({ error: "Failed to update draft" }, { status: 500 });
  }
}

// DELETE - Delete draft
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const { id } = await params;
    await db.draftLaporan.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting draft:", error);
    return NextResponse.json({ error: "Failed to delete draft" }, { status: 500 });
  }
}
