import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  Search,
  Upload,
  Monitor,
  Globe,
} from 'lucide-react';
import type { BrandColor, FontConfig, FontSource, Locale, TypographyConfig } from '../types';
import { COPY } from '../i18n';
import { relativeLuminance } from '../utils/color';
import {
  ensureConfigFontLoaded,
  ensureGoogleFontLoaded,
  fetchAllGoogleFontsCatalog,
  GOOGLE_FONTS_CATALOG,
  type GoogleFontMeta,
  queryInstalledPcFonts,
  registerUploadedFont,
} from '../utils/fontLoader';
import { ToggleSwitch } from './ToggleSwitch';

interface StepTypographyProps {
  locale: Locale;
  brandName: string;
  tagline: string;
  colors: BrandColor[];
  typography: TypographyConfig;
  setTypography: React.Dispatch<React.SetStateAction<TypographyConfig>>;
  onBack: () => void;
  onSkip: () => void;
  onNext: () => void;
}

const WEIGHTS = [300, 400, 500, 600, 700, 800];

const HorizontalFontCard: React.FC<{
  roleKind: 'primary' | 'secondary';
  title: string;
  locale: Locale;
  brandName: string;
  tagline: string;
  previewBg: string;
  previewFg: string;
  config: FontConfig;
  onChange: (next: FontConfig) => void;
  googleCatalog: GoogleFontMeta[];
  pcFonts: string[];
  pcStatus: string;
  onScanPcFonts: () => void;
}> = ({
  roleKind,
  title,
  locale,
  brandName,
  tagline,
  previewBg,
  previewFg,
  config,
  onChange,
  googleCatalog,
  pcFonts,
  pcStatus,
  onScanPcFonts,
}) => {
  const t = COPY[locale];
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | 'sans' | 'serif' | 'display' | 'mono'>('all');
  const [onlyCyrillic, setOnlyCyrillic] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ensureConfigFontLoaded(config);
  }, [config]);

  const setSource = (source: FontSource) => onChange({ ...config, source });

  const filteredGoogle = googleCatalog.filter((f) => {
    if (onlyCyrillic && !f.cyrillic) return false;
    if (catFilter !== 'all' && f.category !== catFilter) return false;
    if (query.trim() && !f.family.toLowerCase().includes(query.trim().toLowerCase())) return false;
    return true;
  });
  const visibleGoogle = filteredGoogle.slice(0, 120);
  const activeMeta = googleCatalog.find(
    (f) => f.family.toLowerCase() === config.family.toLowerCase(),
  );
  const filteredPc = pcFonts.filter((f) => f.toLowerCase().includes(query.toLowerCase()));

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    const loaded = await registerUploadedFont(file);
    onChange(loaded);
  };

  return (
    <div className="rounded-2xl border border-[#e5e3dc] bg-white p-5 space-y-4 shadow-2xs">
      {/* Header row locked single-line on desktop so long font names never wrap source tabs */}
      <div className="flex flex-col sm:flex-row sm:flex-nowrap sm:items-center justify-between gap-2.5 pb-3 border-b border-[#eceae5]">
        <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
          <h3 className="text-sm font-semibold text-[#1f1f1f] shrink-0 whitespace-nowrap">{title}</h3>
          <span
            title={`${config.family} · ${config.weight}${config.italic ? ' Italic' : ''}`}
            className="rounded-full bg-[hsl(40_16%_93%/0.6)] border border-[#e5e3dc] px-2.5 py-0.5 text-[11px] font-mono text-[#1f1f1f] truncate min-w-0"
          >
            {config.family} · {config.weight}
            {config.italic ? ' Italic' : ''}
          </span>
        </div>

        <div className="inline-flex shrink-0 rounded-lg bg-[hsl(40_16%_93%/0.55)] p-0.5 border border-[#e5e3dc]/80 text-[11px] font-medium gap-0.5">
          <button
            type="button"
            onClick={() => setSource('google')}
            className={`inline-flex items-center gap-1 rounded-md py-1.5 px-2.5 whitespace-nowrap transition ${
              config.source === 'google'
                ? 'bg-white text-[#1f1f1f] shadow-2xs'
                : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
            }`}
          >
            <Globe className="h-3.5 w-3.5 shrink-0" />
            <span>{t.sourceGoogle}</span>
          </button>
          <button
            type="button"
            onClick={() => setSource('local')}
            className={`inline-flex items-center gap-1 rounded-md py-1.5 px-2.5 whitespace-nowrap transition ${
              config.source === 'local'
                ? 'bg-white text-[#1f1f1f] shadow-2xs'
                : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
            }`}
          >
            <Monitor className="h-3.5 w-3.5 shrink-0" />
            <span>{t.sourceLocal}</span>
          </button>
          <button
            type="button"
            onClick={() => setSource('upload')}
            className={`inline-flex items-center gap-1 rounded-md py-1.5 px-2.5 whitespace-nowrap transition ${
              config.source === 'upload'
                ? 'bg-white text-[#1f1f1f] shadow-2xs'
                : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
            }`}
          >
            <Upload className="h-3.5 w-3.5 shrink-0" />
            <span>{t.sourceUpload}</span>
          </button>
        </div>
      </div>

      {/* Horizontal Body: Left Picker (7 cols) + Right Live Specimen & Weight (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Search, Filter & List */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-2.5">
          {config.source === 'google' && (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#6b6b6b]" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={`${t.searchFonts} (${googleCatalog.length})`}
                  className="w-full h-9 rounded-lg border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] pl-8 pr-3 text-xs focus:border-[#fa5008] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono">
                <div className="flex flex-wrap gap-1">
                  {(['all', 'sans', 'serif', 'display', 'mono'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCatFilter(cat)}
                      className={`rounded-md px-2 py-0.5 uppercase transition ${
                        catFilter === cat
                          ? 'bg-[#1f1f1f] text-white'
                          : 'bg-[hsl(40_16%_93%/0.55)] text-[#6b6b6b] hover:text-[#1f1f1f]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setOnlyCyrillic((v) => !v)}
                  className={`rounded-md px-2 py-0.5 uppercase transition ${
                    onlyCyrillic
                      ? 'bg-[#fa5008] text-white font-semibold'
                      : 'bg-[hsl(40_16%_93%/0.55)] text-[#6b6b6b] border border-[#e5e3dc]'
                  }`}
                  title="Filter fonts supporting Cyrillic"
                >
                  CYR
                </button>
              </div>

              <div className="h-44 overflow-y-auto rounded-xl border border-[#e5e3dc] divide-y divide-[#eceae5]">
                {visibleGoogle.map((gf) => (
                  <button
                    key={gf.family}
                    type="button"
                    onMouseEnter={() => ensureGoogleFontLoaded(gf.family, gf.weights)}
                    onClick={() => {
                      ensureGoogleFontLoaded(gf.family, gf.weights);
                      const w = gf.weights.includes(config.weight)
                        ? config.weight
                        : gf.weights[gf.weights.length - 1] ?? 400;
                      onChange({ ...config, family: gf.family, weight: w });
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-[hsl(40_16%_93%/0.4)] ${
                      config.family === gf.family ? 'bg-[#fa5008]/10 font-semibold text-[#fa5008]' : ''
                    }`}
                  >
                    <span style={{ fontFamily: `"${gf.family}", sans-serif` }}>{gf.family}</span>
                    <span className="flex items-center gap-1.5 text-[10px] font-mono text-[#6b6b6b] uppercase">
                      {gf.cyrillic && (
                        <span className="rounded bg-[#eceae5] px-1.5 py-0.5 text-[9px]">CYR</span>
                      )}
                      {gf.category}
                    </span>
                  </button>
                ))}
                {filteredGoogle.length > visibleGoogle.length && (
                  <div className="px-3 py-1.5 text-[10px] font-mono text-[#6b6b6b] bg-[#f8f6f1] text-center">
                    Showing {visibleGoogle.length} of {filteredGoogle.length} fonts — type to narrow search
                  </div>
                )}
              </div>
            </>
          )}

          {config.source === 'local' && (
            <div className="space-y-2.5 flex-1 flex flex-col">
              <button
                type="button"
                onClick={onScanPcFonts}
                className="w-full h-9 rounded-lg border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] text-xs font-medium text-[#1f1f1f] hover:border-[#fa5008] transition"
              >
                {t.loadLocalFonts}
              </button>
              <p className="text-[11px] text-[#6b6b6b] leading-relaxed">{t.localFontsHint}</p>
              {pcStatus && <p className="text-[11px] font-mono text-amber-700">{pcStatus}</p>}
              {pcFonts.length > 0 && (
                <>
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t.searchFonts}
                    className="w-full h-9 rounded-lg border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] px-3 text-xs focus:border-[#fa5008] focus:outline-none"
                  />
                  <div className="max-h-36 overflow-y-auto rounded-xl border border-[#e5e3dc] divide-y divide-[#eceae5]">
                    {filteredPc.slice(0, 120).map((fam) => (
                      <button
                        key={fam}
                        type="button"
                        onClick={() => onChange({ ...config, family: fam })}
                        className={`w-full px-3 py-1.5 text-left text-xs hover:bg-[#f8f6f1] ${
                          config.family === fam ? 'bg-[#fa5008]/10 font-semibold text-[#fa5008]' : ''
                        }`}
                      >
                        {fam}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {config.source === 'upload' && (
            <div
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  fileRef.current?.click();
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files[0]);
              }}
              onClick={() => fileRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center cursor-pointer rounded-xl border-2 border-dashed border-[#d6d2c8] bg-[hsl(40_16%_93%/0.4)] p-6 text-center hover:border-[#fa5008] hover:bg-white transition"
            >
              <input
                ref={fileRef}
                type="file"
                accept=".ttf,.otf,.woff,.woff2"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              <Upload className="h-5 w-5 text-[#6b6b6b] mb-2" />
              <p className="text-xs font-medium text-[#1f1f1f]">{t.dropFont}</p>
            </div>
          )}
        </div>

        {/* Right: Integrated Live Specimen + Weight & Italic */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3">
          <div
            className="flex-1 rounded-xl p-4 flex flex-col justify-between min-h-44 border border-[#e5e3dc]"
            style={{ backgroundColor: previewBg, color: previewFg }}
          >
            <div className="text-[10px] opacity-70 font-mono uppercase tracking-wider">
              {config.family} · {config.weight}
              {config.italic ? ' Italic' : ''}
            </div>

            {roleKind === 'primary' ? (
              <div
                className="my-2 text-2xl sm:text-3xl leading-tight break-words"
                style={{
                  fontFamily: `"${config.family}", sans-serif`,
                  fontWeight: config.weight,
                  fontStyle: config.italic ? 'italic' : 'normal',
                }}
              >
                {brandName || 'Brand Headline'}
              </div>
            ) : (
              <div
                className="my-2 text-lg sm:text-xl leading-snug break-words"
                style={{
                  fontFamily: `"${config.family}", sans-serif`,
                  fontWeight: config.weight,
                  fontStyle: config.italic ? 'italic' : 'normal',
                }}
              >
                {tagline || 'Modern visual identity system & clear guidelines.'}
              </div>
            )}

            <div
              className="text-[11px] opacity-75 tracking-wide"
              style={{
                fontFamily: `"${config.family}", sans-serif`,
                fontWeight: config.weight,
                fontStyle: config.italic ? 'italic' : 'normal',
              }}
            >
              {locale === 'ua'
                ? 'Аа Бб Вв Гг Ґґ · Aa Bb · 0123456789'
                : 'Aa Bb Cc Dd Ee · 0123456789'}
            </div>
          </div>

          {/* Weight + Italic strip */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="text-[11px] text-[#6b6b6b] mr-1">{t.weightLabel}:</span>
              {WEIGHTS.map((w) => {
                const supported = !activeMeta || activeMeta.weights.includes(w);
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onChange({ ...config, weight: w })}
                    title={supported ? `Weight ${w}` : `Weight ${w} (synthetic if unavailable)`}
                    className={`rounded-md px-2 py-1 text-[11px] font-mono transition ${
                      config.weight === w
                        ? 'bg-[#1f1f1f] text-white'
                        : supported
                          ? 'bg-[hsl(40_16%_93%/0.6)] text-[#6b6b6b] hover:bg-[#eceae5]'
                          : 'bg-[#f8f6f1]/50 text-[#a1a1aa] hover:bg-[#eceae5]'
                    }`}
                  >
                    {w}
                  </button>
                );
              })}
            </div>
            <ToggleSwitch
              size="xs"
              labelPosition="right"
              checked={config.italic}
              onChange={(v) => onChange({ ...config, italic: v })}
              label={t.italicLabel}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const StepTypography: React.FC<StepTypographyProps> = ({
  locale,
  brandName,
  tagline,
  colors,
  typography,
  setTypography,
  onBack,
  onSkip,
  onNext,
}) => {
  const t = COPY[locale];
  const [googleCatalog, setGoogleCatalog] = useState<GoogleFontMeta[]>(GOOGLE_FONTS_CATALOG);
  const [pcFonts, setPcFonts] = useState<string[]>([]);
  const [pcStatus, setPcStatus] = useState<string>('');

  useEffect(() => {
    let active = true;
    fetchAllGoogleFontsCatalog().then((full) => {
      if (active) setGoogleCatalog(full);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleScanPc = async () => {
    const res = await queryInstalledPcFonts();
    if (res.supported) {
      setPcFonts(res.fonts);
      setPcStatus('');
    } else {
      setPcStatus(res.error || 'Unavailable in this context.');
    }
  };

  const darkHex =
    [...colors].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex))[0]?.hex ??
    '#1F1F1F';
  const accentHex = colors.find((c) => c.hex !== darkHex)?.hex ?? '#FA5008';
  const accentFg = relativeLuminance(accentHex) > 0.55 ? '#1F1F1F' : '#FFFFFF';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f]">
          {locale === 'ua' ? (
            <>
              Типографіка <span className="italic font-normal">бренду</span>
            </>
          ) : (
            <>
              Brand <span className="italic font-normal">typography</span>
            </>
          )}
        </h1>
        <p className="mt-1.5 text-sm text-[#6b6b6b]">{t.typoSubtitle}</p>
      </div>

      {/* Horizontal Stacked Typography Cards (Screenshot 8 fix!) */}
      <div className="space-y-5">
        <HorizontalFontCard
          roleKind="primary"
          title={t.primaryFont}
          locale={locale}
          brandName={brandName}
          tagline={tagline}
          previewBg={darkHex}
          previewFg="#FFFFFF"
          config={typography.primary}
          onChange={(primary) => setTypography((prev) => ({ ...prev, skipped: false, primary }))}
          googleCatalog={googleCatalog}
          pcFonts={pcFonts}
          pcStatus={pcStatus}
          onScanPcFonts={handleScanPc}
        />
        <HorizontalFontCard
          roleKind="secondary"
          title={t.secondaryFont}
          locale={locale}
          brandName={brandName}
          tagline={tagline}
          previewBg={accentHex}
          previewFg={accentFg}
          config={typography.secondary}
          onChange={(secondary) =>
            setTypography((prev) => ({ ...prev, skipped: false, secondary }))
          }
          googleCatalog={googleCatalog}
          pcFonts={pcFonts}
          pcStatus={pcStatus}
          onScanPcFonts={handleScanPc}
        />
      </div>

      <div className="rounded-xl border border-[#e5e3dc] bg-[#faf9f6] px-4 py-2.5 text-[11px] text-[#8e8e8e]">
        {locale === 'ua'
          ? 'Вибрані Google-шрифти та завантажені файли автоматично пакуються у папку 07_Fonts/ фінального архіву.'
          : 'Selected Google Fonts and uploaded font files are automatically packaged in 07_Fonts/.'}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#e5e3dc] bg-white h-11 px-6 text-sm font-medium text-[#1f1f1f] shadow-2xs hover:bg-[#f8f6f1] transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={onSkip}
            className="inline-flex items-center gap-1.5 rounded-full px-4 h-11 text-sm font-medium text-[#6b6b6b] hover:text-[#1f1f1f] transition"
          >
            <SkipForward className="h-4 w-4" /> {t.skip}
          </button>
          <button
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-full bg-[#fa5008] h-11 px-8 text-sm font-semibold text-white shadow-sm hover:bg-[#e04505]"
          >
            {t.next} <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
