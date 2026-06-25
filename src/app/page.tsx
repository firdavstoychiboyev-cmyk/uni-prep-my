"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

const quotes = [
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
];

const universities = [
  { name: "JIDU", fullName: "Jahon Iqtisodiyoti va Diplomatiya Universiteti", emoji: "🌍", grant: 189.0, contract: 185.7 },
  { name: "TDYU", fullName: "Toshkent Davlat Yuridik Universiteti", emoji: "⚖️", grant: 189.0, contract: 180.6 },
  { name: "TDIU", fullName: "Toshkent Davlat Iqtisodiyot Universiteti", emoji: "📊", grant: 185.5, contract: 169.3 },
  { name: "O'zMU", fullName: "O'zbekiston Milliy Universiteti", emoji: "🎓", grant: 181.0, contract: 158.0 },
  { name: "TUIT", fullName: "Toshkent Axborot Texnologiyalari Universiteti", emoji: "💻", grant: 176.0, contract: 148.0 },
];

const stats = [
  { value: "200,000+", label: "Jami savollar" },
  { value: "1,000+", label: "Har bir mavzu bo'yicha" },
  { value: "7", label: "Asosiy fanlar" },
];

export default function LandingPage() {
  const quote = useMemo(() => quotes[Math.floor(Math.random() * quotes.length)], []);

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "var(--font-montserrat), var(--font-dm-sans), system-ui, sans-serif" }}>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-9 h-9">
            <Image src="/gogg.png" alt="UniPrep" fill className="object-contain" priority />
          </div>
          <span className="text-xl font-bold text-gray-900 tracking-tight" style={{ fontFamily: "var(--font-montserrat), system-ui" }}>
            UniPrep
          </span>
        </div>
        <Link
          href="/login"
          className="px-5 py-2.5 rounded-full bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
        >
          Kirish
        </Link>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-20 pb-16 gap-6">
        <h1
          className="font-black leading-none select-none"
          style={{
            fontFamily: "var(--font-montserrat), system-ui",
            fontSize: "clamp(120px, 22vw, 220px)",
            background: "linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          189
        </h1>
        <p className="text-2xl md:text-3xl font-semibold text-gray-800 max-w-xl" style={{ fontFamily: "var(--font-montserrat), system-ui" }}>
          189 — siz o&apos;ylagandan ham oson
        </p>
        <p className="text-lg text-gray-400 italic max-w-md">&ldquo;{quote}&rdquo;</p>
        <Link
          href="/login"
          className="mt-2 inline-flex items-center gap-2 px-8 py-4 rounded-full bg-indigo-600 text-white text-lg font-bold hover:bg-indigo-700 transition-all shadow-lg hover:shadow-indigo-200 hover:scale-105 active:scale-100"
          style={{ fontFamily: "var(--font-montserrat), system-ui" }}
        >
          Ilovani ochish →
        </Link>
      </section>

      {/* Stats bar */}
      <section className="py-12 border-y border-gray-100 bg-gray-50">
        <div className="max-w-3xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-0">
          {stats.map((stat, i) => (
            <div key={stat.label} className="flex flex-col items-center sm:flex-1">
              <span className="text-4xl font-black text-indigo-600" style={{ fontFamily: "var(--font-montserrat), system-ui" }}>
                {stat.value}
              </span>
              <span className="text-sm text-gray-500 mt-1 text-center">{stat.label}</span>
              {i < stats.length - 1 && (
                <div className="hidden sm:block absolute h-12 w-px bg-gray-200" style={{ transform: "translateX(100px)" }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Universities */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 text-center mb-10" style={{ fontFamily: "var(--font-montserrat), system-ui" }}>
            Bu universitetlarga kirish uchun tayyorlan
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory md:grid md:grid-cols-5 md:overflow-visible">
            {universities.map((uni) => (
              <div
                key={uni.name}
                className="snap-center shrink-0 w-48 md:w-auto bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col items-center gap-3"
              >
                <div className="text-4xl">{uni.emoji}</div>
                <div className="text-center">
                  <div className="font-bold text-gray-900 text-sm" style={{ fontFamily: "var(--font-montserrat), system-ui" }}>{uni.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{uni.fullName}</div>
                </div>
                <div className="flex flex-col gap-1.5 w-full">
                  <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-100">
                    Grant: {uni.grant}
                  </span>
                  <span className="text-xs font-semibold text-center px-2 py-1 rounded-lg bg-gray-50 text-gray-600 border border-gray-100">
                    Kontrakt: {uni.contract}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-6">* 2024-2025 o&apos;quv yili qabul ma&apos;lumotlari asosida</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-gray-100 text-center text-sm text-gray-400">
        © 2025 UniPrep. Barcha huquqlar himoyalangan.
      </footer>
    </div>
  );
}
