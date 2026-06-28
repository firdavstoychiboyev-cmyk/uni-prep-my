"use client";

import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface MathTextProps {
    content: string;
    as?: "div" | "span";
    className?: string;
    style?: React.CSSProperties;
}

declare global {
    interface Window {
        renderMathInElement: any; // eslint-disable-line @typescript-eslint/no-explicit-any
        katex: any; // eslint-disable-line @typescript-eslint/no-explicit-any
    }
}

export default function MathText({ content, as = "div", className, style }: MathTextProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const [libLoaded, setLibLoaded] = useState(false);

    useEffect(() => {
        if (window.renderMathInElement) {
            setLibLoaded(true);
            return;
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js";
        script.onload = () => setLibLoaded(true);
        document.head.appendChild(script);
    }, []);

    useEffect(() => {
        if (!rootRef.current) return;

        const container = rootRef.current;
        container.innerHTML = content;

        // CDN auto-render expects window.katex
        if (typeof window !== "undefined") {
            window.katex = katex;
        }

        if (window.renderMathInElement) {
            try {
                window.renderMathInElement(container, {
                    delimiters: [
                        { left: "$$", right: "$$", display: true },
                        { left: "$", right: "$", display: false },
                        { left: "\\(", right: "\\)", display: false },
                        { left: "\\[", right: "\\]", display: true }
                    ],
                    throwOnError: false
                });
            } catch (e) {
                console.error("KaTeX auto-render error:", e);
            }
        }
    }, [content, libLoaded]);

    const Component = as;
    return (
        <Component
            ref={rootRef}
            className={`math-content ${className || ""}`}
            style={style}
        />
    );
}

// Add global styles for math content
if (typeof document !== "undefined") {
    // Only add if not already present
    if (!document.getElementById("math-text-styles")) {
        const style = document.createElement("style");
        style.id = "math-text-styles";
        style.innerHTML = `
            .math-question-text {
                font-family: "Times New Roman", Times, serif;
                color: hsl(var(--foreground));
                line-height: 1.6;
            }
            .math-content .katex-display {
                margin: 1.5rem 0;
                padding: 1rem 0;
                border-radius: 0.5rem;
            }
            .math-content .katex {
                font-size: 1.15em;
            }
        `;
        document.head.appendChild(style);
    }
}
