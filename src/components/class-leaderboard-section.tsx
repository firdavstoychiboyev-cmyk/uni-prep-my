"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { fetchStudentClasses } from "@/lib/profile-utils";
import { fetchClassStudents } from "@/lib/class-utils";
import { User } from "@/lib/firestore-schema";
import ClassLeaderboard from "@/components/class-leaderboard";

interface ClassRoster {
    id: string;
    name: string;
    students: User[];
}

/**
 * Вид рейтинга для ученика: по одному рейтингу на каждый класс, где он состоит.
 * Ничего не рендерит для не-учеников или если ученик не состоит ни в одном
 * классе. Виден на главной странице ученика.
 */
export default function ClassLeaderboardSection() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [rosters, setRosters] = useState<ClassRoster[]>([]);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        if (!user || user.role !== "student") return;
        let cancelled = false;
        (async () => {
            try {
                const classes = await fetchStudentClasses(user.id);
                const withStudents = await Promise.all(
                    classes.map(async (cls) => ({
                        id: cls.id,
                        name: cls.name,
                        students: await fetchClassStudents(cls.students),
                    }))
                );
                if (!cancelled) setRosters(withStudents.filter((c) => c.students.length > 0));
            } catch (e) {
                console.error("Error loading class leaderboards:", e);
            } finally {
                if (!cancelled) setLoaded(true);
            }
        })();
        return () => { cancelled = true; };
    }, [user]);

    if (!user || user.role !== "student" || !loaded || rosters.length === 0) return null;

    return (
        <div className="flex flex-col gap-8">
            {rosters.map((roster) => (
                <ClassLeaderboard
                    key={roster.id}
                    students={roster.students}
                    // Для нескольких классов — уточняем названием класса
                    title={rosters.length > 1 ? `${t("lb.title")} · ${roster.name}` : undefined}
                />
            ))}
        </div>
    );
}
