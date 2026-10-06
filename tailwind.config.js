/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,html}'],
  theme: {
    extend: {
      colors: {
        ios: {
          blue: '#007AFF', green: '#34C759', orange: '#FF9500',
          red: '#FF3B30', purple: '#AF52DE', teal: '#5AC8FA',
          yellow: '#FFCC00', pink: '#FF2D55', indigo: '#5856D6',
          gray: '#8E8E93', bg: '#F2F2F7', surface: '#FFFFFF',
          ink: '#0A0A0A',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display',
               'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: { ios: '12px', 'ios-lg': '16px', 'ios-xl': '24px' },
      boxShadow: {
        ios: '0 1px 3px rgba(0,0,0,0.08)',
        'ios-lg': '0 10px 30px rgba(0,0,0,0.12)',
      },
    },
  },
  plugins: [],
};
