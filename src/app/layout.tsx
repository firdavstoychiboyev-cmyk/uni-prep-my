import type { Metadata } from "next";
import localFont from "next/font/local";
import { Montserrat, DM_Sans, Dancing_Script } from "next/font/google";
import AuthProvider from "@/components/auth-provider";
import "./globals.css";
import "katex/dist/katex.min.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic"],
  variable: "--font-montserrat",
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600"],
});

const dancingScript = Dancing_Script({
  subsets: ["latin"],
  variable: "--font-dancing",
  weight: ["700"],
});

export const metadata: Metadata = {
  title: "Uni-Prep",
  description: "Система подготовки к университету",
  icons: {
    icon: [
      { url: "/auto-Photoroom.png", sizes: "any", type: "image/png" },
      { url: "/auto-Photoroom.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/auto-Photoroom.png",
    apple: [
      { url: "/auto-Photoroom.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" sizes="512x512" href="/auto-Photoroom.png" />
        <link rel="icon" type="image/png" sizes="256x256" href="/auto-Photoroom.png" />
        <link rel="icon" type="image/png" sizes="128x128" href="/auto-Photoroom.png" />
        <link rel="icon" type="image/png" sizes="64x64" href="/auto-Photoroom.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/auto-Photoroom.png" />
        <link rel="shortcut icon" href="/auto-Photoroom.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/auto-Photoroom.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(() => {
  try {
    const key = "uni-prep-theme";
    const saved = localStorage.getItem(key);
    const root = document.documentElement;
    if (saved === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      if (saved !== "light") localStorage.setItem(key, "light");
    }
  } catch {}
})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${montserrat.variable} ${dmSans.variable} ${dancingScript.variable} antialiased min-h-screen relative app-bg`}
      >
        <div className="relative z-10 min-h-screen">
          <AuthProvider>{children}</AuthProvider>
        </div>
      </body>
    </html>
  );
}
