/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './scripts/**/*.{js,ts}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      backgroundImage: {
        'radial-glow': 'radial-gradient(circle at center, rgba(255,255,255,0.07), transparent 70%)'
      },
      animation: {
        'glow': 'glow 2.5s ease-in-out infinite',
        'fade-in': 'fadeIn 0.7s ease-out both'
      },
      keyframes: {
        glow: {
          '0%, 100%': { boxShadow: '0 0 10px 3px rgba(255,255,255,.6)' },
          '50%': { boxShadow: '0 0 20px 6px rgba(255,255,255,.7)' }
        },
        fadeIn: {
          'from': { opacity: 0, transform: 'translateY(8px)' },
          'to': { opacity: 1, transform: 'translateY(0)' }
        }
      }
    }
  },
  darkMode: 'class',
  plugins: [
    function({ addComponents }) {
      addComponents({
        '.glass-panel': {
          '@apply rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl': {}
        },
        '.btn-primary': {
          '@apply px-8 py-3 rounded-full font-semibold text-lg bg-white text-black hover:bg-white/90 active:scale-95 transition duration-150': {}
        },
        '.focus-ring': {
          '@apply focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400/70': {}
        },
        '.dropdown-option': {
          '@apply bg-slate-800 text-slate-100 py-2 px-3': {},
          'background-color': 'rgb(30 41 59) !important',
          'color': 'rgb(241 245 249) !important'
        },
        '.content-section': {
          '@apply rounded-2xl border border-white/10 bg-white/5 backdrop-blur-lg shadow-xl px-6 sm:px-10 py-10 space-y-10': {}
        },
        '.heading-gradient': {
          'background': 'linear-gradient(135deg,#ffffff 0%,#a5b4fc 35%,#38bdf8 70%,#14b8a6 100%)',
          '-webkit-background-clip': 'text',
          'color': 'transparent'
        },
        '.divider-fade': {
          'position': 'relative',
          'height': '1px',
          'background': 'linear-gradient(90deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.15) 50%,rgba(255,255,255,0) 100%)'
        },
        '.bg-space': {
          'background': 'radial-gradient(circle at 30% 20%, #1e293b 0%, #0f172a 50%, #020617 100%)',
          'background-attachment': 'fixed'
        }
      })
    }
  ]
};
