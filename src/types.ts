export type Locale = 'en' | 'ua';
export type AppMode = 'generator' | 'checker';
export type WizardStep = 1 | 2 | 3 | 4;

export type AssetRole =
  | 'primary'
  | 'primary_dark'
  | 'horizontal'
  | 'vertical'
  | 'mark'
  | 'monogram'
  | 'wordmark'
  | 'app_icon'
  | 'custom';

export interface SvgCheckItem {
  id: 'hidden' | 'strokes' | 'text' | 'background' | 'images' | 'colors';
  status: 'pass' | 'warn' | 'fail';
  count: number;
  details: string[];
}

export interface SvgAuditResult {
  valid: boolean;
  viewBox: string;
  width: number;
  height: number;
  aspectRatio: number;
  colors: string[];
  checks: SvgCheckItem[];
  score: number;
}

export interface LogoAsset {
  id: string;
  name: string;
  role: AssetRole;
  svgContent: string;
  audit: SvgAuditResult;
  sizeBytes: number;
  sourceFormat?: 'svg' | 'eps' | 'pdf';
}

export interface CmykValues {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface BrandColor {
  id: string;
  name: string;
  hex: string;
  cmykMode: 'auto' | 'manual';
  cmyk: CmykValues;
  useAsLogo: boolean;
  useAsBackground: boolean;
}

export type FontSource = 'google' | 'local' | 'upload' | 'default';

export interface FontConfig {
  enabled: boolean;
  source: FontSource;
  family: string;
  weight: number;
  italic: boolean;
  fileDataBase64?: string; // base64 of .ttf/.otf/.woff2 for embedding/FontFace
  fileFormat?: string; // 'ttf' | 'otf' | 'woff' | 'woff2'
}

export interface TypographyConfig {
  skipped: boolean;
  primary: FontConfig;
  secondary: FontConfig;
}

export interface MockupImage {
  id: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
}

export type BoardLayoutPreset = 'logomark' | 'swiss' | 'showcase' | 'monolith' | 'product';

export type BoardBlockId =
  | 'primary'
  | 'matrix'
  | 'logomarkSplit'
  | 'accentSign'
  | 'statement'
  | 'icons'
  | 'clearSpace'
  | 'application'
  | 'swatches'
  | 'typography';

export interface BoardBlockItem {
  id: BoardBlockId;
  enabled: boolean;
}

export const DEFAULT_BOARD_BLOCKS: BoardBlockItem[] = [
  { id: 'primary', enabled: true },
  { id: 'matrix', enabled: true },
  { id: 'logomarkSplit', enabled: true },
  { id: 'accentSign', enabled: true },
  { id: 'swatches', enabled: true },
  { id: 'statement', enabled: true },
  { id: 'typography', enabled: true },
  { id: 'icons', enabled: false },
  { id: 'clearSpace', enabled: false },
  { id: 'application', enabled: false },
];

export interface ExportConfig {
  digital: {
    enabled: boolean;
    svg: boolean;
    png: boolean;
    pngSizes: number[];
    jpg: boolean;
    jpgSizes: number[];
    jpgMarginPct: number;
    disabledJpgPairs: string[]; // `${colorId}__${bgHex}`
    manualJpgOverrides?: Record<string, boolean>; // explicit user override over contrast auto-disable
    webp: boolean;
    pdf: boolean;
    eps: boolean;
  };
  print: {
    enabled: boolean;
    eps: boolean;
    pdf: boolean;
  };
  icons: {
    enabled: boolean;
    sourceAssetId: string | 'auto';
    faviconColor: string;
    faviconBg: string; // 'transparent' or hex
    faviconDarkColor: string;
    faviconDarkBg: string;
    faviconScale: number;
    appIconColor: string;
    appIconBg: string;
    appIconScale: number;
    avatarColor: string;
    avatarBg: string;
    avatarScale: number;
  };
  guide: {
    enabled: boolean;
    language: Locale;
    includeApplications: boolean;
    applicationsAssetId?: string | 'auto';
    applicationsScale?: number;
    clearSpacePct: number;
    clearSpaceRule: 'half_x' | 'third_x' | 'two_thirds_x' | 'diagonal';
    minDigitalPx: number;
    minPrintMm: number;
  };
  bento: {
    enabled: boolean;
    layout?: BoardLayoutPreset;
    blocks?: BoardBlockItem[];
    mockups: MockupImage[];
  };
}

export type PdfSectionId =
  | 'cover'
  | 'package'
  | 'colors'
  | 'primary'
  | 'clearSpace'
  | 'colorVariations'
  | 'backgroundUsage'
  | 'incorrectUsage'
  | 'typography'
  | 'additionalVersions'
  | 'bento'
  | 'applications'
  | 'backCover';

export interface GuideSectionItem {
  id: PdfSectionId;
  enabled: boolean;
}

export interface CustomizerConfig {
  ui: {
    showDotSpotlight: boolean;
    showNavChecker: boolean;
    showSummary: boolean;
    showSummarySwatches: boolean;
    showSummaryAssets: boolean;
    containerMaxWidth: number; // 960..1520 px
    sidebarWidth: number; // 240..360 px
    cardRadius: number; // 4..32 px
    cardPadding: number; // 12..36 px
    sectionGap: number; // 12..40 px
    dotSpacing: number; // 12..28 px
    dotOpacity: number; // 0..20 (%)
    bodyFontSize: number; // 12..18 px
    headingScale: number; // 80..135 (%)
    buttonRadius: number; // 6..999 px
    canvasBg: string;
    cardBg: string;
    mutedBg: string;
    borderColor: string;
    accentColor: string;
    textPrimary: string;
    textMuted: string;
  };
  guide: {
    sections: GuideSectionItem[];
    pageMargin: number; // 24..72 pt
    cardGap: number; // 8..32 pt
    cardRadius: number; // 0..24 pt
    headerFontSize: number; // 11..20 pt
    bodyFontSize: number; // 7..13 pt
    logoScalePct: number; // 60..120 %
    bentoGap: number; // 8..40 px
    bentoRadius: number; // 0..48 px
    bentoLogoScalePct: number; // 65..125 %
    pdfPageBg: string;
    pdfCardBg: string;
    pdfDarkCardBg: string;
    pdfHeadingColor: string;
    pdfBodyColor: string;
    coverBg: string;
    coverTextColor: string;
    bentoBackdrop: string;
  };
}

export const DEFAULT_CUSTOMIZER_CONFIG: CustomizerConfig = {
  ui: {
    showDotSpotlight: true,
    showNavChecker: true,
    showSummary: true,
    showSummarySwatches: true,
    showSummaryAssets: true,
    containerMaxWidth: 1060,
    sidebarWidth: 275,
    cardRadius: 24,
    cardPadding: 32,
    sectionGap: 20,
    dotSpacing: 18,
    dotOpacity: 5,
    bodyFontSize: 14,
    headingScale: 115,
    buttonRadius: 999,
    canvasBg: '#F8F6F1',
    cardBg: '#FFFFFF',
    mutedBg: '#ECEAE5',
    borderColor: '#E5E3DC',
    accentColor: '#FA5008',
    textPrimary: '#1F1F1F',
    textMuted: '#6B6B6B',
  },
  guide: {
    sections: [
      { id: 'cover', enabled: true },
      { id: 'package', enabled: true },
      { id: 'colors', enabled: true },
      { id: 'primary', enabled: true },
      { id: 'clearSpace', enabled: true },
      { id: 'colorVariations', enabled: true },
      { id: 'backgroundUsage', enabled: true },
      { id: 'incorrectUsage', enabled: true },
      { id: 'typography', enabled: true },
      { id: 'additionalVersions', enabled: true },
      { id: 'bento', enabled: true },
      { id: 'applications', enabled: true },
      { id: 'backCover', enabled: true },
    ],
    pageMargin: 48,
    cardGap: 18,
    cardRadius: 8,
    headerFontSize: 14,
    bodyFontSize: 10,
    logoScalePct: 100,
    bentoGap: 22,
    bentoRadius: 32,
    bentoLogoScalePct: 100,
    pdfPageBg: '#FFFFFF',
    pdfCardBg: '#F8F6F1',
    pdfDarkCardBg: '#1F1F1F',
    pdfHeadingColor: '#1F1F1F',
    pdfBodyColor: '#6B6B6B',
    coverBg: '#FFFFFF',
    coverTextColor: '#1F2937',
    bentoBackdrop: '#F5F5F7',
  },
};
