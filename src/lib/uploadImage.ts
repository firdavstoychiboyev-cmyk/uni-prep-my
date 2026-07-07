/**
 * Client-side helper that uploads a File through the /api/upload-image route
 * (which forwards to imgbb server-side so the API key is never exposed).
 * Throws with the real error message from the API route on failure.
 */
export async function uploadImage(file: File): Promise<string> {
    const body = new FormData();
    body.append("image", file);

    const res = await fetch("/api/upload-image", { method: "POST", body });
    const json = await res.json().catch(() => ({ error: "Unexpected server response." }));

    if (!res.ok) {
        throw new Error(json.error ?? "Image upload failed.");
    }

    const url = json.url as string | undefined;
    if (!url) throw new Error("Upload succeeded but no URL was returned.");

    return url;
}
