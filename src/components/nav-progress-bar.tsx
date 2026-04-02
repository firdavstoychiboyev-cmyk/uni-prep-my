"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type BarState = "idle" | "loading" | "done";

export default function NavProgressBar() {
    const pathname = usePathname();
    const [state, setState] = useState<BarState>("idle");
    const prev = useRef(pathname);
    const t1 = useRef<NodeJS.Timeout | null>(null);
    const t2 = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (prev.current === pathname) return;
        prev.current = pathname;

        if (t1.current) clearTimeout(t1.current);
        if (t2.current) clearTimeout(t2.current);

        setState("loading");

        t1.current = setTimeout(() => {
            setState("done");
            t2.current = setTimeout(() => setState("idle"), 350);
        }, 400);

        return () => {
            if (t1.current) clearTimeout(t1.current);
            if (t2.current) clearTimeout(t2.current);
        };
    }, [pathname]);

    if (state === "idle") return null;

    return (
        <div
            aria-hidden
            style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                height: "2px",
                zIndex: 999,
                backgroundColor: "#111827",
                transformOrigin: "left center",
                transform: state === "loading" ? "scaleX(0.75)" : "scaleX(1)",
                opacity: state === "done" ? 0 : 1,
                transition:
                    state === "loading"
                        ? "transform 400ms cubic-bezier(0.4,0,0.2,1)"
                        : "transform 200ms ease, opacity 300ms ease 50ms",
            }}
        />
    );
}
