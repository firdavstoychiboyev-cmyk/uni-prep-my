"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Class } from "@/lib/firestore-schema";
import { SUBJECTS } from "@/lib/constants";
import { createClass, fetchTeacherClasses } from "@/lib/class-utils";
import CreateClassModal from "@/components/create-class-modal";
import Link from "next/link";
import { Plus } from "lucide-react";
import { useTranslation } from "@/lib/i18n/useTranslation";

export default function ClassesPage() {
    const { user } = useAuthStore();
    const { t } = useTranslation();
    const [classes, setClasses] = useState<Class[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        if (user?.id) {
            fetchTeacherClasses(user.id).then((data) => {
                setClasses(data);
                setIsLoading(false);
            });
        }
    }, [user]);

    const handleCreateClass = async (name: string, subjectId: string) => {
        if (!user) return;
        const newClass = await createClass(user.id, name, subjectId);
        setClasses((prev) => [
            {
                ...newClass,
                createdAt:
                    typeof newClass.createdAt === "string"
                        ? newClass.createdAt
                        : new Date().toISOString(),
            } as Class,
            ...prev,
        ]);
    };

    if (user?.role !== "teacher") {
        return (
            <div className="flex min-h-[50vh] items-center justify-center">
                <div className="max-w-sm rounded-2xl border border-border bg-card px-8 py-10 text-center">
                    <h2 className="mb-2 text-xl font-semibold text-foreground">{t("classes.accessRestricted")}</h2>
                    <p className="text-sm text-muted-foreground">
                        {t("classes.teacherOnly")}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex animate-in fade-in slide-in-from-bottom-4 flex-col gap-10 py-4 duration-700">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <section>
                    <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
                        {t("nav.classes")}
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                        {t("classes.subtitle")}
                    </p>
                </section>

                <button
                    type="button"
                    onClick={() => setIsModalOpen(true)}
                    className="inline-flex items-center justify-center gap-2 self-start rounded-2xl bg-foreground px-6 py-3 text-sm font-semibold text-background shadow-sm transition-all hover:opacity-90 active:scale-[0.97] md:self-auto"
                >
                    <Plus size={18} />
                    <span>{t("classes.create")}</span>
                </button>
            </div>

            <section>
                {isLoading ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {[1, 2, 3].map((n) => (
                            <div
                                key={n}
                                className="h-48 animate-pulse rounded-2xl border border-border bg-muted"
                            />
                        ))}
                    </div>
                ) : classes.length > 0 ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {classes.map((cls) => {
                            const subject = SUBJECTS.find((s) => s.id === cls.subjectId);
                            return (
                                <Link
                                    key={cls.id}
                                    href={`/classes/${cls.id}`}
                                    className="group rounded-2xl border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm"
                                >
                                    <div className="flex h-44 flex-col gap-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-muted text-2xl shadow-sm">
                                                    {subject?.emoji || "📚"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <h3 className="text-base font-semibold tracking-tight text-foreground">
                                                        {cls.name}
                                                    </h3>
                                                    <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                                                        {subject?.name || t("classes.noSubject")}
                                                    </span>
                                                </div>
                                            </div>
                                            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                                {t("classes.studentsCount", { count: cls.students.length })}
                                            </span>
                                        </div>

                                        <div className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-semibold text-muted-foreground transition-colors group-hover:text-foreground">
                                            <span>{t("classes.manage")}</span>
                                            <span className="transition-transform group-hover:translate-x-1">→</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="rounded-2xl border border-border bg-muted/50 px-6 py-16 text-center dark:bg-muted/30">
                        <p className="font-medium text-muted-foreground">{t("classes.empty")}</p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:opacity-90 active:scale-[0.97]"
                        >
                            <Plus size={16} />
                            <span>{t("classes.createFirst")}</span>
                        </button>
                    </div>
                )}
            </section>

            <CreateClassModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={handleCreateClass}
            />
        </div>
    );
}
