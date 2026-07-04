"use client";

/**
 * Готовые иллюстрации предметов из Claude Design — вставлены как есть
 * (SVG с градиентами и тенями), только переведены в JSX. Ключ — slug предмета
 * из subject-theme. Используются и в больших карточках /subjects, и в мелких
 * бейджах сайдбара.
 *
 * ID градиентов уникализируются через useId(): один и тот же предмет может
 * рендериться дважды на странице (карточка + пункт сайдбара), поэтому
 * захардкоженные id вызвали бы конфликт url(#…). Двоеточия из useId убираем —
 * они ломают ссылки url(#…) в SVG.
 */
import { useId, type SVGProps } from "react";

export type IllustrationKey =
    | "math" | "english" | "native" | "biology" | "history" | "physics" | "chemistry" | "default";

type Glyph = (props: SVGProps<SVGSVGElement>) => JSX.Element;

const MathIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const tri = `${u}-tri`, rul = `${u}-rul`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={tri} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".85" /><stop offset="1" stopColor="#bfe0ff" stopOpacity=".45" /></linearGradient>
                <linearGradient id={rul} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#eaf7ff" stopOpacity=".95" /><stop offset=".5" stopColor="#7dd3fc" stopOpacity=".82" /><stop offset="1" stopColor="#86efac" stopOpacity=".9" /></linearGradient>
            </defs>
            <g transform="rotate(-12 120 130)">
                <path d="M40 44 L40 210 L206 210 Z" fill={`url(#${tri})`} stroke="#ffffff" strokeOpacity=".85" strokeWidth="3" />
                <path d="M62 110 L62 188 L140 188 Z" fill="#1d4ed8" fillOpacity=".16" />
                <g stroke="#2563eb" strokeOpacity=".38" strokeWidth="3" strokeLinecap="round">
                    <line x1="40" y1="70" x2="56" y2="70" /><line x1="40" y1="96" x2="50" y2="96" /><line x1="40" y1="122" x2="56" y2="122" /><line x1="40" y1="148" x2="50" y2="148" /><line x1="40" y1="174" x2="56" y2="174" />
                </g>
            </g>
            <g transform="rotate(52 158 132)">
                <rect x="124" y="26" width="46" height="196" rx="10" fill={`url(#${rul})`} stroke="#ffffff" strokeOpacity=".85" strokeWidth="3" />
                <g stroke="#1d4ed8" strokeOpacity=".34" strokeWidth="3" strokeLinecap="round">
                    <line x1="124" y1="48" x2="146" y2="48" /><line x1="124" y1="66" x2="138" y2="66" /><line x1="124" y1="84" x2="146" y2="84" /><line x1="124" y1="102" x2="138" y2="102" /><line x1="124" y1="120" x2="146" y2="120" /><line x1="124" y1="138" x2="138" y2="138" /><line x1="124" y1="156" x2="146" y2="156" /><line x1="124" y1="174" x2="138" y2="174" /><line x1="124" y1="192" x2="146" y2="192" />
                </g>
                <circle cx="147" cy="42" r="7" fill="#ffffff" fillOpacity=".5" stroke="#ffffff" strokeOpacity=".85" strokeWidth="2.5" />
            </g>
        </svg>
    );
};

const EnglishIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const l = `${u}-l`, r = `${u}-r`, pen = `${u}-pen`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={l} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ffe1f0" /></linearGradient>
                <linearGradient id={r} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffd7ec" /><stop offset="1" stopColor="#ff9ecb" /></linearGradient>
                <linearGradient id={pen} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffe9a8" /><stop offset="1" stopColor="#f5ad2b" /></linearGradient>
            </defs>
            <ellipse cx="132" cy="220" rx="104" ry="16" fill="#7a1050" opacity=".2" />
            <path d="M128 66 C96 48 56 48 30 62 L30 194 C56 180 96 180 128 200 Z" fill={`url(#${l})`} />
            <path d="M128 66 C160 48 204 48 230 62 L230 194 C204 180 160 180 128 200 Z" fill={`url(#${r})`} />
            <path d="M128 66 L128 200" stroke="#f472b6" strokeOpacity=".45" strokeWidth="2.5" />
            <g stroke="#f472b6" strokeOpacity=".7" strokeWidth="5" strokeLinecap="round">
                <line x1="50" y1="90" x2="106" y2="97" /><line x1="50" y1="112" x2="106" y2="119" /><line x1="50" y1="134" x2="96" y2="141" />
                <line x1="150" y1="97" x2="210" y2="90" /><line x1="150" y1="119" x2="210" y2="112" /><line x1="150" y1="141" x2="200" y2="134" />
            </g>
            <g transform="rotate(33 176 120)">
                <rect x="166" y="40" width="22" height="140" rx="7" fill={`url(#${pen})`} />
                <rect x="168" y="40" width="7" height="140" fill="#fff3cf" opacity=".85" />
                <path d="M166 180 l11 30 l11 -30 z" fill="#ffe9c7" />
                <path d="M171 197 l6 13 l6 -13 z" fill="#3a2a12" />
                <rect x="166" y="32" width="22" height="12" rx="4" fill="#ec4899" />
            </g>
        </svg>
    );
};

const NativeIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const bd = `${u}-b`, nib = `${u}-n`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={bd} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".95" /><stop offset="1" stopColor="#ddd0ff" stopOpacity=".7" /></linearGradient>
                <linearGradient id={nib} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e9deff" /><stop offset="1" stopColor="#a78bfa" /></linearGradient>
            </defs>
            <ellipse cx="130" cy="222" rx="86" ry="14" fill="#3b1080" opacity=".2" />
            <g transform="rotate(45 130 130)">
                <rect x="116" y="22" width="28" height="150" rx="14" fill={`url(#${bd})`} stroke="#ffffff" strokeOpacity=".8" strokeWidth="2.5" />
                <rect x="121" y="22" width="8" height="150" rx="4" fill="#ffffff" opacity=".55" />
                <rect x="113" y="58" width="34" height="14" rx="4" fill="#8b5cf6" fillOpacity=".9" />
                <path d="M116 172 L144 172 L130 218 Z" fill={`url(#${nib})`} stroke="#ffffff" strokeOpacity=".6" strokeWidth="2" />
                <line x1="130" y1="172" x2="130" y2="206" stroke="#6d28d9" strokeWidth="3.5" />
                <circle cx="130" cy="186" r="5.5" fill="#6d28d9" />
            </g>
        </svg>
    );
};

const BiologyIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const a = `${u}-a`, b = `${u}-b`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={a} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#d6ffe6" /></linearGradient>
                <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#bbf7d0" /><stop offset="1" stopColor="#4ade80" stopOpacity=".85" /></linearGradient>
            </defs>
            <ellipse cx="132" cy="220" rx="84" ry="14" fill="#064e2b" opacity=".2" />
            <path d="M134 32 C58 66 46 168 84 216 C170 202 218 112 134 32 Z" fill={`url(#${a})`} />
            <path d="M134 32 C182 92 170 168 84 216 C96 142 108 78 134 32 Z" fill={`url(#${b})`} />
            <path d="M108 200 C116 130 124 78 134 38" stroke="#16a34a" strokeWidth="5" fill="none" strokeLinecap="round" />
            <g stroke="#22c55e" strokeOpacity=".8" strokeWidth="4" fill="none" strokeLinecap="round">
                <path d="M116 88 C130 82 142 90 156 82" /><path d="M113 120 C130 114 144 122 160 112" /><path d="M110 152 C126 146 138 154 152 146" /><path d="M108 182 C120 178 130 184 140 178" />
            </g>
        </svg>
    );
};

const HistoryIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const a = `${u}-a`, b = `${u}-b`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={a} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ffe6b8" /></linearGradient>
                <linearGradient id={b} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff6e2" /><stop offset="1" stopColor="#fbbf24" stopOpacity=".85" /></linearGradient>
            </defs>
            <ellipse cx="130" cy="224" rx="98" ry="14" fill="#7c2d00" opacity=".2" />
            <path d="M130 34 L214 88 L46 88 Z" fill={`url(#${a})`} />
            <path d="M130 34 L214 88 L130 88 Z" fill="#f7c977" fillOpacity=".55" />
            <rect x="54" y="92" width="152" height="16" rx="4" fill={`url(#${b})`} />
            <g fill={`url(#${a})`}><rect x="62" y="114" width="24" height="78" rx="4" /><rect x="118" y="114" width="24" height="78" rx="4" /><rect x="174" y="114" width="24" height="78" rx="4" /></g>
            <g fill="#e9a13a" fillOpacity=".4"><rect x="76" y="114" width="10" height="78" /><rect x="132" y="114" width="10" height="78" /><rect x="188" y="114" width="10" height="78" /></g>
            <rect x="46" y="194" width="168" height="16" rx="4" fill={`url(#${b})`} />
        </svg>
    );
};

const PhysicsIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const n = `${u}-n`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <radialGradient id={n} cx="40%" cy="40%" r="70%"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#67e8f9" /></radialGradient>
            </defs>
            <ellipse cx="130" cy="224" rx="80" ry="13" fill="#063b4a" opacity=".2" />
            <g fill="none" stroke="#ffffff" strokeOpacity=".9" strokeWidth="7">
                <ellipse cx="130" cy="128" rx="92" ry="36" />
                <ellipse cx="130" cy="128" rx="92" ry="36" transform="rotate(60 130 128)" />
                <ellipse cx="130" cy="128" rx="92" ry="36" transform="rotate(120 130 128)" />
            </g>
            <g fill="#a5f3fc"><circle cx="222" cy="128" r="10" /><circle cx="84" cy="56" r="10" /><circle cx="84" cy="200" r="10" /></g>
            <circle cx="130" cy="128" r="22" fill={`url(#${n})`} />
            <circle cx="122" cy="120" r="7" fill="#ffffff" fillOpacity=".75" />
        </svg>
    );
};

const ChemistryIllustration: Glyph = (props) => {
    const u = useId().replace(/:/g, "");
    const g = `${u}-g`, liq = `${u}-liq`;
    return (
        <svg viewBox="0 0 260 260" {...props}>
            <defs>
                <linearGradient id={g} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" stopOpacity=".9" /><stop offset="1" stopColor="#ffe1e6" stopOpacity=".6" /></linearGradient>
                <linearGradient id={liq} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fda4af" /><stop offset="1" stopColor="#f43f5e" /></linearGradient>
            </defs>
            <ellipse cx="130" cy="226" rx="80" ry="13" fill="#7a0f2a" opacity=".2" />
            <path d="M106 44 L154 44 L154 102 L196 186 C203 202 191 218 172 218 L88 218 C69 218 57 202 64 186 L106 102 Z" fill={`url(#${g})`} stroke="#ffffff" strokeOpacity=".7" strokeWidth="3" />
            <path d="M86 150 L174 150 L196 186 C203 202 191 218 172 218 L88 218 C69 218 57 202 64 186 Z" fill={`url(#${liq})`} />
            <path d="M86 150 L174 150 L182 162 L78 162 Z" fill="#ffb0bb" />
            <circle cx="110" cy="186" r="7" fill="#ffe4e6" opacity=".85" />
            <circle cx="140" cy="198" r="5" fill="#ffe4e6" opacity=".85" />
            <circle cx="126" cy="176" r="4" fill="#ffe4e6" opacity=".7" />
            <rect x="100" y="36" width="60" height="12" rx="5" fill="#f43f5e" />
        </svg>
    );
};

export const ILLUSTRATIONS: Record<IllustrationKey, Glyph> = {
    math: MathIllustration,
    english: EnglishIllustration,
    native: NativeIllustration,
    biology: BiologyIllustration,
    history: HistoryIllustration,
    physics: PhysicsIllustration,
    chemistry: ChemistryIllustration,
    default: MathIllustration,
};

/**
 * Область самого узнаваемого фрагмента иллюстрации (viewBox) — для мелких
 * бейджей сайдбара, где полная сцена «мутнеет». Кадрируем на главный мотив,
 * не рисуя ничего нового.
 */
export const BADGE_VIEWBOX: Record<IllustrationKey, string> = {
    math: "40 40 150 150",       // угольник + линейка
    english: "24 46 100 118",    // раскрытая книга
    native: "70 46 120 120",     // перо
    biology: "44 26 118 118",    // лист
    history: "40 30 180 120",    // фронтон + колонны
    physics: "40 66 180 130",    // атом
    chemistry: "56 34 148 148",  // колба
    default: "40 40 150 150",
};
