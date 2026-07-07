import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export function uploadToStorage(file: File): Promise<string> {
    const filename = `question-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const storageRef = ref(storage, filename);

    // Use uploadBytesResumable with explicit onError/onComplete callbacks.
    // uploadBytes() wraps this internally but does NOT wire the onError channel,
    // so any error that comes through the task (CORS block, rules rejection, network
    // stall, SDK retry exhaustion) silently hangs the returned Promise.
    const uploadPromise = new Promise<string>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);
        task.on(
            "state_changed",
            null, // no per-chunk progress needed
            (error) => {
                // Fired for every upload failure: rules rejection, CORS block, network error, etc.
                console.error("[Storage] upload error:", error.code, error.serverResponse ?? error.message);
                reject(error);
            },
            async () => {
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve(url);
                } catch (err) {
                    console.error("[Storage] getDownloadURL error:", err);
                    reject(err);
                }
            }
        );
    });

    // Absolute safety net — if the upload promise never settles (e.g. the XHR is
    // swallowed by a proxy/firewall without a response), the caller's loading state
    // still clears with a clear error after 30 seconds.
    const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(
            () => reject(new Error("Upload timed out (30 s). Check Firebase Storage rules and network.")),
            30_000
        )
    );

    return Promise.race([uploadPromise, timeoutPromise]);
}
