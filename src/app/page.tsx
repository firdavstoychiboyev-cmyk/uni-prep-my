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

// ── Animated particles ────────────────────────────────────────────────────────
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
        ctx.fillStyle = `rgba(14, 165, 233, ${p.opacity})`;
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
      className="fixed inset-0 pointer-events-none"
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
        <nav
          className="sticky top-0 z-50 backdrop-blur-xl border-b px-6 py-4 flex items-center justify-between"
          style={{ background: "rgba(10,10,20,0.8)", borderColor: "rgba(255,255,255,0.05)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ color: "#ffffff" }}>UniPrep</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
              className="px-3 py-1.5 rounded-full text-sm font-semibold transition-colors"
              style={{ border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.8)", background: "transparent" }}
            >
              {lang === "uz" ? "RU" : "UZ"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              className="h-9 w-9 rounded-full transition-colors flex items-center justify-center"
              style={{ border: "1px solid rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)" }}
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full text-sm font-semibold transition-colors shadow-sm"
              style={{ background: "#0ea5e9", color: "#ffffff" }}
            >
              {t.login}
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 gap-6">
          {/* Cyan glow blob behind 189 */}
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(14,165,233,0.12) 0%, transparent 70%)" }}
          />
          <div
            className="relative z-10 select-none leading-none"
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
                0 0 42px #0ea5e9,
                0 0 82px #0ea5e9,
                0 0 92px #0ea5e9,
                0 0 102px #0ea5e9,
                0 0 151px #0ea5e9
              `,
              WebkitTextStroke: "2px rgba(14, 165, 233, 0.3)",
            }}
          >
            189
          </div>
          <p className="relative z-10 text-2xl md:text-3xl font-semibold max-w-xl" style={{ color: "rgba(255,255,255,0.9)" }}>
            {t.tagline}
          </p>
          <p className="relative z-10 text-lg italic max-w-md" style={{ color: "rgba(255,255,255,0.5)" }}>
            &ldquo;{displayQuote}&rdquo;
          </p>
          <Link
            href="/login"
            className="relative z-10 mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-full text-lg font-bold transition-all shadow-md hover:scale-105 active:scale-100"
            style={{ background: "#0ea5e9", color: "#ffffff" }}
          >
            {t.cta}
          </Link>
        </section>

        {/* Stats bar */}
        <section
          className="py-12"
          style={{
            background: "rgba(14,165,233,0.04)",
            borderTop: "1px solid rgba(255,255,255,0.05)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
            {t.stats.map((stat, i) => (
              <div key={stat.label} className="flex flex-col items-center sm:flex-1">
                <span className="text-4xl font-black" style={{ color: "#ffffff" }}>
                  {stat.value}
                </span>
                <span className="text-sm mt-1 text-center" style={{ color: "rgba(255,255,255,0.5)" }}>{stat.label}</span>
                {i < t.stats.length - 1 && (
                  <div className="hidden sm:block absolute h-12 w-px" style={{ background: "rgba(255,255,255,0.08)", transform: "translateX(100px)" }} />
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Universities */}
        <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-10" style={{ color: "#ffffff" }}>
              {t.uniHeading}
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible">
              {universities.map((uni) => (
                <div
                  key={uni.name}
                  className="snap-center shrink-0 w-48 md:w-auto rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-5 flex flex-col items-center gap-3"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
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
                    <div className="font-bold text-sm" style={{ color: "#ffffff" }}>{uni.name}</div>
                    <div className="text-xs mt-0.5 leading-tight" style={{ color: "rgba(255,255,255,0.45)" }}>{uni.fullName[lang]}</div>
                  </div>
                  <div className="flex flex-col gap-1.5 w-full">
                    <span
                      className="text-xs font-semibold text-center px-2 py-1 rounded-lg"
                      style={{ background: "rgba(14,165,233,0.15)", color: "#38bdf8", border: "1px solid rgba(14,165,233,0.25)" }}
                    >
                      {t.grant}: {uni.grant}
                    </span>
                    <span
                      className="text-xs font-semibold text-center px-2 py-1 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.08)" }}
                    >
                      {t.contract}: {uni.contract}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.35)" }}>{t.uniNote}</p>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="py-8 text-center text-sm"
          style={{ borderTop: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.35)" }}
        >
          {t.footer}
        </footer>

      </div>
    </div>
  );
}
