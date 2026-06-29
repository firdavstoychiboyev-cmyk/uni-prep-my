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
    footer: "© 2025 Kulcha. Barcha huquqlar himoyalangan.",
    login: "Kirish",
    howTitle: "Qanday ishlaydi?",
    steps: [
      { n: "1", title: "Ro'yxatdan o'ting", desc: "Tez va oson ro'yxatdan o'ting. Hech qanday to'lov yo'q." },
      { n: "2", title: "Fan tanlang", desc: "O'zingizga kerakli fanni va mavzuni tanlang." },
      { n: "3", title: "Mashq qiling", desc: "Savollarni yeching va natijangizni kuzating." },
    ],
    testimonialsTitle: "Talabalar nima deydi?",
    testimonials: [
      { name: "Aziza T.", uni: "TDYU", quote: "Kulcha tufayli tarixdan 89 ball oldim! Savollar juda foydali edi." },
      { name: "Jasur M.", uni: "TUIT", quote: "Har kuni 30 daqiqa mashq qildim va natija ko’rdim. Tavsiya qilaman!" },
      { name: "Nilufar K.", uni: "O‘zMU", quote: "Mavzular bo‘yicha savollar juda aniq tuzilgan. Eng yaxshi tayyorlov platformasi." },
    ],
    faqTitle: "Ko‘p so‘raladigan savollar",
    faqs: [
      { q: "Kulcha bepulmi?", a: "Ha, asosiy funksiyalar mutlaqo bepul. Hech qanday yashirin to‘lov yo‘q." },
      { q: "Qancha savol bor?", a: "Hozirda 200,000+ dan ortiq savol mavjud va har hafta yangilari qo‘shiladi." },
      { q: "Qaysi fanlar mavjud?", a: "Matematika, fizika, kimyo, biologiya, tarix, ingliz tili va boshqa asosiy fanlar." },
      { q: "Telefonda ham ishlatsa bo‘ladimi?", a: "Ha, Kulcha barcha qurilmalarda — telefon, planshet va kompyuterlarda ishlaydi." },
      { q: "Natijalarimni kuzatib borsa bo‘ladimi?", a: "Ha, statistika sahifasida o‘z natijalaringiz, streak va faolligingizni ko‘rishingiz mumkin." },
    ],
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
    footer: "© 2025 Kulcha. Все права защищены.",
    login: "Войти",
    howTitle: "Как это работает?",
    steps: [
      { n: "1", title: "Зарегистрируйтесь", desc: "Быстрая и простая регистрация. Никаких платежей." },
      { n: "2", title: "Выберите предмет", desc: "Выберите нужный предмет и тему для практики." },
      { n: "3", title: "Тренируйтесь", desc: "Решайте задания и следите за своими результатами." },
    ],
    testimonialsTitle: "Что говорят студенты?",
    testimonials: [
      { name: "Aziza T.", uni: "TDYU", quote: "Благодаря Kulcha я набрала 89 баллов по истории! Задания очень полезные." },
      { name: "Jasur M.", uni: "TUIT", quote: "Занимался 30 минут в день и увидел результат. Рекомендую!" },
      { name: "Nilufar K.", uni: "O‘zMU", quote: "Вопросы по темам составлены очень точно. Лучшая платформа для подготовки." },
    ],
    faqTitle: "Часто задаваемые вопросы",
    faqs: [
      { q: "Kulcha бесплатен?", a: "Да, основные функции абсолютно бесплатны. Никаких скрытых платежей." },
      { q: "Сколько вопросов?", a: "Сейчас доступно более 200 000 вопросов, и каждую неделю добавляются новые." },
      { q: "Какие предметы доступны?", a: "Математика, физика, химия, биология, история, английский язык и другие основные предметы." },
      { q: "Можно ли использовать на телефоне?", a: "Да, Kulcha работает на всех устройствах — телефоне, планшете и компьютере." },
      { q: "Можно ли отслеживать результаты?", a: "Да, на странице статистики вы можете видеть свои результаты, серию и активность." },
    ],
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

// ── Hand-drawn quotation mark ─────────────────────────────────────────────────
function QuoteMark() {
  return (
    <svg viewBox="0 0 48 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7" aria-hidden>
      <path d="M4 32 C2 28 2 18 6 10 C10 4 16 2 20 4 C16 8 14 14 16 20 C18 26 24 28 24 22 C24 16 20 10 16 8 C12 6 6 10 4 32Z"
        fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M28 32 C26 28 26 18 30 10 C34 4 40 2 44 4 C40 8 38 14 40 20 C42 26 48 28 48 22 C48 16 44 10 40 8 C36 6 30 10 28 32Z"
        fill="#BFDBFE" stroke="#93C5FD" strokeWidth="1" strokeLinejoin="round"/>
    </svg>
  );
}

export default function LandingPage() {
  const [lang, setLang] = useState<Lang>("uz");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

        {/* ── Navbar ── */}
        <nav className="sticky top-0 z-50 backdrop-blur-xl border-b bg-white/80 dark:bg-black/40 border-gray-100 dark:border-white/5 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-9 h-9">
              <Image src="/gogg.png" alt="Kulcha" fill className="object-contain" priority />
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Kulcha</span>
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

        {/* ── Hero ── */}
        <section className="relative flex flex-col items-center justify-center text-center pt-20 pb-16 gap-6 overflow-hidden">
          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none hidden dark:block"
            style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)" }}
          />

          <div className="relative z-10 w-full flex items-center justify-center" style={{ height: "420px" }}>

            {/* Light mode illustration */}
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
                <g filter="url(#wobbly)" transform="translate(1490, 58)">
                  <circle cx="0" cy="0" r="45" fill="#FFD93D" stroke="#F4A623" strokeWidth="3"/>
                  <circle cx="-12" cy="-5" r="4" fill="#F4A623"/>
                  <circle cx="12" cy="-5" r="4" fill="#F4A623"/>
                  <path d="M-12 8 Q0 18 12 8" stroke="#F4A623" strokeWidth="3" fill="none" strokeLinecap="round"/>
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                    <line key={i}
                      x1={Math.cos(angle * Math.PI / 180) * 52} y1={Math.sin(angle * Math.PI / 180) * 52}
                      x2={Math.cos(angle * Math.PI / 180) * 68} y2={Math.sin(angle * Math.PI / 180) * 68}
                      stroke="#F4A623" strokeWidth="4" strokeLinecap="round"
                    />
                  ))}
                </g>
                <g filter="url(#wobbly2)" transform="translate(90, 52)">
                  <ellipse cx="0" cy="0" rx="50" ry="30" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                  <ellipse cx="-30" cy="5" rx="30" ry="22" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                  <ellipse cx="35" cy="5" rx="35" ry="20" fill="white" stroke="#93C5FD" strokeWidth="3"/>
                </g>
                <g filter="url(#wobbly)" transform="translate(370, 148)">
                  <ellipse cx="0" cy="0" rx="35" ry="20" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="-22" cy="4" rx="22" ry="15" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="25" cy="4" rx="25" ry="14" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                </g>
                <g filter="url(#wobbly2)" transform="translate(1200, 78)">
                  <ellipse cx="0" cy="0" rx="40" ry="24" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="-26" cy="5" rx="26" ry="18" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                  <ellipse cx="28" cy="5" rx="30" ry="16" fill="white" stroke="#93C5FD" strokeWidth="2.5"/>
                </g>
                <g filter="url(#wobbly)" transform="translate(1530, 175)">
                  <ellipse cx="0" cy="0" rx="32" ry="18" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                  <ellipse cx="-20" cy="4" rx="20" ry="13" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                  <ellipse cx="22" cy="4" rx="24" ry="12" fill="white" stroke="#93C5FD" strokeWidth="2"/>
                </g>
                {([
                  [45,  300, "#FF6B9D"], [1545, 285, "#6EE7B7"], [270, 332, "#FCD34D"],
                  [1420, 132, "#A78BFA"], [800,  55, "#F87171"], [620, 318, "#60A5FA"], [980, 300, "#34D399"],
                ] as [number, number, string][]).map(([x, y, color], i) => (
                  <g key={i} transform={`translate(${x}, ${y})`}>
                    <path d="M0,-8 L2,-2 L8,-2 L3,2 L5,8 L0,4 L-5,8 L-3,2 L-8,-2 L-2,-2 Z" fill={color} filter="url(#wobbly)"/>
                  </g>
                ))}
                <path d="M0,370 Q100,355 200,370 Q300,385 400,370 Q500,355 600,370 Q700,385 800,370 Q900,355 1000,370 Q1100,385 1200,370 Q1300,355 1400,370 Q1500,385 1600,370"
                  stroke="#86EFAC" strokeWidth="4" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>
                <path d="M0,380 Q120,365 240,380 Q360,395 480,380 Q600,365 720,380 Q840,395 960,380 Q1080,365 1200,380 Q1320,395 1440,380 Q1560,365 1600,375"
                  stroke="#4ADE80" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#wobbly2)"/>
                <rect x="550" y="180" width="500" height="60" fill="#FEF08A" opacity="0.5" rx="4" filter="url(#wobbly)"/>
                <text x="800" y="290" textAnchor="middle"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontSize: "220px", fontWeight: 900, fill: "none", stroke: "#1e293b", strokeWidth: "8", strokeLinejoin: "round", strokeLinecap: "round", paintOrder: "stroke fill" }}
                  filter="url(#wobbly)">189</text>
                <text x="800" y="290" textAnchor="middle"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontSize: "220px", fontWeight: 900, fill: "#4F46E5", opacity: 0.85 }}
                  filter="url(#wobbly)">189</text>
                <text x="798" y="287" textAnchor="middle"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif", fontSize: "220px", fontWeight: 900, fill: "#818CF8", opacity: 0.3 }}
                  filter="url(#wobbly2)">189</text>
                <path d="M560,310 Q620,325 680,310 Q740,295 800,310 Q860,325 920,310 Q980,295 1040,310"
                  stroke="#F87171" strokeWidth="5" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>
                <path d="M80,200 C80,190 90,185 95,190 C100,185 110,190 110,200 C110,210 95,220 95,220 C95,220 80,210 80,200Z"
                  fill="#FF6B9D" filter="url(#wobbly)"/>
                <path d="M1480,318 C1480,311 1487,307 1491,311 C1495,307 1502,311 1502,318 C1502,325 1491,332 1491,332 C1491,332 1480,325 1480,318Z"
                  fill="#FF6B9D" filter="url(#wobbly2)" opacity="0.8"/>
                <text x="50"   y="270" style={{ fontSize: "32px", fill: "#F59E0B" }} filter="url(#wobbly)">!</text>
                <text x="1530" y="250" style={{ fontSize: "28px", fill: "#10B981" }} filter="url(#wobbly2)">!</text>
                <path d="M595,182 Q625,222 655,242" stroke="#1d4ed8" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#wobbly)"/>
                <path d="M650,234 L655,242 L663,236" stroke="#1d4ed8" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {/* Dark mode neon */}
            <div
              className="hidden dark:flex absolute inset-0 items-center justify-center select-none"
              style={{
                fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                fontSize: "clamp(130px, 24vw, 240px)",
                fontWeight: 900, lineHeight: 0.9, letterSpacing: "-0.04em",
                color: "#ffffff",
                textShadow: `0 0 7px #fff, 0 0 10px #fff, 0 0 21px #fff, 0 0 42px #3b82f6, 0 0 82px #3b82f6, 0 0 92px #3b82f6, 0 0 102px #1d4ed8, 0 0 151px #1d4ed8`,
                WebkitTextStroke: "2px rgba(59, 130, 246, 0.3)",
              }}
            >189</div>
          </div>

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

        {/* ── How It Works ── */}
        <section className="py-16 px-6 relative overflow-hidden" style={{ background: "linear-gradient(180deg, #FEFCE8 0%, #FFF9E6 100%)" }}>
          {/* Decorative stars */}
          <svg className="absolute top-6 left-8 w-6 h-6 text-yellow-400 opacity-70" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.3 6 21.7l2.5-7.5L2 9.5h7.5z" fill="currentColor"/>
          </svg>
          <svg className="absolute top-10 right-12 w-5 h-5 text-pink-400 opacity-60" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.3 6 21.7l2.5-7.5L2 9.5h7.5z" fill="currentColor"/>
          </svg>
          <svg className="absolute bottom-8 right-8 w-4 h-4 text-blue-400 opacity-50" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.3 6 21.7l2.5-7.5L2 9.5h7.5z" fill="currentColor"/>
          </svg>
          <svg className="absolute bottom-6 left-16 w-5 h-5 text-green-400 opacity-50" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2l2.5 7.5H22l-6.5 4.7 2.5 7.5L12 17.3 6 21.7l2.5-7.5L2 9.5h7.5z" fill="currentColor"/>
          </svg>

          <div className="max-w-4xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-12 text-gray-900"
              style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
            >
              {t.howTitle}
            </h2>

            <div className="relative flex flex-col md:flex-row items-center md:items-start gap-10 md:gap-0">
              {t.steps.map((step, i) => (
                <div key={i} className="relative flex-1 flex flex-col items-center text-center px-4">
                  {/* Dashed connector — shown between steps on desktop */}
                  {i < t.steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-8 left-[calc(50%+2.5rem)] right-0"
                      style={{ borderTop: "2.5px dashed #FCA5A5", width: "calc(100% - 5rem)" }}
                      aria-hidden
                    />
                  )}

                  {/* Hand-drawn number circle */}
                  <div className="relative mb-5 z-10">
                    <svg viewBox="0 0 72 72" className="w-16 h-16" aria-hidden>
                      <circle cx="36" cy="36" r="30" fill="#FEF08A" stroke="#F59E0B" strokeWidth="3"
                        strokeDasharray="6 3" strokeLinecap="round"/>
                      <circle cx="36" cy="36" r="24" fill="#FFF9C4" stroke="#FCD34D" strokeWidth="1.5" opacity="0.6"/>
                    </svg>
                    <span
                      className="absolute inset-0 flex items-center justify-center text-2xl font-black text-gray-800"
                      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                    >
                      {step.n}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900 mb-2"
                    style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-gray-600 max-w-[200px] leading-relaxed"
                    style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Stats bar ── */}
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

        {/* ── Universities ── */}
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

        {/* ── Testimonials ── */}
        <section className="py-16 px-6 bg-gray-50/60 dark:bg-white/2 border-y border-gray-100 dark:border-white/5">
          <div className="max-w-5xl mx-auto">
            <h2
              className="text-2xl md:text-3xl font-bold text-center mb-10 text-gray-900 dark:text-white"
              style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
            >
              {t.testimonialsTitle}
            </h2>

            <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible">
              {t.testimonials.map((item, i) => (
                <div
                  key={i}
                  className="snap-center shrink-0 w-[85vw] sm:w-[340px] md:w-auto rounded-2xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col gap-4"
                  style={{ outline: "1.5px dashed #E5E7EB", outlineOffset: "3px" }}
                >
                  <QuoteMark />
                  <p
                    className="text-sm leading-relaxed text-gray-700 dark:text-white/80 flex-1"
                    style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
                  >
                    &ldquo;{item.quote}&rdquo;
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <div>
                      <div className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</div>
                      <div className="text-xs text-gray-400 dark:text-white/40 mt-0.5">{item.uni}</div>
                    </div>
                    <div className="text-yellow-400 text-base tracking-tight" aria-label="5 stars">★★★★★</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 px-6">
          <div className="max-w-2xl mx-auto">
            {/* Title with wavy decoration */}
            <div className="flex flex-col items-center mb-10 gap-3">
              <svg viewBox="0 0 160 14" className="w-40 h-3 text-yellow-400" aria-hidden>
                <path d="M0,7 Q20,0 40,7 Q60,14 80,7 Q100,0 120,7 Q140,14 160,7"
                  stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
              </svg>
              <h2
                className="text-2xl md:text-3xl font-bold text-center text-gray-900 dark:text-white"
                style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
              >
                {t.faqTitle}
              </h2>
              <svg viewBox="0 0 120 10" className="w-32 h-2.5 text-pink-300 opacity-70" aria-hidden>
                <path d="M0,5 Q15,0 30,5 Q45,10 60,5 Q75,0 90,5 Q105,10 120,5"
                  stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </div>

            <div className="flex flex-col divide-y divide-gray-100 dark:divide-white/8">
              {t.faqs.map((faq, i) => {
                const isOpen = openFaq === i;
                return (
                  <div key={i}>
                    <button
                      type="button"
                      onClick={() => setOpenFaq(isOpen ? null : i)}
                      className="w-full flex items-center justify-between gap-4 py-4 text-left group"
                      aria-expanded={isOpen}
                    >
                      <span
                        className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base"
                        style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                      >
                        {faq.q}
                      </span>
                      <span
                        className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-500 dark:text-white/50 transition-transform duration-200 group-hover:border-blue-400 group-hover:text-blue-500"
                        style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                        aria-hidden
                      >
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none">
                          <line x1="8" y1="2" x2="8" y2="14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                          <line x1="2" y1="8" x2="14" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                      </span>
                    </button>

                    {isOpen && (
                      <p
                        className="pb-5 text-sm text-gray-600 dark:text-white/60 leading-relaxed"
                        style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
                      >
                        {faq.a}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Footer ── */}
        <footer className="py-8 border-t border-gray-100 dark:border-white/5 text-center text-sm text-gray-400 dark:text-white/35">
          {t.footer}
        </footer>

      </div>
    </div>
  );
}
