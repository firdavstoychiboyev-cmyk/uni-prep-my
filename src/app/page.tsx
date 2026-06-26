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
        ctx.fillStyle = `rgba(99, 102, 241, ${p.opacity})`;
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
      className="landing-bg min-h-screen text-foreground"
      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
    >
      {/* Particles (dark mode only) */}
      <Particles />

      {/* Dot grid overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(99,102,241,0.08) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          zIndex: 0,
        }}
      />

      {/* All content above bg layers */}
      <div className="relative" style={{ zIndex: 1 }}>

        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-white/90 dark:bg-black/40 backdrop-blur-xl border-b border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">UniPrep</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
              className="px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
            >
              {lang === "uz" ? "RU" : "UZ"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              className="h-9 w-9 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center justify-center"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {t.login}
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 gap-6">
          <div
            className="select-none leading-none dark:drop-shadow-[0_0_80px_rgba(99,102,241,0.4)]"
            style={{
              fontFamily: "var(--font-montserrat), system-ui, sans-serif",
              fontSize: "clamp(130px, 24vw, 240px)",
              fontWeight: 900,
              color: "hsl(var(--foreground))",
              lineHeight: 0.9,
              letterSpacing: "-0.04em",
            }}
          >
            189
          </div>
          <p className="text-2xl md:text-3xl font-semibold text-foreground max-w-xl">
            {t.tagline}
          </p>
          <p className="text-lg text-muted-foreground italic max-w-md">&ldquo;{displayQuote}&rdquo;</p>
          <Link
            href="/login"
            className="mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-indigo-600 text-white text-lg font-bold hover:bg-indigo-700 transition-all shadow-md hover:scale-105 active:scale-100"
          >
            {t.cta}
          </Link>
        </section>

        {/* Stats bar */}
        <section className="py-12 border-y border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/[0.03]">
          <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
            {t.stats.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center sm:flex-1">
                <span className="text-4xl font-black text-foreground">
                  {stat.value}
                </span>
                <span className="text-sm text-muted-foreground mt-1 text-center">{stat.label}</span>
                {i < t.stats.length - 1 && (
                  <div className="hidden sm:block absolute h-12 w-px bg-border" style={{ transform: "translateX(100px)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Universities */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-10">
              {t.uniHeading}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible">
              {universities.map((uni) => (
                <div
                  key={uni.name}
                  className="snap-center shrink-0 w-48 md:w-auto bg-card rounded-2xl border border-border shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col items-center gap-3"
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
                    <div className="font-bold text-foreground text-sm">{uni.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 leading-tight">{uni.fullName[lang]}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100 dark:bg-green-950/30 dark:text-green-400 dark:border-green-900">
                      {t.grant}: {uni.grant}
                    </span>
                    <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-muted text-muted-foreground border border-border">
                      {t.contract}: {uni.contract}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-muted-foreground mt-6">{t.uniNote}</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-8 border-t border-border text-center text-sm text-muted-foreground">
          {t.footer}
        </footer>

      </div>
    </div>
  );
}
