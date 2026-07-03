"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useSubjectsStore } from "@/store/useSubjectsStore";
import { useStatsStore } from "@/store/useStatsStore";
import { Class, Topic } from "@/lib/firestore-schema";
import { SUBJECTS } from "@/lib/constants";
import { fetchStudentClasses } from "@/lib/profile-utils";
import { fetchSubjects, fetchTextbooksBySubject, fetchTopicsByTextbook } from "@/lib/data-fetching";
import { fetchUserSubjectRatings, fetchSubjectProgress } from "@/lib/stats-utils";
import { updateUserProfile } from "@/lib/auth-utils";
import { Star, ShieldCheck, Copy, Check, Settings2, X } from "lucide-react";
import { getSubjectMeta, ACCENT_ICON_BG, ACCENT_ICON_COLORS } from "@/lib/subject-icons";
import { useTranslation } from "@/lib/i18n/useTranslation";
import OrgBadge from "@/components/org-badge";

export default function ProfilePage() {
    const { user, setUser } = useAuthStore();
    const { t } = useTranslation();
    const { subjects, loaded: subjectsLoaded, setSubjects } = useSubjectsStore();
    const { subjectProgress, loadedForUser, setSubjectProgress, setRatings, setLoadedForUser } = useStatsStore();

    const [classes, setClasses] = useState<Class[]>([]);
    const [ratings, setLocalRatings] = useState<Record<string, number>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [newName, setNewName] = useState("");
    const [newSurname, setNewSurname] = useState("");
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        if (!user?.id) return;
        setNewName(user.name);
        setNewSurname(user.surname || "");

        const load = async () => {
            // Subjects — global store
            const subjectsData = subjectsLoaded ? subjects : await fetchSubjects().then((s) => { setSubjects(s); return s; });

            // Classes — always need for this user (short TTL cached)
            const [classesData, ratingsData] = await Promise.all([
                user.role === "student" ? fetchStudentClasses(user.id) : Promise.resolve([]),
                fetchUserSubjectRatings(user.id),
            ]);
            setClasses(classesData);
            setLocalRatings(ratingsData);
            setIsLoading(false);

            // Progress — skip if already loaded for this user in store
            if (loadedForUser === user.id) return;

            setRatings(ratingsData);
            setLoadedForUser(user.id);

            await Promise.all(
                subjectsData.map(async (subject) => {
                    const textbooks = await fetchTextbooksBySubject(subject.id);
                    const allTopicIds: string[] = (
                        await Promise.all(textbooks.map((tb) => fetchTopicsByTextbook(tb.id)))
                    ).flat().map((t: Topic) => t.id);
                    const progress = await fetchSubjectProgress(user.id, subject.id, allTopicIds);
                    setSubjectProgress(subject.id, {
                        stars: ratingsData[subject.id] || 0,
                        medals: progress.medals,
                        progress: progress.progress,
                    });
                })
            );
        };

        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const copyId = () => {
        if (!user) return;
        navigator.clipboard.writeText(user.shortId || user.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || newName.length < 2) return;
        try {
            setIsUpdating(true);
            const updatedUser = await updateUserProfile(user.id, { name: newName, surname: newSurname });
            setUser(updatedUser);
            setIsEditModalOpen(false);
        } catch {
            alert(t("settings.profileError"));
        } finally {
            setIsUpdating(false);
        }
    };

    if (!user) return null;

    const displaySubjects = subjectsLoaded ? subjects : [];

    return (
        <div className="flex flex-col gap-12 py-4 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <section className="flex flex-col items-center text-center gap-5 pt-4">
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 flex-shrink-0 cursor-pointer group" onClick={() => setIsEditModalOpen(true)}>
                    <div className="w-full h-full bg-muted border border-border rounded-3xl flex items-center justify-center text-foreground text-5xl font-bold shadow-sm overflow-hidden">
                        {user.name[0].toUpperCase()}
                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-3xl">
                            <Settings2 size={28} className="text-white" />
                        </div>
                    </div>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground leading-tight">
                        {user.name} {user.surname || ""}
                    </h1>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 text-[10px] bg-muted border border-border px-3 py-1 rounded-full text-muted-foreground font-bold uppercase tracking-widest">
                            <ShieldCheck size={11} />
                            {user.role === "teacher" ? t("role.teacher") : t("role.student")}
                        </span>
                        <OrgBadge organization={user.organization} />
                    </div>
                </div>

                <p className="text-muted-foreground text-sm -mt-1">{user.email}</p>

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border border-border rounded-xl">
                        <code className="text-xs text-muted-foreground font-mono font-bold tracking-wider">
                            ID: {user.shortId || user.id}
                        </code>
                        <button onClick={copyId} className="p-1 hover:bg-muted rounded-lg transition-all text-muted-foreground hover:text-foreground" title={t("profile.copyId")}>
                            {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                        </button>
                    </div>
                    <button onClick={() => setIsEditModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border rounded-xl text-muted-foreground font-semibold hover:bg-muted hover:text-foreground transition-all active:scale-[0.98] text-sm">
                        <Settings2 size={14} />
                        {t("profile.editProfile")}
                    </button>
                </div>
            </section>

            {isEditModalOpen && (
                <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-card border border-border rounded-3xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-foreground tracking-tight">{t("settings.editProfileTitle")}</h2>
                                <button onClick={() => setIsEditModalOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors"><X size={24} /></button>
                            </div>
                            <form onSubmit={handleUpdateProfile} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">{t("settings.name")}</label>
                                    <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full p-4 bg-muted/50 border border-border rounded-2xl focus:border-ring focus:ring-1 focus:ring-ring/25 focus:outline-none transition-colors font-medium text-foreground placeholder:text-muted-foreground/70" placeholder={t("onboarding.namePlaceholder")} required />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest ml-1">{t("settings.surname")}</label>
                                    <input type="text" value={newSurname} onChange={(e) => setNewSurname(e.target.value)} className="w-full p-4 bg-muted/50 border border-border rounded-2xl focus:border-ring focus:ring-1 focus:ring-ring/25 focus:outline-none transition-colors font-medium text-foreground placeholder:text-muted-foreground/70" placeholder={t("onboarding.surnameOptional")} />
                                </div>
                                <div className="flex gap-4 pt-4">
                                    <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 border border-border text-muted-foreground rounded-2xl font-bold hover:bg-muted/50 transition-all">{t("common.cancel")}</button>
                                    <button type="submit" disabled={isUpdating || newName.length < 2} className="flex-1 py-4 bg-foreground text-background rounded-2xl font-bold hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50">
                                        {isUpdating ? t("common.saving") : t("common.save")}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {user.role === "student" && (
                <section>
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-xl font-bold text-foreground tracking-tight">{t("nav.classes")}</h2>
                        <span className="text-sm text-muted-foreground">{t("profile.groupsCount", { count: classes.length })}</span>
                    </div>
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[1, 2].map(n => <div key={n} className="h-24 bg-muted rounded-2xl animate-pulse border border-border" />)}
                        </div>
                    ) : classes.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {classes.map((cls) => {
                                const subject = SUBJECTS.find(s => s.id === cls.subjectId);
                                return (
                                    <div key={cls.id} className="p-5 bg-muted/50 border border-border rounded-2xl flex items-center gap-4">
                                        <span className="text-3xl">{subject?.emoji || "📚"}</span>
                                        <div>
                                            <h3 className="font-semibold text-foreground">{cls.name}</h3>
                                            <p className="text-sm text-muted-foreground">{subject?.name}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="p-12 text-center rounded-2xl border border-border bg-muted/50 text-muted-foreground font-medium">
                            {t("profile.noClasses")}
                        </div>
                    )}
                </section>
            )}

            <section>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-foreground tracking-tight">{t("profile.subjectProgress")}</h2>
                    <p className="text-sm text-muted-foreground">{t("profile.percentTopics")}</p>
                </div>
                {isLoading ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {[1, 2, 3, 4, 5, 6].map(n => <div key={n} className="h-28 bg-muted rounded-2xl animate-pulse border border-border" />)}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {displaySubjects.map((subject) => {
                            const prog = subjectProgress[subject.id];
                            const pct = prog?.progress ?? 0;
                            const medals = prog?.medals ?? { green: 0, grey: 0, bronze: 0 };
                            const stars = ratings[subject.id] || 0;
                            const { icon: Icon, accent } = getSubjectMeta(subject.name, subject.id);
                            return (
                                <div key={subject.id} className="p-5 bg-muted/50 border border-border rounded-2xl flex flex-col gap-3 hover:bg-muted transition-all">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${ACCENT_ICON_BG[accent]}`}>
                                            <Icon size={17} className={ACCENT_ICON_COLORS[accent]} />
                                        </div>
                                        <span className="text-sm font-bold text-foreground tracking-tight flex-1 truncate">{subject.name}</span>
                                        <span className="text-xs font-bold text-muted-foreground">{pct}%</span>
                                    </div>
                                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                                        <div className="h-full bg-foreground rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        {medals.green > 0 && <span>🟢 {medals.green}</span>}
                                        {medals.grey > 0 && <span>⚪ {medals.grey}</span>}
                                        {medals.bronze > 0 && <span>🥉 {medals.bronze}</span>}
                                        {stars > 0 && (
                                            <span className="ml-auto flex items-center gap-1">
                                                <Star size={11} className="fill-yellow-400 text-yellow-400" />
                                                {stars}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
