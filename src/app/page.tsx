"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState, useRef } from "react";
import { Moon, Sun } from "lucide-react";

type Lang = "uz" | "ru";
type ThemeMode = "light" | "dark";

const THEME_KEY = "uni-prep-theme";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

const content = {
  uz: {
    tagline: "siz o'ylagandan ham oson",
    quotes: [
      "Har bir savolga javob — bu kelajakka qadam.",
      "Bugun qilgan mehnat, ertangi g'alabadir.",
      "189 — bu raqam emas, bu sen.",
      "Qiyin emas, odatlanmagan xolos.",
      "Har kun bir oz — natija katta.",
      "Muvaffaqiyat tayyorgarlikning mevasidir.",
      "O'zing ishonmasang, kim ishonadi?",
      "Har bir dars — bu kelajakka investitsiya.",
      "Bilim — eng ishonchli qurol.",
      "Bugun boshla, ertaga g'urur his qilasan.",
    ],
    cta: "Ilovani ochish →",
    stats: [
      { value: "200,000+", label: "Jami savollar" },
      { value: "1,000+", label: "Har bir mavzu bo'yicha" },
      { value: "7", label: "Asosiy fanlar" },
    ],
    uniHeading: "Bu universitetlarga kirish uchun tayyorlan",
    uniNote: "* 2024-2025 o'quv yili qabul ma'lumotlari asosida",
    grant: "Grant",
    contract: "Kontrakt",
    footer: "© 2025 UniPrep. Barcha huquqlar himoyalangan.",
    login: "Kirish",
  },
  ru: {
    tagline: "проще, чем вы думаете",
    quotes: [
      "Каждый ответ — шаг в будущее.",
      "Труд сегодня — победа завтра.",
      "189 — это не цифра, это ты.",
      "Не сложно, просто непривычно.",
      "Каждый день понемногу — результат большой.",
      "Успех — это плод подготовки.",
      "Если не веришь сам — кто поверит?",
      "Каждый урок — инвестиция в будущее.",
      "Знание — самое надёжное оружие.",
      "Начни сегодня — завтра почувствуешь гордость.",
    ],
    cta: "Открыть приложение →",
    stats: [
      { value: "200,000+", label: "Всего вопросов" },
      { value: "1,000+", label: "По каждой теме" },
      { value: "7", label: "Основных предметов" },
    ],
    uniHeading: "Готовься к поступлению в эти университеты",
    uniNote: "* На основе данных приёма 2024-2025 учебного года",
    grant: "Грант",
    contract: "Контракт",
    footer: "© 2025 UniPrep. Все права защищены.",
    login: "Войти",
  },
};

const universities = [
  { name: "JIDU", fullName: { uz: "Jahon Iqtisodiyoti va Diplomatiya Universiteti", ru: "Университет мировой экономики и дипломатии" }, logo: "https://jidu.uz/local/templates/jidu/img/logo.png", grant: 189.0, contract: 185.7 },
  { name: "TDYU", fullName: { uz: "Toshkent Davlat Yuridik Universiteti", ru: "Ташкентский государственный юридический университет" }, logo: "https://tdyu.uz/images/logo.png", grant: 189.0, contract: 180.6 },
  { name: "TDIU", fullName: { uz: "Toshkent Davlat Iqtisodiyot Universiteti", ru: "Ташкентский государственный экономический университет" }, logo: "https://tdiu.uz/images/logo.png", grant: 185.5, contract: 169.3 },
  { name: "O'zMU", fullName: { uz: "O'zbekiston Milliy Universiteti", ru: "Национальный университет Узбекистана" }, logo: "https://nuu.uz/images/logo.png", grant: 181.0, contract: 158.0 },
  { name: "TUIT", fullName: { uz: "Toshkent Axborot Texnologiyalari Universiteti", ru: "Ташкентский университет информационных технологий" }, logo: "https://tuit.uz/images/logo.png", grant: 176.0, contract: 148.0 },
];

// ── Animated particles (dark mode only) ──────────────────────────────────────
function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 2 + 0.5,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.4 + 0.1,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(59, 130, 246, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none hidden dark:block"
      style={{ zIndex: 0 }}
    />
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const initial: ThemeMode = saved === "dark" ? "dark" : "light";
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const toggleTheme = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  };

  const t = content[lang];
  const quote = useMemo(
    () => content.uz.quotes[Math.floor(Math.random() * content.uz.quotes.length)],
    []
  );
  const displayQuote = lang === "uz" ? quote : content.ru.quotes[content.uz.quotes.indexOf(quote)];

  return (
    <div
      className="landing-bg min-h-screen"
      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
    >
      <Particles />

      <div className="relative" style={{ zIndex: 1 }}>

        {/* Navbar */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/80 dark:bg-black/40 border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">UniPrep</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors border border-gray-200 dark:border-white/15 text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              {lang === "uz" ? "RU" : "UZ"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              className="h-9 w-9 rounded-full transition-colors flex items-center justify-center border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/10"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-sm bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-500 text-white"
            >
              {t.login}
            </Link>
          </div>
        </nav>

        {/* Hero */}
        {/* px-6 is removed from section so the illustration can be truly full-bleed.
            Text elements below get their own px-6 wrapper. */}
        <section className="relative flex flex-col items-center justify-center text-center pt-20 pb-16 gap-6 overflow-hidden">
          {/* Glow blob — dark mode only */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none hidden dark:block"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
          />

          {/* 189 hero — full-bleed fixed-height container, layout-stable across modes */}
          <div className="relative z-10 w-full flex items-center justify-center" style={{ height: "420px" }}>

            {/* Light mode: full-bleed hand-drawn SVG.
                viewBox is 1600×400 so decorations spread to screen edges.
                preserveAspectRatio="xMidYMid slice" fills the container at any viewport width
                while keeping 189 horizontally centered. */}
            <div className="dark:hidden absolute inset-0">
              <svg
                viewBox="0 0 1600 400"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-full"
                preserveAspectRatio="xMidYMid slice"
              >
                <defs>
                  <filter id="wobbly">
                    <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="2" result="noise" seed="2"/>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G"/>
                  </filter>
                  <filter id="wobbly2">
                    <feTurbulence type="turbulence" baseFrequency="0.025" numOctaves="2" result="noise" seed="5"/>
                    <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G"/>
                  </filter>
                </defs>

                {/* Sun — far right */}
                <g filter="url(#wobbly)" transform="translate(1490, 58)">
                  <circle cx="0" cy="0" r="45" fill="#FFD93D" stroke="#F4A623" strokeWidth="3"/>
                  <circle cx="-12" cy="-5" r="4" fill="#F4A623"/>
                  <circle cx="12" cy="-5" r="4" fill="#F4A623"/>
                  <path d="M-12 8 Q0 18 12 8" stroke="#F4A623" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <line
                      key={i}
                      x1={Math.cos(angle * Math.PI / 180) * 52}
                      y1={Math.sin(angle * Math.PI / 180) * 52}
                      x2={Math.cos(angle * Math.PI / 180) * 68}
                      y2={Math.sin(angle * Math.PI / 180) * 68}
                      stroke="#F4A623"
                      strokeWidth="4"
                      strokeLinecap="round"
                    />
                  ))}
                </g>

                {/* Cloud 1 — far left */}
                <g filter="url(#wobbly2)" transform="translate(90, 52)">
                  <ellipse cx="0" cy="0" rx="50" ry="30" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                  <ellipse cx="-30" cy="5" rx="30" ry="22" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                  <ellipse cx="35" cy="5" rx="35" ry="20" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                </g>

                {/* Cloud 2 — left-center */}
                <g filter="url(#wobbly)" transform="translate(370, 148)">
                  <ellipse cx="0" cy="0" rx="35" ry="20" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="-22" cy="4" rx="22" ry="15" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="25" cy="4" rx="25" ry="14" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                </g>

                {/* Cloud 3 — right-center */}
                <g filter="url(#wobbly2)" transform="translate(1200, 78)">
                  <ellipse cx="0" cy="0" rx="40" ry="24" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="-26" cy="5" rx="26" ry="18" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="28" cy="5" rx="30" ry="16" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                </g>

                {/* Cloud 4 — far right edge */}
                <g filter="url(#wobbly)" transform="translate(1530, 175)">
                  <ellipse cx="0" cy="0" rx="32" ry="18" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                  <ellipse cx="-20" cy="4" rx="20" ry="13" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                  <ellipse cx="22" cy="4" rx="24" ry="12" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                </g>

                {/* Stars — spread across full 1600-wide canvas */}
                {([
                  [45,  300, "#FF6B9D"],
                  [1545, 285, "#6EE7B7"],
                  [270, 332, "#FCD34D"],
                  [1420, 132, "#A78BFA"],
                  [800,  55, "#F87171"],
                  [620, 318, "#60A5FA"],
                  [980, 300, "#34D399"],
                ] as [number, number, string][]).map(([x, y, color], i) => (
                  <g key={i} transform={`translate(${x}, ${y})`}>
                    <path d="M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z" fill={color} filter="url(#wobbly)"/>
                  </g>
                ))}

                {/* Grass — full width 0 → 1600 */}
                <path d="M0,370 Q100,355 200,370 Q300,385 400,370 Q500,355 600,370 Q700,385 800,370 Q900,355 1000,370 Q1100,385 1200,370 Q1300,355 1400,370 Q1500,385 1600,370"
                  stroke="#86EFAC" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>
                <path d="M0,380 Q120,365 240,380 Q360,395 480,380 Q600,365 720,380 Q840,395 960,380 Q1080,365 1200,380 Q1320,395 1440,380 Q1560,365 1600,375"
                  stroke="#4ADE80" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#wobbly2)"/>

                {/* Yellow highlighter behind 189 — centered on x=800 */}
                <rect x="550" y="180" width="500" height="60" fill="#FEF08A" opacity="0.5" rx="4" filter="url(#wobbly)"/>

                {/* 189 — outline stroke */}
                <text
                  x="800" y="290"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                    fontSize: "220px",
                    fontWeight: 900,
                    fill: "none",
                    stroke: "#1e293b",
                    strokeWidth: "8",
                    strokeLinejoin: "round",
                    strokeLinecap: "round",
                    paintOrder: "stroke fill",
                  }}
                  filter="url(#wobbly)"
                >189</text>

                {/* 189 — color fill */}
                <text
                  x="800" y="290"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                    fontSize: "220px",
                    fontWeight: 900,
                    fill: "#4F46E5",
                    opacity: 0.85,
                  }}
                  filter="url(#wobbly)"
                >189</text>

                {/* 189 — highlight */}
                <text
                  x="798" y="287"
                  textAnchor="middle"
                  style={{
                    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                    fontSize: "220px",
                    fontWeight: 900,
                    fill: "#818CF8",
                    opacity: 0.3,
                  }}
                  filter="url(#wobbly2)"
                >189</text>

                {/* Squiggly underline — centered on x=800 */}
                <path d="M560,310 Q620,325 680,310 Q740,295 800,310 Q860,325 920,310 Q980,295 1040,310"
                  stroke="#F87171" strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>

                {/* Hearts */}
                <path d="M80,200 C80,190 90,185 95,190 C100,185 110,190 110,200 C110,210 95,220 95,220 C95,220 80,210 80,200Z"
                  fill="#FF6B9D" filter="url(#wobbly)"/>
                <path d="M1480,318 C1480,311 1487,307 1491,311 C1495,307 1502,311 1502,318 C1502,325 1491,332 1491,332 C1491,332 1480,325 1480,318Z"
                  fill="#FF6B9D" filter="url(#wobbly2)" opacity="0.8"/>

                {/* Exclamation marks */}
                <text x="50"   y="270" style={{ fontSize: "32px", fill: "#F59E0B" }} filter="url(#wobbly)">!</text>
                <text x="1530" y="250" style={{ fontSize: "28px", fill: "#10B981" }} filter="url(#wobbly2)">!</text>

                {/* Arrow — near 189 */}
                <path d="M595,182 Q625,222 655,242" stroke="#1d4ed8" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>
                <path d="M650,234 L655,242 L663,236" stroke="#1d4ed8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Dark mode: neon glow — absolutely fills the same container */}
            <div
              className="hidden dark:flex absolute inset-0 items-center justify-center select-none"
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "clamp(130px, 24vw, 240px)",
                fontWeight: 900,
                lineHeight: 0.9,
                letterSpacing: "-0.04em",
                color: "#ffffff",
                textShadow: `
                  0 0 7px #fff,
                  0 0 10px #fff,
                  0 0 21px #fff,
                  0 0 42px #3b82f6,
                  0 0 82px #3b82f6,
                  0 0 92px #3b82f6,
                  0 0 102px #1d4ed8,
                  0 0 151px #1d4ed8
                `,
                WebkitTextStroke: "2px rgba(59, 130, 246, 0.3)",
              }}
            >
              189
            </div>

          </div>

          {/* Text content — own px-6 so it doesn't touch screen edges on mobile */}
          <div className="relative z-10 flex flex-col items-center gap-6 w-full px-6">
            <p className="text-2xl md:text-3xl font-semibold max-w-xl text-gray-800 dark:text-white/90">
              {t.tagline}
            </p>
            <p className="text-lg italic max-w-md text-gray-400 dark:text-white/50">
              &ldquo;{displayQuote}&rdquo;
            </p>
            <Link
              href="/login"
              className="mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-md hover:scale-105 active:scale-100 text-white bg-blue-700 dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-500"
            >
              {t.cta}
            </Link>
          </div>
        </section>

        {/* Stats bar */}
        <section className="py-12 border-y border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-blue-900/10">
          <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
            {t.stats.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center sm:flex-1">
                <span className="text-4xl font-black text-gray-900 dark:text-white">
                  {stat.value}
                </span>
                <span className="text-sm mt-1 text-center text-gray-500 dark:text-white/50">{stat.label}</span>
                {i < t.stats.length - 1 && (
                  <div className="hidden sm:block absolute h-12 w-px bg-gray-200 dark:bg-white/10" style={{ transform: "translateX(100px)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Universities */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10 text-gray-900 dark:text-white">
              {t.uniHeading}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible">
              {universities.map((uni) => (
                <div
                  key={uni.name}
                  className="snap-center shrink-0 w-48 md:w-auto rounded-2xl shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col items-center gap-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/8"
                >
                  <div className="relative w-16 h-16">
                    <Image
                      src={uni.logo}
                      alt={uni.name}
                      fill
                      className="object-contain"
                      onError={(e) => { e.currentTarget.style.display = "none"; }}
                    />
                  </div>
                  <div className="text-center">
                    <div className="font-bold text-sm text-gray-900 dark:text-white">{uni.name}</div>
                    <div className="text-xs mt-0.5 leading-tight text-gray-400 dark:text-white/45">{uni.fullName[lang]}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100 dark:bg-blue-600/15 dark:text-blue-300 dark:border-blue-500/25">
                      {t.grant}: {uni.grant}
                    </span>
                    <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-gray-100 text-gray-500 border border-gray-200 dark:bg-white/6 dark:text-white/50 dark:border-white/8">
                      {t.contract}: {uni.contract}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6 text-gray-400 dark:text-white/35">{t.uniNote}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-100 dark:border-white/5 text-center text-sm text-gray-400 dark:text-white/35">
          {t.footer}
        </footer>

      </div>
    </div>
  );
}
