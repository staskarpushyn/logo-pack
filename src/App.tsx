import React, { useState } from 'react';
import { Sparkles, Check, SlidersHorizontal } from 'lucide-react';
import {
  DEFAULT_CUSTOMIZER_CONFIG,
  type AppMode,
  type BrandColor,
  type CustomizerConfig,
  type ExportConfig,
  type Locale,
  type LogoAsset,
  type TypographyConfig,
  type WizardStep,
} from './types';
import { COPY } from './i18n';
import { guessColorName, hexToCmyk } from './utils/color';
import { auditSvg, DEMO_ASSETS } from './utils/svgEngine';
import { StepAssets } from './components/StepAssets';
import { StepColors } from './components/StepColors';
import { StepTypography } from './components/StepTypography';
import { StepExport } from './components/StepExport';
import { SvgCheckerView } from './components/SvgCheckerView';
import { CustomizerPanel } from './components/CustomizerPanel';
import { DotGrid } from './components/DotGrid';

const ENABLE_CUSTOMIZER = import.meta.env.MODE === 'customizer';

const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  digital: {
    enabled: true,
    svg: true,
    png: true,
    pngSizes: [512, 1024, 2048],
    jpg: true,
    jpgSizes: [1024, 2048],
    jpgMarginPct: 10,
    disabledJpgPairs: [],
    webp: true,
    pdf: true,
    eps: false,
  },
  print: {
    enabled: true,
    eps: true,
    pdf: true,
  },
  icons: {
    enabled: true,
    sourceAssetId: 'auto',
    faviconColor: '#1F1F1F',
    faviconBg: 'transparent',
    faviconDarkColor: '#FFFFFF',
    faviconDarkBg: 'transparent',
    faviconScale: 1,
    appIconColor: '#1F1F1F',
    appIconBg: '#FFFFFF',
    appIconScale: 1,
    avatarColor: '#FFFFFF',
    avatarBg: '#1F1F1F',
    avatarScale: 1,
  },
  guide: {
    enabled: true,
    language: 'en',
    includeApplications: true,
    applicationsAssetId: 'auto',
    applicationsScale: 1,
    clearSpacePct: 12,
    clearSpaceRule: 'half_x',
    minDigitalPx: 100,
    minPrintMm: 28,
  },
  bento: {
    enabled: true,
    layout: 'logomark',
    mockups: [],
  },
};

export function App() {
  const [locale, setLocale] = useState<Locale>('ua');
  const [mode, setMode] = useState<AppMode>('generator');
  const [step, setStep] = useState<WizardStep>(1);

  const [brandName, setBrandName] = useState('');
  const [industry, setIndustry] = useState('');
  const [tagline, setTagline] = useState('');
  const [designedBy, setDesignedBy] = useState('');
  const [assets, setAssets] = useState<LogoAsset[]>([]);
  const [colors, setColors] = useState<BrandColor[]>([]);
  const [bwEditions, setBwEditions] = useState(true);
  const [keepOriginal, setKeepOriginal] = useState(true);

  const [typography, setTypography] = useState<TypographyConfig>({
    skipped: false,
    primary: { enabled: true, source: 'google', family: 'Manrope', weight: 700, italic: false },
    secondary: { enabled: true, source: 'google', family: 'Inter', weight: 500, italic: false },
  });

  const [exportConfig, setExportConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [customizer, setCustomizer] = useState<CustomizerConfig>(DEFAULT_CUSTOMIZER_CONFIG);
  const [customizerOpen, setCustomizerOpen] = useState<boolean>(ENABLE_CUSTOMIZER);

  const t = COPY[locale];

  const syncColorsFromAssets = (loadedAssets: LogoAsset[]) => {
    const seen = new Set<string>(colors.map((c) => c.hex.toUpperCase()));
    const next: BrandColor[] = [...colors];
    loadedAssets.forEach((a) => {
      a.audit.colors.forEach((hex) => {
        const up = hex.toUpperCase();
        if (!seen.has(up) && next.length < 24) {
          seen.add(up);
          next.push({
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: guessColorName(up, next.length),
            hex: up,
            cmykMode: 'auto',
            cmyk: hexToCmyk(up),
            useAsLogo: true,
            useAsBackground: true,
          });
        }
      });
    });
    setColors(next);
  };

  const handleLoadDemo = () => {
    const demoLoaded: LogoAsset[] = DEMO_ASSETS.map((d, idx) => ({
      id: `demo-${idx}`,
      name: d.name,
      role: d.role,
      svgContent: d.svg,
      audit: auditSvg(d.svg),
      sizeBytes: d.svg.length,
      sourceFormat: 'svg',
    }));
    setBrandName('ACME Studio');
    setIndustry('Design & Architecture');
    setTagline('Precision visual systems');
    setAssets(demoLoaded);
    const extracted: BrandColor[] = [];
    const seen = new Set<string>();
    demoLoaded.forEach((a) => {
      a.audit.colors.forEach((hex) => {
        const up = hex.toUpperCase();
        if (!seen.has(up)) {
          seen.add(up);
          extracted.push({
            id: `c-${extracted.length}`,
            name: guessColorName(up, extracted.length),
            hex: up,
            cmykMode: 'auto',
            cmyk: hexToCmyk(up),
            useAsLogo: true,
            useAsBackground: true,
          });
        }
      });
    });
    setColors(extracted);
    setMode('generator');
    setStep(1);
  };

  const goStep2 = () => {
    if (colors.length === 0) syncColorsFromAssets(assets);
    setStep(2);
  };

  const steps: Array<{ num: WizardStep; label: string }> = [
    { num: 1, label: t.step1 },
    { num: 2, label: t.step2 },
    { num: 3, label: t.step3 },
    { num: 4, label: t.step4 },
  ];

  const inkCount =
    (keepOriginal ? 1 : 0) +
    colors.filter((c) => c.useAsLogo).length +
    (bwEditions ? 2 : 0);
  const estDigitalPerInk =
    (exportConfig.digital.svg ? 1 : 0) +
    (exportConfig.digital.png ? exportConfig.digital.pngSizes.length : 0) +
    (exportConfig.digital.webp ? 1 : 0) +
    (exportConfig.digital.jpg ? exportConfig.digital.jpgSizes.length * 2 : 0) +
    (exportConfig.digital.pdf ? 1 : 0) +
    (exportConfig.digital.eps ? 1 : 0);
  const estPrintPerInk =
    exportConfig.print.enabled
      ? (exportConfig.print.eps ? 1 : 0) + (exportConfig.print.pdf ? 1 : 0)
      : 0;
  const estFiles =
    assets.length *
      Math.max(1, inkCount) *
      ((exportConfig.digital.enabled ? estDigitalPerInk : 0) + estPrintPerInk) +
    (exportConfig.icons.enabled ? 8 : 0) +
    (exportConfig.guide.enabled ? 1 : 0) +
    (exportConfig.bento.enabled ? 1 : 0);

  const ui = customizer.ui;
  const rootStyle = {
    '--bg-canvas': ui.canvasBg,
    '--bg-card': ui.cardBg,
    '--bg-muted': ui.mutedBg,
    '--border-stone': ui.borderColor,
    '--accent': ui.accentColor,
    '--text-ink': ui.textPrimary,
    '--text-muted': ui.textMuted,
    '--grid-dot': `rgba(26, 26, 26, ${(ui.dotOpacity / 100).toFixed(2)})`,
    '--dot-size': `${ui.dotSpacing}px`,
    '--sidebar-w': `${ui.sidebarWidth}px`,
    '--card-r': `${ui.cardRadius}px`,
    '--btn-r': `${ui.buttonRadius}px`,
    '--h-scale': String(ui.headingScale / 100),
    '--ui-font-size': `${ui.bodyFontSize}px`,
    backgroundColor: ui.canvasBg,
  } as React.CSSProperties;

  return (
    <div
      data-customizer={ENABLE_CUSTOMIZER ? 'true' : undefined}
      style={rootStyle}
      className="min-h-screen flex flex-col relative bg-[#f8f6f1]"
    >
      {/* ReactBits WebGL2 Interactive DotGrid tuned for studio canvas */}
      {ui.showDotSpotlight && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
          <DotGrid
            baseColor="#1a1a1a"
            activeColor={ui.accentColor || '#18181b'}
            shape="circle"
            dotSize={3.05}
            gap={ui.dotSpacing}
            proximity={155}
            strength={1.28}
            bounce={0.62}
            tension={0.4}
            returnDuration={0.8}
            shockRadius={340}
            shockStrength={5.5}
            swell={1.08}
            stretch={0.55}
            glow={0.34}
            fade={0}
            opacity={ui.dotOpacity <= 0 ? 0 : Math.min(1, ui.dotOpacity / 100)}
            intro={true}
          />
        </div>
      )}

      {/* Top Navigation */}
      <header
        className="sticky top-0 z-30 border-b border-[#e5e3dc]/80 backdrop-blur-md"
        style={{ backgroundColor: ENABLE_CUSTOMIZER ? `${ui.canvasBg}E6` : 'rgba(248,246,241,0.9)' }}
      >
        <div
          className="mx-auto px-5 min-h-16 py-2 flex flex-wrap items-center justify-between gap-3"
          style={{ maxWidth: `${ui.containerMaxWidth}px` }}
        >
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#fa5008] flex items-center justify-center text-white font-display font-bold text-sm shadow-2xs">
                L
              </div>
              <span className="font-display font-bold text-base tracking-tight text-[#1f1f1f]">
                logopack
                {ENABLE_CUSTOMIZER && (
                  <span className="ml-1.5 rounded bg-[#fa5008]/12 px-1.5 py-0.5 text-[10px] font-mono text-[#fa5008]">
                    BUILDER
                  </span>
                )}
              </span>
            </div>

            {ui.showNavChecker && (
              <nav className="flex items-center rounded-full border border-[#e5e3dc] bg-white p-1 text-xs font-medium shadow-2xs">
                <button
                  onClick={() => setMode('generator')}
                  className={`rounded-full px-3.5 py-1 transition ${
                    mode === 'generator'
                      ? 'bg-[#1f1f1f] text-white'
                      : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
                  }`}
                >
                  {t.navGenerator}
                </button>
                <button
                  onClick={() => setMode('checker')}
                  className={`rounded-full px-3.5 py-1 transition ${
                    mode === 'checker'
                      ? 'bg-[#1f1f1f] text-white'
                      : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
                  }`}
                >
                  {t.navChecker}
                </button>
              </nav>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            {ENABLE_CUSTOMIZER && (
              <button
                type="button"
                onClick={() => setCustomizerOpen((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 h-9 text-xs font-semibold transition border ${
                  customizerOpen
                    ? 'bg-[#fa5008] text-white border-[#fa5008]'
                    : 'bg-white text-[#1f1f1f] border-[#e5e3dc] hover:border-[#fa5008]'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                {locale === 'ua' ? 'Слайдери дизайну' : 'Customizer'}
              </button>
            )}

            <button
              onClick={handleLoadDemo}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e3dc] bg-white px-3.5 h-9 text-xs font-medium text-[#1f1f1f] shadow-2xs hover:border-[#fa5008] hover:bg-[#faf9f6] transition"
            >
              <Sparkles className="h-3.5 w-3.5 text-[#fa5008]" /> {t.loadDemo}
            </button>

            <div className="inline-flex rounded-full border border-[#e5e3dc] bg-white p-0.5 text-xs font-mono">
              {(['en', 'ua'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => {
                    setLocale(lang);
                    setExportConfig((p) => ({ ...p, guide: { ...p.guide, language: lang } }));
                  }}
                  className={`rounded-full px-2.5 py-1 uppercase transition ${
                    locale === lang ? 'bg-[#fa5008] text-white font-semibold' : 'text-[#6b6b6b]'
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main
        className={`relative z-10 mx-auto w-full flex-1 px-5 py-7 transition-[padding] ${
          ENABLE_CUSTOMIZER && customizerOpen ? 'lg:pr-[25rem]' : ''
        }`}
        style={{ maxWidth: `${ui.containerMaxWidth}px` }}
      >
        {mode === 'checker' ? (
          <div
            data-studio-surface="true"
            className="rounded-2xl border border-[#e5e3dc]/60 bg-white p-6 shadow-sm"
            style={{
              borderRadius: `${ui.cardRadius}px`,
              padding: `${ui.cardPadding}px`,
            }}
          >
            <SvgCheckerView locale={locale} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: `${ui.sectionGap}px` }}>
            {/* Stepper Pills — 100% opaque in all states so dot grid never shows through on hover */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {steps.map((s, idx) => {
                const active = step === s.num;
                const completed = step > s.num;
                const clickable = s.num === 1 || assets.length > 0;
                return (
                  <React.Fragment key={s.num}>
                    <button
                      disabled={!clickable}
                      onClick={() => clickable && setStep(s.num)}
                      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-colors shrink-0 shadow-2xs ${
                        active
                          ? 'bg-[#fa5008] border-[#fa5008] text-white'
                          : completed
                            ? 'bg-white border-[#fa5008]/40 text-[#fa5008] hover:bg-[#fff2eb] hover:border-[#fa5008]/65'
                            : 'bg-white border-[#e5e3dc] text-[#52525b] hover:bg-[#faf9f6] hover:border-[#d6d2c8] hover:text-[#1f1f1f] disabled:bg-white disabled:text-[#a1a1aa] disabled:border-[#e5e3dc] disabled:cursor-not-allowed'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          active
                            ? 'bg-white text-[#fa5008]'
                            : completed
                              ? 'bg-[#fa5008] text-white'
                              : 'bg-[#eceae5] text-[#6b6b6b]'
                        }`}
                      >
                        {completed ? <Check className="h-3 w-3" /> : s.num}
                      </span>
                      <span>{s.label}</span>
                    </button>
                    {idx < steps.length - 1 && (
                      <div className="h-px w-5 bg-[#e5e3dc] shrink-0" />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div
              className={`grid grid-cols-1 items-start ${
                ui.showSummary ? 'studio-grid-with-sidebar' : ''
              }`}
              style={{
                gap: `${ui.sectionGap}px`,
              }}
            >
              {/* Main Generator Card */}
              <div
                data-studio-surface="true"
                className="min-w-0 rounded-2xl border border-[#e5e3dc]/60 bg-white shadow-sm"
                style={{
                  borderRadius: `${ui.cardRadius}px`,
                  padding: `${ui.cardPadding}px`,
                }}
              >
                {step === 1 && (
                  <StepAssets
                    locale={locale}
                    brandName={brandName}
                    setBrandName={setBrandName}
                    industry={industry}
                    setIndustry={setIndustry}
                    tagline={tagline}
                    setTagline={setTagline}
                    designedBy={designedBy}
                    setDesignedBy={setDesignedBy}
                    assets={assets}
                    setAssets={setAssets}
                    onNext={goStep2}
                  />
                )}

                {step === 2 && (
                  <StepColors
                    locale={locale}
                    assets={assets}
                    colors={colors}
                    setColors={setColors}
                    bwEditions={bwEditions}
                    setBwEditions={setBwEditions}
                    keepOriginal={keepOriginal}
                    setKeepOriginal={setKeepOriginal}
                    onBack={() => setStep(1)}
                    onSkip={() => setStep(3)}
                    onNext={() => setStep(3)}
                  />
                )}

                {step === 3 && (
                  <StepTypography
                    locale={locale}
                    brandName={brandName}
                    tagline={tagline}
                    colors={colors}
                    typography={typography}
                    setTypography={setTypography}
                    onBack={() => setStep(2)}
                    onSkip={() => {
                      setTypography((p) => ({ ...p, skipped: true }));
                      setStep(4);
                    }}
                    onNext={() => {
                      setTypography((p) => ({ ...p, skipped: false }));
                      setStep(4);
                    }}
                  />
                )}

                {step === 4 && (
                  <StepExport
                    locale={locale}
                    brandName={brandName}
                    industry={industry}
                    tagline={tagline}
                    designedBy={designedBy}
                    assets={assets}
                    colors={colors}
                    typography={typography}
                    bwEditions={bwEditions}
                    keepOriginal={keepOriginal}
                    exportConfig={exportConfig}
                    setExportConfig={setExportConfig}
                    customizerGuide={ENABLE_CUSTOMIZER ? customizer.guide : undefined}
                    onBack={() => setStep(3)}
                  />
                )}
              </div>

              {/* Sticky SUMMARY Sidebar */}
              {ui.showSummary && (
                <aside
                  data-studio-surface="true"
                  className="lg:sticky lg:top-24 rounded-2xl border border-[#e5e3dc]/60 bg-white p-5 space-y-4 shadow-sm"
                  style={{
                    borderRadius: `${ui.cardRadius}px`,
                    padding: `${Math.max(14, ui.cardPadding - 4)}px`,
                  }}
                >
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-[#6b6b6b]">
                      Summary
                    </div>
                    <p className="text-[11px] text-[#6b6b6b]">
                      {locale === 'ua'
                        ? 'Файли обробляються локально у вашому браузері'
                        : 'Settings kept; files stay only in this open tab'}
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-0.5 p-2.5 bg-[hsl(40_16%_93%/0.4)] rounded-xl border border-[#e5e3dc]/60">
                      <span className="text-[10px] text-[#6b6b6b]">Assets</span>
                      <span className="text-xl font-bold font-mono tabular-nums text-[#fa5008]">
                        {assets.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5 bg-[hsl(40_16%_93%/0.4)] rounded-xl border border-[#e5e3dc]/60">
                      <span className="text-[10px] text-[#6b6b6b]">Colors</span>
                      <span className="text-xl font-bold font-mono tabular-nums text-[#fa5008]">
                        {colors.length}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5 p-2.5 bg-[hsl(40_16%_93%/0.4)] rounded-xl border border-[#e5e3dc]/60">
                      <span className="text-[10px] text-[#6b6b6b]">~Files</span>
                      <span className="text-xl font-bold font-mono tabular-nums text-[#1f1f1f]">
                        {estFiles}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between text-xs pt-1">
                    <span className="text-[#6b6b6b]">Brand</span>
                    <span className="font-semibold text-[#1f1f1f] truncate max-w-40">
                      {brandName || '—'}
                    </span>
                  </div>

                  {ui.showSummarySwatches && colors.length > 0 && (
                    <div className="p-3 bg-[hsl(40_16%_93%/0.4)] rounded-xl border border-[#e5e3dc]/60 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {colors.slice(0, 8).map((c) => (
                          <span
                            key={c.id}
                            title={`${c.name} (${c.hex})`}
                            className="h-4 w-4 rounded-full border border-black/15"
                            style={{ backgroundColor: c.hex }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {ui.showSummaryAssets && assets.length > 0 && (
                    <div className="border-t border-[#eceae5] pt-3 space-y-1.5">
                      {assets.slice(0, 6).map((a, i) => (
                        <div key={a.id} className="flex items-center gap-2 text-xs text-[#1f1f1f]">
                          <span className="font-mono text-[10px] text-[#6b6b6b]">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="truncate">{t.roles[a.role]}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-[#eceae5] pt-3 space-y-1.5 text-[11px] text-[#6b6b6b]">
                    <div className="flex justify-between gap-2">
                      <span>Typography</span>
                      <span className="font-mono text-[#1f1f1f] truncate max-w-36">
                        {typography.skipped ? 'Default' : `${typography.primary.family}`}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span>Package</span>
                      <span className="font-mono text-[#1f1f1f]">ZIP · PDF · Board</span>
                    </div>
                  </div>
                </aside>
              )}
            </div>
          </div>
        )}
      </main>

      {ENABLE_CUSTOMIZER && (
        <CustomizerPanel
          open={customizerOpen}
          onClose={() => setCustomizerOpen(false)}
          locale={locale}
          config={customizer}
          setConfig={setCustomizer}
        />
      )}
    </div>
  );
}

export default App;
