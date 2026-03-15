import { NextRequest, NextResponse } from "next/server";
import { db, isDatabaseAvailable } from "@/lib/db";

// GET - Get all drafts
export async function GET() {
  try {
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return NextResponse.json([]); // Return empty array if no database
    }

    const drafts = await db.draftLaporan.findMany({
      orderBy: {
        updatedAt: "desc",
      },
    });

    const formattedDrafts = drafts.map((draft) => ({
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
    }));

    return NextResponse.json(formattedDrafts);
  } catch (error) {
    console.error("Error fetching drafts:", error);
    return NextResponse.json([]); // Return empty array on error
  }
}

// POST - Create new draft
export async function POST(request: NextRequest) {
  try {
    // Check if database is available
    if (!isDatabaseAvailable()) {
      return NextResponse.json({ error: "Database not available" }, { status: 503 });
    }

    const body = await request.json();
    
    const draft = await db.draftLaporan.create({
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
    console.error("Error creating draft:", error);
    return NextResponse.json({ error: "Failed to create draft" }, { status: 500 });
  }
}
