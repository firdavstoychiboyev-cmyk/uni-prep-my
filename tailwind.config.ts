import type { Config } from "tailwindcss";

const config: Config = {
	darkMode: ["class"],
	content: [
		"./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/components/**/*.{js,ts,jsx,tsx,mdx}",
		"./src/app/**/*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				// Более мягкие углы карточек/панелей (глобально). Вложенные
				// элементы обычно rounded-lg/rounded-full — остаются меньше.
				// +~15% в этом проходе: 16→18, 22→25, 28→32.
				xl: '1.125rem',    // 18px (было 16px)
				'2xl': '1.5625rem', // 25px (было 22px)
				'3xl': '2rem'      // 32px (было 28px)
			},
			// Общая типографская шкала для карточек — один токен на приложение,
			// чтобы «крупные цифры / читаемые подписи» были единообразны.
			fontSize: {
				'stat': ['2.5rem', { lineHeight: '1', letterSpacing: '-0.02em' }],        // крупная цифра статы (40px)
				'stat-sm': ['2rem', { lineHeight: '1', letterSpacing: '-0.02em' }],       // компактный вариант (32px)
				'stat-label': ['0.8125rem', { lineHeight: '1.15', letterSpacing: '0.04em' }], // подпись статы (13px)
				'card-title': ['0.9375rem', { lineHeight: '1.3' }],                       // заголовок в карточке (15px)
				'quote': ['1.3125rem', { lineHeight: '1.55' }],                           // цитата-callout (21px)
			},
			fontFamily: {
				sans: ['var(--font-plus-jakarta)', 'var(--font-geist-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				mono: ['var(--font-geist-mono)', 'monospace'],
				manrope: ['var(--font-manrope)', 'ui-sans-serif', 'sans-serif'],
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
};
export default config;
