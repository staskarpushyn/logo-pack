import type { BrandColor, CmykValues } from '../types';

export function normalizeHex(input: string): string | null {
  const raw = input.trim().toLowerCase();
  if (!raw || raw === 'none' || raw === 'transparent' || raw.startsWith('url(')) return null;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    const r = raw[1];
    const g = raw[2];
    const b = raw[3];
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  const rgbMatch = raw.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgbMatch) {
    const r = Math.min(255, Math.max(0, Number(rgbMatch[1])));
    const g = Math.min(255, Math.max(0, Number(rgbMatch[2])));
    const b = Math.min(255, Math.max(0, Number(rgbMatch[3])));
    return rgbToHex(r, g, b);
  }
  const named: Record<string, string> = {
    black: '#000000',
    white: '#FFFFFF',
    red: '#FF0000',
    green: '#008000',
    blue: '#0000FF',
    yellow: '#FFFF00',
    orange: '#FFA500',
    gray: '#808080',
    grey: '#808080',
  };
  return named[raw] ?? null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const num = parseInt(clean.length === 3 ? clean.replace(/(.)/g, '$1$1') : clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const max = Math.max(rp, gp, bp);
  const min = Math.min(rp, gp, bp);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rp) h = (gp - bp) / d + (gp < bp ? 6 : 0);
    else if (max === gp) h = (bp - rp) / d + 2;
    else h = (rp - gp) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

export function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.max(0, Math.min(100, s)) / 100;
  const ll = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255);
}

export function hexToCmyk(hex: string): CmykValues {
  const { r, g, b } = hexToRgb(hex);
  const rp = r / 255;
  const gp = g / 255;
  const bp = b / 255;
  const k = 1 - Math.max(rp, gp, bp);
  if (k >= 0.999) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = ((1 - rp - k) / (1 - k)) * 100;
  const m = ((1 - gp - k) / (1 - k)) * 100;
  const y = ((1 - bp - k) / (1 - k)) * 100;
  return {
    c: Math.round(c),
    m: Math.round(m),
    y: Math.round(y),
    k: Math.round(k * 100),
  };
}

export function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const DESIGNER_SWATCH_NAMES: Array<{ name: string; r: number; g: number; b: number }> = [
  // Whites & Light Neutrals
  { name: 'White', r: 255, g: 255, b: 255 },
  { name: 'Snow', r: 255, g: 250, b: 250 },
  { name: 'Ivory', r: 255, g: 255, b: 240 },
  { name: 'Alabaster', r: 242, g: 240, b: 230 },
  { name: 'Off-White', r: 244, g: 243, b: 239 },
  { name: 'Anti-Flash White', r: 241, g: 243, b: 245 },
  { name: 'Isabelline', r: 244, g: 240, b: 236 },
  { name: 'Linen', r: 250, g: 240, b: 230 },
  { name: 'Seashell', r: 255, g: 245, b: 238 },
  { name: 'Platinum', r: 229, g: 229, b: 229 },
  { name: 'Timberwolf', r: 218, g: 215, b: 205 },
  { name: 'Bone', r: 227, g: 218, b: 201 },
  { name: 'Ash Gray', r: 178, g: 190, b: 181 },
  { name: 'French Gray', r: 173, g: 181, b: 189 },
  { name: 'Silver', r: 192, g: 192, b: 192 },
  // Cool & Warm Grays
  { name: 'Cool Gray', r: 141, g: 153, b: 174 },
  { name: 'Slate Gray', r: 108, g: 117, b: 125 },
  { name: 'Dim Gray', r: 105, g: 105, b: 105 },
  { name: 'Taupe', r: 132, g: 117, b: 110 },
  { name: 'Battleship Gray', r: 132, g: 132, b: 130 },
  { name: 'Davys Gray', r: 85, g: 85, b: 85 },
  // Darks & Blacks (Coolors calibrated)
  { name: 'Charcoal', r: 54, g: 69, b: 79 },
  { name: 'Outer Space', r: 65, g: 74, b: 76 },
  { name: 'Gunmetal', r: 41, g: 50, b: 65 },
  { name: 'Onyx', r: 53, g: 57, b: 53 },
  { name: 'Eerie Black', r: 36, g: 36, b: 36 },
  { name: 'Raisin Black', r: 36, g: 33, b: 36 },
  { name: 'Jet Black', r: 26, g: 36, b: 46 },
  { name: 'Rich Black', r: 13, g: 27, b: 42 },
  { name: 'Night', r: 12, g: 12, b: 12 },
  { name: 'Obsidian', r: 10, g: 12, b: 16 },
  { name: 'Black', r: 0, g: 0, b: 0 },
  // Oranges & Corals
  { name: 'International Orange', r: 250, g: 80, b: 8 },
  { name: 'Coquelicot', r: 241, g: 80, b: 37 },
  { name: 'Tangelo', r: 249, g: 77, b: 0 },
  { name: 'Orange Pantone', r: 255, g: 88, b: 0 },
  { name: 'Pumpkin', r: 255, g: 117, b: 24 },
  { name: 'Safety Orange', r: 255, g: 121, b: 0 },
  { name: 'Tangerine', r: 242, g: 133, b: 0 },
  { name: 'Burnt Sienna', r: 231, g: 111, b: 81 },
  { name: 'Terracotta', r: 224, g: 122, b: 95 },
  { name: 'Coral', r: 255, g: 127, b: 80 },
  { name: 'Bittersweet', r: 254, g: 111, b: 94 },
  { name: 'Salmon', r: 250, g: 128, b: 114 },
  { name: 'Peach', r: 255, g: 203, b: 164 },
  { name: 'Apricot', r: 251, g: 206, b: 177 },
  // Reds & Pinks
  { name: 'Vermilion', r: 227, g: 66, b: 52 },
  { name: 'Imperial Red', r: 230, g: 57, b: 70 },
  { name: 'Crimson', r: 220, g: 20, b: 60 },
  { name: 'Scarlet', r: 255, g: 36, b: 0 },
  { name: 'Fire Engine Red', r: 206, g: 32, b: 41 },
  { name: 'Ruby Red', r: 155, g: 17, b: 30 },
  { name: 'Carmine', r: 150, g: 0, b: 24 },
  { name: 'Burgundy', r: 128, g: 0, b: 32 },
  { name: 'Maroon', r: 92, g: 16, b: 28 },
  { name: 'Rose Red', r: 194, g: 30, b: 86 },
  { name: 'Bright Pink', r: 255, g: 0, b: 127 },
  { name: 'Folly', r: 255, g: 0, b: 79 },
  { name: 'Magenta', r: 214, g: 48, b: 134 },
  { name: 'Rose Quartz', r: 170, g: 152, b: 169 },
  { name: 'Blush Pink', r: 235, g: 168, b: 180 },
  { name: 'Tea Rose', r: 244, g: 194, b: 194 },
  // Purples & Indigos
  { name: 'Plum', r: 106, g: 44, b: 112 },
  { name: 'Eggplant', r: 97, g: 64, b: 81 },
  { name: 'Royal Purple', r: 120, g: 81, b: 169 },
  { name: 'Amethyst', r: 153, g: 102, b: 204 },
  { name: 'Electric Violet', r: 143, g: 0, b: 255 },
  { name: 'Iris', r: 90, g: 79, b: 207 },
  { name: 'Lavender', r: 178, g: 164, b: 236 },
  { name: 'Periwinkle', r: 204, g: 204, b: 255 },
  { name: 'Indigo', r: 63, g: 55, b: 201 },
  { name: 'Space Cadet', r: 43, g: 45, b: 66 },
  // Blues & Cyans
  { name: 'Oxford Blue', r: 0, g: 33, b: 71 },
  { name: 'Prussian Blue', r: 29, g: 45, b: 68 },
  { name: 'Midnight Blue', r: 25, g: 25, b: 112 },
  { name: 'Navy Blue', r: 0, g: 0, b: 128 },
  { name: 'YinMn Blue', r: 46, g: 80, b: 144 },
  { name: 'Cobalt Blue', r: 0, g: 71, b: 171 },
  { name: 'Royal Blue', r: 65, g: 105, b: 225 },
  { name: 'Azure', r: 0, g: 127, b: 255 },
  { name: 'Dodger Blue', r: 30, g: 144, b: 255 },
  { name: 'Steel Blue', r: 70, g: 130, b: 180 },
  { name: 'Cerulean', r: 0, g: 123, b: 167 },
  { name: 'Sky Blue', r: 135, g: 206, b: 235 },
  { name: 'Powder Blue', r: 176, g: 224, b: 230 },
  { name: 'Ice Blue', r: 214, g: 234, b: 248 },
  { name: 'Teal', r: 0, g: 128, b: 128 },
  { name: 'Midnight Green', r: 0, g: 73, b: 83 },
  { name: 'Caribbean Current', r: 0, g: 109, b: 119 },
  { name: 'Cyan', r: 0, g: 180, b: 216 },
  { name: 'Turquoise', r: 64, g: 224, b: 208 },
  // Greens
  { name: 'Dark Green', r: 1, g: 50, b: 32 },
  { name: 'British Racing Green', r: 0, g: 66, b: 37 },
  { name: 'Deep Forest', r: 1, g: 55, b: 42 },
  { name: 'Pine Green', r: 1, g: 121, b: 111 },
  { name: 'Forest Green', r: 34, g: 139, b: 34 },
  { name: 'Hunter Green', r: 53, g: 94, b: 59 },
  { name: 'Emerald', r: 42, g: 157, b: 143 },
  { name: 'Jungle Green', r: 41, g: 171, b: 135 },
  { name: 'Jade', r: 0, g: 168, b: 107 },
  { name: 'Mint', r: 152, g: 255, b: 152 },
  { name: 'Celadon', r: 172, g: 225, b: 175 },
  { name: 'Sage', r: 188, g: 184, b: 138 },
  { name: 'Moss Green', r: 138, g: 154, b: 91 },
  { name: 'Olive', r: 128, g: 128, b: 0 },
  { name: 'Avocado', r: 86, g: 130, b: 3 },
  { name: 'Chartreuse', r: 127, g: 255, b: 0 },
  { name: 'Lime', r: 168, g: 214, b: 48 },
  // Yellows & Browns
  { name: 'Gold', r: 255, g: 215, b: 0 },
  { name: 'Cyber Yellow', r: 255, g: 211, b: 0 },
  { name: 'Amber', r: 255, g: 191, b: 0 },
  { name: 'Saffron', r: 244, g: 196, b: 48 },
  { name: 'Mustard', r: 255, g: 219, b: 88 },
  { name: 'Vanilla', r: 238, g: 220, b: 130 },
  { name: 'Champagne', r: 247, g: 231, b: 206 },
  { name: 'Beige', r: 245, g: 245, b: 220 },
  { name: 'Sand', r: 214, g: 194, b: 152 },
  { name: 'Khaki', r: 195, g: 176, b: 145 },
  { name: 'Ochre', r: 204, g: 119, b: 34 },
  { name: 'Rust', r: 183, g: 65, b: 14 },
  { name: 'Chestnut', r: 149, g: 69, b: 53 },
  { name: 'Chocolate', r: 123, g: 63, b: 0 },
  { name: 'Espresso', r: 68, g: 42, b: 28 },
  { name: 'Bistre', r: 61, g: 43, b: 31 },
];

function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const rl = lin(r);
  const gl = lin(g);
  const bl = lin(b);
  const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
  const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.072175) / 1.0;
  const z = (rl * 0.0193339 + gl * 0.119192 + bl * 0.9503041) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

const DESIGNER_SWATCH_LAB = DESIGNER_SWATCH_NAMES.map((sw) => ({
  ...sw,
  lab: rgbToLab(sw.r, sw.g, sw.b),
}));

export const ALL_AUTO_COLOR_NAMES = new Set(DESIGNER_SWATCH_NAMES.map((s) => s.name));

export function isAutoGeneratedColorName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return true;
  if (ALL_AUTO_COLOR_NAMES.has(trimmed)) return true;
  if (/^Brand Color \d+$/i.test(trimmed)) return true;
  // Also recognize old auto-names
  return [
    'Gold',
    'Deep Forest',
    'Forest Green',
    'Emerald',
    'Midnight Navy',
    'Cobalt',
    'Burgundy',
    'Crimson',
    'Pumpkin',
    'Onyx',
    'Off-White',
    'Pure White',
    'Signal Orange',
    'Amber Gold',
  ].includes(trimmed);
}

export function guessColorName(hex: string, _idx = 0): string {
  const norm = normalizeHex(hex) ?? hex;
  const { r, g, b } = hexToRgb(norm);
  const [l1, a1, b1] = rgbToLab(r, g, b);

  let bestName = DESIGNER_SWATCH_LAB[0].name;
  let bestDist = Infinity;
  for (const sw of DESIGNER_SWATCH_LAB) {
    const [l2, a2, b2] = sw.lab;
    const dl = l1 - l2;
    const da = a1 - a2;
    const db = b1 - b2;
    const dist = dl * dl + da * da + db * db;
    if (dist < bestDist) {
      bestDist = dist;
      bestName = sw.name;
    }
  }
  return bestName;
}

export type HarmonyStrategy = 'auto' | 'accent' | 'complementary' | 'analogous' | 'light' | 'dark';

function labDistance(hexA: string, hexB: string): number {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const [l1, a1, b1] = rgbToLab(a.r, a.g, a.b);
  const [l2, a2, b2] = rgbToLab(b.r, b.g, b.b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

/**
 * Blues/violets (210–275°) appear perceptually darker than warm oranges/greens at equal HSL L;
 * compensate lightness slightly upward so blue/violet accents never collapse into dark navy.
 */
function vividLightnessForHue(hue: number, baseL = 50): number {
  const h = ((hue % 360) + 360) % 360;
  let boost = 0;
  if (h >= 205 && h <= 275) {
    boost = 8;
  } else if (h > 275 && h <= 330) {
    boost = 4;
  } else if (h >= 40 && h <= 85) {
    boost = 2;
  }
  return Math.max(44, Math.min(68, baseL + boost));
}

function labStats(hex: string): { lStar: number; chroma: number; hue: number; sat: number } {
  const rgb = hexToRgb(hex);
  const [lStar, a, b] = rgbToLab(rgb.r, rgb.g, rgb.b);
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  return {
    lStar,
    chroma: Math.hypot(a, b),
    hue: hsl.h,
    sat: hsl.s,
  };
}

/**
 * Coolors-inspired harmonious color addition:
 * enforces global quota across light papers (max 1–2), dark inks (max 1–2),
 * and vibrant/mid chromatic hues so repeated clicks never converge to all-dark or all-white.
 */
export function generateHarmoniousColor(
  existingColors: BrandColor[],
  strategy: HarmonyStrategy = 'auto',
  stepSeed = 0,
): { hex: string; name: string } {
  const usedHexes = new Set(existingColors.map((c) => c.hex.toUpperCase()));

  const chromaticAnchors = [...existingColors]
    .filter((c) => {
      const st = labStats(c.hex);
      return st.sat >= 24 && st.lStar >= 25 && st.lStar <= 82;
    })
    .sort((a, b) => labStats(b.hex).chroma - labStats(a.hex).chroma);

  const primaryAnchor = chromaticAnchors[0] ?? existingColors[0] ?? null;
  const anchorStats = primaryAnchor
    ? labStats(primaryAnchor.hex)
    : { lStar: 58, chroma: 75, hue: 201, sat: 94 };
  const baseHue = anchorStats.sat < 14 ? (201 + stepSeed * 43) % 360 : anchorStats.hue;

  const darkCount = existingColors.filter((c) => labStats(c.hex).lStar < 28).length;
  const lightCount = existingColors.filter((c) => labStats(c.hex).lStar > 78).length;
  const maxExtremes = Math.max(2, Math.floor(existingColors.length / 2));
  const hasAccent = chromaticAnchors.length > 0;

  const allowsTone = (candHex: string, roleHint: HarmonyStrategy): boolean => {
    const st = labStats(candHex);
    if (roleHint !== 'light' && lightCount >= maxExtremes && st.lStar > 78) return false;
    if (roleHint !== 'dark' && darkCount >= maxExtremes && st.lStar < 28) return false;
    return true;
  };

  const tryCandidate = (
    candHex: string,
    roleHint: HarmonyStrategy,
    minDeltaE = 18,
  ): { hex: string; name: string } | null => {
    const up = candHex.toUpperCase();
    if (usedHexes.has(up)) return null;
    if (!allowsTone(up, roleHint)) return null;
    for (const ex of existingColors) {
      if (labDistance(up, ex.hex) < minDeltaE) return null;
    }
    return { hex: up, name: guessColorName(up, existingColors.length) };
  };

  let effective = strategy;
  if (effective === 'auto') {
    if (!hasAccent) effective = 'accent';
    else if (lightCount === 0) effective = 'light';
    else if (darkCount === 0) effective = 'dark';
    else if (stepSeed % 5 === 2 && lightCount < maxExtremes) effective = 'light';
    else if (stepSeed % 5 === 4 && darkCount < maxExtremes) effective = 'dark';
    else effective = 'complementary';
  }

  const candidates: string[] = [];
  if (effective === 'light') {
    const lightHues = [baseHue, (baseHue + 36) % 360, (baseHue + 180) % 360, 40];
    lightHues.forEach((h, i) => {
      candidates.push(hslToHex((h + stepSeed * 23) % 360, 42 + (i % 2) * 18, 87 + (i % 2) * 3));
    });
  } else if (effective === 'dark') {
    const darkHues = [baseHue, (baseHue + 180) % 360, 349, 210];
    darkHues.forEach((h, i) => {
      candidates.push(hslToHex((h + stepSeed * 23) % 360, 26 + (i % 2) * 16, 14 + (i % 2) * 5));
    });
  } else if (effective === 'analogous') {
    [32, -32, 52, -52, 20, -20].forEach((a, i) => {
      const h = (baseHue + a + stepSeed * 19 + 360) % 360;
      candidates.push(hslToHex(h, 74 - (i % 2) * 10, vividLightnessForHue(h, 50 + (i % 2) * 6)));
    });
  } else {
    const goldenHue = (baseHue + (existingColors.length + stepSeed + 1) * 137.508) % 360;
    const schemaMode = (existingColors.length + stepSeed) % 4;

    const vividPool = [
      hslToHex((baseHue + 180) % 360, 80, vividLightnessForHue(baseHue + 180, 49)),
      hslToHex((baseHue + 150) % 360, 76, vividLightnessForHue(baseHue + 150, 50)),
      hslToHex((baseHue + 210) % 360, 76, vividLightnessForHue(baseHue + 210, 50)),
      hslToHex((baseHue + 120) % 360, 72, vividLightnessForHue(baseHue + 120, 49)),
      hslToHex((baseHue + 240) % 360, 72, vividLightnessForHue(baseHue + 240, 49)),
      hslToHex((baseHue + 34) % 360, 78, vividLightnessForHue(baseHue + 34, 51)),
      hslToHex((baseHue - 34 + 360) % 360, 78, vividLightnessForHue(baseHue - 34, 51)),
      hslToHex(goldenHue, 78, vividLightnessForHue(goldenHue, 50)),
    ];

    const mediumSoftPool = [
      hslToHex((baseHue + 165) % 360, 56, 62),
      hslToHex((baseHue + 32) % 360, 52, 64),
      hslToHex((baseHue - 40 + 360) % 360, 54, 62),
      hslToHex(goldenHue, 58, 60),
    ];

    const neutralMidPool = [
      hslToHex((baseHue + 18) % 360, 16, 56), // Coolors #A39A92 warm silver feel
      hslToHex((baseHue + 180) % 360, 20, 44), // Coolors #77685D umber mid-tone feel
      hslToHex((baseHue + 8) % 360, 24, 58),
    ];

    if (schemaMode === 2) {
      candidates.push(...mediumSoftPool, ...vividPool);
    } else if (schemaMode === 3) {
      candidates.push(...neutralMidPool, ...vividPool, ...mediumSoftPool);
    } else {
      const rot = stepSeed % vividPool.length;
      candidates.push(...vividPool.slice(rot), ...vividPool.slice(0, rot), ...mediumSoftPool);
    }
  }

  for (const hex of candidates) {
    const picked = tryCandidate(hex, effective, 18);
    if (picked) return picked;
  }

  // Fallback sweep strictly in balanced 46–62% lightness band (never pale white or dark black)
  for (let i = 0; i < 16; i++) {
    const h = (baseHue + (stepSeed + i + 1) * 137.508) % 360;
    const l = vividLightnessForHue(h, 49 + (i % 3) * 5);
    const s = 68 + ((i + stepSeed) % 3) * 8;
    const picked = tryCandidate(hslToHex(h, s, l), effective, 14);
    if (picked) return picked;
  }

  const fbHue = (baseHue + (existingColors.length + stepSeed + 1) * 137.508) % 360;
  const fb = hslToHex(fbHue, 74, vividLightnessForHue(fbHue, 50));
  return { hex: fb, name: guessColorName(fb, existingColors.length) };
}

/**
 * Regenerates ONE selected color cleanly without any sticky light/dark traps:
 * balances global palette quotas (recovering vivid accents if a palette turned all-pale or all-dark)
 * and cycles cleanly across rich Coolors harmony roles & hue angles on repeated clicks.
 */
export function regenerateMatchingColor(
  allColors: BrandColor[],
  targetId: string,
  cycleCount = 0,
): { hex: string; name: string } {
  const current = allColors.find((c) => c.id === targetId);
  const others = allColors.filter((c) => c.id !== targetId);
  const usedHexes = new Set(allColors.map((c) => c.hex.toUpperCase()));

  const otherStats = others.map((c) => ({ c, st: labStats(c.hex) }));
  const lightOthers = otherStats.filter((x) => x.st.lStar > 78).length;
  const darkOthers = otherStats.filter((x) => x.st.lStar < 28).length;
  const maxExtremes = Math.max(2, Math.floor(allColors.length / 2) + 1);
  const chromaticOthers = otherStats
    .filter((x) => x.st.sat >= 24 && x.st.lStar >= 26 && x.st.lStar <= 78)
    .sort((a, b) => b.st.chroma - a.st.chroma);

  const curSt = current ? labStats(current.hex) : { lStar: 52, chroma: 60, hue: 201, sat: 75 };
  const heroHues = [201, 18, 158, 268, 342, 38, 185];
  const anchorHue =
    chromaticOthers[0]?.st.hue ??
    (curSt.sat >= 24 ? curSt.hue : heroHues[cycleCount % heroHues.length]);
  const baseHue = (anchorHue + (chromaticOthers.length === 0 ? cycleCount * 47 : 0)) % 360;

  const scheduleSlot = cycleCount % 6;
  const wantLightThisStep =
    lightOthers < maxExtremes &&
    ((cycleCount === 0 && curSt.lStar > 82 && lightOthers === 0 && chromaticOthers.length > 0) ||
      scheduleSlot === 3);
  const wantDarkThisStep =
    darkOthers < maxExtremes &&
    ((cycleCount === 0 &&
      curSt.lStar < 23 &&
      curSt.chroma < 22 &&
      darkOthers === 0 &&
      chromaticOthers.length > 0) ||
      scheduleSlot === 5);

  const isAcceptable = (hex: string, minDiff = 16, allowExtreme = false): boolean => {
    const up = hex.toUpperCase();
    if (usedHexes.has(up)) return false;
    if (current && labDistance(up, current.hex) < 12) return false;
    const st = labStats(up);
    if (!allowExtreme) {
      if (lightOthers >= maxExtremes && st.lStar > 78) return false;
      if (darkOthers >= maxExtremes && st.lStar < 28) return false;
      if (
        chromaticOthers.length === 0 &&
        curSt.sat < 24 &&
        (st.lStar > 76 || st.lStar < 30 || st.sat < 45)
      ) {
        return false;
      }
    }
    for (const o of others) {
      if (labDistance(up, o.hex) < minDiff) return false;
    }
    return true;
  };

  const pool: string[] = [];

  if (wantLightThisStep) {
    [(baseHue + 180) % 360, (baseHue + 45) % 360, baseHue, 200].forEach((h, i) => {
      pool.push(hslToHex((h + cycleCount * 19) % 360, 44 + (i % 2) * 18, 86 + (i % 2) * 3));
    });
  } else if (wantDarkThisStep) {
    [(baseHue + 180) % 360, 210, 156, 349, 26].forEach((h, i) => {
      pool.push(hslToHex((h + cycleCount * 17) % 360, 28 + (i % 2) * 14, 14 + (i % 3) * 4));
    });
  }

  // Main trap-free Coolors cycle across rich mid-tone to vivid chromatic bands (L 42%..65%)
  const angles = [180, 34, -34, 150, -150, 120, -120, 68, -68, 96, -96, 20, -20];
  const start = cycleCount % angles.length;

  for (let k = 0; k < angles.length; k++) {
    const angle = angles[(start + k) % angles.length];
    const h = (baseHue + angle + cycleCount * 17 + 360) % 360;
    const tier = (cycleCount + k) % 4;

    if (tier === 0) {
      pool.push(hslToHex(h, 78 + (k % 2) * 10, vividLightnessForHue(h, 48)));
    } else if (tier === 1) {
      pool.push(hslToHex(h, 70 + (k % 2) * 10, vividLightnessForHue(h, 54)));
    } else if (tier === 2) {
      pool.push(hslToHex(h, 60 + (k % 2) * 12, vividLightnessForHue(h, 60)));
    } else {
      const s = chromaticOthers.length === 0 ? 74 : 26 + (k % 2) * 16;
      const l = chromaticOthers.length === 0 ? vividLightnessForHue(h, 50) : 46 + (k % 2) * 10;
      pool.push(hslToHex(h, s, l));
    }
  }

  for (const hex of pool) {
    if (isAcceptable(hex, 16, wantLightThisStep || wantDarkThisStep)) {
      const up = hex.toUpperCase();
      return { hex: up, name: guessColorName(up) };
    }
  }

  for (const hex of pool) {
    if (isAcceptable(hex, 8, false)) {
      const up = hex.toUpperCase();
      return { hex: up, name: guessColorName(up) };
    }
  }

  // Final deterministic vivid recovery
  const fbHue = heroHues[(cycleCount + allColors.length) % heroHues.length];
  const fallback = hslToHex(fbHue, 78, vividLightnessForHue(fbHue, 50));
  return { hex: fallback, name: guessColorName(fallback) };
}
