"use client";

import { useEffect, useRef } from "react";
import "react-quill-new/dist/quill.snow.css";

interface QuillEditorProps {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
}

export default function QuillEditor({ value, onChange, placeholder }: QuillEditorProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const quillRef = useRef<unknown>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Prevent double-init in React StrictMode
        if (quillRef.current) return;

        (async () => {
            const { default: Quill } = await import("quill");

            // Clear any leftover DOM from previous StrictMode cycle
            container.innerHTML = "";
            const editorDiv = document.createElement("div");
            container.appendChild(editorDiv);

            const quill = new Quill(editorDiv, {
                theme: "snow",
                modules: {
                    toolbar: [
                        ["bold", "italic", "underline"],
                        [{ script: "sub" }, { script: "super" }],
                        ["clean"],
                    ],
                },
                formats: ["bold", "italic", "underline", "script"],
                placeholder: placeholder ?? "",
            });

            quill.on("text-change", () => {
                onChangeRef.current(quill.root.innerHTML);
            });

            if (value && value !== "<p><br></p>") {
                quill.root.innerHTML = value;
            }

            quillRef.current = quill;
        })();

        return () => {
            quillRef.current = null;
            if (container) container.innerHTML = "";
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div>
            <div ref={containerRef} />
            <style>{`
                .ql-toolbar {
                    border-color: hsl(var(--border)) !important;
                    border-radius: 0.5rem 0.5rem 0 0;
                    background: hsl(var(--muted));
                }
                .ql-container {
                    border-color: hsl(var(--border)) !important;
                    border-radius: 0 0 0.5rem 0.5rem;
                    background: hsl(var(--muted));
                    font-size: 0.95rem;
                    min-height: 120px;
                }
                .ql-editor {
                    color: hsl(var(--foreground));
                    min-height: 120px;
                }
                .ql-editor.ql-blank::before {
                    color: hsl(var(--muted-foreground));
                    font-style: normal;
                }
                .ql-toolbar .ql-stroke { stroke: hsl(var(--foreground)); }
                .ql-toolbar .ql-fill { fill: hsl(var(--foreground)); }
                .ql-toolbar button:hover .ql-stroke,
                .ql-toolbar button.ql-active .ql-stroke { stroke: hsl(var(--foreground)); }
                .ql-toolbar button:hover .ql-fill,
                .ql-toolbar button.ql-active .ql-fill { fill: hsl(var(--foreground)); }
                .ql-toolbar .ql-picker-label { color: hsl(var(--foreground)); }
            `}</style>
        </div>
    );
}
