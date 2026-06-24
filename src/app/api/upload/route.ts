import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "IMGBB_API_KEY not configured" }, { status: 500 });
    }

    const body = await req.formData();
    const file = body.get("file") as File | null;
    if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const form = new FormData();
    form.append("image", base64);
    form.append("name", file.name.replace(/\.[^.]+$/, "")); // filename without extension

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const err = await res.text();
        console.error("[upload] ImgBB error:", res.status, err);
        return NextResponse.json({ error: `Upload failed: ${err}` }, { status: 500 });
    }

    const data = await res.json() as { data: { url: string } };
    return NextResponse.json({ url: data.data.url });
}
