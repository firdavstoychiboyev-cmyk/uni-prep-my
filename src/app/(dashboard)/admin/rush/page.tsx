"use client";

import { useEffect, useState } from "react";
import { Zap, Landmark } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchRegistanUsers } from "@/lib/admin-utils";
import { fetchTeacherClasses } from "@/lib/class-utils";
import { Class } from "@/lib/firestore-schema";
import RushScheduler from "@/components/rush-scheduler";

/**
 * Планирование Rush для групп Registan (супер-админ и Registan-админ).
 *
 * ФЛАГ: у классов нет поля организации, поэтому «группа Registan» определена
 * как класс, которым руководит преподаватель с organization="registan".
 * Если нужен другой критерий (например, классы, где есть Registan-ученики) —
 * уточните, это меняет выборку групп.
 */
export default function AdminRushPage() {
    const { t } = useTranslation();
    const { user } = useAuthStore();
    const [groups, setGroups] = useState<Class[] | null>(null);
    const [selected, setSelected] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const teachers = (await fetchRegistanUsers()).filter((u) => u.role === "teacher");
                const lists = await Promise.all(teachers.map((tt) => fetchTeacherClasses(tt.id)));
                const byId = new Map<string, Class>();
                lists.flat().forEach((c) => byId.set(c.id, c));
                if (!cancelled) setGroups(Array.from(byId.values()));
            } catch (e) {
                console.error("Error loading Registan groups:", e);
                if (!cancelled) setGroups([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-foreground">
                    <Zap size={22} className="text-amber-500" />{t("adminRush.title")}
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">{t("adminRush.subtitle")}</p>
            </div>

            <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
                <Landmark size={13} /> {t("adminScope.registan")}
            </span>

            <div className="flex flex-col gap-2 max-w-md">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("adminRush.pickGroup")}</label>
                <select
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                    disabled={!groups || groups.length === 0}
                    className="h-12 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/25 disabled:opacity-50"
                >
                    <option value="">{groups === null ? "…" : groups.length === 0 ? t("adminRush.noGroups") : "—"}</option>
                    {groups?.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                </select>
            </div>

            {selected && user && <RushScheduler classId={selected} user={user} />}
        </div>
    );
}
