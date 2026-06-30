"use client";

import Link from "next/link";
import { Subject } from "@/lib/firestore-schema";
import { ChevronRight } from "lucide-react";
import { getSubjectMeta, AccentKey } from "@/lib/subject-icons";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface SubjectCardProps {
    subject: Subject;
    stars?: number;
    medals?: { green: number; grey: number; bronze: number };
    progress?: number;
}

const GRADIENTS: Record<AccentKey, string> = {
    purple:  "linear-gradient(135deg, #8B5CF6 0%, #C084FC 100%)",
    blue:    "linear-gradient(135deg, #1C82E0 0%, #6366F1 100%)",
    sky:     "linear-gradient(135deg, #0EA5E9 0%, #6366F1 100%)",
    emerald: "linear-gradient(135deg, #059669 0%, #10B981 100%)",
    teal:    "linear-gradient(135deg, #0D9488 0%, #06B6D4 100%)",
    indigo:  "linear-gradient(135deg, #4F46E5 0%, #818CF8 100%)",
    amber:   "linear-gradient(135deg, #D97706 0%, #F59E0B 100%)",
    rose:    "linear-gradient(135deg, #E8568F 0%, #F43F5E 100%)",
    orange:  "linear-gradient(135deg, #E2562F 0%, #F97316 100%)",
    neutral: "linear-gradient(135deg, #525252 0%, #737373 100%)",
};

export default function SubjectCard({ subject, progress = 0 }: SubjectCardProps) {
    const { language } = useTranslation();
    const { icon: Icon, accent: accentKey } = getSubjectMeta(subject.name, subject.id);
    const gradient = GRADIENTS[accentKey];

    const pct = Math.max(0, Math.min(100, progress));

    return (
        <div
            className="relative flex flex-col rounded-xl overflow-hidden transition-all duration-200"
            style={{ background: gradient, minHeight: 172 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 16px 40px rgba(0,0,0,.5)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
        >
            {/* Noise overlay for depth */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.06]"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />

            <div className="relative z-10 flex flex-col flex-1 p-5">
                {/* Icon + progress badge */}
                <div className="flex items-start justify-between mb-auto">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.2)" }}>
                        <Icon size={20} style={{ color: "#fff" }} />
                    </div>
                    {pct > 0 && (
                        <span className="text-[11px] font-bold rounded-full px-2.5 py-1"
                            style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
                            {pct}%
                        </span>
                    )}
                </div>

                {/* Name */}
                <div className="mt-4 mb-3">
                    <div className="text-[17px] font-extrabold text-white leading-tight" style={{ letterSpacing: "-.01em" }}>
                        {subject.name}
                    </div>
                </div>

                {/* Progress bar */}
                {pct > 0 && (
                    <div className="h-1 w-full rounded-full mb-3" style={{ background: "rgba(255,255,255,0.25)" }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "rgba(255,255,255,0.85)" }} />
                    </div>
                )}

                {/* Open button */}
                <Link
                    href={`/subject/${subject.id}`}
                    className="inline-flex items-center gap-1.5 text-[13px] font-bold rounded-lg px-4 py-2.5 transition-all duration-150 self-start"
                    style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.5)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "rgba(0,0,0,0.35)")}
                >
                    {language === "uz" ? "Ochish" : "Открыть"}
                    <ChevronRight size={14} strokeWidth={2.5} />
                </Link>
            </div>
        </div>
    );
}
