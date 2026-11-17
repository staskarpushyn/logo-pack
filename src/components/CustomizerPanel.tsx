import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FileText,
  Monitor,
  RotateCcw,
  SlidersHorizontal,
  Upload,
  X,
} from 'lucide-react';
import {
  DEFAULT_CUSTOMIZER_CONFIG,
  type CustomizerConfig,
  type Locale,
  type PdfSectionId,
} from '../types';
import { ToggleSwitch } from './ToggleSwitch';

interface CustomizerPanelProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  config: CustomizerConfig;
  setConfig: React.Dispatch<React.SetStateAction<CustomizerConfig>>;
}

const SECTION_LABELS: Record<PdfSectionId, { en: string; ua: string }> = {
  cover: { en: 'Cover Page', ua: 'Титульна сторінка (Cover)' },
  package: { en: 'Logo Package Tree', ua: 'Структура файлів (Package)' },
  colors: { en: 'Brand Colors', ua: 'Кольори бренду' },
  primary: { en: 'Primary Logo Original', ua: 'Основний логотип (White/Black)' },
  clearSpace: { en: 'Clear Space & Min Size', ua: 'Охоронне поле та мін. розмір' },
  colorVariations: { en: 'Color Variations', ua: 'Кольорові варіації' },
  backgroundUsage: { en: 'Background Usage', ua: 'Використання на фонах' },
  incorrectUsage: { en: 'Incorrect Usage (Don’ts)', ua: 'Заборонене використання' },
  typography: { en: 'Brand Typography', ua: 'Типографіка бренду' },
  additionalVersions: { en: 'Additional Versions / Mark', ua: 'Додаткові версії / Знак' },
  bento: { en: 'Brand Overview Board', ua: 'Дошка бренду (Overview)' },
  applications: { en: 'Brand Applications (Mockups)', ua: 'Носії бренду (Мокапи)' },
  backCover: { en: 'Back Cover', ua: 'Фінальна обкладинка' },
};

const SliderControl: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  hint?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, unit = '', hint, onChange }) => (
  <div className="space-y-1">
    <div className="flex items-center justify-between text-[11px]">
      <span className="text-[#52525b] font-medium">{label}</span>
      <span className="font-mono text-[#1f1f1f] bg-[#f8f6f1] border border-[#e5e3dc] rounded px-1.5 py-0.5 text-[10px]">
        {value}
        {unit}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-1.5 accent-[#fa5008] cursor-pointer"
    />
    {hint && <div className="text-[10px] text-[#8e8e8e] leading-snug">{hint}</div>}
  </div>
);

const ColorControl: React.FC<{
  label: string;
  value: string;
  onChange: (hex: string) => void;
}> = ({ label, value, onChange }) => (
  <div className="flex items-center justify-between gap-2 text-[11px]">
    <span className="text-[#52525b] truncate">{label}</span>
    <label className="inline-flex items-center gap-1.5 rounded-md border border-[#e5e3dc] bg-[#f8f6f1] px-1.5 py-1 cursor-pointer">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value.toUpperCase())}
        className="h-4 w-4 border-0 bg-transparent p-0 cursor-pointer"
      />
      <span className="font-mono text-[10px] text-[#1f1f1f]">{value}</span>
    </label>
  </div>
);

export const CustomizerPanel: React.FC<CustomizerPanelProps> = ({
  open,
  onClose,
  locale,
  config,
  setConfig,
}) => {
  const [tab, setTab] = useState<'ui' | 'guide'>('ui');
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const updateUi = <K extends keyof CustomizerConfig['ui']>(
    key: K,
    val: CustomizerConfig['ui'][K],
  ) => setConfig((p) => ({ ...p, ui: { ...p.ui, [key]: val } }));

  const updateGuide = <K extends keyof CustomizerConfig['guide']>(
    key: K,
    val: CustomizerConfig['guide'][K],
  ) => setConfig((p) => ({ ...p, guide: { ...p.guide, [key]: val } }));

  const moveSection = (index: number, dir: -1 | 1) => {
    const next = [...config.guide.sections];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    updateGuide('sections', next);
  };

  const toggleSection = (id: PdfSectionId, enabled: boolean) => {
    updateGuide(
      'sections',
      config.guide.sections.map((s) => (s.id === id ? { ...s, enabled } : s)),
    );
  };

  const exportPreset = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'logopack-customizer-preset.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const importPreset = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text()) as Partial<CustomizerConfig>;
      setConfig((prev) => ({
        ui: { ...prev.ui, ...(parsed.ui || {}) },
        guide: { ...prev.guide, ...(parsed.guide || {}) },
      }));
    } catch {
      // Ignore invalid JSON
    }
  };

  return (
    <aside className="fixed top-16 right-0 bottom-0 z-40 w-80 sm:w-96 border-l border-[#e5e3dc] bg-white shadow-2xl flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#eceae5] flex items-center justify-between bg-[#faf9f6]">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#1f1f1f]">
          <SlidersHorizontal className="h-4 w-4 text-[#fa5008]" />
          <span>{locale === 'ua' ? 'Редактор дизайну й макету' : 'Visual Builder'}</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={exportPreset}
            title="Export JSON preset"
            className="rounded-md p-1.5 text-[#6b6b6b] hover:bg-[#eceae5] hover:text-[#1f1f1f]"
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            title="Import JSON preset"
            className="rounded-md p-1.5 text-[#6b6b6b] hover:bg-[#eceae5] hover:text-[#1f1f1f]"
          >
            <Upload className="h-3.5 w-3.5" />
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => importPreset(e.target.files?.[0])}
            />
          </button>
          <button
            type="button"
            onClick={() => setConfig(DEFAULT_CUSTOMIZER_CONFIG)}
            title="Reset defaults"
            className="rounded-md p-1.5 text-[#6b6b6b] hover:bg-[#eceae5] hover:text-[#1f1f1f]"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-[#6b6b6b] hover:bg-[#eceae5] hover:text-[#1f1f1f]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Mode Tabs */}
      <div className="p-2.5 border-b border-[#eceae5]">
        <div className="grid grid-cols-2 rounded-lg bg-[#eceae5]/70 p-1 text-xs font-medium">
          <button
            type="button"
            onClick={() => setTab('ui')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
              tab === 'ui' ? 'bg-white text-[#1f1f1f] shadow-2xs' : 'text-[#6b6b6b]'
            }`}
          >
            <Monitor className="h-3.5 w-3.5" />
            {locale === 'ua' ? 'Інтерфейс сайту' : 'App UI'}
          </button>
          <button
            type="button"
            onClick={() => setTab('guide')}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md py-1.5 transition ${
              tab === 'guide' ? 'bg-white text-[#1f1f1f] shadow-2xs' : 'text-[#6b6b6b]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            {locale === 'ua' ? 'PDF і Дошка' : 'PDF & Board'}
          </button>
        </div>
      </div>

      {/* Scrollable Sliders, Toggles & Color Pickers */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {tab === 'ui' ? (
          <>
            {/* Structure / Visibility Toggles */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Блоки інтерфейсу' : 'UI Blocks'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-2.5">
                <ToggleSwitch
                  size="xs"
                  labelPosition="right"
                  checked={config.ui.showDotSpotlight}
                  onChange={(v) => updateUi('showDotSpotlight', v)}
                  label={locale === 'ua' ? 'Сітка крапок і підсвічування' : 'Interactive dot matrix'}
                />
                <ToggleSwitch
                  size="xs"
                  labelPosition="right"
                  checked={config.ui.showNavChecker}
                  onChange={(v) => updateUi('showNavChecker', v)}
                  label={locale === 'ua' ? 'Вкладка SVG Перевірка' : 'SVG Checker tab'}
                />
                <ToggleSwitch
                  size="xs"
                  labelPosition="right"
                  checked={config.ui.showSummary}
                  onChange={(v) => updateUi('showSummary', v)}
                  label={locale === 'ua' ? 'Бокова панель Summary' : 'Summary sidebar'}
                />
                <ToggleSwitch
                  size="xs"
                  labelPosition="right"
                  checked={config.ui.showSummarySwatches}
                  onChange={(v) => updateUi('showSummarySwatches', v)}
                  label={locale === 'ua' ? 'Кольори в Summary' : 'Summary color swatches'}
                />
                <ToggleSwitch
                  size="xs"
                  labelPosition="right"
                  checked={config.ui.showSummaryAssets}
                  onChange={(v) => updateUi('showSummaryAssets', v)}
                  label={locale === 'ua' ? 'Список асетів у Summary' : 'Summary asset list'}
                />
              </div>
            </div>

            {/* Sizes & Spacing Sliders */}
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Розміри та відступи' : 'Dimensions & Spacing'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-3">
                <SliderControl
                  label={locale === 'ua' ? 'Ширина контейнера' : 'Container Max Width'}
                  value={config.ui.containerMaxWidth}
                  min={960}
                  max={1520}
                  step={20}
                  unit="px"
                  hint={locale === 'ua' ? 'Реком. 1000–1160px для зручного фокусу' : 'Rec. 1000–1160px'}
                  onChange={(v) => updateUi('containerMaxWidth', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Ширина Summary' : 'Sidebar Width'}
                  value={config.ui.sidebarWidth}
                  min={220}
                  max={360}
                  step={5}
                  unit="px"
                  hint={locale === 'ua' ? 'Права панель підсумку (реком. 250px)' : 'Right summary panel (rec. 250px)'}
                  onChange={(v) => updateUi('sidebarWidth', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Внутрішній відступ карток' : 'Card Padding'}
                  value={config.ui.cardPadding}
                  min={12}
                  max={36}
                  unit="px"
                  hint={locale === 'ua' ? '«Повітря» всередині основної картки' : 'Inner card breathing room'}
                  onChange={(v) => updateUi('cardPadding', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Скруглення карток' : 'Card Radius'}
                  value={config.ui.cardRadius}
                  min={4}
                  max={32}
                  unit="px"
                  hint={locale === 'ua' ? 'Кути блоків інтерфейсу (реком. 16px)' : 'UI card corner radius'}
                  onChange={(v) => updateUi('cardRadius', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Проміжки між секціями' : 'Section Gap'}
                  value={config.ui.sectionGap}
                  min={12}
                  max={40}
                  unit="px"
                  hint={locale === 'ua' ? 'Відстань між основними блоками' : 'Spacing between blocks'}
                  onChange={(v) => updateUi('sectionGap', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Крок сітки фону' : 'Dot Grid Spacing'}
                  value={config.ui.dotSpacing}
                  min={12}
                  max={30}
                  unit="px"
                  hint={locale === 'ua' ? 'Відстань між крапками фону (реком. 25px)' : 'Background dot pitch (rec. 25px)'}
                  onChange={(v) => updateUi('dotSpacing', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Насиченість крапок' : 'Dot Opacity'}
                  value={config.ui.dotOpacity}
                  min={0}
                  max={20}
                  unit="%"
                  hint={locale === 'ua' ? 'Видимість точкового візерунку (реком. 10%)' : 'Dot pattern opacity (rec. 10%)'}
                  onChange={(v) => updateUi('dotOpacity', v)}
                />
              </div>
            </div>

            {/* Typography Scale */}
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Розмір тексту і кнопок' : 'Typography & Controls'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-3">
                <SliderControl
                  label={locale === 'ua' ? 'Розмір основного тексту' : 'Base Text Size'}
                  value={config.ui.bodyFontSize}
                  min={12}
                  max={18}
                  unit="px"
                  onChange={(v) => updateUi('bodyFontSize', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Масштаб заголовків' : 'Heading Scale'}
                  value={config.ui.headingScale}
                  min={80}
                  max={135}
                  unit="%"
                  onChange={(v) => updateUi('headingScale', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Скруглення кнопок' : 'Button Radius'}
                  value={config.ui.buttonRadius}
                  min={4}
                  max={32}
                  unit="px"
                  onChange={(v) => updateUi('buttonRadius', v)}
                />
              </div>
            </div>

            {/* UI Colors */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Кольори блоків і тексту' : 'Block & Text Colors'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-2">
                <ColorControl
                  label={locale === 'ua' ? 'Фон сторінки' : 'Page Background'}
                  value={config.ui.canvasBg}
                  onChange={(v) => updateUi('canvasBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Фон карток' : 'Card Surface'}
                  value={config.ui.cardBg}
                  onChange={(v) => updateUi('cardBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Вторинний фон' : 'Muted Surface'}
                  value={config.ui.mutedBg}
                  onChange={(v) => updateUi('mutedBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Рамки (Borders)' : 'Border Color'}
                  value={config.ui.borderColor}
                  onChange={(v) => updateUi('borderColor', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Акцентний колір' : 'Primary Accent'}
                  value={config.ui.accentColor}
                  onChange={(v) => updateUi('accentColor', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Основний текст' : 'Primary Text'}
                  value={config.ui.textPrimary}
                  onChange={(v) => updateUi('textPrimary', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Другорядний текст' : 'Muted Text'}
                  value={config.ui.textMuted}
                  onChange={(v) => updateUi('textMuted', v)}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            {/* PDF & Bento Structure / Reorder / Enable */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Структура і порядок сторінок PDF' : 'PDF Structure & Order'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] divide-y divide-[#eceae5]">
                {config.guide.sections.map((sec, idx) => (
                  <div
                    key={sec.id}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <ToggleSwitch
                      size="xs"
                      labelPosition="right"
                      checked={sec.enabled}
                      onChange={(v) => toggleSection(sec.id, v)}
                      label={SECTION_LABELS[sec.id][locale]}
                    />
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => moveSection(idx, -1)}
                        className="rounded p-1 text-[#6b6b6b] hover:bg-[#f8f6f1] disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === config.guide.sections.length - 1}
                        onClick={() => moveSection(idx, 1)}
                        className="rounded p-1 text-[#6b6b6b] hover:bg-[#f8f6f1] disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* PDF & Brand Board Dimensions */}
            <div className="space-y-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Розміри та відступи PDF / Дошки' : 'PDF & Board Dimensions'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-3">
                <SliderControl
                  label={locale === 'ua' ? 'Поля сторінки PDF' : 'PDF Page Margin'}
                  value={config.guide.pageMargin}
                  min={24}
                  max={72}
                  unit="pt"
                  hint={locale === 'ua' ? 'Зовнішні поля кожного слайда (реком. 44–52pt)' : 'Outer slide padding (rec. 48pt)'}
                  onChange={(v) => updateGuide('pageMargin', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Проміжки між картками' : 'Card Gap'}
                  value={config.guide.cardGap}
                  min={8}
                  max={32}
                  unit="pt"
                  hint={locale === 'ua' ? 'Відстань між плитками в PDF (реком. 16–20pt)' : 'Gap between PDF tiles'}
                  onChange={(v) => updateGuide('cardGap', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Скруглення блоків PDF' : 'PDF Card Radius'}
                  value={config.guide.cardRadius}
                  min={0}
                  max={24}
                  unit="pt"
                  hint={locale === 'ua' ? 'Кути прев’ю-блоків у PDF (реком. 8–14pt)' : 'Corner radius inside PDF'}
                  onChange={(v) => updateGuide('cardRadius', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Розмір заголовків PDF' : 'PDF Heading Size'}
                  value={config.guide.headerFontSize}
                  min={11}
                  max={20}
                  unit="pt"
                  hint={locale === 'ua' ? 'Кегль заголовків слайдів (реком. 14pt)' : 'Slide title size (rec. 14pt)'}
                  onChange={(v) => updateGuide('headerFontSize', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Розмір тексту PDF' : 'PDF Body Size'}
                  value={config.guide.bodyFontSize}
                  min={7}
                  max={13}
                  unit="pt"
                  hint={locale === 'ua' ? 'Описи та підписи правил (реком. 10pt)' : 'Descriptions & rules (rec. 10pt)'}
                  onChange={(v) => updateGuide('bodyFontSize', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Масштаб лого у PDF' : 'PDF Logo Scale'}
                  value={config.guide.logoScalePct}
                  min={60}
                  max={120}
                  unit="%"
                  hint={locale === 'ua' ? 'Заповнення картки логотипом (реком. 95–105%)' : 'Logo fill size (rec. 100%)'}
                  onChange={(v) => updateGuide('logoScalePct', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Проміжки сітки дошки' : 'Board Grid Gap'}
                  value={config.guide.bentoGap}
                  min={8}
                  max={40}
                  unit="px"
                  hint={locale === 'ua' ? 'Відступи між плитками дошки бренду (реком. 22px)' : 'Gap inside Brand Board'}
                  onChange={(v) => updateGuide('bentoGap', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Скруглення карток дошки' : 'Board Card Radius'}
                  value={config.guide.bentoRadius}
                  min={0}
                  max={48}
                  unit="px"
                  hint={locale === 'ua' ? 'Скруглення плиток дошки (реком. 28–32px)' : 'Board tile corner radius'}
                  onChange={(v) => updateGuide('bentoRadius', v)}
                />
                <SliderControl
                  label={locale === 'ua' ? 'Масштаб лого на дошці' : 'Board Logo Scale'}
                  value={config.guide.bentoLogoScalePct}
                  min={65}
                  max={125}
                  unit="%"
                  hint={locale === 'ua' ? 'Розмір логотипів на дошці (реком. 100%)' : 'Logo size on Brand Board'}
                  onChange={(v) => updateGuide('bentoLogoScalePct', v)}
                />
              </div>
            </div>

            {/* PDF & Board Colors */}
            <div className="space-y-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-[#6b6b6b]">
                {locale === 'ua' ? 'Кольори сторінок та тексту' : 'PDF & Board Colors'}
              </div>
              <div className="rounded-xl border border-[#e5e3dc] p-3 space-y-2">
                <ColorControl
                  label={locale === 'ua' ? 'Фон обкладинки' : 'Cover Background'}
                  value={config.guide.coverBg}
                  onChange={(v) => updateGuide('coverBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Текст обкладинки' : 'Cover Title Color'}
                  value={config.guide.coverTextColor}
                  onChange={(v) => updateGuide('coverTextColor', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Фон сторінок PDF' : 'PDF Page Background'}
                  value={config.guide.pdfPageBg}
                  onChange={(v) => updateGuide('pdfPageBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Світлі картки PDF' : 'PDF Light Card Bg'}
                  value={config.guide.pdfCardBg}
                  onChange={(v) => updateGuide('pdfCardBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Темні картки PDF' : 'PDF Dark Card Bg'}
                  value={config.guide.pdfDarkCardBg}
                  onChange={(v) => updateGuide('pdfDarkCardBg', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Заголовки PDF' : 'PDF Heading Text'}
                  value={config.guide.pdfHeadingColor}
                  onChange={(v) => updateGuide('pdfHeadingColor', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Описи PDF' : 'PDF Body Text'}
                  value={config.guide.pdfBodyColor}
                  onChange={(v) => updateGuide('pdfBodyColor', v)}
                />
                <ColorControl
                  label={locale === 'ua' ? 'Фон дошки бренду' : 'Brand Board Backdrop'}
                  value={config.guide.bentoBackdrop}
                  onChange={(v) => updateGuide('bentoBackdrop', v)}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};
