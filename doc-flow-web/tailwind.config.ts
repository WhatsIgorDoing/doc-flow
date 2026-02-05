import type { Config } from 'tailwindcss';

export default {
    darkMode: ['class', '.dark'],
    content: [
        './pages/**/*.{ts,tsx}',
        './components/**/*.{ts,tsx}',
        './app/**/*.{ts,tsx}',
        './src/**/*.{ts,tsx}',
    ],
    prefix: '',
    theme: {
        container: {
            center: true,
            padding: '2rem',
            screens: {
                '2xl': '1400px',
            },
        },
        extend: {
            colors: {
                // Precision v2 Palette (Paper & Ink)
                background: '#F9F9FB', // Rice Paper
                foreground: '#1A1D23', // Deep Ink

                border: '#E2E8F0', // Slate 200
                input: '#E2E8F0',
                ring: '#64748B',

                surface: {
                    DEFAULT: 'rgba(255, 255, 255, 0.8)', // Glass base
                    foreground: '#1A1D23',
                },

                primary: {
                    DEFAULT: '#24292F', // Ink Blue (Pro)
                    foreground: '#FFFFFF',
                },
                secondary: {
                    DEFAULT: '#F1F5F9', // Slate 100
                    foreground: '#1E293B', // Slate 800
                },
                destructive: {
                    DEFAULT: '#E11D48', // Rose 600
                    foreground: '#FFFFFF',
                },
                muted: {
                    DEFAULT: '#F8FAFC', // Slate 50
                    foreground: '#64748B', // Slate 500
                },
                accent: {
                    DEFAULT: '#F1F5F9', // Slate 100
                    foreground: '#0F172A', // Slate 900
                },
                popover: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#1A1D23',
                },
                card: {
                    DEFAULT: '#FFFFFF',
                    foreground: '#1A1D23',
                },
                success: {
                    DEFAULT: '#059669', // Emerald 600
                    foreground: '#FFFFFF',
                },
                warning: {
                    DEFAULT: '#D97706', // Amber 600
                    foreground: '#FFFFFF',
                },
            },
            borderRadius: {
                lg: 'var(--radius)',
                md: 'calc(var(--radius) - 2px)',
                sm: 'calc(var(--radius) - 4px)',
            },
            fontFamily: {
                sans: [
                    '-apple-system',
                    'BlinkMacSystemFont',
                    '"Segoe UI"',
                    'Roboto',
                    'Helvetica',
                    'Arial',
                    'sans-serif',
                ],
            },
            boxShadow: {
                glass: '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
                layered: '0 1px 2px 0 rgba(0, 0, 0, 0.05), 0 4px 12px 0 rgba(0, 0, 0, 0.05)', // Ambient + Key
            },
            backdropBlur: {
                glass: '10px',
            },
            keyframes: {
                'accordion-down': {
                    from: { height: '0' },
                    to: { height: 'var(--radix-accordion-content-height)' },
                },
                'accordion-up': {
                    from: { height: 'var(--radix-accordion-content-height)' },
                    to: { height: '0' },
                },
            },
            animation: {
                'accordion-down': 'accordion-down 0.2s ease-out',
                'accordion-up': 'accordion-up 0.2s ease-out',
            },
        },
    },
    plugins: [require('tailwindcss-animate')],
} satisfies Config;
