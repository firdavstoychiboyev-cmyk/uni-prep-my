"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useEffect, useState } from "react";
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
      className="min-h-screen bg-background text-foreground"
      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
    >
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-background/90 backdrop-blur border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9">
            <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">UniPrep</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <button
            onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
            className="px-3 py-1.5 rounded-full border border-border text-sm font-semibold text-foreground hover:bg-muted transition-colors"
          >
            {lang === "uz" ? "RU" : "UZ"}
          </button>
          {/* Dark/light toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
            className="h-9 w-9 rounded-full border border-border bg-card hover:bg-muted text-foreground transition-colors flex items-center justify-center"
          >
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {/* Login */}
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
          className="select-none leading-none"
          style={{
            fontFamily: "var(--font-cormorant), serif",
            fontSize: "clamp(130px, 24vw, 240px)",
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            lineHeight: 0.9,
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
      <section className="py-12 border-y border-border bg-muted/40">
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
  );
}
