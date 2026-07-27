/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
        "colors": {
            "surface-container-high": "#dee9fc",
            "on-secondary": "#ffffff",
            "surface-container-highest": "#d9e3f6",
            "inverse-surface": "#27313f",
            "on-secondary-fixed-variant": "#5c4033",
            "inverse-primary": "#f7bd48",
            "surface-dim": "#d0dbed",
            "inverse-on-surface": "#eaf1ff",
            "surface": "#f8f9ff",
            "tertiary": "#735c00",
            "on-tertiary": "#ffffff",
            "on-secondary-container": "#795a4c",
            "on-error": "#ffffff",
            "on-error-container": "#93000a",
            "surface-container": "#e6eeff",
            "surface-container-low": "#eff4ff",
            "outline": "#817563",
            "surface-tint": "#7b5800",
            "tertiary-container": "#cca72f",
            "on-primary-container": "#fffbff",
            "surface-variant": "#d9e3f6",
            "on-background": "#121c2a",
            "background": "#f8f9ff",
            "outline-variant": "#d3c4af",
            "on-surface-variant": "#4f4535",
            "primary-container": "#986d00",
            "primary": "#785600",
            "on-primary-fixed-variant": "#5d4200",
            "secondary-fixed-dim": "#e6bead",
            "primary-fixed": "#ffdea6",
            "on-tertiary-fixed": "#241a00",
            "error": "#ba1a1a",
            "tertiary-fixed": "#ffe088",
            "secondary-container": "#fed4c2",
            "on-primary": "#ffffff",
            "secondary": "#765749",
            "surface-bright": "#f8f9ff",
            "surface-container-lowest": "#ffffff",
            "on-secondary-fixed": "#2c160b",
            "on-primary-fixed": "#271900",
            "on-tertiary-fixed-variant": "#574500",
            "primary-fixed-dim": "#f7bd48",
            "on-tertiary-container": "#4e3d00",
            "on-surface": "#121c2a",
            "error-container": "#ffdad6",
            "secondary-fixed": "#ffdbcc",
            "tertiary-fixed-dim": "#e9c349"
        },
        "borderRadius": {
            "DEFAULT": "0.125rem",
            "lg": "0.25rem",
            "xl": "0.5rem",
            "full": "0.75rem"
        },
        "spacing": {
            "base": "8px",
            "margin-mobile": "16px",
            "container-max": "1280px",
            "gutter": "24px",
            "margin-desktop": "64px",
            "section-gap": "120px"
        },
        "fontFamily": {
            "body-lg": ["Inter", "sans-serif"],
            "headline-lg": ["Playfair Display", "serif"],
            "label-sm": ["Inter", "sans-serif"],
            "display-lg-mobile": ["Playfair Display", "serif"],
            "body-md": ["Inter", "sans-serif"],
            "headline-md": ["Playfair Display", "serif"],
            "display-lg": ["Playfair Display", "serif"],
            "label-md": ["Inter", "sans-serif"]
        },
        "fontSize": {
            "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
            "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "600" }],
            "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.08em", "fontWeight": "600" }],
            "display-lg-mobile": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
            "body-md": ["16px", { "lineHeight": "24px", "fontWeight": "400" }],
            "headline-md": ["24px", { "lineHeight": "32px", "fontWeight": "600" }],
            "display-lg": ["64px", { "lineHeight": "72px", "letterSpacing": "-0.02em", "fontWeight": "700" }],
            "label-md": ["14px", { "lineHeight": "20px", "letterSpacing": "0.05em", "fontWeight": "500" }]
        },
        "keyframes": {
            "fade-up": {
                "0%": { opacity: "0", transform: "translateY(30px)" },
                "100%": { opacity: "1", transform: "translateY(0)" }
            },
            "subtle-zoom": {
                "0%": { transform: "scale(1)" },
                "100%": { transform: "scale(1.1)" }
            }
        },
        "animation": {
            "fade-up": "fade-up 1s cubic-bezier(0.16, 1, 0.3, 1) forwards",
            "subtle-zoom": "subtle-zoom 20s linear infinite alternate"
        }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries'),
  ],
}
