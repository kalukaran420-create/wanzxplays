/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        cyber: {
          base: '#0d0f17',       // Base Surface (Deep)
          panel: '#131622',      // Surface (Secondary Panel)
          chat: '#181b2a',       // Surface (Chat Feed)
          input: '#202538',      // Surface (Elevated Input/Modals)
          hover: '#282e46',      // Hover State Surface
          border: 'rgba(255, 255, 255, 0.08)',
          violet: '#7c3aed',     // Primary Brand Accent
          'violet-hover': '#6d28d9',
          cyan: '#06b6d4',       // Secondary Accent
          'cyan-hover': '#0891b2',
          emerald: '#10b981',    // Online Status
          amber: '#f59e0b',      // Idle Status
          rose: '#ef4444',       // DND / Error Status
          neonPink: '#ec4899',   // Neon Accent Pink
          neonBlue: '#3b82f6',   // Neon Accent Blue
          text: '#f1f5f9',       // Primary Text (Starlight)
          muted: '#94a3b8',      // Muted Secondary Text
        },
        discord: {
          primary: '#181b2a',
          secondary: '#131622',
          tertiary: '#0d0f17',
          floating: '#202538',
          input: '#202538',
          hover: '#282e46',
          active: '#2c334e',
          brand: '#7c3aed',
          'brand-hover': '#6d28d9',
          green: '#10b981',
          yellow: '#f59e0b',
          red: '#ef4444',
          gray: '#64748b',
          text: '#f1f5f9',
          muted: '#94a3b8',
        }
      },
      boxShadow: {
        'glow-violet': '0 0 22px rgba(124, 58, 237, 0.45)',
        'glow-cyan': '0 0 22px rgba(6, 182, 212, 0.45)',
        'glow-emerald': '0 0 18px rgba(16, 185, 129, 0.55)',
        'glow-pink': '0 0 22px rgba(236, 72, 153, 0.45)',
        'glow-blue': '0 0 22px rgba(59, 130, 246, 0.45)',
        'glow-neon': '0 0 25px rgba(6, 182, 212, 0.35), 0 0 12px rgba(124, 58, 237, 0.45)',
      },
      backgroundImage: {
        'aurora-gradient': 'linear-gradient(135deg, #7c3aed 0%, #06b6d4 100%)',
        'aurora-hover': 'linear-gradient(135deg, #6d28d9 0%, #0891b2 100%)',
        'dark-gradient': 'linear-gradient(180deg, #131622 0%, #0d0f17 100%)',
        'neon-gradient': 'linear-gradient(135deg, #ec4899 0%, #7c3aed 50%, #06b6d4 100%)',
      }
    },
  },
  plugins: [],
}
