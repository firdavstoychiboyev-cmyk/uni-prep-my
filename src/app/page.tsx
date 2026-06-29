"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Moon, Sun, ChevronDown } from "lucide-react";

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
    badge: "O'zbekiston №1 tayyorlov platformasi 🎓",
    heroLine1: "189 ball olish",
    heroLine2: "endi oson.",
    heroSub: "200,000+ savol, batafsil tushuntirishlar va kuzatuv tizimi — barchasi bepul.",
    heroCta: "Boshlash →",
    heroSecondary: "Ko'proq bilish",
    socialProof: "50,000+ talaba allaqachon tayyorlanmoqda",
    howTitle: "Qanday ishlaydi?",
    steps: [
      { n: "1", title: "Ro'yxatdan o'ting", desc: "Tez va oson ro'yxatdan o'ting. Hech qanday to'lov yo'q." },
      { n: "2", title: "Fan tanlang", desc: "O'zingizga kerakli fanni va mavzuni tanlang." },
      { n: "3", title: "Mashq qiling", desc: "Savollarni yeching va natijangizni kuzating." },
    ],
    stats: [
      { value: "200,000+", label: "Jami savollar" },
      { value: "1,000+", label: "Har bir mavzu bo'yicha" },
      { value: "7", label: "Asosiy fanlar" },
    ],
    uniHeading: "Bu universitetlarga kirish uchun tayyorlan",
    uniNote: "* 2024-2025 o'quv yili qabul ma'lumotlari asosida",
    grant: "Grant",
    contract: "Kontrakt",
    testimonialsTitle: "Talabalar nima deydi?",
    testimonials: [
      { name: "Aziza T.", uni: "TDYU", quote: "Kulcha tufayli tarixdan 89 ball oldim! Savollar juda foydali edi." },
      { name: "Jasur M.", uni: "TUIT", quote: "Har kuni 30 daqiqa mashq qildim va natija ko'rdim. Tavsiya qilaman!" },
      { name: "Nilufar K.", uni: "O'zMU", quote: "Mavzular bo'yicha savollar juda aniq tuzilgan. Eng yaxshi tayyorlov platformasi." },
    ],
    faqTitle: "Ko'p so'raladigan savollar",
    faqs: [
      { q: "Kulcha bepulmi?", a: "Ha, asosiy funksiyalar mutlaqo bepul. Hech qanday yashirin to'lov yo'q." },
      { q: "Qancha savol bor?", a: "Hozirda 200,000+ dan ortiq savol mavjud va har hafta yangilari qo'shiladi." },
      { q: "Qaysi fanlar mavjud?", a: "Matematika, fizika, kimyo, biologiya, tarix, ingliz tili va boshqa asosiy fanlar." },
      { q: "Telefonda ham ishlatsa bo'ladimi?", a: "Ha, Kulcha barcha qurilmalarda — telefon, planshet va kompyuterlarda ishlaydi." },
      { q: "Natijalarimni kuzatib borsa bo'ladimi?", a: "Ha, statistika sahifasida o'z natijalaringiz, streak va faolligingizni ko'rishingiz mumkin." },
    ],
    login: "Kirish",
    footerTagline: "O'zbekiston universitetlariga tayyorlov",
    footer: "© 2025 Kulcha. Barcha huquqlar himoyalangan.",
  },
  ru: {
    badge: "Платформа подготовки №1 в Узбекистане 🎓",
    heroLine1: "Набрать 189 баллов",
    heroLine2: "теперь просто.",
    heroSub: "200,000+ вопросов, подробные объяснения и система отслеживания — всё бесплатно.",
    heroCta: "Начать →",
    heroSecondary: "Узнать больше",
    socialProof: "50,000+ студентов уже готовятся",
    howTitle: "Как это работает?",
    steps: [
      { n: "1", title: "Зарегистрируйтесь", desc: "Быстрая и простая регистрация. Никаких платежей." },
      { n: "2", title: "Выберите предмет", desc: "Выберите нужный предмет и тему для практики." },
      { n: "3", title: "Тренируйтесь", desc: "Решайте задания и следите за своими результатами." },
    ],
    stats: [
      { value: "200,000+", label: "Всего вопросов" },
      { value: "1,000+", label: "По каждой теме" },
      { value: "7", label: "Основных предметов" },
    ],
    uniHeading: "Готовься к поступлению в эти университеты",
    uniNote: "* На основе данных приёма 2024-2025 учебного года",
    grant: "Грант",
    contract: "Контракт",
    testimonialsTitle: "Что говорят студенты?",
    testimonials: [
      { name: "Aziza T.", uni: "TDYU", quote: "Благодаря Kulcha я набрала 89 баллов по истории! Задания очень полезные." },
      { name: "Jasur M.", uni: "TUIT", quote: "Занимался 30 минут в день и увидел результат. Рекомендую!" },
      { name: "Nilufar K.", uni: "O'zMU", quote: "Вопросы по темам составлены очень точно. Лучшая платформа для подготовки." },
    ],
    faqTitle: "Часто задаваемые вопросы",
    faqs: [
      { q: "Kulcha бесплатен?", a: "Да, основные функции абсолютно бесплатны. Никаких скрытых платежей." },
      { q: "Сколько вопросов?", a: "Сейчас доступно более 200 000 вопросов, и каждую неделю добавляются новые." },
      { q: "Какие предметы доступны?", a: "Математика, физика, химия, биология, история, английский язык и другие основные предметы." },
      { q: "Можно ли использовать на телефоне?", a: "Да, Kulcha работает на всех устройствах — телефоне, планшете и компьютере." },
      { q: "Можно ли отслеживать результаты?", a: "Да, на странице статистики вы можете видеть свои результаты, серию и активность." },
    ],
    login: "Войти",
    footerTagline: "Подготовка к поступлению в университеты Узбекистана",
    footer: "© 2025 Kulcha. Все права защищены.",
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

  return (
    <div
      className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#0a0a0a] dark:text-white"
      style={{ fontFamily: "var(--font-dm-sans), system-ui, sans-serif" }}
    >
      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-[#0a0a0a]/90 backdrop-blur-md border-b border-gray-100 dark:border-white/8">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex-shrink-0">
              <Image src="/gogg.png" alt="Kulcha" fill className="object-contain" priority />
            </div>
            <span
              className="text-lg font-bold tracking-tight text-[#0a0a0a] dark:text-white"
              style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
            >
              Kulcha
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "uz" ? "ru" : "uz")}
              className="px-3 py-1.5 rounded-full text-sm font-semibold border border-gray-200 dark:border-white/15 text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
            >
              {lang === "uz" ? "RU" : "UZ"}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Light mode" : "Dark mode"}
              className="w-9 h-9 rounded-full border border-gray-200 dark:border-white/15 flex items-center justify-center text-gray-600 dark:text-white/70 hover:bg-gray-50 dark:hover:bg-white/8 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link
              href="/login"
              className="px-5 py-2 rounded-full text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              {t.login}
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="pt-24 pb-28 px-6 text-center bg-gradient-to-b from-white to-gray-50 dark:from-[#0a0a0a] dark:to-[#111111]">
        <div className="max-w-4xl mx-auto flex flex-col items-center gap-6">

          {/* Badge */}
          <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
            {t.badge}
          </span>

          {/* Headline */}
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight"
            style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
          >
            <span className="text-indigo-600 dark:text-indigo-400">{t.heroLine1}</span>
            <br />
            <span className="text-[#0a0a0a] dark:text-white">{t.heroLine2}</span>
          </h1>

          {/* Subtext */}
          <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
            {t.heroSub}
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3 mt-2">
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm"
            >
              {t.heroCta}
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 rounded-full text-base font-semibold text-[#0a0a0a] dark:text-white bg-white dark:bg-white/5 border border-gray-200 dark:border-white/15 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
            >
              {t.heroSecondary}
            </Link>
          </div>

          {/* Social proof */}
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-2 align-middle" />
            {t.socialProof}
          </p>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-24 px-6 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-14 text-[#0a0a0a] dark:text-white"
            style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
          >
            {t.howTitle}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {t.steps.map((step, i) => (
              <div
                key={i}
                className="rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3 p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-5 leading-none"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                >
                  {step.n}
                </div>
                <h3
                  className="text-lg font-bold text-[#0a0a0a] dark:text-white mb-2"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                >
                  {step.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 border-y border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/3">
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-center justify-center divide-y sm:divide-y-0 sm:divide-x divide-gray-200 dark:divide-white/10">
            {t.stats.map((stat) => (
              <div key={stat.label} className="flex-1 flex flex-col items-center py-6 sm:py-0 sm:px-10">
                <span
                  className="text-4xl font-black text-indigo-600 dark:text-indigo-400"
                  style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                >
                  {stat.value}
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-center">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Universities ── */}
      <section className="py-24 px-6 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-6xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#0a0a0a] dark:text-white"
            style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
          >
            {t.uniHeading}
          </h2>

          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
            {universities.map((uni) => (
              <div
                key={uni.name}
                className="snap-center shrink-0 w-48 md:w-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3 p-5 flex flex-col items-center gap-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="relative w-14 h-14">
                  <Image
                    src={uni.logo}
                    alt={uni.name}
                    fill
                    className="object-contain"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                </div>
                <div className="text-center">
                  <div
                    className="font-bold text-base text-[#0a0a0a] dark:text-white"
                    style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                  >
                    {uni.name}
                  </div>
                  <div className="text-xs mt-1 leading-tight text-gray-400 dark:text-gray-500">
                    {uni.fullName[lang]}
                  </div>
                </div>
                <div className="flex flex-col gap-2 w-full">
                  <span className="text-xs font-semibold text-center px-3 py-1.5 rounded-full bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border border-green-100 dark:border-green-900/50">
                    {t.grant}: {uni.grant}
                  </span>
                  <span className="text-xs font-semibold text-center px-3 py-1.5 rounded-full bg-gray-100 dark:bg-white/6 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10">
                    {t.contract}: {uni.contract}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-8 text-gray-400 dark:text-gray-600">
            {t.uniNote}
          </p>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-24 px-6 border-y border-gray-100 dark:border-white/8 bg-gray-50 dark:bg-white/2">
        <div className="max-w-5xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#0a0a0a] dark:text-white"
            style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
          >
            {t.testimonialsTitle}
          </h2>

          <div className="flex gap-5 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
            {t.testimonials.map((item, i) => (
              <div
                key={i}
                className="snap-center shrink-0 w-[85vw] sm:w-[340px] md:w-auto rounded-2xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/3 p-7 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-5"
              >
                <div
                  className="text-5xl leading-none text-indigo-200 dark:text-indigo-900 select-none"
                  aria-hidden
                >
                  &ldquo;
                </div>
                <p className="text-gray-700 dark:text-gray-300 italic text-sm leading-relaxed flex-1">
                  {item.quote}
                </p>
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/8">
                  <div>
                    <div
                      className="font-semibold text-sm text-[#0a0a0a] dark:text-white"
                      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                    >
                      {item.name}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{item.uni}</div>
                  </div>
                  <div className="text-yellow-400 text-sm tracking-tight" aria-label="5 stars">
                    ★★★★★
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="py-24 px-6 bg-white dark:bg-[#0a0a0a]">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-bold text-center mb-12 text-[#0a0a0a] dark:text-white"
            style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
          >
            {t.faqTitle}
          </h2>

          <div className="flex flex-col">
            {t.faqs.map((faq, i) => {
              const isOpen = openFaq === i;
              return (
                <div key={i} className="border-b border-gray-100 dark:border-white/8">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-left"
                    aria-expanded={isOpen}
                  >
                    <span
                      className="font-semibold text-[#0a0a0a] dark:text-white text-sm sm:text-base"
                      style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
                    >
                      {faq.q}
                    </span>
                    <ChevronDown
                      className="w-5 h-5 flex-shrink-0 text-gray-400 dark:text-gray-500 transition-transform duration-200"
                      style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                      aria-hidden
                    />
                  </button>
                  {isOpen && (
                    <p className="pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
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
      <footer className="bg-[#0a0a0a] border-t border-white/10 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span
              className="text-base font-bold text-white"
              style={{ fontFamily: "var(--font-montserrat), system-ui, sans-serif" }}
            >
              Kulcha
            </span>
            <span className="text-sm text-white/40">{t.footerTagline}</span>
          </div>
          <span className="text-sm text-white/40">{t.footer}</span>
        </div>
      </footer>
    </div>
  );
}
