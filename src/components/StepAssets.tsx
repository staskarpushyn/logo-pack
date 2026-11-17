import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  Check,
  CheckCircle2,
  ChevronDown,
  Eye,
  GripVertical,
  Info,
  Trash2,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import type { AssetRole, Locale, LogoAsset, SvgCheckItem } from '../types';
import { COPY } from '../i18n';
import { auditSvg, guessRoleFromFilename } from '../utils/svgEngine';
import { importVectorFile } from '../utils/vectorImport';

interface StepAssetsProps {
  locale: Locale;
  brandName: string;
  setBrandName: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  tagline: string;
  setTagline: (v: string) => void;
  designedBy: string;
  setDesignedBy: (v: string) => void;
  assets: LogoAsset[];
  setAssets: React.Dispatch<React.SetStateAction<LogoAsset[]>>;
  onNext: () => void;
}

const ROLES: AssetRole[] = [
  'primary',
  'primary_dark',
  'horizontal',
  'vertical',
  'mark',
  'monogram',
  'wordmark',
  'app_icon',
  'custom',
];

const ROLE_DESCRIPTIONS: Record<AssetRole, { en: string; ua: string }> = {
  primary: {
    en: 'Main logo for light backgrounds.',
    ua: 'Основний логотип для світлих фонів.',
  },
  primary_dark: {
    en: 'Original logo prepared for dark backgrounds.',
    ua: 'Оригінальний логотип для темних фонів.',
  },
  horizontal: {
    en: 'Wide lockup variant exported separately.',
    ua: 'Горизонтальна версія, експортується окремо.',
  },
  vertical: {
    en: 'Stacked / vertical lockup exported separately.',
    ua: 'Вертикальна версія, експортується окремо.',
  },
  mark: {
    en: 'Standalone symbol / icon mark without wordmark.',
    ua: 'Окремий графічний знак без тексту.',
  },
  monogram: {
    en: 'Compact initials monogram for tight spaces.',
    ua: 'Компактна монограма для невеликих носіїв.',
  },
  wordmark: {
    en: 'Text-only brand logotype without icon.',
    ua: 'Текстовий логотип без графічного знаку.',
  },
  app_icon: {
    en: 'Preferred source artwork for app icon & favicon.',
    ua: 'Джерело для генерації фавікона й іконки додатку.',
  },
  custom: {
    en: 'Standalone variant exported in its own folder.',
    ua: 'Окрема додаткова версія у власній папці.',
  },
};

const PILL_META: Array<{
  checkId: SvgCheckItem['id'];
  en: string;
  ua: string;
  tipEn: string;
  tipUa: string;
}> = [
  {
    checkId: 'hidden',
    en: 'Transparency',
    ua: 'Прозорість',
    tipEn: 'Checks invisible layers, opacity:0 or translucent fills that behave unexpectedly in CMYK/PDF.',
    tipUa: 'Перевіряє приховані шари, display:none або напівпрозорість, що може спотворити друк.',
  },
  {
    checkId: 'strokes',
    en: 'Lines',
    ua: 'Контури',
    tipEn: 'Expanded fills scale cleanly; unexpanded strokes may change thickness on resize.',
    tipUa: 'Розібрані криві масштабуються ідеально; неконвертовані strokes можуть змінити товщину.',
  },
  {
    checkId: 'text',
    en: 'Fonts',
    ua: 'Шрифти',
    tipEn: 'Text converted to outlines prevents missing-font substitutions on client devices.',
    tipUa: 'Текст переведений у криві не «злетить» через відсутній шрифт на інших ПК.',
  },
  {
    checkId: 'background',
    en: 'Background',
    ua: 'Фон',
    tipEn: 'Artboard-sized rectangles block true transparent PNG/SVG backgrounds.',
    tipUa: 'Фоновий прямокутник перекриває прозорість у PNG та SVG.',
  },
  {
    checkId: 'images',
    en: 'Images',
    ua: 'Растр',
    tipEn: 'No embedded bitmaps ensures razor-sharp infinite vector scaling.',
    tipUa: 'Відсутність вбудованого растру гарантує бездоганну якість на будь-якому розмірі.',
  },
];

const RoleDropdown: React.FC<{
  value: AssetRole;
  onChange: (role: AssetRole) => void;
  locale: Locale;
}> = ({ value, onChange, locale }) => {
  const t = COPY[locale];
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onDocClick);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDocClick);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative w-full sm:w-72">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={`w-full h-10 rounded-lg border px-3 text-left text-xs font-medium flex items-center justify-between gap-2 transition ${
          open
            ? 'border-[#fa5008] bg-white ring-2 ring-[#fa5008]/20 text-[#1f1f1f]'
            : 'border-[#d6d2c8] bg-white text-[#1f1f1f] hover:border-[#fa5008]/70'
        }`}
      >
        <span className="truncate">{t.roles[value]}</span>
        <ChevronDown
          className={`h-4 w-4 text-[#6b6b6b] shrink-0 transition-transform ${open ? 'rotate-180 text-[#fa5008]' : ''}`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-11 z-30 w-full min-w-72 rounded-xl border border-[#e5e3dc] bg-white p-1.5 shadow-xl space-y-0.5 max-h-72 overflow-y-auto"
        >
          {ROLES.map((r) => {
            const active = r === value;
            return (
              <button
                key={r}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(r);
                  setOpen(false);
                }}
                className={`w-full rounded-lg px-2.5 py-2 text-left flex items-start justify-between gap-2 transition ${
                  active
                    ? 'bg-[#fa5008]/10 text-[#1f1f1f]'
                    : 'hover:bg-[#f8f6f1] text-[#1f1f1f]'
                }`}
              >
                <div className="min-w-0">
                  <div className={`text-xs font-semibold ${active ? 'text-[#fa5008]' : ''}`}>
                    {t.roles[r]}
                  </div>
                  <div className="text-[10px] text-[#6b6b6b] leading-snug">
                    {ROLE_DESCRIPTIONS[r][locale]}
                  </div>
                </div>
                {active && <Check className="h-3.5 w-3.5 text-[#fa5008] shrink-0 mt-0.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const StepAssets: React.FC<StepAssetsProps> = ({
  locale,
  brandName,
  setBrandName,
  industry,
  setIndustry,
  tagline,
  setTagline,
  designedBy,
  setDesignedBy,
  assets,
  setAssets,
  onNext,
}) => {
  const t = COPY[locale];
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDraggingUpload, setIsDraggingUpload] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeCheckTip, setActiveCheckTip] = useState<{
    assetId: string;
    checkId: SvgCheckItem['id'];
  } | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setUploadError('');
    const next: LogoAsset[] = [];
    const errors: string[] = [];

    for (const file of Array.from(files)) {
      const lower = file.name.toLowerCase();
      if (!lower.endsWith('.svg') && !lower.endsWith('.eps') && !lower.endsWith('.pdf')) {
        errors.push(
          locale === 'ua'
            ? `"${file.name}" пропущено — підтримуються .svg, .eps та .pdf`
            : `Skipped "${file.name}" — only .svg, .eps and .pdf files are supported`,
        );
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        errors.push(
          locale === 'ua'
            ? `"${file.name}" перевищує ліміт 10 МБ`
            : `"${file.name}" exceeds the 10 MB limit`,
        );
        continue;
      }
      if (assets.length + next.length >= 12) break;
      try {
        const imported = await importVectorFile(file);
        const audit = auditSvg(imported.svgContent);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          role: guessRoleFromFilename(file.name),
          svgContent: imported.svgContent,
          audit,
          sizeBytes: file.size,
          sourceFormat: imported.sourceFormat,
        });
      } catch (err) {
        errors.push(err instanceof Error ? err.message : `Failed to parse ${file.name}`);
      }
    }

    if (errors.length) setUploadError(errors[0]);
    if (next.length > 0) {
      setAssets((prev) => [...prev, ...next]);
    }
  };

  const moveAsset = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || toIdx < 0 || toIdx >= assets.length) return;
    setAssets((prev) => {
      const clone = [...prev];
      const [moved] = clone.splice(fromIdx, 1);
      clone.splice(toIdx, 0, moved);
      return clone;
    });
  };

  // Smart role & quality hints (Screenshot 10)
  const hasPrimary = assets.some((a) => a.role === 'primary');
  const hasPrimaryDark = assets.some((a) => a.role === 'primary_dark');
  const primaryCount = assets.filter((a) => a.role === 'primary').length;
  const assetsWithWarnings = assets.filter((a) =>
    a.audit.checks.some((c) => c.id !== 'colors' && c.status !== 'pass'),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1f1f1f]">
          {locale === 'ua' ? (
            <>
              Бренд та <span className="italic font-normal">асети</span>
            </>
          ) : (
            <>
              Brand <span className="italic font-normal">&amp; assets</span>
            </>
          )}
        </h1>
        <p className="mt-1.5 text-sm text-[#6b6b6b]">
          {locale === 'ua'
            ? 'Заповніть деталі бренду та додайте чисті векторні файли у форматі SVG, EPS або PDF.'
            : 'Enter brand details and upload clean SVG, vector EPS, or single-page PDF logo files.'}
        </p>
      </div>

      {/* Brand Details — 2 rows of 2 wide inputs for comfortable editing (Screenshot 1) */}
      <section className="rounded-xl border border-[#e5e3dc]/80 bg-[hsl(40_16%_93%/0.4)] p-5 space-y-4">
        <div className="text-[10px] uppercase tracking-widest font-semibold text-[#6b6b6b]">
          {t.brandInfo}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
              {t.brandName} *
            </label>
            <input
              type="text"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t.brandNamePlaceholder}
              className="w-full h-11 rounded-lg border border-[#e5e3dc] bg-white px-3.5 text-sm text-[#1f1f1f] shadow-2xs placeholder:text-[#6b6b6b]/65 focus:border-[#fa5008] focus:ring-1 focus:ring-[#fa5008]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
              {t.industry}
            </label>
            <input
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder={t.industryPlaceholder}
              className="w-full h-11 rounded-lg border border-[#e5e3dc] bg-white px-3.5 text-sm text-[#1f1f1f] shadow-2xs placeholder:text-[#6b6b6b]/65 focus:border-[#fa5008] focus:ring-1 focus:ring-[#fa5008]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
              {t.tagline}
            </label>
            <input
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder={t.taglinePlaceholder}
              className="w-full h-11 rounded-lg border border-[#e5e3dc] bg-white px-3.5 text-sm text-[#1f1f1f] shadow-2xs placeholder:text-[#6b6b6b]/65 focus:border-[#fa5008] focus:ring-1 focus:ring-[#fa5008]/30 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#6b6b6b] mb-1.5">
              {locale === 'ua' ? 'Автор / Студія (опц.)' : 'Designed by (optional)'}
            </label>
            <input
              type="text"
              value={designedBy}
              onChange={(e) => setDesignedBy(e.target.value)}
              placeholder={locale === 'ua' ? 'напр. Олена / Studio K' : 'e.g. Studio K'}
              className="w-full h-11 rounded-lg border border-[#e5e3dc] bg-white px-3.5 text-sm text-[#1f1f1f] shadow-2xs placeholder:text-[#6b6b6b]/65 focus:border-[#fa5008] focus:ring-1 focus:ring-[#fa5008]/30 focus:outline-none"
            />
          </div>
        </div>
      </section>

      {/* Dropzone — solid subtle grey background without dot pattern */}
      <section
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDraggingUpload(true);
        }}
        onDragLeave={() => setIsDraggingUpload(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDraggingUpload(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-9 text-center transition focus-visible:outline-2 focus-visible:outline-[#fa5008] ${
          isDraggingUpload
            ? 'border-[#fa5008] bg-[#fa5008]/[0.07]'
            : 'border-[#d6d2c8] bg-[hsl(40_16%_93%/0.4)] hover:border-[#fa5008] hover:bg-white'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".svg,.eps,.pdf,image/svg+xml,application/pdf,application/postscript"
          multiple
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
        />
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e3dc] bg-white text-[#6b6b6b] shadow-2xs">
          <Upload className="h-5 w-5" />
        </div>
        <p className="font-display text-base font-semibold text-[#1f1f1f]">{t.uploadTitle}</p>
        <p className="mt-1 text-xs text-[#6b6b6b] font-mono">{t.uploadHint}</p>
        <div className="mt-3.5 flex items-center justify-center gap-2">
          {(['SVG', 'EPS', 'PDF'] as const).map((ext) => (
            <span
              key={ext}
              className="rounded-md border border-[#e5e3dc] bg-white px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#6b6b6b]"
            >
              {ext}
            </span>
          ))}
        </div>
      </section>

      {/* Quiet vector preparation note & examples modal trigger — low visual weight */}
      <div className="rounded-xl border border-[#e5e3dc] bg-[#faf9f6] px-4 py-2.5 flex items-center justify-between gap-3 text-[11px] text-[#6b6b6b]">
        <div className="flex items-start gap-2 min-w-0">
          <Info className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-medium text-[#52525b]">
              {locale === 'ua' ? 'Вимоги до файлів: ' : 'File prep: '}
            </span>
            {locale === 'ua'
              ? 'чистий вектор без фонових прямокутників, без вбудованого растру та з текстом у кривих.'
              : 'clean vector artwork without background boxes, embedded rasters, or live text.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExamplesOpen(true)}
          className="inline-flex items-center gap-1 shrink-0 font-medium text-[#52525b] underline decoration-[#d6d2c8] underline-offset-2 hover:text-[#1f1f1f] transition"
        >
          <Eye className="h-3.5 w-3.5 text-[#8e8e8e]" />
          <span>{locale === 'ua' ? 'Приклади' : 'Examples'}</span>
        </button>
      </div>

      {uploadError && (
        <div
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 flex items-center gap-2"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Role Conflict & Pre-flight Export Warnings (Screenshot 10) */}
      {assets.length > 0 && hasPrimaryDark && !hasPrimary && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50/90 px-4 py-3 text-xs text-red-700 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {locale === 'ua'
              ? '«Основний (Темний)» потребує окремого «Основного логотипа» (Primary Logo). Для самостійного темного логотипа оберіть «Інший» або його фактичний тип.'
              : 'Primary Logo (Dark) needs a separate Primary Logo. For a standalone dark logo, choose Custom or its actual asset type.'}
          </span>
        </div>
      )}

      {assets.length > 0 && primaryCount > 1 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {locale === 'ua'
              ? 'Вибрано декілька файлів з роллю «Основний логотип». Рекомендується залишити один основний, а іншим призначити «Горизонтальний», «Вертикальний» або «Інший».'
              : 'Multiple assets are set to Primary Logo. Keep one main Primary Logo and set variants to Horizontal, Vertical, or Custom.'}
          </span>
        </div>
      )}

      {assetsWithWarnings.length > 0 && (
        <div className="rounded-xl border border-[#e5e3dc] bg-[#faf9f6] px-4 py-2.5 text-[11px] text-[#6b6b6b] flex items-start gap-2">
          <Info className="h-3.5 w-3.5 text-[#8e8e8e] shrink-0 mt-0.5" />
          <span>
            {locale === 'ua'
              ? 'Деякі файли мають попередження під картками — натисніть на індикатор для деталей.'
              : 'Some files show pre-flight warnings below — click any pill to inspect details.'}
          </span>
        </div>
      )}

      {/* Horizontal Draggable Logo Asset Cards (Screenshot 9) */}
      {assets.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between text-[11px] text-[#6b6b6b]">
            <span className="font-medium">
              {locale === 'ua'
                ? 'Порядок логотипів (перетягніть ⋮⋮ для зміни позиції)'
                : 'Choose each file’s role & order (drag ⋮⋮ to reorder)'}
            </span>
            <span className="font-mono">{assets.length} / 12</span>
          </div>

          <div className="space-y-3">
            {assets.map((asset, index) => {
              const isDark = asset.role === 'primary_dark';
              const fmtBadge = (asset.sourceFormat ?? 'svg').toUpperCase();
              const sizeKb = `${(asset.sizeBytes / 1024).toFixed(1)} KB`;
              const checkMap = new Map(asset.audit.checks.map((c) => [c.id, c]));

              return (
                <div
                  key={asset.id}
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = 'move';
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && hoverIndex !== index) setHoverIndex(index);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null && dragIndex !== index) {
                      moveAsset(dragIndex, index);
                    }
                    setDragIndex(null);
                    setHoverIndex(null);
                  }}
                  onDragEnd={() => {
                    setDragIndex(null);
                    setHoverIndex(null);
                  }}
                  className={`group rounded-2xl border bg-white p-4 transition shadow-2xs ${
                    hoverIndex === index && dragIndex !== index
                      ? 'border-[#fa5008] ring-2 ring-[#fa5008]/20'
                      : 'border-[#e5e3dc] hover:border-[#d6d2c8]'
                  } ${dragIndex === index ? 'opacity-55' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                    {/* Left Drag Handle + Thumbnail */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveAsset(index, index - 1)}
                          disabled={index === 0}
                          className="p-0.5 text-[#a1a1aa] hover:text-[#1f1f1f] disabled:opacity-25"
                          title={locale === 'ua' ? 'Вгору' : 'Move up'}
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <div
                          className="cursor-grab active:cursor-grabbing p-1 text-[#a1a1aa] hover:text-[#1f1f1f]"
                          title={locale === 'ua' ? 'Перетягніть для зміни порядку' : 'Drag to reorder'}
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <button
                          type="button"
                          onClick={() => moveAsset(index, index + 1)}
                          disabled={index === assets.length - 1}
                          className="p-0.5 text-[#a1a1aa] hover:text-[#1f1f1f] disabled:opacity-25"
                          title={locale === 'ua' ? 'Вниз' : 'Move down'}
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>

                      <div
                        className={`h-20 w-20 rounded-xl border border-[#e5e3dc] flex items-center justify-center p-2.5 shrink-0 ${
                          isDark ? 'bg-[#1f1f1f]' : 'checkerboard-bg'
                        }`}
                      >
                        <div
                          className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-auto [&>svg]:h-auto"
                          dangerouslySetInnerHTML={{ __html: asset.svgContent }}
                        />
                      </div>
                    </div>

                    {/* Right Info + Custom Role Dropdown + Checks */}
                    <div className="flex-1 min-w-0 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <span className="truncate text-xs font-mono font-semibold text-[#1f1f1f]">
                            {asset.name}
                          </span>
                          <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700">
                            {fmtBadge}
                          </span>
                          <span className="text-[11px] font-mono text-[#8e8e8e]">
                            {sizeKb} · {Math.round(asset.audit.width)}×{Math.round(asset.audit.height)}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => setAssets((prev) => prev.filter((a) => a.id !== asset.id))}
                          className="rounded-lg p-1.5 text-[#8e8e8e] hover:bg-red-50 hover:text-red-600 transition shrink-0"
                          title={locale === 'ua' ? 'Видалити' : 'Remove'}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <RoleDropdown
                          value={asset.role}
                          locale={locale}
                          onChange={(role) =>
                            setAssets((prev) =>
                              prev.map((a) => (a.id === asset.id ? { ...a, role } : a)),
                            )
                          }
                        />
                        <div className="flex items-center gap-1.5">
                          {asset.audit.colors.slice(0, 5).map((hex) => (
                            <span
                              key={hex}
                              title={hex}
                              className="h-4 w-4 rounded-full border border-black/15"
                              style={{ backgroundColor: hex }}
                            />
                          ))}
                        </div>
                      </div>

                      <p className="text-[11px] text-[#8e8e8e]">{ROLE_DESCRIPTIONS[asset.role][locale]}</p>

                      {/* 5 Quality Check Pills (Screenshot 9) */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {PILL_META.map((pm) => {
                          const chk = checkMap.get(pm.checkId);
                          const status = chk?.status ?? 'pass';
                          const isSelectedTip =
                            activeCheckTip?.assetId === asset.id &&
                            activeCheckTip?.checkId === pm.checkId;
                          return (
                            <button
                              key={pm.checkId}
                              type="button"
                              onClick={() =>
                                setActiveCheckTip(
                                  isSelectedTip
                                    ? null
                                    : { assetId: asset.id, checkId: pm.checkId },
                                )
                              }
                              title={pm[locale === 'ua' ? 'tipUa' : 'tipEn']}
                              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
                                status === 'pass'
                                  ? 'border-emerald-200 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100/70'
                                  : status === 'warn'
                                    ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                                    : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              {status === 'pass' ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0" />
                              ) : status === 'warn' ? (
                                <AlertTriangle className="h-3 w-3 shrink-0" />
                              ) : (
                                <XCircle className="h-3 w-3 shrink-0" />
                              )}
                              <span>{pm[locale]}</span>
                            </button>
                          );
                        })}
                      </div>

                      {/* Expandable detail for clicked check pill */}
                      {activeCheckTip?.assetId === asset.id && (() => {
                        const meta = PILL_META.find((m) => m.checkId === activeCheckTip.checkId);
                        const chk = checkMap.get(activeCheckTip.checkId);
                        if (!meta) return null;
                        return (
                          <div className="rounded-lg border border-[#e5e3dc] bg-[#faf9f6] px-3 py-2 text-[11px] text-[#52525b] space-y-1">
                            <div className="font-semibold text-[#1f1f1f]">
                              {meta[locale]} — {chk?.status === 'pass' ? (locale === 'ua' ? 'Пройдено без зауважень' : 'Passed cleanly') : t.checks[meta.checkId]?.title}
                            </div>
                            <div>{locale === 'ua' ? meta.tipUa : meta.tipEn}</div>
                            {chk && chk.details.length > 0 && chk.status !== 'pass' && (
                              <div className="font-mono text-[10px] text-[#71717a]">
                                {chk.details.slice(0, 3).join(' · ')}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Footer Action */}
      <div className="flex justify-end pt-2">
        <button
          disabled={assets.length === 0}
          onClick={onNext}
          className="inline-flex items-center justify-center gap-2.5 rounded-full bg-[#fa5008] h-11 px-8 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e04505] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t.next}
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>

      {/* Artwork Examples Modal ("See examples" from Screenshot 8) */}
      {examplesOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-xs"
          onClick={() => setExamplesOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-[#e5e3dc] bg-white p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1f1f1f]">
                {locale === 'ua'
                  ? 'Як підготувати файли логотипу без дефектів'
                  : 'How to prepare clean vector logo files'}
              </h3>
              <button
                type="button"
                onClick={() => setExamplesOpen(false)}
                className="rounded-lg p-1 text-[#6b6b6b] hover:bg-[#eceae5]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 space-y-2">
                <div className="font-semibold text-emerald-800 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {locale === 'ua' ? 'Правильний файл' : 'Clean vector file'}
                </div>
                <ul className="space-y-1.5 text-[#3f3f46] list-disc pl-4">
                  <li>{locale === 'ua' ? 'Прозорий фон без білих прямокутників' : 'Transparent artboard with no backdrop rect'}</li>
                  <li>{locale === 'ua' ? 'Весь текст переведений у криві (Outlines)' : 'All text converted to vector outlines'}</li>
                  <li>{locale === 'ua' ? 'Обводки розібрані у заливки (Expand)' : 'Strokes expanded to filled shapes'}</li>
                  <li>{locale === 'ua' ? 'Щільний viewBox без зайвих пустих полів' : 'Tight artboard / viewBox bounds'}</li>
                </ul>
              </div>

              <div className="rounded-xl border border-red-200 bg-red-50/40 p-4 space-y-2">
                <div className="font-semibold text-red-800 flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  {locale === 'ua' ? 'Чого варто уникати' : 'What causes export defects'}
                </div>
                <ul className="space-y-1.5 text-[#3f3f46] list-disc pl-4">
                  <li>{locale === 'ua' ? 'Вбудовані растрові PNG/JPG всередині SVG' : 'Embedded raster images inside vector SVG'}</li>
                  <li>{locale === 'ua' ? 'Суцільний білий або прозорий короб позаду лого' : 'Full-canvas solid or invisible hitboxes'}</li>
                  <li>{locale === 'ua' ? 'Живий текст (<text>) без шрифтових кривих' : 'Live un-outlined text dependent on local fonts'}</li>
                  <li>{locale === 'ua' ? 'Приховані шари або невидимі групи' : 'Hidden layers or opacity: 0 leftovers'}</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
