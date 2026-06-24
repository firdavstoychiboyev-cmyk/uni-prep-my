export async function uploadToStorage(file: File): Promise<string> {
    const form = new FormData();
    form.append("file", file);

    const res = await fetch("/api/upload", {
        method: "POST",
        body: form,
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error((err as { error?: string }).error ?? "Upload failed");
    }

    const data = await res.json() as { url: string };
    return data.url;
}
