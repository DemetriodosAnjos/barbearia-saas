/**
 * @file .storybook/preview.jsx
 * Configuração global do Preview do Storybook para o Design System da Barbearia SaaS.
 * Injeta o CSS do Tailwind, temas dark/light e parâmetros de regressão visual Chromatic/Playwright.
 */

import React from "react";
import "../src/index.css";

/** @type { import('@storybook/react').Preview } */
const preview = {
  parameters: {
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0a0a0a" },
        { name: "surface", value: "#171717" },
        { name: "light", value: "#ffffff" },
      ],
    },
    viewport: {
      viewports: {
        mobile: {
          name: "Mobile iPhone 14",
          styles: { width: "390px", height: "844px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet iPad Mini",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop HD",
          styles: { width: "1280px", height: "800px" },
          type: "desktop",
        },
      },
    },
    // Parâmetros de Regressão Visual Chromatic e Playwright
    chromatic: {
      viewports: [390, 768, 1280],
      delay: 300,
      pauseAnimationAtEnd: true,
      diffThreshold: 0.05, // Tolerância estrita de 5% de anti-aliasing
    },
    a11y: {
      config: {
        rules: [
          { id: "color-contrast", enabled: true },
          { id: "focus-order-semantics", enabled: true },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => (
      <div className="min-h-[120px] p-6 bg-neutral-950 text-neutral-100 flex items-center justify-center font-sans antialiased">
        <div className="w-full max-w-xl">
          <Story {...context} />
        </div>
      </div>
    ),
  ],
};

export default preview;
