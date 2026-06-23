"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { User2, Palette, Trophy, ShieldAlert, Languages } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Item = { labelKey: string; id: "profile" | "language" | "appearance" | "achievements" | "account-actions"; icon: typeof User2 };
const groups: Array<{ titleKey: string; items: Item[] }> = [
    {
        titleKey: "settings.account",
        items: [{ labelKey: "settings.profile", id: "profile", icon: User2 }],
    },
    {
        titleKey: "settings.language",
        items: [{ labelKey: "settings.language", id: "language", icon: Languages }],
    },
    {
        titleKey: "settings.appearance",
        items: [{ labelKey: "settings.appearance", id: "appearance", icon: Palette }],
    },
    {
        titleKey: "settings.achievements",
        items: [{ labelKey: "settings.achievements", id: "achievements", icon: Trophy }],
    },
    {
        titleKey: "settings.accountActions",
        items: [{ labelKey: "settings.accountActions", id: "account-actions", icon: ShieldAlert }],
    },
];

export default function SettingsNav() {
    const { t } = useTranslation();
    const allItems = useMemo(() => groups.flatMap((g) => g.items), []);
    const [active, setActive] = useState<Item["id"]>("profile");
    const scrollWrapRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const hash = (window.location.hash || "").replace("#", "") as Item["id"];
        if (hash && allItems.some((i) => i.id === hash)) setActive(hash);
    }, [allItems]);

    useEffect(() => {
        const els = allItems
            .map((i) => document.getElementById(i.id))
            .filter(Boolean) as HTMLElement[];
        if (els.length === 0) return;

        const io = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => (a.boundingClientRect.top ?? 0) - (b.boundingClientRect.top ?? 0));
                if (visible[0]?.target?.id) setActive(visible[0].target.id as Item["id"]);
            },
            { root: null, rootMargin: "-96px 0px -70% 0px", threshold: [0.05, 0.2, 0.4] }
        );
        els.forEach((el) => io.observe(el));
        return () => io.disconnect();
    }, [allItems]);

    useEffect(() => {
        const wrap = scrollWrapRef.current;
        if (!wrap) return;
        const btn = wrap.querySelector<HTMLButtonElement>(`button[data-settings-id="${active}"]`);
        if (!btn) return;
        // keep active item visible inside the menu
        btn.scrollIntoView({ block: "nearest" });
    }, [active]);

    const go = (id: Item["id"]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.history.replaceState(null, "", `#${id}`);
        setActive(id);
    };

    return (
        <aside className="sticky top-24">
            <div
                ref={scrollWrapRef}
                className="p-6 max-h-[calc(100vh-6rem)] overflow-auto"
            >
                {groups.map((g) => (
                    <div key={g.titleKey} className="mb-6 last:mb-0">
                        <div className="px-3 mb-2 text-[11px] font-black tracking-[0.18em] uppercase text-muted-foreground">
                            {t(g.titleKey)}
                        </div>
                        <nav className="flex flex-col gap-1">
                            {g.items.map((it) => {
                                const Icon = it.icon;
                                return (
                                    <button
                                        key={it.id}
                                        data-settings-id={it.id}
                                        type="button"
                                        onClick={() => go(it.id)}
                                        className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-colors w-full text-left ${
                                            active === it.id
                                                ? "bg-muted text-foreground"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                    >
                                        <Icon
                                            className={`w-4 h-4 ${active === it.id ? "text-[hsl(var(--brand-blue))]" : "text-muted-foreground"}`}
                                        />
                                        <span className="text-sm font-semibold">{t(it.labelKey)}</span>
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                ))}
            </div>
        </aside>
    );
}

