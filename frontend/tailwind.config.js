/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Custom palette - Apple-inspired
                brand: {
                    blue: '#38b6ff',      // Primary blue
                    'blue-dark': '#389cd6', // Secondary blue
                    teal: '#3b7a9f',      // Accent teal
                },
                dark: {
                    900: '#141414',       // Darkest background
                    800: '#1a1a1a',       // Slightly lighter
                    700: '#242424',       // Card backgrounds
                    600: '#3a3b3b',       // Elevated surfaces
                    500: '#4e5c64',       // Muted elements
                },
                light: {
                    100: '#e5e5e5',       // Primary light text
                    200: '#a8a8a8',       // Secondary text
                    300: '#6b6b6b',       // Muted text
                }
            },
            fontFamily: {
                sans: [
                    'Poppins',
                    'system-ui',
                    'sans-serif'
                ],
            },
            borderRadius: {
                '2xl': '1rem',
                '3xl': '1.5rem',
                '4xl': '2rem',
            },
            boxShadow: {
                'glow': '0 0 20px rgba(56, 182, 255, 0.15)',
                'glow-lg': '0 0 40px rgba(56, 182, 255, 0.2)',
                'soft': '0 4px 20px rgba(0, 0, 0, 0.3)',
            },
            animation: {
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-up': 'slideUp 0.4s ease-out',
                'scale-in': 'scaleIn 0.3s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { opacity: '0', transform: 'translateY(16px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
                scaleIn: {
                    '0%': { opacity: '0', transform: 'scale(0.95)' },
                    '100%': { opacity: '1', transform: 'scale(1)' },
                },
            },
            backdropBlur: {
                'xl': '20px',
                '2xl': '40px',
            },
        },
    },
    plugins: [],
}
