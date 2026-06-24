import { NextResponse } from "next/server";

// Uploads are handled client-side via Firebase Storage SDK (src/lib/upload.ts).
// This route is no longer in the upload path.
export async function POST() {
    return NextResponse.json(
        { error: "File uploads are handled client-side via Firebase Storage. Use uploadToStorage() from @/lib/upload." },
        { status: 410 }
    );
}
