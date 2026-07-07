import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Upload a file to Firebase Storage and return the download URL.
 *
 * @param file - The file to upload.
 * @param storagePath - Optional explicit path inside the bucket
 *   (e.g. "questions/{id}/question.jpg").  When omitted a timestamped
 *   path under question-images/ is used (suitable for new questions
 *   whose Firestore ID isn't known yet).
 */
export async function uploadImage(file: File, storagePath?: string): Promise<string> {
    const path =
        storagePath ??
        `question-images/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;

    const storageRef = ref(storage, path);

    return new Promise<string>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, file);

        const timeoutId = setTimeout(() => {
            task.cancel();
            reject(
                new Error(
                    "Upload timed out after 30 s. Check Firebase Storage rules and network."
                )
            );
        }, 30_000);

        task.on(
            "state_changed",
            null,
            (error) => {
                clearTimeout(timeoutId);
                // error.code is e.g. "storage/unauthorized", "storage/canceled"
                reject(
                    new Error(
                        `Storage upload failed [${error.code}]: ${error.serverResponse ?? error.message}`
                    )
                );
            },
            async () => {
                clearTimeout(timeoutId);
                try {
                    const url = await getDownloadURL(task.snapshot.ref);
                    resolve(url);
                } catch (err) {
                    reject(err);
                }
            }
        );
    });
}
