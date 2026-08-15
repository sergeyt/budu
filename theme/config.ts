import { createSystem, defaultConfig, defineConfig } from "@chakra-ui/react";
import { buttonRecipe } from "./button.recipe";

const font =
  "var(--font-main), system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

// 2) System config with brand tokens + recipes
const config = defineConfig({
  globalCss: {
    "html, body": {
      bg: "bg.page",
      color: "text.body",
    },
    "*::placeholder, *[data-placeholder]": {
      color: "text.muted",
      opacity: 1,
    },
  },
  theme: {
    tokens: {
      colors: {
        // Treat Chakra's `blue` palette as your brand palette
        blue: {
          50: { value: "#eff6ff" },
          100: { value: "#dbeafe" },
          200: { value: "#bfdbfe" },
          300: { value: "#93c5fd" },
          400: { value: "#60a5fa" },
          500: { value: "#3b82f6" }, // primary brand
          600: { value: "#2563eb" },
          700: { value: "#1d4ed8" },
          800: { value: "#1e40af" },
          900: { value: "#1e3a8a" },
        },
        gray: {
          50: { value: "#f9fafb" },
          100: { value: "#f3f4f6" },
          200: { value: "#e5e7eb" },
          300: { value: "#d1d5db" },
          400: { value: "#9ca3af" },
          500: { value: "#6b7280" },
          600: { value: "#4b5563" },
          700: { value: "#374151" },
          800: { value: "#1f2937" },
          900: { value: "#111827" },
        },
      },
      fonts: {
        body: {
          value: font,
        },
        heading: {
          value: font,
        },
      },
      radii: {
        lg: { value: "12px" },
        full: { value: "9999px" },
      },
      shadows: {
        card: { value: "0 1px 2px rgba(15, 23, 42, 0.08)" },
      },
      spacing: {
        4: { value: "1rem" },
        6: { value: "1.5rem" },
        8: { value: "2rem" },
      },
      fontSizes: {
        sm: { value: "0.875rem" },
        md: { value: "1rem" },
        lg: { value: "1.125rem" },
        xl: { value: "1.25rem" },
        "2xl": { value: "1.5rem" },
      },
    },

    semanticTokens: {
      colors: {
        //
        // ===== BACKGROUNDS =====
        //
        "bg.page": {
          value: {
            base: "{colors.gray.50}",
            _dark: "{colors.gray.900}",
          },
        },
        "bg.surface": {
          value: {
            base: "{colors.white}",
            _dark: "{colors.gray.800}",
          },
        },
        "bg.elevated": {
          value: {
            base: "{colors.gray.100}",
            _dark: "{colors.gray.700}",
          },
        },
        "bg.subtle": {
          value: {
            base: "{colors.gray.50}",
            _dark: "{colors.gray.800}",
          },
        },
        "bg.muted": {
          value: {
            base: "{colors.gray.100}",
            _dark: "{colors.gray.800}",
          },
        },
        "bg.inverse": {
          value: {
            base: "{colors.gray.900}",
            _dark: "{colors.gray.50}",
          },
        },

        //
        // ===== TEXT =====
        //
        "text.heading": {
          value: {
            base: "{colors.gray.800}",
            _dark: "{colors.gray.100}",
          },
        },
        "text.body": {
          value: {
            base: "{colors.gray.700}",
            _dark: "{colors.gray.200}",
          },
        },
        "text.muted": {
          value: {
            base: "{colors.gray.500}",
            _dark: "{colors.gray.400}",
          },
        },
        "text.inverse": {
          value: {
            base: "{colors.white}",
            _dark: "{colors.gray.900}",
          },
        },
        "text.link": {
          value: {
            base: "{colors.blue.600}",
            _dark: "{colors.blue.300}",
          },
        },
        "text.linkHover": {
          value: {
            base: "{colors.blue.700}",
            _dark: "{colors.blue.200}",
          },
        },

        //
        // ===== BORDERS =====
        //
        "border.subtle": {
          value: {
            base: "{colors.gray.200}",
            _dark: "{colors.gray.700}",
          },
        },
        "border.muted": {
          value: {
            base: "{colors.gray.300}",
            _dark: "{colors.gray.600}",
          },
        },
        "border.accent": {
          value: {
            base: "{colors.blue.400}",
            _dark: "{colors.blue.300}",
          },
        },

        //
        // ===== BRAND =====
        //
        "brand.solid": {
          value: {
            base: "{colors.blue.500}",
            _dark: "{colors.blue.400}",
          },
        },
        "brand.muted": {
          value: {
            base: "{colors.blue.100}",
            _dark: "{colors.blue.800}",
          },
        },
        "brand.subtle": {
          value: {
            base: "{colors.blue.50}",
            _dark: "{colors.blue.900}",
          },
        },

        //
        // ===== ACCENTS (optional highlight surfaces) =====
        //
        "accent.yellow": {
          value: {
            base: "{colors.yellow.300}",
            _dark: "{colors.yellow.400}",
          },
        },
        "accent.red": {
          value: {
            base: "{colors.red.300}",
            _dark: "{colors.red.400}",
          },
        },
        "accent.green": {
          value: {
            base: "{colors.green.300}",
            _dark: "{colors.green.400}",
          },
        },
        "accent.purple": {
          value: {
            base: "{colors.purple.300}",
            _dark: "{colors.purple.400}",
          },
        },

        //
        // ===== FOCUS RING =====
        //
        "focus.ring": {
          value: {
            base: "{colors.blue.500}",
            _dark: "{colors.blue.300}",
          },
        },

        //
        // ===== OVERLAY =====
        //
        "overlay.backdrop": {
          value: {
            base: "rgba(0,0,0,0.45)",
            _dark: "rgba(0,0,0,0.6)",
          },
        },
      },

      //
      // ===== SHADOWS =====
      //
      shadows: {
        "shadow.card": {
          value: {
            base: "0 1px 2px rgba(15, 23, 42, 0.08)",
            _dark: "0 1px 3px rgba(0, 0, 0, 0.4)",
          },
        },
        "shadow.popover": {
          value: {
            base: "0 4px 16px rgba(15, 23, 42, 0.15)",
            _dark: "0 4px 20px rgba(0, 0, 0, 0.55)",
          },
        },
        "shadow.focus": {
          value: {
            base: "0 0 0 2px rgba(59, 130, 246, 0.5)", // blue-500
            _dark: "0 0 0 2px rgba(147, 197, 253, 0.4)", // blue-300
          },
        },
      },
    },

    // Attach our custom button recipe – this EXTENDS the built-in Button
    recipes: {
      button: buttonRecipe,
    },
  },
});

// export system for <ChakraProvider value={system}>
export const system = createSystem(defaultConfig, config);
