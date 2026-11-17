import type { FontConfig, Locale, TypographyConfig } from '../types';

export interface GoogleFontMeta {
  family: string;
  category: 'sans' | 'serif' | 'display' | 'mono';
  weights: number[];
  hasItalic?: boolean;
  cyrillic?: boolean;
}

export const GOOGLE_FONTS_CATALOG: GoogleFontMeta[] = [
  { family: 'Manrope', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: true },
  { family: 'Inter', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Space Grotesk', category: 'sans', weights: [300, 400, 500, 600, 700], cyrillic: false },
  { family: 'Plus Jakarta Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Montserrat', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'DM Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Outfit', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: false },
  { family: 'Syne', category: 'display', weights: [400, 500, 600, 700, 800], cyrillic: false },
  { family: 'Sora', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: false },
  { family: 'Poppins', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Work Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Archivo', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'IBM Plex Sans', category: 'sans', weights: [300, 400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Raleway', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Rubik', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Nunito', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Nunito Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Jost', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Mulish', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'PT Sans', category: 'sans', weights: [400, 700], hasItalic: true, cyrillic: true },
  { family: 'Fira Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Oswald', category: 'display', weights: [300, 400, 500, 600, 700], cyrillic: true },
  { family: 'Roboto', category: 'sans', weights: [300, 400, 500, 700], hasItalic: true, cyrillic: true },
  { family: 'Roboto Condensed', category: 'sans', weights: [300, 400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Open Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Lato', category: 'sans', weights: [300, 400, 700], hasItalic: true, cyrillic: false },
  { family: 'Geist', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: true },
  { family: 'Onest', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: true },
  { family: 'Golos Text', category: 'sans', weights: [400, 500, 600, 700, 800], cyrillic: true },
  { family: 'Bricolage Grotesque', category: 'display', weights: [300, 400, 500, 600, 700, 800], cyrillic: false },
  { family: 'Instrument Sans', category: 'sans', weights: [400, 500, 600, 700], hasItalic: true, cyrillic: false },
  { family: 'Schibsted Grotesk', category: 'sans', weights: [400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Figtree', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Urbanist', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Karla', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Lexend', category: 'sans', weights: [300, 400, 500, 600, 700, 800], cyrillic: false },
  { family: 'Epilogue', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Albert Sans', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Barlow', category: 'sans', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Unbounded', category: 'display', weights: [300, 400, 500, 600, 700, 800], cyrillic: true },
  { family: 'Dela Gothic One', category: 'display', weights: [400], cyrillic: true },
  { family: 'Russo One', category: 'display', weights: [400], cyrillic: true },
  { family: 'Comfortaa', category: 'display', weights: [300, 400, 500, 600, 700], cyrillic: true },
  { family: 'Bebas Neue', category: 'display', weights: [400], cyrillic: false },
  { family: 'Anton', category: 'display', weights: [400], cyrillic: false },
  { family: 'Righteous', category: 'display', weights: [400], cyrillic: false },
  { family: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Cormorant', category: 'serif', weights: [300, 400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Lora', category: 'serif', weights: [400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Merriweather', category: 'serif', weights: [300, 400, 700], hasItalic: true, cyrillic: true },
  { family: 'PT Serif', category: 'serif', weights: [400, 700], hasItalic: true, cyrillic: true },
  { family: 'EB Garamond', category: 'serif', weights: [400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Fraunces', category: 'serif', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: false },
  { family: 'Instrument Serif', category: 'serif', weights: [400], hasItalic: true, cyrillic: false },
  { family: 'DM Serif Display', category: 'serif', weights: [400], hasItalic: true, cyrillic: false },
  { family: 'Bitter', category: 'serif', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'Spectral', category: 'serif', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'JetBrains Mono', category: 'mono', weights: [300, 400, 500, 600, 700, 800], hasItalic: true, cyrillic: true },
  { family: 'IBM Plex Mono', category: 'mono', weights: [300, 400, 500, 600, 700], hasItalic: true, cyrillic: true },
  { family: 'Space Mono', category: 'mono', weights: [400, 700], hasItalic: true, cyrillic: false },
  { family: 'Fira Code', category: 'mono', weights: [300, 400, 500, 600, 700], cyrillic: true },
];

let cachedFullCatalog: GoogleFontMeta[] | null = null;
let catalogPromise: Promise<GoogleFontMeta[]> | null = null;

function mapCategory(raw: string | undefined): GoogleFontMeta['category'] {
  if (raw === 'serif') return 'serif';
  if (raw === 'monospace') return 'mono';
  if (raw === 'display' || raw === 'handwriting') return 'display';
  return 'sans';
}

export async function fetchAllGoogleFontsCatalog(): Promise<GoogleFontMeta[]> {
  if (cachedFullCatalog) return cachedFullCatalog;
  if (catalogPromise) return catalogPromise;

  catalogPromise = (async () => {
    try {
      const res = await fetch('https://api.fontsource.org/v1/fonts', {
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) return GOOGLE_FONTS_CATALOG;
      const items = (await res.json()) as Array<{
        family: string;
        category?: string;
        weights?: number[];
        styles?: string[];
        subsets?: string[];
      }>;
      const curatedNames = new Set(GOOGLE_FONTS_CATALOG.map((f) => f.family.toLowerCase()));
      const extra: GoogleFontMeta[] = [];
      for (const item of items) {
        if (!item.family || curatedNames.has(item.family.toLowerCase())) continue;
        curatedNames.add(item.family.toLowerCase());
        extra.push({
          family: item.family,
          category: mapCategory(item.category),
          weights: item.weights?.length ? item.weights : [400],
          hasItalic: item.styles?.includes('italic') ?? false,
          cyrillic: item.subsets?.includes('cyrillic') ?? false,
        });
      }
      cachedFullCatalog = [...GOOGLE_FONTS_CATALOG, ...extra];
      return cachedFullCatalog;
    } catch {
      return GOOGLE_FONTS_CATALOG;
    }
  })();

  return catalogPromise;
}

const fontLoadPromises = new Map<string, Promise<void>>();

function loadStylesheet(href: string): Promise<boolean> {
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLLinkElement>(`link[href="${href}"]`);
    if (existing) {
      resolve(true);
      return;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.crossOrigin = 'anonymous';
    link.onload = () => resolve(true);
    link.onerror = () => {
      link.remove();
      resolve(false);
    };
    document.head.appendChild(link);
  });
}

function getFontMeta(family: string): GoogleFontMeta | undefined {
  const list = cachedFullCatalog ?? GOOGLE_FONTS_CATALOG;
  return list.find((f) => f.family.toLowerCase() === family.toLowerCase());
}

/**
 * Forces both Latin and Cyrillic subsets + exact weight to load before Canvas draws!
 */
async function warmCanvasFont(family: string, weight: number, italic = false): Promise<void> {
  const sample = 'AaBbCc АаБбВвГг 0123456789';
  const spec = `${italic ? 'italic ' : ''}${weight} 48px "${family}"`;
  await Promise.allSettled([
    document.fonts.load(spec, sample),
    document.fonts.load(`${weight} 48px "${family}"`, 'AaBbCc АаБбВв'),
    document.fonts.ready,
  ]);
}

export async function ensureGoogleFontLoaded(
  family: string,
  weights: number[] = [300, 400, 500, 600, 700, 800],
  italic = false,
): Promise<void> {
  const clean = family.trim();
  if (!clean) return;

  const meta = getFontMeta(clean);
  const validWeights = meta
    ? [...new Set(weights.filter((w) => meta.weights.includes(w)).concat(meta.weights))]
        .sort((a, b) => a - b)
    : [...new Set(weights)].sort((a, b) => a - b);
  const finalWeights = validWeights.length ? validWeights : [400, 700];

  const allowItalic = italic && (meta?.hasItalic ?? true);
  const key = `${clean.toLowerCase()}__${finalWeights.join(',')}__${allowItalic ? 'i' : 'n'}`;
  const pending = fontLoadPromises.get(key);
  if (pending) {
    await pending;
    await Promise.all(finalWeights.map((w) => warmCanvasFont(clean, w, allowItalic)));
    return;
  }

  const job = (async () => {
    const encoded = encodeURIComponent(clean).replace(/%20/g, '+');
    const urls: string[] = [];

    if (allowItalic) {
      const tuples = [
        ...finalWeights.map((w) => `0,${w}`),
        ...finalWeights.map((w) => `1,${w}`),
      ].join(';');
      urls.push(`https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@${tuples}&display=swap`);
    }
    urls.push(
      `https://fonts.googleapis.com/css2?family=${encoded}:wght@${finalWeights.join(';')}&display=swap`,
      `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`,
    );

    for (const url of urls) {
      const ok = await loadStylesheet(url);
      if (ok) break;
    }

    await Promise.all(finalWeights.map((w) => warmCanvasFont(clean, w, allowItalic)));
  })();

  fontLoadPromises.set(key, job);
  await job;
}

const uploadedFamiliesLoaded = new Set<string>();

export async function ensureConfigFontLoaded(cfg: FontConfig): Promise<void> {
  if (!cfg.family) return;
  if (cfg.source === 'google') {
    await ensureGoogleFontLoaded(cfg.family, [cfg.weight, 400, 600, 700], cfg.italic);
    await warmCanvasFont(cfg.family, cfg.weight, cfg.italic);
    return;
  }
  if (cfg.source === 'upload' && cfg.fileDataBase64 && !uploadedFamiliesLoaded.has(cfg.family)) {
    try {
      const bin = atob(cfg.fileDataBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const face = new FontFace(cfg.family, bytes.buffer, {
        weight: String(cfg.weight),
        style: cfg.italic ? 'italic' : 'normal',
      });
      await face.load();
      document.fonts.add(face);
      uploadedFamiliesLoaded.add(cfg.family);
    } catch {
      // ignore if already registered
    }
  }
  await warmCanvasFont(cfg.family, cfg.weight, cfg.italic);
}

export async function registerUploadedFont(file: File): Promise<FontConfig> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'ttf';
  const family = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Custom Font';
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);

  const face = new FontFace(family, buffer);
  await face.load();
  document.fonts.add(face);
  uploadedFamiliesLoaded.add(family);

  return {
    enabled: true,
    source: 'upload',
    family,
    weight: 600,
    italic: false,
    fileDataBase64: base64,
    fileFormat: ext,
  };
}

export async function queryInstalledPcFonts(): Promise<{
  supported: boolean;
  fonts: string[];
  error?: string;
}> {
  const win = window as unknown as {
    queryLocalFonts?: () => Promise<Array<{ family: string; fullName: string; style: string }>>;
  };
  if (typeof win.queryLocalFonts !== 'function') {
    return {
      supported: false,
      fonts: [],
      error: 'Local Font Access API is not supported in this browser or context.',
    };
  }
  try {
    const list = await win.queryLocalFonts();
    const families = Array.from(new Set(list.map((f) => f.family))).sort((a, b) =>
      a.localeCompare(b),
    );
    return { supported: true, fonts: families };
  } catch (err) {
    return {
      supported: false,
      fonts: [],
      error: err instanceof Error ? err.message : 'Permission denied or blocked on file://',
    };
  }
}

export interface PackagedFontAsset {
  path: string;
  data: Uint8Array | string;
}

function base64ToUint8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function slugFamily(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'font';
}

/**
 * Automatically downloads or extracts the actual font files (.ttf/.otf/.woff2)
 * used in Primary & Secondary typography so the client can install them cleanly.
 */
export async function collectUsedFontFilesForZip(
  typography: TypographyConfig,
  locale: Locale,
): Promise<PackagedFontAsset[]> {
  const results: PackagedFontAsset[] = [];
  const pCfg: FontConfig = typography.skipped
    ? { enabled: true, source: 'google', family: 'Manrope', weight: 700, italic: false }
    : typography.primary;
  const sCfg: FontConfig = typography.skipped
    ? { enabled: true, source: 'google', family: 'Inter', weight: 500, italic: false }
    : typography.secondary;

  const entries: Array<{ role: string; cfg: FontConfig }> = [{ role: 'Primary', cfg: pCfg }];
  if (
    sCfg.family.toLowerCase() !== pCfg.family.toLowerCase() ||
    sCfg.weight !== pCfg.weight ||
    sCfg.italic !== pCfg.italic
  ) {
    entries.push({ role: 'Secondary', cfg: sCfg });
  }

  const readmeLines: string[] = [
    locale === 'ua' ? 'ШРИФТИ БРЕНДУ (FONTS)' : 'BRAND FONTS PACKAGE',
    '=========================',
    '',
  ];

  for (const { role, cfg } of entries) {
    const clean = cfg.family.trim();
    const safeFile = clean.replace(/[^a-zA-Z0-9_-]+/g, '_');
    const styleTag = `${cfg.weight}${cfg.italic ? '-Italic' : ''}`;
    let packaged = false;

    // 1. User-uploaded file (already in memory as base64)
    if (cfg.source === 'upload' && cfg.fileDataBase64) {
      const ext = cfg.fileFormat || 'ttf';
      results.push({
        path: `${role}_${safeFile}-${styleTag}.${ext}`,
        data: base64ToUint8(cfg.fileDataBase64),
      });
      packaged = true;
    }

    // 2. Google Fonts -> prefer real installable TTF from Fontsource CDN, fallback to Google CSS2 woff2
    if (!packaged && cfg.source === 'google') {
      const slug = slugFamily(clean);
      const styleWord = cfg.italic ? 'italic' : 'normal';
      const trySubsets = ['cyrillic', 'latin'];

      for (const subset of trySubsets) {
        const ttfUrl = `https://cdn.jsdelivr.net/fontsource/fonts/${slug}@latest/${subset}-${cfg.weight}-${styleWord}.ttf`;
        try {
          const res = await fetch(ttfUrl, { signal: AbortSignal.timeout(4500) });
          if (res.ok) {
            const buf = new Uint8Array(await res.arrayBuffer());
            if (buf.byteLength > 1000) {
              results.push({
                path: `${role}_${safeFile}-${styleTag}-${subset}.ttf`,
                data: buf,
              });
              packaged = true;
            }
          }
        } catch {
          // try next subset
        }
      }

      // Fallback: fetch Google Fonts CSS2 & extract gstatic woff2 files
      if (!packaged) {
        try {
          const enc = encodeURIComponent(clean).replace(/%20/g, '+');
          const cssUrl = `https://fonts.googleapis.com/css2?family=${enc}:wght@${cfg.weight}&display=swap`;
          const cssRes = await fetch(cssUrl, { signal: AbortSignal.timeout(4500) });
          if (cssRes.ok) {
            const cssText = await cssRes.text();
            const matches = Array.from(cssText.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g));
            const uniqueUrls = Array.from(new Set(matches.map((m) => m[1]))).slice(0, 3);
            for (let i = 0; i < uniqueUrls.length; i++) {
              const fontRes = await fetch(uniqueUrls[i], { signal: AbortSignal.timeout(4500) });
              if (fontRes.ok) {
                const buf = new Uint8Array(await fontRes.arrayBuffer());
                const ext = uniqueUrls[i].split('.').pop()?.split('?')[0] || 'woff2';
                results.push({
                  path: `${role}_${safeFile}-${styleTag}-${i + 1}.${ext}`,
                  data: buf,
                });
                packaged = true;
              }
            }
          }
        } catch {
          // offline fallback handled in README
        }
      }
    }

    // 3. PC Local fonts -> try Local Font Access API blob()
    if (!packaged && cfg.source === 'local') {
      try {
        const win = window as unknown as {
          queryLocalFonts?: () => Promise<
            Array<{ family: string; style: string; blob?: () => Promise<Blob> }>
          >;
        };
        if (typeof win.queryLocalFonts === 'function') {
          const list = await win.queryLocalFonts();
          const match = list.find((f) => f.family.toLowerCase() === clean.toLowerCase());
          if (match?.blob) {
            const b = await match.blob();
            const buf = new Uint8Array(await b.arrayBuffer());
            if (buf.byteLength > 1000) {
              results.push({
                path: `${role}_${safeFile}-${styleTag}.ttf`,
                data: buf,
              });
              packaged = true;
            }
          }
        }
      } catch {
        // permission unavailable
      }
    }

    readmeLines.push(
      `• ${role}: ${clean} (Weight ${cfg.weight}${cfg.italic ? ', Italic' : ''}) — ${
        packaged
          ? locale === 'ua'
            ? 'файл додано в цю папку'
            : 'font file included in this folder'
          : `https://fonts.google.com/specimen/${encodeURIComponent(clean)}`
      }`,
    );
  }

  readmeLines.push(
    '',
    locale === 'ua'
      ? 'Інструкція: двічі клікніть по .ttf / .otf файлу і натисніть «Встановити» (Install), щоб шрифти з’явилися у Figma, Illustrator, Canva чи Word.'
      : 'Tip: Double-click any included .ttf / .otf file and click Install to use across desktop design tools.',
  );

  results.push({
    path: 'Fonts_Install_README.txt',
    data: readmeLines.join('\n'),
  });

  return results;
}
