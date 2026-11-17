import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  File as FileIcon,
  Folder,
  Globe,
  GripVertical,
  Image as ImageIcon,
  LayoutGrid,
  Monitor,
  Palette,
  Plus,
  Printer,
  Settings2,
  SlidersHorizontal,
  Trash2,
  AlertTriangle,
  X,
} from 'lucide-react';
import type {
  BoardBlockId,
  BoardBlockItem,
  BoardLayoutPreset,
  BrandColor,
  CustomizerConfig,
  ExportConfig,
  Locale,
  LogoAsset,
  MockupImage,
  TypographyConfig,
} from '../types';
import { COPY } from '../i18n';
import { getPresetBoardBlocks, renderBentoBoardBlob, renderBentoBoardCanvas } from '../utils/bentoBoard';
import {
  MockupKind,
  renderMockupSpreadDataUrl,
  resolveThreeMockupSurfaces,
} from '../utils/brandMockups';
import { contrastRatio } from '../utils/color';
import { buildBrandGuidePdf } from '../utils/pdfGuide';
import { recolorSvg } from '../utils/svgEngine';
import { buildFullZipPack } from '../utils/zipExporter';
import { ToggleSwitch } from './ToggleSwitch';

interface StepExportProps {
  locale: Locale;
  brandName: string;
  industry: string;
  tagline: string;
  designedBy?: string;
  assets: LogoAsset[];
  colors: BrandColor[];
  typography: TypographyConfig;
  bwEditions: boolean;
  keepOriginal: boolean;
  exportConfig: ExportConfig;
  setExportConfig: React.Dispatch<React.SetStateAction<ExportConfig>>;
  customizerGuide?: CustomizerConfig['guide'];
  onBack: () => void;
}

const PRESET_SIZES = [512, 1024, 2048, 4096];

const CLEAR_SPACE_META: Record<
  'half_x' | 'third_x' | 'two_thirds_x' | 'diagonal',
  { label: string; factor: number; descEn: string; descUa: string }
> = {
  half_x: { label: '1/2x', factor: 0.34, descEn: 'Balanced (50% of height)', descUa: 'Збалансоване (50% висоти)' },
  third_x: { label: '1/3x', factor: 0.22, descEn: 'Compact (33% of height)', descUa: 'Компактне (33% висоти)' },
  two_thirds_x: { label: '2/3x', factor: 0.44, descEn: 'Generous (66% of height)', descUa: 'Широке (66% висоти)' },
  diagonal: { label: '1/2c', factor: 0.38, descEn: 'Diagonal proportion', descUa: 'За діагоналлю лого' },
};

function triggerDotPulse() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('logopack:dot-pulse'));
  }
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function slugify(str: string): string {
  return (
    str
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'brand'
  );
}

const SquareCheck: React.FC<{ checked: boolean; onChange: () => void; label: string }> = ({
  checked,
  onChange,
  label,
}) => (
  <button
    type="button"
    onClick={onChange}
    className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1f1f1f] hover:text-[#fa5008] transition"
  >
    <span
      className={`h-4 w-4 rounded flex items-center justify-center border transition ${
        checked
          ? 'bg-[#fa5008] border-[#fa5008] text-white'
          : 'bg-white border-[#d6d2c8] text-transparent'
      }`}
    >
      <Check className="h-3 w-3 stroke-[3]" />
    </span>
    <span>{label}</span>
  </button>
);

const SwatchPickerRow: React.FC<{
  title: string;
  value: string;
  allowTransparent?: boolean;
  brandColors: BrandColor[];
  onChange: (hex: string) => void;
}> = ({ title, value, allowTransparent, brandColors, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const presets = ['#FFFFFF', '#1F1F1F', ...brandColors.map((c) => c.hex.toUpperCase())].filter(
    (v, i, arr) => arr.indexOf(v) === i,
  );

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-medium text-[#1f1f1f]">{title}</div>
      <div className="flex flex-wrap items-center gap-1.5">
        {allowTransparent && (
          <button
            type="button"
            onClick={() => onChange('transparent')}
            title="Transparent"
            className={`checkerboard-bg h-7 w-7 rounded-lg border-2 transition ${
              value === 'transparent' ? 'border-[#fa5008] ring-2 ring-[#fa5008]/25' : 'border-[#e5e3dc]'
            }`}
          />
        )}
        {presets.slice(0, 7).map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => onChange(hex)}
            title={hex}
            className={`h-7 w-7 rounded-lg border-2 transition ${
              value.toUpperCase() === hex
                ? 'border-[#fa5008] ring-2 ring-[#fa5008]/25'
                : 'border-[#e5e3dc]'
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Custom color"
          className="h-7 w-7 rounded-lg border border-dashed border-[#c7c2b8] bg-white text-[#6b6b6b] hover:border-[#fa5008] hover:text-[#fa5008] flex items-center justify-center"
        >
          <Plus className="h-3.5 w-3.5" />
          <input
            ref={inputRef}
            type="color"
            value={value === 'transparent' ? '#FFFFFF' : value}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="sr-only"
          />
        </button>
      </div>
      {value === 'transparent' && (
        <div className="text-[10px] text-[#6b6b6b]">Transparent</div>
      )}
    </div>
  );
};

export const StepExport: React.FC<StepExportProps> = ({
  locale,
  brandName,
  industry,
  tagline,
  designedBy,
  assets,
  colors,
  typography,
  bwEditions,
  keepOriginal,
  exportConfig,
  setExportConfig,
  customizerGuide,
  onBack,
}) => {
  const t = COPY[locale];
  const mockupRef = useRef<HTMLInputElement>(null);

  // All accordions & ZIP folder structure start collapsed by default (Screenshots 3 & 7)
  const [openDigital, setOpenDigital] = useState(false);
  const [openPrint, setOpenPrint] = useState(false);
  const [openIcons, setOpenIcons] = useState(false);
  const [openGuide, setOpenGuide] = useState(false);
  const [openApps, setOpenApps] = useState(false);
  const [openBento, setOpenBento] = useState(false);
  const [showZipTree, setShowZipTree] = useState(false);
  const [expandedZipDirs, setExpandedZipDirs] = useState<Record<string, boolean>>({});

  const toggleZipDir = (key: string) =>
    setExpandedZipDirs((prev) => ({ ...prev, [key]: !prev[key] }));

  const [sizePopover, setSizePopover] = useState<'png' | 'jpg' | null>(null);
  const [customWidthInput, setCustomWidthInput] = useState('');
  const [showMatrix, setShowMatrix] = useState(false);
  const [iconModal, setIconModal] = useState<'favicon' | 'appIcon' | 'avatar' | null>(null);
  const [dragBoardIdx, setDragBoardIdx] = useState<number | null>(null);

  const currentBoardLayout: BoardLayoutPreset = exportConfig.bento.layout ?? 'logomark';
  const boardBlocks: BoardBlockItem[] = useMemo(() => {
    if (exportConfig.bento.blocks && exportConfig.bento.blocks.length > 0) {
      return exportConfig.bento.blocks;
    }
    return getPresetBoardBlocks(currentBoardLayout);
  }, [exportConfig.bento.blocks, currentBoardLayout]);

  const [bentoPreviewUrl, setBentoPreviewUrl] = useState<string>('');
  const [mockupPreviewKind, setMockupPreviewKind] = useState<MockupKind>('tote');
  const [mockupPreviewUrl, setMockupPreviewUrl] = useState<string>('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('');
  const [busyLabel, setBusyLabel] = useState<string>('');
  const [progress, setProgress] = useState<number>(0);
  const [exportError, setExportError] = useState<string>('');

  const primaryAsset = assets.find((a) => a.role === 'primary') ?? assets[0];
  const markAsset = assets.find((a) => a.role === 'mark') ?? primaryAsset;

  const iconSourceAsset =
    (exportConfig.icons.sourceAssetId !== 'auto'
      ? assets.find((a) => a.id === exportConfig.icons.sourceAssetId)
      : assets.find((a) => a.role === 'mark') ?? assets[0]) ?? assets[0];

  useEffect(() => {
    let cancelled = false;
    if (!exportConfig.bento.enabled) return;
    renderBentoBoardCanvas({
      brandName,
      tagline,
      designedBy,
      layout: currentBoardLayout,
      blocks: boardBlocks,
      assets,
      colors,
      typography,
      mockups: exportConfig.bento.mockups,
      guideStyle: customizerGuide,
    }).then((canvas) => {
      if (!cancelled) setBentoPreviewUrl(canvas.toDataURL('image/png'));
    });
    return () => {
      cancelled = true;
    };
  }, [
    brandName,
    tagline,
    designedBy,
    currentBoardLayout,
    boardBlocks,
    assets,
    colors,
    typography,
    exportConfig.bento.enabled,
    exportConfig.bento.mockups,
    customizerGuide,
  ]);

  useEffect(() => {
    let cancelled = false;
    if (!exportConfig.guide.includeApplications || assets.length === 0) return;
    const appSourceId = exportConfig.guide.applicationsAssetId ?? 'auto';
    const appAsset =
      (appSourceId !== 'auto' ? assets.find((a) => a.id === appSourceId) : undefined) ??
      primaryAsset;
    const surfaces = resolveThreeMockupSurfaces(colors, assets, locale, appSourceId);
    const ratio = appAsset ? appAsset.audit.aspectRatio : 2;
    const scale = exportConfig.guide.applicationsScale ?? 1;
    renderMockupSpreadDataUrl(mockupPreviewKind, surfaces, ratio, 'image/png', scale).then((url) => {
      if (!cancelled) setMockupPreviewUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [
    colors,
    assets,
    locale,
    mockupPreviewKind,
    exportConfig.guide.includeApplications,
    exportConfig.guide.applicationsAssetId,
    exportConfig.guide.applicationsScale,
    primaryAsset,
  ]);

  // Revoke PDF preview object URL on cleanup
  useEffect(() => {
    return () => {
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    };
  }, [pdfPreviewUrl]);

  const handleMockups = async (files: FileList | null) => {
    if (!files) return;
    const added: MockupImage[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (exportConfig.bento.mockups.length + added.length >= 2) break;
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(file);
      });
      const dims = await new Promise<{ w: number; h: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ w: img.width, h: img.height });
        img.src = dataUrl;
      });
      added.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: file.name,
        dataUrl,
        width: dims.w,
        height: dims.h,
      });
    }
    if (added.length) {
      setExportConfig((prev) => ({
        ...prev,
        bento: { ...prev.bento, mockups: [...prev.bento.mockups, ...added] },
      }));
    }
  };

  const toggleSize = (key: 'pngSizes' | 'jpgSizes', size: number) => {
    setExportConfig((prev) => {
      const cur = prev.digital[key];
      const next = cur.includes(size) ? cur.filter((s) => s !== size) : [...cur, size].sort((a, b) => a - b);
      return {
        ...prev,
        digital: { ...prev.digital, [key]: next.length ? next : [size] },
      };
    });
  };

  const addCustomSize = (key: 'pngSizes' | 'jpgSizes') => {
    const val = Math.round(Number(customWidthInput));
    if (!Number.isFinite(val) || val < 16 || val > 8192) return;
    setExportConfig((prev) => {
      const cur = prev.digital[key];
      const next = cur.includes(val) ? cur : [...cur, val].sort((a, b) => a - b);
      return {
        ...prev,
        digital: { ...prev.digital, [key]: next },
      };
    });
    setCustomWidthInput('');
  };

  const handleDownloadZip = async () => {
    setExportError('');
    setBusyLabel(t.generating);
    setProgress(5);
    try {
      const blob = await buildFullZipPack({
        brandName: brandName || 'brand',
        industry,
        tagline,
        designedBy,
        assets,
        colors,
        typography,
        bwEditions,
        keepOriginal,
        exportConfig,
        customizerGuide,
        onProgress: (pct, lbl) => {
          setProgress(pct);
          setBusyLabel(lbl);
        },
      });
      triggerDownload(blob, `${slugify(brandName)}-logopack.zip`);
      triggerDotPulse();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'ZIP export failed');
    } finally {
      setBusyLabel('');
      setProgress(0);
    }
  };

  const handleDownloadBento = async () => {
    setExportError('');
    setBusyLabel(locale === 'ua' ? 'Рендерю дошку бренду...' : 'Rendering Brand Board PNG...');
    try {
      const blob = await renderBentoBoardBlob({
        brandName,
        tagline,
        designedBy,
        layout: currentBoardLayout,
        blocks: boardBlocks,
        assets,
        colors,
        typography,
        mockups: exportConfig.bento.mockups,
        guideStyle: customizerGuide,
      });
      triggerDownload(blob, `${slugify(brandName)}-brand-board.png`);
      triggerDotPulse();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Brand Board export failed');
    } finally {
      setBusyLabel('');
    }
  };

  const buildPdfBlob = () =>
    buildBrandGuidePdf({
      brandName,
      industry,
      tagline,
      designedBy,
      language: exportConfig.guide.language,
      assets,
      colors,
      typography,
      clearSpacePct: exportConfig.guide.clearSpacePct,
      clearSpaceRule: exportConfig.guide.clearSpaceRule,
      minDigitalPx: exportConfig.guide.minDigitalPx,
      minPrintMm: exportConfig.guide.minPrintMm,
      includeApplications: exportConfig.guide.includeApplications,
      applicationsAssetId: exportConfig.guide.applicationsAssetId,
      applicationsScale: exportConfig.guide.applicationsScale,
      boardLayout: currentBoardLayout,
      boardBlocks,
      mockups: exportConfig.bento.mockups,
      customizer: customizerGuide,
    });

  const handlePreviewGuide = async () => {
    setExportError('');
    setBusyLabel(locale === 'ua' ? 'Готую прев’ю PDF...' : 'Preparing PDF preview...');
    try {
      const blob = await buildPdfBlob();
      if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
      setPdfPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PDF preview failed');
    } finally {
      setBusyLabel('');
    }
  };

  const handleDownloadGuide = async () => {
    setExportError('');
    setBusyLabel(locale === 'ua' ? 'Формую PDF Гайд...' : 'Building PDF Guide...');
    try {
      const blob = await buildPdfBlob();
      triggerDownload(blob, `${slugify(brandName)}-logo-guide-${exportConfig.guide.language}.pdf`);
      triggerDotPulse();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'PDF export failed');
    } finally {
      setBusyLabel('');
    }
  };

  // Deduplicated, uniquely-keyed JPG Contrast Matrix combinations
  const { inksList, bgsList, matrixPairs } = useMemo(() => {
    const inks: Array<{ id: string; label: string; slug: string; hex: string }> = [];
    if (keepOriginal && colors[0]) {
      inks.push({
        id: 'orig',
        label: 'Original',
        slug: 'original',
        hex: colors[0].hex.toUpperCase(),
      });
    }
    for (const c of colors) {
      if (c.useAsLogo) {
        inks.push({ id: c.id, label: c.name, slug: slugify(c.name), hex: c.hex.toUpperCase() });
      }
    }
    if (bwEditions) {
      inks.push({ id: 'bw-black', label: 'Black', slug: 'black', hex: '#000000' });
      inks.push({ id: 'bw-white', label: 'White', slug: 'white', hex: '#FFFFFF' });
    }

    const bgs: Array<{ id: string; label: string; slug: string; hex: string }> = [
      { id: 'bg-white', label: 'White', slug: 'white', hex: '#FFFFFF' },
    ];
    const seenBg = new Set<string>(['#FFFFFF']);
    for (const c of colors) {
      if (!c.useAsBackground) continue;
      const up = c.hex.toUpperCase();
      if (seenBg.has(up)) continue;
      seenBg.add(up);
      bgs.push({ id: c.id, label: c.name, slug: slugify(c.name), hex: up });
    }

    const pairs: Array<{
      pairKey: string;
      inkLabel: string;
      bgLabel: string;
      inkHex: string;
      bgHex: string;
      ratio: number;
    }> = [];
    for (const ink of inks) {
      for (const bg of bgs) {
        const ratio = contrastRatio(ink.hex, bg.hex);
        if (ratio < 1.35) continue;
        pairs.push({
          pairKey: `${ink.id}__${bg.hex}`,
          inkLabel: ink.label,
          bgLabel: bg.label,
          inkHex: ink.hex,
          bgHex: bg.hex,
          ratio,
        });
      }
    }
    return { inksList: inks, bgsList: bgs, matrixPairs: pairs };
  }, [colors, keepOriginal, bwEditions]);

  const isJpgPairEnabled = (pairKey: string, ratio: number) => {
    const override = exportConfig.digital.manualJpgOverrides?.[pairKey];
    if (override !== undefined) return override;
    if (exportConfig.digital.disabledJpgPairs.includes(pairKey)) return false;
    return ratio >= 3;
  };

  const previewMarkSvg = markAsset ? markAsset.svgContent : primaryAsset?.svgContent ?? '';

  const csMeta = CLEAR_SPACE_META[exportConfig.guide.clearSpaceRule];
  const slug = slugify(brandName);

  const allPngWidths = Array.from(new Set([...PRESET_SIZES, ...exportConfig.digital.pngSizes])).sort(
    (a, b) => a - b,
  );
  const allJpgWidths = Array.from(new Set([...PRESET_SIZES, ...exportConfig.digital.jpgSizes])).sort(
    (a, b) => a - b,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f]">
          {locale === 'ua' ? (
            <>
              Готово до <span className="italic font-normal">генерації</span>
            </>
          ) : (
            <>
              Ready to <span className="italic font-normal">generate</span>
            </>
          )}
        </h1>
        <p className="mt-1 text-sm text-[#6b6b6b]">{t.exportSubtitle}</p>
      </div>

      {/* Stacked Horizontal Export Format Rows (matching Screenshot 4 & 5) */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs font-semibold text-[#1f1f1f]">
          <span>{locale === 'ua' ? 'Формати експорту' : 'Export formats'}</span>
          <span className="text-[11px] font-normal text-[#8e8e8e]">
            {locale === 'ua'
              ? 'Оберіть файли та параметри, які увійдуть до архіву'
              : 'Choose which file formats to include in the ZIP.'}
          </span>
        </div>

        {/* 1. Digital / RGB */}
        <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs relative">
          <div
            onClick={() => setOpenDigital((v) => !v)}
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#f8f6f1]/50 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <ToggleSwitch
                size="sm"
                checked={exportConfig.digital.enabled}
                onChange={(v) =>
                  setExportConfig((p) => ({ ...p, digital: { ...p.digital, enabled: v } }))
                }
              />
              <Monitor className="h-4 w-4 text-[#6b6b6b]" />
              <span className="text-sm font-semibold text-[#1f1f1f]">{t.digitalRgb}</span>
            </div>
            {openDigital ? (
              <ChevronUp className="h-4 w-4 text-[#6b6b6b]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
            )}
          </div>

          {openDigital && (
            <div className="px-4 pb-4 pt-2 border-t border-[#eceae5] space-y-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
                <SquareCheck
                  checked={exportConfig.digital.svg}
                  label="SVG"
                  onChange={() =>
                    setExportConfig((p) => ({
                      ...p,
                      digital: { ...p.digital, svg: !p.digital.svg },
                    }))
                  }
                />

                <div className="inline-flex items-center gap-1 relative">
                  <SquareCheck
                    checked={exportConfig.digital.png}
                    label="PNG"
                    onChange={() =>
                      setExportConfig((p) => ({
                        ...p,
                        digital: { ...p.digital, png: !p.digital.png },
                      }))
                    }
                  />
                  {exportConfig.digital.png && (
                    <button
                      type="button"
                      onClick={() => setSizePopover((cur) => (cur === 'png' ? null : 'png'))}
                      title="PNG export sizes & custom width"
                      className={`rounded p-1 transition ${
                        sizePopover === 'png'
                          ? 'bg-[#fa5008]/15 text-[#fa5008]'
                          : 'text-[#6b6b6b] hover:bg-[#eceae5]'
                      }`}
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="inline-flex items-center gap-1 relative">
                  <SquareCheck
                    checked={exportConfig.digital.jpg}
                    label="JPG"
                    onChange={() =>
                      setExportConfig((p) => ({
                        ...p,
                        digital: { ...p.digital, jpg: !p.digital.jpg },
                      }))
                    }
                  />
                  {exportConfig.digital.jpg && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSizePopover((cur) => (cur === 'jpg' ? null : 'jpg'))}
                        title="JPG sizes & Margin %"
                        className={`rounded p-1 transition ${
                          sizePopover === 'jpg'
                            ? 'bg-[#fa5008]/15 text-[#fa5008]'
                            : 'text-[#6b6b6b] hover:bg-[#eceae5]'
                        }`}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMatrix((v) => !v)}
                        title="JPG contrast matrix (select pairs)"
                        className={`rounded p-1 transition ${
                          showMatrix
                            ? 'bg-[#fa5008]/15 text-[#fa5008]'
                            : 'text-[#6b6b6b] hover:bg-[#eceae5]'
                        }`}
                      >
                        <Palette className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>

                <SquareCheck
                  checked={exportConfig.digital.webp}
                  label="WebP"
                  onChange={() =>
                    setExportConfig((p) => ({
                      ...p,
                      digital: { ...p.digital, webp: !p.digital.webp },
                    }))
                  }
                />
                <SquareCheck
                  checked={exportConfig.digital.pdf}
                  label="PDF"
                  onChange={() =>
                    setExportConfig((p) => ({
                      ...p,
                      digital: { ...p.digital, pdf: !p.digital.pdf },
                    }))
                  }
                />
                <SquareCheck
                  checked={exportConfig.digital.eps}
                  label="EPS"
                  onChange={() =>
                    setExportConfig((p) => ({
                      ...p,
                      digital: { ...p.digital, eps: !p.digital.eps },
                    }))
                  }
                />
              </div>

              {/* Custom Width + Preset Size Inline Drawer (matching Screenshot 5!) */}
              {sizePopover && (
                <div className="rounded-xl border border-[#e5e3dc] bg-[#f8f6f1] p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1f1f1f]">
                      {sizePopover === 'png'
                        ? locale === 'ua'
                          ? 'Ширина PNG експорту'
                          : 'PNG export sizes'
                        : locale === 'ua'
                          ? 'Ширина JPG експорту та Margin %'
                          : 'JPG export sizes & Margin %'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSizePopover(null)}
                      className="text-[#6b6b6b] hover:text-[#1f1f1f]"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(sizePopover === 'png' ? allPngWidths : allJpgWidths).map((sz) => {
                      const list =
                        sizePopover === 'png'
                          ? exportConfig.digital.pngSizes
                          : exportConfig.digital.jpgSizes;
                      return (
                        <SquareCheck
                          key={sz}
                          checked={list.includes(sz)}
                          label={`${sz}px`}
                          onChange={() =>
                            toggleSize(sizePopover === 'png' ? 'pngSizes' : 'jpgSizes', sz)
                          }
                        />
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-end gap-3 pt-1 border-t border-[#e5e3dc]">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#6b6b6b] mb-1">
                        {locale === 'ua' ? 'Власна ширина' : 'Custom width'}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={16}
                          max={8192}
                          value={customWidthInput}
                          onChange={(e) => setCustomWidthInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              addCustomSize(sizePopover === 'png' ? 'pngSizes' : 'jpgSizes');
                            }
                          }}
                          placeholder="e.g. 256"
                          className="w-28 h-8 rounded-lg border border-[#e5e3dc] bg-white px-2.5 text-xs font-mono"
                        />
                        <span className="text-xs text-[#6b6b6b] font-mono">px</span>
                        <button
                          type="button"
                          onClick={() =>
                            addCustomSize(sizePopover === 'png' ? 'pngSizes' : 'jpgSizes')
                          }
                          className="h-8 w-8 rounded-lg border border-[#e5e3dc] bg-white hover:border-[#fa5008] hover:text-[#fa5008] flex items-center justify-center"
                          title="Add custom width"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {sizePopover === 'jpg' && (
                      <div
                        title={
                          locale === 'ua'
                            ? 'Внутрішня безпечна рамка навколо лого на суцільному фоні JPG (у % від сторони)'
                            : 'Inner safety padding around the logo inside solid-backdrop JPG exports'
                        }
                      >
                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-[#6b6b6b] mb-1">
                          Margin % ({locale === 'ua' ? 'поля' : 'padding'})
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={35}
                          value={exportConfig.digital.jpgMarginPct}
                          onChange={(e) =>
                            setExportConfig((p) => ({
                              ...p,
                              digital: {
                                ...p.digital,
                                jpgMarginPct: Math.max(0, Math.min(35, Number(e.target.value) || 0)),
                              },
                            }))
                          }
                          className="w-20 h-8 rounded-lg border border-[#e5e3dc] bg-white px-2.5 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-[#6b6b6b]">
                    {sizePopover === 'jpg'
                      ? locale === 'ua'
                        ? 'Ширина 16–8192 px (висота автоматично). Margin % додає вільне поле навколо логотипу в JPG.'
                        : 'Width 16–8192 px (height scales automatically). Margin % sets outer padding around logo in JPG.'
                      : locale === 'ua'
                        ? 'Ширина в пікселях (16–8192). Висота масштабується пропорційно.'
                        : 'Width in pixels (16–8192). Height scales to aspect ratio.'}
                  </p>
                </div>
              )}

              {/* JPG Contrast Matrix with color swatch preview, subtle contrast ratio & auto-disable < 3:1 */}
              {exportConfig.digital.jpg && showMatrix && (
                <div className="rounded-xl border border-[#e5e3dc] bg-[#faf9f6] p-3.5 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-[#1f1f1f]">
                      JPG contrast matrix ({matrixPairs.filter((p) => isJpgPairEnabled(p.pairKey, p.ratio)).length}/{matrixPairs.length})
                    </span>
                    <span className="text-[10px] text-[#71717a]">
                      {locale === 'ua'
                        ? 'Низький контраст (< 3:1) вимкнено автоматично'
                        : 'Low-contrast pairs (< 3:1) are disabled automatically'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {matrixPairs.map((pair) => {
                      const enabled = isJpgPairEnabled(pair.pairKey, pair.ratio);
                      const lowContrast = pair.ratio < 3;
                      const thumbSvg = previewMarkSvg
                        ? recolorSvg(previewMarkSvg, pair.inkHex, pair.bgHex)
                        : '';
                      return (
                        <label
                          key={pair.pairKey}
                          className={`flex items-center justify-between gap-2 rounded-lg border border-[#e5e3dc] px-2.5 py-2 text-[11px] cursor-pointer transition ${
                            !enabled ? 'opacity-50 bg-[#eceae5]/70' : 'bg-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="h-6 w-8 rounded border border-black/15 flex items-center justify-center p-1 shrink-0"
                              style={{ backgroundColor: pair.bgHex }}
                            >
                              {thumbSvg ? (
                                <div
                                  className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                                  dangerouslySetInnerHTML={{ __html: thumbSvg }}
                                />
                              ) : (
                                <span
                                  className="text-[9px] font-bold leading-none"
                                  style={{ color: pair.inkHex }}
                                >
                                  Aa
                                </span>
                              )}
                            </div>
                            <div className="min-w-0 leading-tight">
                              <div className="truncate font-medium text-[#1f1f1f]">
                                {pair.inkLabel} / {pair.bgLabel}
                              </div>
                              <div className="text-[10px] font-mono text-[#8e8e8e]">
                                {pair.ratio.toFixed(1)}:1{lowContrast ? (locale === 'ua' ? ' · низький' : ' · low') : ''}
                              </div>
                            </div>
                          </div>
                          <span className="flex items-center gap-1 shrink-0">
                            {lowContrast && (
                              <span title={`Low contrast ${pair.ratio.toFixed(1)}:1`} className="inline-flex">
                                <AlertTriangle className="h-3 w-3 text-amber-500" />
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={enabled}
                              onChange={() => {
                                const nextVal = !enabled;
                                setExportConfig((p) => {
                                  const nextOverrides = {
                                    ...(p.digital.manualJpgOverrides ?? {}),
                                    [pair.pairKey]: nextVal,
                                  };
                                  const nextDisabled = nextVal
                                    ? p.digital.disabledJpgPairs.filter((x) => x !== pair.pairKey)
                                    : Array.from(new Set([...p.digital.disabledJpgPairs, pair.pairKey]));
                                  return {
                                    ...p,
                                    digital: {
                                      ...p.digital,
                                      manualJpgOverrides: nextOverrides,
                                      disabledJpgPairs: nextDisabled,
                                    },
                                  };
                                });
                              }}
                              className="accent-[#fa5008]"
                            />
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 2. Print / CMYK */}
        <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs">
          <div
            onClick={() => setOpenPrint((v) => !v)}
            className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#f8f6f1]/50 rounded-xl transition"
          >
            <div className="flex items-center gap-3">
              <ToggleSwitch
                size="sm"
                checked={exportConfig.print.enabled}
                onChange={(v) =>
                  setExportConfig((p) => ({ ...p, print: { ...p.print, enabled: v } }))
                }
              />
              <Printer className="h-4 w-4 text-[#6b6b6b]" />
              <span className="text-sm font-semibold text-[#1f1f1f]">{t.printCmyk}</span>
            </div>
            {openPrint ? (
              <ChevronUp className="h-4 w-4 text-[#6b6b6b]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
            )}
          </div>
          {openPrint && (
            <div className="px-4 pb-3.5 pt-2 border-t border-[#eceae5] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-5">
                <SquareCheck
                  checked={exportConfig.print.eps}
                  label="EPS"
                  onChange={() =>
                    setExportConfig((p) => ({ ...p, print: { ...p.print, eps: !p.print.eps } }))
                  }
                />
                <SquareCheck
                  checked={exportConfig.print.pdf}
                  label="PDF"
                  onChange={() =>
                    setExportConfig((p) => ({ ...p, print: { ...p.print, pdf: !p.print.pdf } }))
                  }
                />
              </div>
              <span className="text-[11px] text-[#6b6b6b]">
                {locale === 'ua'
                  ? 'CMYK-вектор для друку та сувенірки'
                  : 'CMYK vector files prepared for print production'}
              </span>
            </div>
          )}
        </section>

        {/* 3. Icons & Avatars (matching Screenshot 4 & 6 with Scale + Swatch Settings Modal!) */}
        {iconSourceAsset && (
          <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs">
            <div
              onClick={() => setOpenIcons((v) => !v)}
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#f8f6f1]/50 rounded-xl transition"
            >
              <div className="flex items-center gap-3">
                <ToggleSwitch
                  size="sm"
                  checked={exportConfig.icons.enabled}
                  onChange={(v) =>
                    setExportConfig((p) => ({ ...p, icons: { ...p.icons, enabled: v } }))
                  }
                />
                <Globe className="h-4 w-4 text-[#6b6b6b]" />
                <span className="text-sm font-semibold text-[#1f1f1f]">{t.iconsAvatars}</span>
              </div>
              {openIcons ? (
                <ChevronUp className="h-4 w-4 text-[#6b6b6b]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
              )}
            </div>

            {openIcons && (
              <div className="px-4 pb-4 pt-3 border-t border-[#eceae5] space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#52525b]">Icon source</span>
                  <select
                    value={exportConfig.icons.sourceAssetId}
                    onChange={(e) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, sourceAssetId: e.target.value },
                      }))
                    }
                    className="h-9 rounded-lg border border-[#e5e3dc] bg-[#f8f6f1] px-3 text-xs font-medium text-[#1f1f1f] focus:border-[#fa5008] focus:outline-none"
                  >
                    <option value="auto">Automatic — {t.roles[iconSourceAsset.role]}</option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Favicon Card */}
                  <div className="rounded-xl border border-[#e5e3dc] bg-[#f8f6f1] p-3.5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1f1f1f]">Favicon</span>
                      <button
                        type="button"
                        onClick={() => setIconModal('favicon')}
                        title="Favicon color & scale settings"
                        className="rounded-md p-1 text-[#6b6b6b] hover:bg-white hover:text-[#fa5008] transition"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 rounded-lg bg-white border border-[#e5e3dc] px-2.5 py-1.5 text-[11px]">
                        <div
                          className={`h-4 w-4 shrink-0 rounded-sm flex items-center justify-center overflow-hidden ${
                            exportConfig.icons.faviconBg === 'transparent' ? 'checkerboard-bg' : ''
                          }`}
                          style={
                            exportConfig.icons.faviconBg !== 'transparent'
                              ? { backgroundColor: exportConfig.icons.faviconBg }
                              : undefined
                          }
                        >
                          <div
                            className="h-3.5 w-3.5 [&>svg]:w-full [&>svg]:h-full"
                            style={{ transform: `scale(${exportConfig.icons.faviconScale})` }}
                            dangerouslySetInnerHTML={{
                              __html: recolorSvg(
                                iconSourceAsset.svgContent,
                                exportConfig.icons.faviconColor,
                                exportConfig.icons.faviconBg === 'transparent'
                                  ? '#FFFFFF'
                                  : exportConfig.icons.faviconBg,
                              ),
                            }}
                          />
                        </div>
                        <span className="truncate">{brandName || 'Brand'}</span>
                      </div>

                      <div className="flex items-center gap-2 rounded-lg bg-[#1f1f1f] text-white px-2.5 py-1.5 text-[11px]">
                        <div
                          className="h-4 w-4 shrink-0 rounded-sm flex items-center justify-center overflow-hidden"
                          style={
                            exportConfig.icons.faviconDarkBg !== 'transparent'
                              ? { backgroundColor: exportConfig.icons.faviconDarkBg }
                              : undefined
                          }
                        >
                          <div
                            className="h-3.5 w-3.5 [&>svg]:w-full [&>svg]:h-full"
                            style={{ transform: `scale(${exportConfig.icons.faviconScale})` }}
                            dangerouslySetInnerHTML={{
                              __html: recolorSvg(
                                iconSourceAsset.svgContent,
                                exportConfig.icons.faviconDarkColor,
                                exportConfig.icons.faviconDarkBg === 'transparent'
                                  ? '#1F1F1F'
                                  : exportConfig.icons.faviconDarkBg,
                              ),
                            }}
                          />
                        </div>
                        <span className="truncate">{brandName || 'Brand'}</span>
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[#6b6b6b] flex justify-between">
                      <span>Scale {Math.round(exportConfig.icons.faviconScale * 100)}%</span>
                      <span>.svg · .ico · 96px</span>
                    </div>
                  </div>

                  {/* App Icon Card */}
                  <div className="rounded-xl border border-[#e5e3dc] bg-[#f8f6f1] p-3.5 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1f1f1f]">App icon</span>
                      <button
                        type="button"
                        onClick={() => setIconModal('appIcon')}
                        title="App Icon color & scale settings"
                        className="rounded-md p-1 text-[#6b6b6b] hover:bg-white hover:text-[#fa5008] transition"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-center py-1">
                      <div
                        className="h-14 w-14 shrink-0 rounded-[14px] border border-[#e5e3dc] flex items-center justify-center p-2.5 overflow-hidden shadow-2xs"
                        style={{ backgroundColor: exportConfig.icons.appIconBg }}
                      >
                        <div
                          className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                          style={{ transform: `scale(${exportConfig.icons.appIconScale})` }}
                          dangerouslySetInnerHTML={{
                            __html: recolorSvg(
                              iconSourceAsset.svgContent,
                              exportConfig.icons.appIconColor,
                              exportConfig.icons.appIconBg,
                            ),
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[#6b6b6b] flex justify-between">
                      <span>Scale {Math.round(exportConfig.icons.appIconScale * 100)}%</span>
                      <span>180 / 1024px</span>
                    </div>
                  </div>

                  {/* Avatar Card */}
                  <div className="rounded-xl border border-[#e5e3dc] bg-[#f8f6f1] p-3.5 flex flex-col justify-between space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1f1f1f]">Avatar</span>
                      <button
                        type="button"
                        onClick={() => setIconModal('avatar')}
                        title="Avatar color & scale settings"
                        className="rounded-md p-1 text-[#6b6b6b] hover:bg-white hover:text-[#fa5008] transition"
                      >
                        <SlidersHorizontal className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="flex justify-center py-1">
                      <div
                        className="h-14 w-14 shrink-0 rounded-full border border-[#e5e3dc] flex items-center justify-center p-2.5 overflow-hidden shadow-2xs"
                        style={{ backgroundColor: exportConfig.icons.avatarBg }}
                      >
                        <div
                          className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                          style={{ transform: `scale(${exportConfig.icons.avatarScale})` }}
                          dangerouslySetInnerHTML={{
                            __html: recolorSvg(
                              iconSourceAsset.svgContent,
                              exportConfig.icons.avatarColor,
                              exportConfig.icons.avatarBg,
                            ),
                          }}
                        />
                      </div>
                    </div>
                    <div className="text-[10px] font-mono text-[#6b6b6b] flex justify-between">
                      <span>Scale {Math.round(exportConfig.icons.avatarScale * 100)}%</span>
                      <span>1024px</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        {/* 4. Logo Guide PDF with View Guide Preview Modal + Clear Space & Brand Applications */}
        <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs">
          <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div
              onClick={() => setOpenGuide((v) => !v)}
              className="flex items-center gap-3 cursor-pointer"
            >
              <ToggleSwitch
                size="sm"
                checked={exportConfig.guide.enabled}
                onChange={(v) =>
                  setExportConfig((p) => ({ ...p, guide: { ...p.guide, enabled: v } }))
                }
              />
              <BookOpen className="h-4 w-4 text-[#6b6b6b]" />
              <span className="text-sm font-semibold text-[#1f1f1f]">{t.logoGuidePdf}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handlePreviewGuide}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e3dc] bg-white px-3.5 h-8 text-xs font-medium text-[#fa5008] hover:border-[#fa5008] transition"
              >
                <Eye className="h-3.5 w-3.5" />
                {locale === 'ua' ? 'Переглянути PDF' : 'View guide'}
              </button>
              <button
                type="button"
                onClick={handleDownloadGuide}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e3dc] bg-white px-3.5 h-8 text-xs font-medium text-[#1f1f1f] hover:border-[#fa5008] transition"
              >
                <Download className="h-3.5 w-3.5" /> {t.downloadGuidePdf}
              </button>
              <button
                type="button"
                onClick={() => setOpenGuide((v) => !v)}
                className="p-1 text-[#6b6b6b]"
              >
                {openGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {openGuide && (
            <div className="px-4 pb-5 pt-4 border-t border-[#eceae5] space-y-4">
              {/* Top Row: 3 Equal Height Setting Cards — exact horizontal baseline, clean labels & unclipped digits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
                {/* Card 1: Language & Clear space % */}
                <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col justify-between gap-3.5 text-xs">
                  <div>
                    <label className="block text-xs font-medium text-[#1f1f1f] mb-1.5">
                      {locale === 'ua' ? 'Мова гайду' : 'Guide Language'}
                    </label>
                    <div className="grid grid-cols-2 h-9 rounded-lg border border-[#e5e3dc] bg-white p-0.5 text-xs font-medium">
                      {(
                        [
                          { id: 'en', label: 'English' },
                          { id: 'ua', label: 'Українська' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            setExportConfig((p) => ({
                              ...p,
                              guide: { ...p.guide, language: opt.id },
                            }))
                          }
                          className={`rounded-md transition ${
                            exportConfig.guide.language === opt.id
                              ? 'bg-[#1f1f1f] text-white font-semibold'
                              : 'text-[#6b6b6b] hover:text-[#1f1f1f]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-baseline justify-between gap-2 mb-1.5">
                      <label className="text-xs font-medium text-[#1f1f1f] whitespace-nowrap">
                        {locale === 'ua' ? 'Охоронне поле, %' : 'Clear space, %'}
                      </label>
                      <span className="text-[11px] text-[#8e8e8e] whitespace-nowrap">
                        {locale === 'ua' ? '10–15%' : 'rec. 10–15%'}
                      </span>
                    </div>
                    <input
                      type="number"
                      min={5}
                      max={30}
                      value={exportConfig.guide.clearSpacePct}
                      onChange={(e) =>
                        setExportConfig((p) => ({
                          ...p,
                          guide: { ...p.guide, clearSpacePct: Number(e.target.value) || 10 },
                        }))
                      }
                      className="w-full h-9 rounded-lg border border-[#e5e3dc] bg-white px-3 text-xs font-mono font-medium text-[#1f1f1f] focus:border-[#fa5008] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Card 2: Clear Space Rule */}
                <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col justify-between gap-3.5 text-xs">
                  <div>
                    <div className="text-xs font-medium text-[#1f1f1f]">
                      {locale === 'ua' ? 'Правило охоронного поля' : 'Clear Space Rule'}
                    </div>
                    <div className="mt-1 text-[11px] text-[#8e8e8e] leading-snug">
                      {locale === 'ua' ? csMeta.descUa : csMeta.descEn}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['half_x', 'third_x', 'two_thirds_x', 'diagonal'] as const).map((key) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setExportConfig((p) => ({
                            ...p,
                            guide: { ...p.guide, clearSpaceRule: key },
                          }))
                        }
                        className={`rounded-lg h-9 font-mono text-xs transition ${
                          exportConfig.guide.clearSpaceRule === key
                            ? 'bg-[#1f1f1f] text-white font-semibold'
                            : 'bg-white border border-[#e5e3dc] text-[#6b6b6b] hover:text-[#1f1f1f]'
                        }`}
                      >
                        {CLEAR_SPACE_META[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Card 3: Minimum Legible Size */}
                <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col justify-between gap-3.5 text-xs">
                  <div>
                    <div className="text-xs font-medium text-[#1f1f1f]">
                      {locale === 'ua' ? 'Мінімальний розмір' : 'Minimum Legible Size'}
                    </div>
                    <div className="mt-1 text-[11px] text-[#8e8e8e] leading-snug">
                      {locale === 'ua'
                        ? 'Поріг читабельності (80–120px / 20–30mm)'
                        : 'Legibility threshold (80–120px / 20–30mm)'}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="number"
                        min={24}
                        max={400}
                        value={exportConfig.guide.minDigitalPx}
                        onChange={(e) =>
                          setExportConfig((p) => ({
                            ...p,
                            guide: { ...p.guide, minDigitalPx: Number(e.target.value) || 100 },
                          }))
                        }
                        className="flex-1 min-w-0 h-9 rounded-lg border border-[#e5e3dc] bg-white px-2.5 text-center font-mono text-xs font-medium text-[#1f1f1f] focus:border-[#fa5008] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#6b6b6b] shrink-0">px</span>
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <input
                        type="number"
                        min={5}
                        max={100}
                        value={exportConfig.guide.minPrintMm}
                        onChange={(e) =>
                          setExportConfig((p) => ({
                            ...p,
                            guide: { ...p.guide, minPrintMm: Number(e.target.value) || 28 },
                          }))
                        }
                        className="flex-1 min-w-0 h-9 rounded-lg border border-[#e5e3dc] bg-white px-2.5 text-center font-mono text-xs font-medium text-[#1f1f1f] focus:border-[#fa5008] focus:outline-none"
                      />
                      <span className="text-[11px] text-[#6b6b6b] shrink-0">mm</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Row: 2 Spacious Live Diagrams (no cramped headers or overlapping labels!) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
                <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col items-center justify-between min-h-72">
                  <div className="w-full flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-[#6b6b6b] mb-3">
                    <span className="whitespace-nowrap">Clear Space ({csMeta.label})</span>
                    <span className="text-[#1f1f1f] whitespace-nowrap">
                      {(markAsset ? markAsset.audit.aspectRatio : 1).toFixed(2)}:1 Ratio
                    </span>
                  </div>

                  {(() => {
                    const ratio = Math.max(
                      0.45,
                      Math.min(3.4, markAsset ? markAsset.audit.aspectRatio : 1),
                    );
                    let boxW = 92;
                    let boxH = Math.round(boxW / ratio);
                    if (boxH > 64) {
                      boxH = 64;
                      boxW = Math.round(boxH * ratio);
                    } else if (boxH < 36) {
                      boxH = 36;
                      boxW = Math.min(132, Math.round(boxH * ratio));
                    }
                    const padPx = Math.max(25, Math.min(44, Math.round(csMeta.factor * 94)));

                    return (
                      <div className="flex flex-col items-center my-auto">
                        <div
                          className="flex items-end text-[8.5px] font-mono leading-none mb-2"
                          style={{ marginLeft: '40px' }}
                        >
                          <span
                            className="text-center text-[#fa5008] font-bold border-b border-[#a1a1aa] pb-1 whitespace-nowrap px-0.5"
                            style={{ width: `${padPx}px` }}
                          >
                            {csMeta.label}
                          </span>
                          <span
                            className="text-center border-b border-x border-[#a1a1aa] pb-1 font-semibold text-[#1f1f1f]"
                            style={{ width: `${boxW}px` }}
                          >
                            X
                          </span>
                          <span
                            className="text-center text-[#fa5008] font-bold border-b border-[#a1a1aa] pb-1 whitespace-nowrap px-0.5"
                            style={{ width: `${padPx}px` }}
                          >
                            {csMeta.label}
                          </span>
                        </div>

                        <div className="flex items-center">
                          <div
                            className="flex flex-col items-end justify-between mr-3 w-7 text-[8.5px] font-mono leading-none shrink-0"
                            style={{ height: `${boxH + padPx * 2}px` }}
                          >
                            <span className="text-[#fa5008] font-bold whitespace-nowrap">
                              {csMeta.label}
                            </span>
                            <span className="font-semibold text-[#1f1f1f]">Y</span>
                            <span className="text-[#fa5008] font-bold whitespace-nowrap">
                              {csMeta.label}
                            </span>
                          </div>

                          <div
                            className="relative border border-dashed border-[#a1a1aa] bg-white flex items-center justify-center transition-all"
                            style={{ padding: `${padPx}px` }}
                          >
                            <span
                              className="absolute top-0 left-0 bg-[#eceae5]"
                              style={{ width: `${padPx}px`, height: `${padPx}px` }}
                            />
                            <span
                              className="absolute top-0 right-0 bg-[#eceae5]"
                              style={{ width: `${padPx}px`, height: `${padPx}px` }}
                            />
                            <span
                              className="absolute bottom-0 left-0 bg-[#eceae5]"
                              style={{ width: `${padPx}px`, height: `${padPx}px` }}
                            />
                            <span
                              className="absolute bottom-0 right-0 bg-[#eceae5]"
                              style={{ width: `${padPx}px`, height: `${padPx}px` }}
                            />
                            <div
                              className="relative z-10 border border-[#e5e3dc] p-1 flex items-center justify-center transition-all"
                              style={{ width: `${boxW}px`, height: `${boxH}px` }}
                            >
                              {markAsset && (
                                <div
                                  className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                                  dangerouslySetInnerHTML={{ __html: markAsset.svgContent }}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="mt-3 text-[10px] text-[#6b6b6b] font-mono truncate max-w-full">
                    {locale === 'ua' ? `База: ${markAsset?.name || 'Logo'}` : `Ref: ${markAsset?.name || 'Logo'}`}
                  </div>
                </div>

                <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col items-center justify-between min-h-72">
                  <div className="w-full flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-wider text-[#6b6b6b] mb-3">
                    <span className="whitespace-nowrap">Minimum Size</span>
                    <span className="text-[#1f1f1f] whitespace-nowrap">01 / 02</span>
                  </div>
                  {primaryAsset && (
                    <div className="w-full flex flex-col items-center gap-3 my-auto py-1">
                      {(() => {
                        const logoAspect = Math.max(0.5, primaryAsset.audit.aspectRatio || 1);
                        const digBarW = Math.min(
                          216,
                          Math.max(16, Math.round(exportConfig.guide.minDigitalPx * 0.9)),
                        );
                        const digLogoH = Math.min(
                          48,
                          Math.max(10, Math.round(digBarW / logoAspect)),
                        );
                        const printBarW = Math.min(
                          216,
                          Math.max(14, Math.round(exportConfig.guide.minPrintMm * 2.6)),
                        );
                        const printLogoH = Math.min(
                          48,
                          Math.max(10, Math.round(printBarW / logoAspect)),
                        );
                        return (
                          <div className="w-full space-y-3">
                            <div className="flex flex-col items-center">
                              <div
                                className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-all"
                                style={{ width: `${digBarW}px`, height: `${digLogoH}px` }}
                                dangerouslySetInnerHTML={{ __html: primaryAsset.svgContent }}
                              />
                              <div
                                className="mt-1 border-t border-[#1f1f1f] relative transition-all"
                                style={{ width: `${digBarW}px` }}
                              >
                                <span className="absolute -top-1 left-0 h-2 w-px bg-[#1f1f1f]" />
                                <span className="absolute -top-1 right-0 h-2 w-px bg-[#1f1f1f]" />
                              </div>
                              <div className="mt-1 text-[10px] font-mono font-semibold text-[#1f1f1f]">
                                01 Digital: {exportConfig.guide.minDigitalPx}px
                              </div>
                            </div>

                            <div className="flex flex-col items-center pt-2.5 border-t border-[#e5e3dc] w-full">
                              <div
                                className="flex items-center justify-center [&>svg]:w-full [&>svg]:h-full transition-all"
                                style={{ width: `${printBarW}px`, height: `${printLogoH}px` }}
                                dangerouslySetInnerHTML={{ __html: primaryAsset.svgContent }}
                              />
                              <div
                                className="mt-1 border-t border-[#fa5008] relative transition-all"
                                style={{ width: `${printBarW}px` }}
                              >
                                <span className="absolute -top-1 left-0 h-2 w-px bg-[#fa5008]" />
                                <span className="absolute -top-1 right-0 h-2 w-px bg-[#fa5008]" />
                              </div>
                              <div className="mt-1 text-[10px] font-mono font-semibold text-[#1f1f1f]">
                                02 Print: {exportConfig.guide.minPrintMm}mm
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      {markAsset && (
                        <div className="flex items-center gap-2 text-[10px] text-[#6b6b6b] font-mono pt-1">
                          <div
                            className="h-4 w-4 flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                            dangerouslySetInnerHTML={{ __html: markAsset.svgContent }}
                          />
                          <span>Icon min: 16px / 4mm</span>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="mt-3 text-[10px] text-[#6b6b6b] font-mono">
                    {locale === 'ua' ? 'Поріг читабельності' : 'Legibility threshold'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* 5. Brand Applications & Mockups — evenly aligned 3 columns (Screenshot 7 fix!) */}
        <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs">
          <div
            onClick={() => setOpenApps((v) => !v)}
            className="px-4 py-3 flex items-center justify-between gap-3 cursor-pointer hover:bg-[#f8f6f1]/50 rounded-xl transition"
          >
            <div className="flex items-center gap-3 min-w-0">
              <ToggleSwitch
                size="sm"
                checked={exportConfig.guide.includeApplications}
                onChange={(v) =>
                  setExportConfig((p) => ({
                    ...p,
                    guide: { ...p.guide, includeApplications: v },
                  }))
                }
              />
              <ImageIcon className="h-4 w-4 text-[#6b6b6b] shrink-0" />
              <span className="text-sm font-semibold text-[#1f1f1f] truncate">
                {locale === 'ua' ? 'Мокапи та носії (Brand Applications)' : 'Brand Applications & Mockups'}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="hidden sm:inline text-[11px] font-mono text-[#8e8e8e]">
                {Math.round((exportConfig.guide.applicationsScale ?? 1) * 100)}%
              </span>
              {openApps ? (
                <ChevronUp className="h-4 w-4 text-[#6b6b6b]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
              )}
            </div>
          </div>

          {openApps && (
            <div className="px-4 pb-4 pt-3 border-t border-[#eceae5] space-y-4">
              <input
                ref={mockupRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleMockups(e.target.files)}
              />

              {/* Strictly level 3-column grid: equal top labels, h-9 controls, bottom hints */}
              <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <div className="h-5 flex items-center mb-1.5">
                    <label className="text-xs font-medium text-[#1f1f1f]">
                      {locale === 'ua' ? 'Логотип для мокапів' : 'Logo on mockups'}
                    </label>
                  </div>
                  <select
                    value={exportConfig.guide.applicationsAssetId ?? 'auto'}
                    onChange={(e) =>
                      setExportConfig((p) => ({
                        ...p,
                        guide: { ...p.guide, applicationsAssetId: e.target.value },
                      }))
                    }
                    className="w-full h-9 rounded-lg border border-[#e5e3dc] bg-white px-3 text-xs font-medium text-[#1f1f1f] focus:border-[#fa5008] focus:outline-none"
                  >
                    <option value="auto">
                      {locale === 'ua'
                        ? `Авто — ${primaryAsset ? t.roles[primaryAsset.role] : 'Основний'}`
                        : `Auto — ${primaryAsset ? t.roles[primaryAsset.role] : 'Primary'}`}
                    </option>
                    {assets.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({t.roles[a.role]})
                      </option>
                    ))}
                  </select>
                  <div className="mt-1.5 text-[11px] text-[#8e8e8e]">
                    {locale === 'ua' ? 'Відображається на всіх носіях' : 'Applied across all spreads'}
                  </div>
                </div>

                <div>
                  <div className="h-5 flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-[#1f1f1f]">
                      {locale === 'ua' ? 'Масштаб на носіях' : 'Mockup Logo Scale'}
                    </span>
                    <span className="font-mono text-[#1f1f1f] bg-white border border-[#e5e3dc] rounded px-1.5 py-0.5 text-[10px]">
                      {Math.round((exportConfig.guide.applicationsScale ?? 1) * 100)}%
                    </span>
                  </div>
                  <div className="h-9 flex items-center">
                    <input
                      type="range"
                      min={60}
                      max={140}
                      step={2}
                      value={Math.round((exportConfig.guide.applicationsScale ?? 1) * 100)}
                      onChange={(e) =>
                        setExportConfig((p) => ({
                          ...p,
                          guide: { ...p.guide, applicationsScale: Number(e.target.value) / 100 },
                        }))
                      }
                      className="w-full accent-[#fa5008] cursor-pointer"
                    />
                  </div>
                  <div className="mt-1.5 text-[11px] text-[#8e8e8e]">
                    {locale === 'ua' ? 'Рекомендовано 90–110%' : 'Recommended 90–110%'}
                  </div>
                </div>

                <div>
                  <div className="h-5 flex items-center mb-1.5">
                    <span className="text-xs font-medium text-[#1f1f1f]">
                      {locale === 'ua' ? 'Власні фото мокапів' : 'Custom Mockup Photos'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => mockupRef.current?.click()}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#e5e3dc] bg-white px-3 h-9 text-xs font-medium hover:border-[#fa5008] whitespace-nowrap transition"
                  >
                    <Plus className="h-3.5 w-3.5 text-[#fa5008] shrink-0" />
                    <span>
                      {locale === 'ua' ? 'Завантажити' : 'Upload Mockups'} ({exportConfig.bento.mockups.length}/2)
                    </span>
                  </button>
                  <div className="mt-1.5 text-[11px] text-[#8e8e8e]">
                    {locale === 'ua' ? 'Додаються у PDF і Дошку' : 'Included in PDF & Board'}
                  </div>
                </div>
              </div>

              {exportConfig.bento.mockups.length > 0 && (
                <div className="flex flex-wrap gap-3">
                  {exportConfig.bento.mockups.map((m) => (
                    <div
                      key={m.id}
                      className="relative h-20 w-32 rounded-xl border border-[#e5e3dc] overflow-hidden"
                    >
                      <img src={m.dataUrl} alt={m.name} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setExportConfig((p) => ({
                            ...p,
                            bento: {
                              ...p.bento,
                              mockups: p.bento.mockups.filter((x) => x.id !== m.id),
                            },
                          }))
                        }
                        className="absolute top-1 right-1 rounded-md bg-white/90 p-1 text-[#1f1f1f] hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {exportConfig.guide.includeApplications && mockupPreviewUrl && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-[#6b6b6b]">
                      Brand Applications — Live Preview
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(
                        [
                          { id: 'tote', label: 'Tote Bags' },
                          { id: 'bottle', label: 'Drinkware' },
                          { id: 'cards', label: 'Cards' },
                          { id: 'folder', label: 'Folders' },
                          { id: 'hoodie', label: 'Apparel' },
                        ] as const
                      ).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMockupPreviewKind(tab.id)}
                          className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                            mockupPreviewKind === tab.id
                              ? 'bg-[#1f1f1f] text-white'
                              : 'bg-[#f8f6f1] text-[#6b6b6b] hover:text-[#1f1f1f]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-[#e5e3dc] overflow-hidden bg-white">
                    <img src={mockupPreviewUrl} alt="Brand Applications Preview" className="w-full h-auto" />
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 6. Brand Board (Unified single-line header matching all other sections! Screenshot 4 fix) */}
        <section className="rounded-xl border border-[#e5e3dc] bg-white shadow-2xs">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            <div
              onClick={() => setOpenBento((v) => !v)}
              className="flex items-center gap-3 cursor-pointer min-w-0"
            >
              <ToggleSwitch
                size="sm"
                checked={exportConfig.bento.enabled}
                onChange={(v) =>
                  setExportConfig((p) => ({ ...p, bento: { ...p.bento, enabled: v } }))
                }
              />
              <LayoutGrid className="h-4 w-4 text-[#6b6b6b] shrink-0" />
              <span className="text-sm font-semibold text-[#1f1f1f] truncate">{t.bentoBoard}</span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadBento}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e5e3dc] bg-white px-3.5 h-8 text-xs font-medium hover:border-[#fa5008] transition"
              >
                <Download className="h-3.5 w-3.5" /> {t.downloadBentoPng}
              </button>
              <button
                type="button"
                onClick={() => setOpenBento((v) => !v)}
                className="p-1 text-[#6b6b6b]"
              >
                {openBento ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {openBento && (
            <div className="px-4 pb-4 pt-3 border-t border-[#eceae5] space-y-3">
              {/* 5 Minimalist Brand Board Layout Presets + Modular Block Toggle & Reorder */}
              <div className="rounded-xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-3 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#52525b]">
                    {locale === 'ua' ? 'Композиція дошки:' : 'Board Layout:'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: 'logomark', en: 'Logomark Overview', ua: 'Огляд Logomark' },
                        { id: 'swiss', en: 'Balanced Grid', ua: 'Класичний баланс' },
                        { id: 'showcase', en: 'Stationery & Icons', ua: 'Вітрина носіїв' },
                        { id: 'monolith', en: 'Light / Dark Split', ua: 'Світло / Тінь' },
                        { id: 'product', en: 'Hero Sign & Matrix', ua: 'Геометрія і Знак' },
                      ] as Array<{ id: BoardLayoutPreset; en: string; ua: string }>
                    ).map((preset) => {
                      const active = currentBoardLayout === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setExportConfig((p) => ({
                              ...p,
                              bento: {
                                ...p.bento,
                                layout: preset.id,
                                blocks: getPresetBoardBlocks(preset.id),
                              },
                            }))
                          }
                          className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
                            active
                              ? 'bg-[#1f1f1f] text-white'
                              : 'bg-white border border-[#e5e3dc] text-[#6b6b6b] hover:text-[#1f1f1f]'
                          }`}
                        >
                          {preset[locale]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Modular Block Toggle & Drag/Button Reorder */}
                <div className="pt-2 border-t border-[#e5e3dc]/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-[#6b6b6b]">
                    <span>
                      {locale === 'ua'
                        ? 'Блоки дошки (вкл/викл та порядок — сітка адаптується авто):'
                        : 'Board blocks (toggle & reorder — grid auto-adapts):'}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setExportConfig((p) => ({
                          ...p,
                          bento: {
                            ...p.bento,
                            blocks: getPresetBoardBlocks(currentBoardLayout),
                          },
                        }))
                      }
                      className="text-[10px] font-sans font-medium text-[#fa5008] hover:underline"
                    >
                      {locale === 'ua' ? 'Скинути порядок' : 'Reset order'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {boardBlocks.map((blk, idx) => {
                      const labels: Record<BoardBlockId, { en: string; ua: string }> = {
                        primary: { en: 'Primary Logo', ua: 'Основний лого' },
                        matrix: { en: '2x2 Matrix', ua: 'Матриця 2x2' },
                        logomarkSplit: { en: 'Logomark Split', ua: 'Logomark сітка' },
                        accentSign: { en: 'Accent Sign', ua: 'Знак на акценті' },
                        swatches: { en: 'Color Palette', ua: 'Палітра' },
                        statement: { en: 'Brand / Mockup', ua: 'Бренд / Мокап' },
                        typography: { en: 'Typography', ua: 'Типографіка' },
                        icons: { en: 'App Icon & Tab', ua: 'Іконки та Tab' },
                        clearSpace: { en: 'Clear Space', ua: 'Охоронне поле' },
                        application: { en: 'Application Card', ua: 'Носій бренду' },
                      };
                      const moveBlock = (from: number, to: number) => {
                        if (to < 0 || to >= boardBlocks.length || from === to) return;
                        const next = [...boardBlocks];
                        const [moved] = next.splice(from, 1);
                        next.splice(to, 0, moved);
                        setExportConfig((p) => ({
                          ...p,
                          bento: { ...p.bento, blocks: next },
                        }));
                      };
                      const toggleBlock = () => {
                        const next = boardBlocks.map((item, i) =>
                          i === idx ? { ...item, enabled: !item.enabled } : item,
                        );
                        setExportConfig((p) => ({
                          ...p,
                          bento: { ...p.bento, blocks: next },
                        }));
                      };
                      return (
                        <div
                          key={blk.id}
                          draggable
                          onDragStart={() => setDragBoardIdx(idx)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => {
                            if (dragBoardIdx !== null) moveBlock(dragBoardIdx, idx);
                            setDragBoardIdx(null);
                          }}
                          onDragEnd={() => setDragBoardIdx(null)}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] transition select-none ${
                            blk.enabled
                              ? 'bg-white border-[#d6d2c8] text-[#1f1f1f] shadow-2xs'
                              : 'bg-[#f4f2ec]/70 border-[#e5e3dc] text-[#8e8e8e] opacity-70'
                          }`}
                        >
                          <GripVertical className="h-3 w-3 text-[#a1a1aa] cursor-grab shrink-0" />
                          <button
                            type="button"
                            onClick={toggleBlock}
                            className="inline-flex items-center gap-1.5 font-medium"
                          >
                            <span
                              className={`h-3.5 w-3.5 rounded flex items-center justify-center border ${
                                blk.enabled
                                  ? 'bg-[#fa5008] border-[#fa5008] text-white'
                                  : 'bg-white border-[#d6d2c8] text-transparent'
                              }`}
                            >
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                            <span>{labels[blk.id][locale]}</span>
                          </button>
                          <div className="inline-flex items-center ml-0.5 border-l border-[#eceae5] pl-1 gap-0.5">
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveBlock(idx, idx - 1)}
                              title={locale === 'ua' ? 'Перемістити раніше' : 'Move earlier'}
                              className="p-0.5 rounded hover:bg-[#eceae5] disabled:opacity-30"
                            >
                              <ArrowUp className="h-2.5 w-2.5" />
                            </button>
                            <button
                              type="button"
                              disabled={idx === boardBlocks.length - 1}
                              onClick={() => moveBlock(idx, idx + 1)}
                              title={locale === 'ua' ? 'Перемістити пізніше' : 'Move later'}
                              className="p-0.5 rounded hover:bg-[#eceae5] disabled:opacity-30"
                            >
                              <ArrowDown className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {bentoPreviewUrl && (
                <div className="rounded-xl border border-[#e5e3dc] overflow-hidden bg-[#f5f5f7]">
                  <img src={bentoPreviewUrl} alt="Brand Board Preview" className="w-full h-auto" />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* ZIP Folder Structure — Expandable Tree Preview with Accent Orange Folders (Screenshot 7) */}
      <section className="rounded-xl border border-[#e5e3dc] bg-white overflow-hidden shadow-2xs">
        <button
          type="button"
          onClick={() => setShowZipTree((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-[#f8f6f1]/60 transition"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#1f1f1f]">ZIP Folder Structure</span>
            <span className="rounded-md bg-[#eceae5] px-2 py-0.5 text-[10px] font-mono text-[#6b6b6b]">
              Preview
            </span>
          </div>
          {showZipTree ? (
            <ChevronUp className="h-4 w-4 text-[#6b6b6b]" />
          ) : (
            <ChevronDown className="h-4 w-4 text-[#6b6b6b]" />
          )}
        </button>

        {showZipTree && (
          <div className="border-t border-[#eceae5] bg-[#faf9f6] p-4 space-y-2.5">
            <div className="flex items-center gap-2 font-mono text-xs font-semibold text-[#1f1f1f]">
              <Folder className="h-4 w-4 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
              <span>{slug}_Logo_Asset_Pack.zip</span>
            </div>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-[#e5e3dc] bg-white p-3 font-mono text-[11px] text-[#27272a] space-y-1">
              {assets.map((asset, idx) => {
                const assetKey = `asset-${idx}`;
                const assetOpen = !!expandedZipDirs[assetKey];
                const digKey = `dig-${idx}`;
                const digOpen = !!expandedZipDirs[digKey];
                const svgKey = `svg-${idx}`;
                const svgOpen = !!expandedZipDirs[svgKey];
                const pngKey = `png-${idx}`;
                const pngOpen = !!expandedZipDirs[pngKey];
                const jpgKey = `jpg-${idx}`;
                const jpgOpen = !!expandedZipDirs[jpgKey];
                const prnKey = `prn-${idx}`;
                const prnOpen = !!expandedZipDirs[prnKey];
                const folderName = `${String(idx + 1).padStart(2, '0')}_${asset.role}`;

                return (
                  <div key={asset.id} className="space-y-0.5">
                    <button
                      type="button"
                      onClick={() => toggleZipDir(assetKey)}
                      className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1 font-semibold"
                    >
                      {assetOpen ? (
                        <ChevronDown className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                      )}
                      <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                      <span>{folderName}</span>
                    </button>

                    {assetOpen && (
                      <div className="pl-5 space-y-0.5">
                        {exportConfig.digital.enabled && (
                          <div className="space-y-0.5">
                            <button
                              type="button"
                              onClick={() => toggleZipDir(digKey)}
                              className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1"
                            >
                              {digOpen ? (
                                <ChevronDown className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                              <span>01_RGB_Digital</span>
                            </button>

                            {digOpen && (
                              <div className="pl-5 space-y-0.5 text-[#52525b]">
                                {exportConfig.digital.svg && (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => toggleZipDir(svgKey)}
                                      className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1"
                                    >
                                      {svgOpen ? (
                                        <ChevronDown className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      )}
                                      <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                      <span>01_SVG</span>
                                    </button>
                                    {svgOpen && (
                                      <div className="pl-6 space-y-0.5 py-0.5 text-[10.5px] text-[#71717a]">
                                        {inksList.map((ink) => (
                                          <div key={ink.id} className="flex items-center gap-1.5 py-0.5">
                                            <FileIcon className="h-3 w-3 text-[#a1a1aa] shrink-0" />
                                            <span>
                                              {slug}-{asset.role}-{ink.slug}.svg
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {exportConfig.digital.png && (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => toggleZipDir(pngKey)}
                                      className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1"
                                    >
                                      {pngOpen ? (
                                        <ChevronDown className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      )}
                                      <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                      <span>02_PNG_Transparent</span>
                                    </button>
                                    {pngOpen && (
                                      <div className="pl-6 space-y-0.5 py-0.5 text-[10.5px] text-[#71717a]">
                                        {inksList.slice(0, 2).flatMap((ink) =>
                                          exportConfig.digital.pngSizes.slice(0, 2).map((sz) => (
                                            <div key={`${ink.id}-${sz}`} className="flex items-center gap-1.5 py-0.5">
                                              <FileIcon className="h-3 w-3 text-[#a1a1aa] shrink-0" />
                                              <span>
                                                {slug}-{asset.role}-{ink.slug}-{sz}w.png
                                              </span>
                                            </div>
                                          )),
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {exportConfig.digital.webp && (
                                  <div className="flex items-center gap-1.5 py-0.5 pl-4">
                                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                    <span>03_WEBP</span>
                                  </div>
                                )}

                                {exportConfig.digital.jpg && (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => toggleZipDir(jpgKey)}
                                      className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1"
                                    >
                                      {jpgOpen ? (
                                        <ChevronDown className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                                      )}
                                      <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                      <span>04_JPG</span>
                                    </button>
                                    {jpgOpen && inksList[0] && bgsList[0] && (
                                      <div className="pl-6 space-y-0.5 py-0.5 text-[10.5px] text-[#71717a]">
                                        {exportConfig.digital.jpgSizes.slice(0, 2).map((sz) => (
                                          <div key={sz} className="flex items-center gap-1.5 py-0.5">
                                            <FileIcon className="h-3 w-3 text-[#a1a1aa] shrink-0" />
                                            <span>
                                              {slug}-{asset.role}-{inksList[0].slug}-on-{bgsList[0].slug}-{sz}w.jpg
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {exportConfig.digital.pdf && (
                                  <div className="flex items-center gap-1.5 py-0.5 pl-4">
                                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                    <span>05_PDF</span>
                                  </div>
                                )}
                                {exportConfig.digital.eps && (
                                  <div className="flex items-center gap-1.5 py-0.5 pl-4">
                                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                                    <span>06_EPS</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {exportConfig.print.enabled && (
                          <div>
                            <button
                              type="button"
                              onClick={() => toggleZipDir(prnKey)}
                              className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1"
                            >
                              {prnOpen ? (
                                <ChevronDown className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                              ) : (
                                <ChevronRight className="h-3 w-3 text-[#8e8e8e] shrink-0" />
                              )}
                              <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                              <span>02_CMYK_Print</span>
                            </button>
                            {prnOpen && (
                              <div className="pl-6 space-y-0.5 py-0.5 text-[10.5px] text-[#71717a]">
                                {exportConfig.print.eps && <div>EPS/ ({inksList.length} files)</div>}
                                {exportConfig.print.pdf && <div>PDF/ ({inksList.length} files)</div>}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {exportConfig.icons.enabled && (
                <>
                  <button
                    type="button"
                    onClick={() => toggleZipDir('icons-fav')}
                    className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1 font-medium"
                  >
                    {expandedZipDirs['icons-fav'] ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                    )}
                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                    <span>03_Favicon</span>
                  </button>
                  {expandedZipDirs['icons-fav'] && (
                    <div className="pl-6 space-y-0.5 text-[10.5px] text-[#71717a]">
                      {['favicon.svg', 'favicon.ico', 'favicon-96.png', 'setup.html'].map((f) => (
                        <div key={f} className="flex items-center gap-1.5 py-0.5">
                          <FileIcon className="h-3 w-3 text-[#a1a1aa]" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => toggleZipDir('icons-app')}
                    className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1 font-medium"
                  >
                    {expandedZipDirs['icons-app'] ? (
                      <ChevronDown className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                    )}
                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                    <span>04_App_Icon</span>
                  </button>
                  {expandedZipDirs['icons-app'] && (
                    <div className="pl-6 space-y-0.5 text-[10.5px] text-[#71717a]">
                      {['apple-touch-icon.png', 'icon-1024.png', 'Icon_Composer/'].map((f) => (
                        <div key={f} className="flex items-center gap-1.5 py-0.5">
                          <FileIcon className="h-3 w-3 text-[#a1a1aa]" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 py-0.5 pl-6 font-medium">
                    <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                    <span>05_Avatar</span>
                  </div>
                </>
              )}

              {exportConfig.bento.enabled && (
                <div className="flex items-center gap-1.5 py-0.5 pl-6 font-medium">
                  <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                  <span>06_Brand_Board/{slug}-brand-board.png</span>
                </div>
              )}

              <button
                type="button"
                onClick={() => toggleZipDir('fonts-dir')}
                className="flex items-center gap-1.5 w-full text-left py-0.5 rounded hover:bg-[#f8f6f1] px-1 font-medium"
              >
                {expandedZipDirs['fonts-dir'] ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0" />
                )}
                <Folder className="h-3.5 w-3.5 text-[#fa5008] fill-[#fa5008]/15 shrink-0" />
                <span>07_Fonts</span>
              </button>
              {expandedZipDirs['fonts-dir'] && (
                <div className="pl-6 space-y-0.5 text-[10.5px] text-[#71717a]">
                  <div className="flex items-center gap-1.5 py-0.5">
                    <FileIcon className="h-3 w-3 text-[#a1a1aa]" />
                    <span>
                      Primary_{typography.primary.family.replace(/\s+/g, '_')}-{typography.primary.weight}.ttf
                    </span>
                  </div>
                  {typography.secondary.family !== typography.primary.family && (
                    <div className="flex items-center gap-1.5 py-0.5">
                      <FileIcon className="h-3 w-3 text-[#a1a1aa]" />
                      <span>
                        Secondary_{typography.secondary.family.replace(/\s+/g, '_')}-{typography.secondary.weight}.ttf
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 py-0.5">
                    <FileIcon className="h-3 w-3 text-[#a1a1aa]" />
                    <span>Fonts_Install_README.txt</span>
                  </div>
                </div>
              )}

              {exportConfig.guide.enabled && (
                <div className="flex items-center gap-1.5 py-0.5 pl-6 text-[#52525b]">
                  <FileIcon className="h-3.5 w-3.5 text-[#fa5008] shrink-0" />
                  <span>
                    {slug}-logo-guide-{exportConfig.guide.language}.pdf
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Progress + Main Action */}
      {exportError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
          {exportError}
        </div>
      )}

      {busyLabel && (
        <div role="status" aria-live="polite" className="rounded-xl border border-[#e5e3dc] bg-white p-4 space-y-2">
          <div className="flex justify-between text-xs font-mono text-[#52525b]">
            <span>{busyLabel}</span>
            <span>{progress}%</span>
          </div>
          <progress
            className="brand-progress"
            max={100}
            value={progress}
            aria-label={busyLabel}
          />
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-full border border-[#e5e3dc] bg-white h-11 px-6 text-sm font-medium text-[#1f1f1f] shadow-2xs hover:bg-[#f8f6f1] transition"
        >
          <ArrowLeft className="h-4 w-4" /> {t.back}
        </button>
        <button
          disabled={!!busyLabel || assets.length === 0}
          onClick={handleDownloadZip}
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#fa5008] h-11 px-8 text-sm font-semibold text-white shadow-sm hover:bg-[#e04505] disabled:opacity-50 transition"
        >
          <Download className="h-4 w-4" /> {t.downloadZip}
        </button>
      </div>

      {/* Icon Settings Modal (matching Screenshot 6: Scale slider + Color swatches) */}
      {iconModal && iconSourceAsset && (
        <div
          onClick={() => setIconModal(null)}
          className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-[#e5e3dc] bg-white p-5 space-y-5 shadow-xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[#1f1f1f]">
                {iconModal === 'favicon'
                  ? 'Favicon settings'
                  : iconModal === 'appIcon'
                    ? 'App Icon settings'
                    : 'Avatar settings'}
              </h3>
              <button
                type="button"
                onClick={() => setIconModal(null)}
                className="rounded-lg p-1 text-[#6b6b6b] hover:bg-[#f8f6f1] hover:text-[#1f1f1f]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {iconModal === 'favicon' && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-white border border-[#e5e3dc] px-3 py-2.5 text-xs">
                    <div
                      className={`h-5 w-5 rounded flex items-center justify-center overflow-hidden ${
                        exportConfig.icons.faviconBg === 'transparent' ? 'checkerboard-bg' : ''
                      }`}
                      style={
                        exportConfig.icons.faviconBg !== 'transparent'
                          ? { backgroundColor: exportConfig.icons.faviconBg }
                          : undefined
                      }
                    >
                      <div
                        className="h-4 w-4 [&>svg]:w-full [&>svg]:h-full"
                        style={{ transform: `scale(${exportConfig.icons.faviconScale})` }}
                        dangerouslySetInnerHTML={{
                          __html: recolorSvg(
                            iconSourceAsset.svgContent,
                            exportConfig.icons.faviconColor,
                            exportConfig.icons.faviconBg === 'transparent'
                              ? '#FFFFFF'
                              : exportConfig.icons.faviconBg,
                          ),
                        }}
                      />
                    </div>
                    <span className="truncate font-medium">{brandName || 'Brand'}</span>
                  </div>

                  <div className="flex items-center gap-2 rounded-xl bg-[#1f1f1f] text-white px-3 py-2.5 text-xs">
                    <div
                      className="h-5 w-5 rounded flex items-center justify-center overflow-hidden"
                      style={
                        exportConfig.icons.faviconDarkBg !== 'transparent'
                          ? { backgroundColor: exportConfig.icons.faviconDarkBg }
                          : undefined
                      }
                    >
                      <div
                        className="h-4 w-4 [&>svg]:w-full [&>svg]:h-full"
                        style={{ transform: `scale(${exportConfig.icons.faviconScale})` }}
                        dangerouslySetInnerHTML={{
                          __html: recolorSvg(
                            iconSourceAsset.svgContent,
                            exportConfig.icons.faviconDarkColor,
                            exportConfig.icons.faviconDarkBg === 'transparent'
                              ? '#1F1F1F'
                              : exportConfig.icons.faviconDarkBg,
                          ),
                        }}
                      />
                    </div>
                    <span className="truncate font-medium">{brandName || 'Brand'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SwatchPickerRow
                    title="Favicon Color"
                    value={exportConfig.icons.faviconColor}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, faviconColor: v },
                      }))
                    }
                  />
                  <SwatchPickerRow
                    title="Dark Favicon Color"
                    value={exportConfig.icons.faviconDarkColor}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, faviconDarkColor: v },
                      }))
                    }
                  />
                  <SwatchPickerRow
                    title="Favicon Background"
                    value={exportConfig.icons.faviconBg}
                    allowTransparent
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, faviconBg: v },
                      }))
                    }
                  />
                  <SwatchPickerRow
                    title="Dark Favicon Background"
                    value={exportConfig.icons.faviconDarkBg}
                    allowTransparent
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, faviconDarkBg: v },
                      }))
                    }
                  />
                </div>

                <div className="space-y-2 pt-2 border-t border-[#eceae5]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1f1f1f]">Scale</span>
                    <span className="rounded-md border border-[#e5e3dc] px-2 py-0.5 font-mono text-xs">
                      {Math.round(exportConfig.icons.faviconScale * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={180}
                    value={Math.round(exportConfig.icons.faviconScale * 100)}
                    onChange={(e) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, faviconScale: Number(e.target.value) / 100 },
                      }))
                    }
                    className="w-full accent-[#fa5008]"
                  />
                </div>
              </>
            )}

            {iconModal === 'appIcon' && (
              <>
                <div className="flex justify-center py-2">
                  <div
                    className="h-20 w-20 rounded-[18px] border border-[#e5e3dc] flex items-center justify-center p-3 overflow-hidden shadow-sm"
                    style={{ backgroundColor: exportConfig.icons.appIconBg }}
                  >
                    <div
                      className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                      style={{ transform: `scale(${exportConfig.icons.appIconScale})` }}
                      dangerouslySetInnerHTML={{
                        __html: recolorSvg(
                          iconSourceAsset.svgContent,
                          exportConfig.icons.appIconColor,
                          exportConfig.icons.appIconBg,
                        ),
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SwatchPickerRow
                    title="Icon Color"
                    value={exportConfig.icons.appIconColor}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, appIconColor: v },
                      }))
                    }
                  />
                  <SwatchPickerRow
                    title="Background Color"
                    value={exportConfig.icons.appIconBg}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, appIconBg: v },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-[#eceae5]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1f1f1f]">Scale</span>
                    <span className="rounded-md border border-[#e5e3dc] px-2 py-0.5 font-mono text-xs">
                      {Math.round(exportConfig.icons.appIconScale * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={180}
                    value={Math.round(exportConfig.icons.appIconScale * 100)}
                    onChange={(e) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, appIconScale: Number(e.target.value) / 100 },
                      }))
                    }
                    className="w-full accent-[#fa5008]"
                  />
                </div>
              </>
            )}

            {iconModal === 'avatar' && (
              <>
                <div className="flex justify-center py-2">
                  <div
                    className="h-20 w-20 rounded-full border border-[#e5e3dc] flex items-center justify-center p-3 overflow-hidden shadow-sm"
                    style={{ backgroundColor: exportConfig.icons.avatarBg }}
                  >
                    <div
                      className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full"
                      style={{ transform: `scale(${exportConfig.icons.avatarScale})` }}
                      dangerouslySetInnerHTML={{
                        __html: recolorSvg(
                          iconSourceAsset.svgContent,
                          exportConfig.icons.avatarColor,
                          exportConfig.icons.avatarBg,
                        ),
                      }}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <SwatchPickerRow
                    title="Icon Color"
                    value={exportConfig.icons.avatarColor}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, avatarColor: v },
                      }))
                    }
                  />
                  <SwatchPickerRow
                    title="Background Color"
                    value={exportConfig.icons.avatarBg}
                    brandColors={colors}
                    onChange={(v) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, avatarBg: v },
                      }))
                    }
                  />
                </div>
                <div className="space-y-2 pt-2 border-t border-[#eceae5]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#1f1f1f]">Scale</span>
                    <span className="rounded-md border border-[#e5e3dc] px-2 py-0.5 font-mono text-xs">
                      {Math.round(exportConfig.icons.avatarScale * 100)} %
                    </span>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={180}
                    value={Math.round(exportConfig.icons.avatarScale * 100)}
                    onChange={(e) =>
                      setExportConfig((p) => ({
                        ...p,
                        icons: { ...p.icons, avatarScale: Number(e.target.value) / 100 },
                      }))
                    }
                    className="w-full accent-[#fa5008]"
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Live PDF Guide Preview Modal (matching Screenshot 5 "View guide") */}
      {pdfPreviewUrl && (
        <div
          onClick={() => setPdfPreviewUrl('')}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl h-[86vh] rounded-2xl border border-[#e5e3dc] bg-white flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-4 py-3 border-b border-[#eceae5] flex items-center justify-between bg-[#faf9f6]">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#1f1f1f]">
                <BookOpen className="h-4 w-4 text-[#fa5008]" />
                <span>{brandName || 'Brand'} — Logo Guide PDF Preview</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={pdfPreviewUrl}
                  download={`${slug}-logo-guide-${exportConfig.guide.language}.pdf`}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#fa5008] px-4 h-8 text-xs font-semibold text-white hover:bg-[#e04505]"
                >
                  <Download className="h-3.5 w-3.5" /> {t.downloadGuidePdf}
                </a>
                <button
                  type="button"
                  onClick={() => setPdfPreviewUrl('')}
                  className="rounded-lg p-1.5 text-[#6b6b6b] hover:bg-[#eceae5] hover:text-[#1f1f1f]"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            <iframe
              src={pdfPreviewUrl}
              title="Brand Guidelines PDF Preview"
              className="flex-1 w-full bg-[#27272a]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
