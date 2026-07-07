import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    const apiKey = process.env.IMGBB_API_KEY;
    if (!apiKey) {
        return NextResponse.json({ error: "Server misconfiguration: IMGBB_API_KEY is not set." }, { status: 500 });
    }

    let file: File | null = null;
    try {
        const form = await req.formData();
        const entry = form.get("image");
        if (!entry || !(entry instanceof File)) {
            return NextResponse.json({ error: "No image file provided." }, { status: 400 });
        }
        file = entry;
    } catch {
        return NextResponse.json({ error: "Invalid multipart request." }, { status: 400 });
    }

    // Convert the uploaded file to base64 — imgbb's most reliable ingest format
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");

    const body = new URLSearchParams();
    body.set("key", apiKey);
    body.set("image", base64);

    let imgbbRes: Response;
    try {
        imgbbRes = await fetch("https://api.imgbb.com/1/upload", {
            method: "POST",
            body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });
    } catch (err) {
        return NextResponse.json(
            { error: `Could not reach imgbb: ${err instanceof Error ? err.message : String(err)}` },
            { status: 502 }
        );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let json: any;
    try {
        json = await imgbbRes.json();
    } catch {
        return NextResponse.json({ error: "imgbb returned a non-JSON response." }, { status: 502 });
    }

    if (!imgbbRes.ok || !json.success) {
        const msg = json?.error?.message ?? json?.status_txt ?? "imgbb upload failed.";
        return NextResponse.json({ error: msg }, { status: imgbbRes.status || 500 });
    }

    const url: string = json.data?.url;
    if (!url) {
        return NextResponse.json({ error: "imgbb did not return a URL." }, { status: 502 });
    }

    return NextResponse.json({ url });
}
