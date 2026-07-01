"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type ThemeMode = "light" | "dark";

const STORAGE_KEY = "uni-prep-theme";

function applyTheme(mode: ThemeMode) {
    const root = document.documentElement;
    if (mode === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
}

export function ThemeToggle({ className = "" }: { className?: string }) {
    const [mode, setMode] = useState<ThemeMode>("dark");

    useEffect(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        // Default is dark — only go light if explicitly saved as "light"
        const initial: ThemeMode = saved === "light" ? "light" : "dark";
        if (saved !== "dark" && saved !== "light") {
            localStorage.setItem(STORAGE_KEY, "dark");
        }
        setMode(initial);
        applyTheme(initial);
    }, []);

    const toggle = () => {
        const next: ThemeMode = mode === "dark" ? "light" : "dark";
        setMode(next);
        localStorage.setItem(STORAGE_KEY, next);
        applyTheme(next);
    };

    const Icon = mode === "dark" ? Sun : Moon;
    const label = mode === "dark" ? "Светлая тема" : "Тёмная тема";

    return (
        <button
            type="button"
            onClick={toggle}
            aria-label={label}
            title={label}
            className={`h-9 w-9 rounded-lg border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center justify-center ${className}`}
        >
            <Icon className="w-4 h-4" />
        </button>
    );
}

