"use client";

import { useEffect, useRef, useState } from "react";

interface MathInputProps {
    value: string;
    onChange: (v: string) => void;
    className?: string;
}

declare global {
    interface Window {
        jQuery: any;
        $: any;
        MathQuill: any;
    }
}

export default function MathInput({ value, onChange, className }: MathInputProps) {
    const containerRef = useRef<HTMLSpanElement>(null);
    const mathFieldRef = useRef<any>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const isFirstValueRef = useRef(true);

    useEffect(() => {
        // Load dependencies from CDN
        const loadScripts = async () => {
            if (window.MathQuill) {
                setIsLoaded(true);
                return;
            }

            // Load jQuery if not present
            if (!window.jQuery) {
                const jq = document.createElement("script");
                jq.src = "https://code.jquery.com/jquery-3.6.0.min.js";
                document.head.appendChild(jq);
                await new Promise(resolve => jq.onload = resolve);
            }

            // Load MathQuill CSS
            if (!document.getElementById("mathquill-css")) {
                const link = document.createElement("link");
                link.id = "mathquill-css";
                link.rel = "stylesheet";
                link.href = "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.css";
                document.head.appendChild(link);
            }

            // Load MathQuill JS
            const mq = document.createElement("script");
            mq.src = "https://cdnjs.cloudflare.com/ajax/libs/mathquill/0.10.1/mathquill.min.js";
            document.head.appendChild(mq);
            await new Promise(resolve => mq.onload = resolve);

            setIsLoaded(true);
        };

        loadScripts();
    }, []);

    useEffect(() => {
        if (!isLoaded || !containerRef.current || mathFieldRef.current) return;

        const MQ = window.MathQuill.getInterface(2);
        const mathField = MQ.MathField(containerRef.current, {
            handlers: {
                edit: () => {
                    // Extract LaTeX value
                    const latex = mathField.latex();
                    onChange(latex);
                },
            },
            autoCommands: 'pi theta rho sigma tau phi lambda gamma sqrt',
            autoOperatorNames: 'sin cos tan arcsin arccos arctan sinh cosh tanh log ln lg',
        });

        // Set initial value
        if (value) {
            mathField.latex(value);
        }
        
        mathFieldRef.current = mathField;

        return () => {
            // Clean up if needed
            mathFieldRef.current = null;
        };
    }, [isLoaded, onChange]);

    // Update mathfield if value changes externally (carefully to avoid cursor reset)
    useEffect(() => {
        if (mathFieldRef.current && value !== mathFieldRef.current.latex()) {
            mathFieldRef.current.latex(value);
        }
    }, [value]);

    return (
        <div className={`math-input-wrapper ${className || ""}`}>
            <span 
                ref={containerRef} 
                className="w-full h-full block min-h-[40px] px-3 py-2"
            />
            <style jsx global>{`
                .math-input-wrapper .mq-editable-field {
                    width: 100%;
                    border: 1px solid hsl(var(--border));
                    border-radius: 0.5rem;
                    background: hsl(var(--muted));
                    color: hsl(var(--foreground));
                    font-size: 1.1rem;
                    padding: 0.5rem !important;
                }
                .math-input-wrapper .mq-focused {
                    border-color: hsl(var(--ring)) !important;
                    box-shadow: 0 0 0 1px hsl(var(--ring)/0.3) !important;
                }
                /* Ensure it looks like our inputs */
                .mq-cursor {
                    border-color: hsl(var(--foreground)) !important;
                }
            `}</style>
        </div>
    );
}
