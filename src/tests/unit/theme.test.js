import { describe, it, expect, beforeEach } from "vitest";
import {
  setBrandTheme,
  applyThemeMode,
  getBestContrastTextColor,
  OFFICIAL_PALETTE,
} from "../../utils/theme";

describe("Utility: theme", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    localStorage.clear();
  });

  describe("applyThemeMode", () => {
    it("should add 'dark' class when mode is dark", () => {
      applyThemeMode("dark");
      expect(document.documentElement.classList.contains("dark")).toBe(true);
      expect(localStorage.getItem("barbersaas_theme_mode")).toBe("dark");
    });

    it("should remove 'dark' class when mode is light", () => {
      document.documentElement.classList.add("dark");
      applyThemeMode("light");
      expect(document.documentElement.classList.contains("dark")).toBe(false);
      expect(localStorage.getItem("barbersaas_theme_mode")).toBe("light");
    });
  });

  describe("setBrandTheme", () => {
    it("should apply brand CSS variables to root and save in localStorage", () => {
      setBrandTheme("emerald");
      expect(localStorage.getItem("barbersaas_brand_theme")).toBe("emerald");
      const brand500 = document.documentElement.style.getPropertyValue("--brand-500");
      expect(brand500).toBe("#10b981");
    });

    it("should fallback to amber if theme does not exist", () => {
      setBrandTheme("unknown_theme");
      const brand500 = document.documentElement.style.getPropertyValue("--brand-500");
      expect(brand500).toBe("#f59e0b");
    });
  });

  describe("getBestContrastTextColor", () => {
    it("should return black for bright colors", () => {
      expect(getBestContrastTextColor("#ffffff")).toBe("#000000");
      expect(getBestContrastTextColor("#fffbeb")).toBe("#000000");
      expect(getBestContrastTextColor("#fde68a")).toBe("#000000");
    });

    it("should return white for dark colors", () => {
      expect(getBestContrastTextColor("#000000")).toBe("#ffffff");
      expect(getBestContrastTextColor("#171717")).toBe("#ffffff");
      expect(getBestContrastTextColor("#1e3a8a")).toBe("#ffffff");
    });

    it("should handle 3-digit hex strings", () => {
      expect(getBestContrastTextColor("#FFF")).toBe("#000000");
      expect(getBestContrastTextColor("#000")).toBe("#ffffff");
    });
  });
});
