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
            /* Luxury attar & fragrance palette — see DESIGN.md section 2.
               Token names are kept (M3-style) so all existing usages inherit
               the refined values; hexes are chosen for WCAG-safe contrast at
               scale (primary is read as text/border/fill in 500+ places). */
            "ink": "#121c2a",
            "ink-hover": "#1e2b3d",
            "accent": "#d4af37",
            "accent-hover": "#b8860b",
            "accent-soft": "#f7ecc9",

            "surface-container-high": "#f1ead9",
            "on-secondary": "#ffffff",
            "surface-container-highest": "#ebe0c8",
            "inverse-surface": "#121c2a",
            "on-secondary-fixed-variant": "#5c4033",
            "inverse-primary": "#d4af37",
            "surface-dim": "#e4dcc8",
            "inverse-on-surface": "#fbf9f5",
            "surface": "#fbf9f5",
            "tertiary": "#6b7355",
            "on-tertiary": "#ffffff",
            "on-secondary-container": "#5c4033",
            "on-error": "#ffffff",
            "on-error-container": "#93000a",
            "surface-container": "#f5f1e8",
            "surface-container-low": "#f8f5ec",
            "outline": "#8a8171",
            "surface-tint": "#7a5600",
            "tertiary-container": "#dde3d2",
            "on-primary-container": "#fbf9f5",
            "surface-variant": "#ede4d3",
            "on-background": "#121c2a",
            "background": "#fbf9f5",
            "outline-variant": "#e4dcc8",
            "on-surface-variant": "#5b5346",
            "primary-container": "#90690a",
            "primary": "#90690a",
            "on-primary-fixed-variant": "#5d4200",
            "secondary-fixed-dim": "#c9a892",
            "primary-fixed": "#f7ecc9",
            "on-tertiary-fixed": "#2a2f22",
            "error": "#ba1a1a",
            "tertiary-fixed": "#dde3d2",
            "secondary-container": "#f2ded0",
            "on-primary": "#ffffff",
            "secondary": "#765749",
            "surface-bright": "#fbf9f5",
            "surface-container-lowest": "#ffffff",
            "on-secondary-fixed": "#2c160b",
            "on-primary-fixed": "#121c2a",
            "on-tertiary-fixed-variant": "#3f4632",
            "primary-fixed-dim": "#d4af37",
            "on-tertiary-container": "#3f4632",
            "on-surface": "#121c2a",
            "error-container": "#ffdad6",
            "secondary-fixed": "#f2ded0",
            "tertiary-fixed-dim": "#8a9478"
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
            "body-sm": ["Inter", "sans-serif"],
            "headline-lg": ["Playfair Display", "serif"],
            "headline-sm": ["Playfair Display", "serif"],
            "label-sm": ["Inter", "sans-serif"],
            "label-lg": ["Inter", "sans-serif"],
            "display-lg-mobile": ["Playfair Display", "serif"],
            "display-md": ["Playfair Display", "serif"],
            "display-sm": ["Playfair Display", "serif"],
            "body-md": ["Inter", "sans-serif"],
            "headline-md": ["Playfair Display", "serif"],
            "display-lg": ["Playfair Display", "serif"],
            "label-md": ["Inter", "sans-serif"]
        },
        "fontSize": {
            "body-lg": ["18px", { "lineHeight": "28px", "fontWeight": "400" }],
            "body-sm": ["14px", { "lineHeight": "22px", "fontWeight": "400" }],
            "headline-lg": ["32px", { "lineHeight": "40px", "fontWeight": "600" }],
            "headline-sm": ["20px", { "lineHeight": "28px", "fontWeight": "600" }],
            "label-sm": ["12px", { "lineHeight": "16px", "letterSpacing": "0.08em", "fontWeight": "600" }],
            "label-lg": ["16px", { "lineHeight": "24px", "letterSpacing": "0.06em", "fontWeight": "600" }],
            "display-lg-mobile": ["40px", { "lineHeight": "48px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
            "display-md": ["48px", { "lineHeight": "56px", "letterSpacing": "-0.015em", "fontWeight": "700" }],
            "display-sm": ["36px", { "lineHeight": "44px", "letterSpacing": "-0.01em", "fontWeight": "700" }],
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
