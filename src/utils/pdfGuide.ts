import { jsPDF } from 'jspdf';
import 'svg2pdf.js';
import {
  DEFAULT_CUSTOMIZER_CONFIG,
  type BoardBlockItem,
  type BoardLayoutPreset,
  type BrandColor,
  type CustomizerConfig,
  type FontConfig,
  type Locale,
  type LogoAsset,
  type MockupImage,
  type TypographyConfig,
} from '../types';
import { renderBentoBoardCanvas } from './bentoBoard';
import {
  MockupKind,
  renderMockupSpreadDataUrl,
  resolveThreeMockupSurfaces,
} from './brandMockups';
import { contrastRatio, hexToCmyk, hexToRgb, relativeLuminance } from './color';
import { ensureConfigFontLoaded } from './fontLoader';
import { recolorSvg, sanitizeSvgForExport } from './svgEngine';

async function embedSvgInPdf(
  doc: jsPDF,
  svgText: string,
  x: number,
  y: number,
  maxW: number,
  maxH: number,
  aspectRatio: number,
) {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(sanitizeSvgForExport(svgText), 'image/svg+xml');
  const svgEl = svgDoc.documentElement as unknown as SVGSVGElement;

  let w = maxW;
  let h = w / aspectRatio;
  if (h > maxH) {
    h = maxH;
    w = h * aspectRatio;
  }
  const dx = x + (maxW - w) / 2;
  const dy = y + (maxH - h) / 2;
  await doc.svg(svgEl, { x: dx, y: dy, width: w, height: h });
}

export async function svgToVectorPdfBlob(
  svgText: string,
  aspectRatio: number,
): Promise<Blob> {
  const w = 400;
  const h = Math.max(100, Math.round(w / aspectRatio));
  const doc = new jsPDF({
    orientation: w >= h ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [w + 80, h + 80],
  });
  await embedSvgInPdf(doc, svgText, 40, 40, w, h, aspectRatio);
  return doc.output('blob');
}

async function tryRegisterCyrillicFont(doc: jsPDF): Promise<string> {
  try {
    const [regRes, boldRes] = await Promise.all([
      fetch('https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Regular.ttf'),
      fetch('https://cdn.jsdelivr.net/gh/googlefonts/roboto@main/src/hinted/Roboto-Bold.ttf'),
    ]);
    if (!regRes.ok) return 'helvetica';
    const toBase64 = async (res: Response) => {
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };
    doc.addFileToVFS('Roboto-Regular.ttf', await toBase64(regRes));
    doc.addFont('Roboto-Regular.ttf', 'RobotoPDF', 'normal');
    if (boldRes.ok) {
      doc.addFileToVFS('Roboto-Bold.ttf', await toBase64(boldRes));
      doc.addFont('Roboto-Bold.ttf', 'RobotoPDF', 'bold');
    } else {
      doc.addFont('Roboto-Regular.ttf', 'RobotoPDF', 'bold');
    }
    return 'RobotoPDF';
  } catch {
    return 'helvetica';
  }
}

export interface BrandGuideParams {
  brandName: string;
  industry: string;
  tagline: string;
  designedBy?: string;
  language: Locale;
  assets: LogoAsset[];
  colors: BrandColor[];
  typography: TypographyConfig;
  clearSpacePct: number;
  clearSpaceRule?: 'half_x' | 'third_x' | 'two_thirds_x' | 'diagonal';
  minDigitalPx?: number;
  minPrintMm?: number;
  includeApplications: boolean;
  applicationsAssetId?: string | 'auto';
  applicationsScale?: number;
  boardLayout?: BoardLayoutPreset;
  boardBlocks?: BoardBlockItem[];
  mockups: MockupImage[];
  customizer?: CustomizerConfig['guide'];
}

const RULE_TOKENS: Record<
  'half_x' | 'third_x' | 'two_thirds_x' | 'diagonal',
  { label: string; factor: number }
> = {
  half_x: { label: '1/2X', factor: 0.5 },
  third_x: { label: '1/3X', factor: 0.333 },
  two_thirds_x: { label: '2/3X', factor: 0.666 },
  diagonal: { label: '1/2C', factor: 0.45 },
};

async function renderTypographySpecimenDataUrl(
  label: string,
  fontCfg: FontConfig,
  bgHex: string,
  fgHex: string,
  sampleText: string,
  language: Locale,
): Promise<string> {
  // Ensure stylesheet finishes downloading BEFORE fonts.load & canvas draw
  await ensureConfigFontLoaded(fontCfg);

  const family = fontCfg.family || 'Inter';
  const weight = fontCfg.weight || 400;
  const italic = !!fontCfg.italic;

  const W = 740;
  const H = 640;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = bgHex;
  ctx.fillRect(0, 0, W, H);

  const isLight = relativeLuminance(bgHex) > 0.55;
  const mutedCol = isLight ? '#6B6B6B' : 'rgba(255,255,255,0.65)';

  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = mutedCol;
  ctx.font = '600 18px "Inter", sans-serif';
  ctx.fillText(label.toUpperCase(), 48, 44);

  ctx.fillStyle = fgHex;
  ctx.font = `${italic ? 'italic ' : ''}${weight} 42px "${family}", sans-serif`;
  ctx.fillText(family, 48, 82);

  ctx.fillStyle = mutedCol;
  ctx.font = '500 18px "JetBrains Mono", monospace';
  ctx.fillText(`Weight ${weight}${italic ? ' · Italic' : ''}`, 48, 138);

  ctx.fillStyle = fgHex;
  ctx.font = `${italic ? 'italic ' : ''}${weight} 168px "${family}", sans-serif`;
  ctx.fillText(language === 'ua' ? 'Аа Бб' : 'Aa Bb', 48, 200);

  ctx.fillStyle = isLight ? '#3F3F46' : 'rgba(255,255,255,0.88)';
  ctx.font = `${italic ? 'italic ' : ''}${weight} 24px "${family}", sans-serif`;
  if (language === 'ua') {
    ctx.fillText('АБВГДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ', 48, 434);
    ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789', 48, 476);
  } else {
    ctx.fillText('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 48, 434);
    ctx.fillText('abcdefghijklmnopqrstuvwxyz · 0123456789', 48, 476);
  }

  ctx.fillStyle = mutedCol;
  ctx.font = `${italic ? 'italic ' : ''}${Math.min(600, weight)} 22px "${family}", sans-serif`;
  ctx.fillText(sampleText.slice(0, 44), 48, 540);

  return canvas.toDataURL('image/jpeg', 0.92);
}

async function renderDontExampleDataUrl(
  svgText: string,
  aspectRatio: number,
  kind: 'stretch' | 'rotate' | 'recolor' | 'shadow' | 'low_contrast' | 'clear_space',
  darkBgHex: string,
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 520;
  canvas.height = 280;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 520, 280);

  const modifiedSvg =
    kind === 'recolor'
      ? recolorSvg(svgText, '#6D5DF6', '#FFFFFF')
      : kind === 'low_contrast'
        ? recolorSvg(svgText, '#161618', '#050505')
        : sanitizeSvgForExport(svgText);

  const blob = new Blob([modifiedSvg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => {
      URL.revokeObjectURL(url);
      resolve(el);
    };
    el.onerror = reject;
    el.src = url;
  });

  let dw = kind === 'stretch' ? 275 : kind === 'rotate' ? 320 : 375;
  let dh = dw / aspectRatio;
  const maxH = kind === 'clear_space' ? 155 : kind === 'rotate' ? 168 : 196;
  if (dh > maxH) {
    dh = maxH;
    dw = dh * aspectRatio;
  }

  ctx.save();
  ctx.translate(260, kind === 'clear_space' ? 124 : 140);
  if (kind === 'stretch') {
    ctx.scale(1.52, 0.56);
  } else if (kind === 'rotate') {
    ctx.rotate(-0.2);
  } else if (kind === 'shadow') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.36)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 11;
    ctx.shadowOffsetY = 13;
  }
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();

  if (kind === 'clear_space') {
    ctx.fillStyle = darkBgHex;
    ctx.font = '700 24px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('OTHER CONTENT', 260 - dw / 2, 124 + dh / 2 + 24);
  }

  return canvas.toDataURL('image/png');
}

const PDF_COPY = {
  en: {
    headerSuffix: 'LOGO GUIDELINES',
    coverTitle: 'LOGO GUIDELINES',
    backTag: 'Logo assets & usage guidelines',
    packageTitle: 'YOUR LOGO PACKAGE',
    packageRows: [
      { path: 'Logo_Asset_Pack.zip', indent: 0, desc: 'Your logo files, organized by logo version and file format.' },
      { path: '01_Primary_Logo', indent: 1, desc: 'Format structure shown once.' },
      { path: '01_RGB_Digital', indent: 2, desc: 'Files for screen-based use.' },
      { path: '01_SVG', indent: 3, desc: 'Scalable vector artwork for screens and web.' },
      { path: '02_PNG_Transparent', indent: 3, desc: 'Transparent images for digital layouts.' },
      { path: '03_JPG', indent: 3, desc: 'Images with a solid contrast-checked background.' },
      { path: '04_WEBP', indent: 3, desc: 'Lightweight images for websites.' },
      { path: '02_CMYK_Print', indent: 2, desc: 'Files using project CMYK values for print.' },
      { path: '01_EPS', indent: 3, desc: 'Vector artwork for print production.' },
      { path: '02_PDF', indent: 3, desc: 'Vector artwork for print, viewing and sharing.' },
      { path: '02_Logo_Mark', indent: 1, desc: 'Same structure; standalone logo mark.' },
      { path: '03_Favicon & 04_App_Icon', indent: 1, desc: 'Website and app icons. See included setup.html.' },
      { path: '06_Brand_Board', indent: 1, desc: 'High-resolution Brand Board overview.' },
      { path: '07_Fonts', indent: 1, desc: 'Installable brand font files & setup guide.' },
      { path: 'Logo_Guide.pdf', indent: 1, desc: 'A reference for using the logo, brand colors and supplied files.' },
    ],
    colorsTitle: 'BRAND COLORS',
    colorsNote: 'Use HEX and RGB for digital applications and CMYK for print.',
    primaryTitle: 'PRIMARY LOGO / ORIGINAL',
    onWhite: 'Original on White',
    onBlack: 'Original on Black',
    primaryNote: 'Use the supplied original for its background. Keep the artwork colors, proportions and arrangement unchanged.',
    assetFolder: 'Asset folder: 01_Primary_Logo',
    clearSpaceTitle: 'CLEAR SPACE & PROPORTIONS',
    clearSpaceNote: (rule: string, pct: number) =>
      `Maintain at least ${rule} (${pct}%) clear space on every side. Keep text, graphics and page edges outside the boundary.`,
    minSizeTitle: 'MINIMUM SIZE',
    minSizeNote: (px: number, mm: number) =>
      `Primary logo should never be smaller than ${px}px in digital or ${mm}mm in print. Icon minimum: 16px / 4mm.`,
    variationsTitle: 'COLOR VARIATIONS / PRIMARY LOGO',
    variationsSub: 'Use these color versions to suit the background and production method.',
    variationsNote: 'Use light versions on dark backgrounds. Do not introduce other colors or alter the artwork.',
    bgUsageTitle: 'BACKGROUND USAGE',
    bgUsageNote: 'Choose a background that keeps the entire logo clearly visible. Avoid busy images and colors that blend into the artwork.',
    dontsTitle: 'INCORRECT USAGE / PRIMARY LOGO',
    dontsSub: 'Always use the supplied logo files. Do not redraw, distort or add effects to the artwork.',
    dontsLabels: [
      'Do not stretch or distort',
      'Do not rotate',
      'Do not recolor — use only brand colors',
      'Do not add effects',
      'Do not reduce legibility',
      'Respect the clear space',
    ],
    typoTitle: 'BRAND TYPOGRAPHY',
    typoSub: 'Primary display and secondary descriptor typefaces.',
    primaryType: 'Primary Typeface',
    secondaryType: 'Secondary Typeface',
    markTitle: 'ADDITIONAL LOGO VERSIONS',
    markSub: 'Alternative forms of the identity for different layouts and applications.',
    bentoTitle: 'BRAND OVERVIEW',
    appsDividerTitle: 'BRAND\nAPPLICATIONS',
    appsDividerSub: 'Examples of the identity in use.',
    appsPages: [
      { kind: 'tote' as MockupKind, title: 'TOTE BAGS', sub: 'Everyday essentials in the brand palette.' },
      { kind: 'bottle' as MockupKind, title: 'DRINKWARE', sub: 'A consistent identity across light, accent and dark surfaces.' },
      { kind: 'cards' as MockupKind, title: 'BUSINESS CARDS', sub: 'A simple introduction in the brand palette.' },
      { kind: 'folder' as MockupKind, title: 'PRESENTATION FOLDERS', sub: 'A considered finish for documents and project handovers.' },
      { kind: 'hoodie' as MockupKind, title: 'APPAREL', sub: 'Relaxed silhouettes. Understated branding.' },
    ],
    customAppsTitle: 'CUSTOM BRAND COLLATERAL',
    customAppsSub: 'Uploaded presentation mockups.',
  },
  ua: {
    headerSuffix: 'ГАЙДЛАЙН ЛОГОТИПУ',
    coverTitle: 'LOGO GUIDELINES',
    backTag: 'Файли логотипу та правила використання',
    packageTitle: 'ВАШ ПАКЕТ ФАЙЛІВ',
    packageRows: [
      { path: 'Logo_Asset_Pack.zip', indent: 0, desc: 'Усі файли логотипу, впорядковані за версіями та форматами.' },
      { path: '01_Primary_Logo', indent: 1, desc: 'Основний логотип (структура папок показана нижче).' },
      { path: '01_RGB_Digital', indent: 2, desc: 'Файли для екранів та вебу.' },
      { path: '01_SVG', indent: 3, desc: 'Масштабований вектор для вебу та інтерфейсів.' },
      { path: '02_PNG_Transparent', indent: 3, desc: 'Растр із прозорим фоном для макетів.' },
      { path: '03_JPG', indent: 3, desc: 'Растр на суцільному фоні з перевіреним контрастом.' },
      { path: '04_WEBP', indent: 3, desc: 'Легкі веб-оптимізовані зображення.' },
      { path: '02_CMYK_Print', indent: 2, desc: 'Файли з CMYK-значеннями для поліграфії.' },
      { path: '01_EPS', indent: 3, desc: 'Вектор для друкарень та препресу.' },
      { path: '02_PDF', indent: 3, desc: 'Векторний PDF для друку, перегляду й передачі.' },
      { path: '02_Logo_Mark', indent: 1, desc: 'Така ж структура для окремого знаку (Mark).' },
      { path: '03_Favicon & 04_App_Icon', indent: 1, desc: 'Іконки сайту та додатків + готовий setup.html.' },
      { path: '06_Brand_Board', indent: 1, desc: 'Зведена презентаційна дошка бренду.' },
      { path: '07_Fonts', indent: 1, desc: 'Готові файли фірмових шрифтів для встановлення.' },
      { path: 'Logo_Guide.pdf', indent: 1, desc: 'Довідник із використання лого, кольорів і файлів.' },
    ],
    colorsTitle: 'КОЛЬОРИ БРЕНДУ',
    colorsNote: 'Використовуйте HEX та RGB для цифрових носіїв, а CMYK — для друку.',
    primaryTitle: 'ОСНОВНИЙ ЛОГОТИП / ОРИГІНАЛ',
    onWhite: 'Оригінал на білому',
    onBlack: 'Оригінал на чорному',
    primaryNote: 'Використовуйте оригінал відповідно до фону. Не змінюйте пропорції та розташування елементів.',
    assetFolder: 'Папка файлів: 01_Primary_Logo',
    clearSpaceTitle: 'ОХОРОННЕ ПОЛЕ ТА ПРОПОРЦІЇ',
    clearSpaceNote: (rule: string, pct: number) =>
      `Зберігайте вільне поле мінімум ${rule} (${pct}%) з кожного боку. Не розміщуйте текст чи графіку всередині зони.`,
    minSizeTitle: 'МІНІМАЛЬНИЙ РОЗМІР',
    minSizeNote: (px: number, mm: number) =>
      `Логотип не повинен бути меншим за ${px}px на екранах та ${mm}mm у друці. Мінімум для знаку: 16px / 4mm.`,
    variationsTitle: 'КОЛЬОРОВІ ВАРІАЦІЇ / ОСНОВНИЙ ЛОГОТИП',
    variationsSub: 'Обирайте кольорову версію залежно від фону та способу друку.',
    variationsNote: 'На темних фонах використовуйте світлі версії. Не додавайте сторонніх кольорів.',
    bgUsageTitle: 'ВИКОРИСТАННЯ НА ФОНАХ',
    bgUsageNote: 'Обирайте фон, на якому логотип залишається чітким і контрастним.',
    dontsTitle: 'ЗАБОРОНЕНЕ ВИКОРИСТАННЯ',
    dontsSub: 'Завжди використовуйте надані файли. Не перемальовуйте, не спотворюйте та не додавайте ефекти.',
    dontsLabels: [
      'Не розтягуйте й не стискайте',
      'Не повертайте під кутом',
      'Не фарбуйте у сторонні кольори',
      'Не додавайте тіні чи ефекти',
      'Не знижуйте контрастність',
      'Дотримуйтесь охоронного поля',
    ],
    typoTitle: 'ТИПОГРАФІКА БРЕНДУ',
    typoSub: 'Основний акцентний та додатковий текстовий шрифти.',
    primaryType: 'Основний шрифт',
    secondaryType: 'Додатковий шрифт',
    markTitle: 'ДОДАТКОВІ ВЕРСІЇ ЛОГОТИПУ',
    markSub: 'Альтернативні форми знаку для компактних носіїв.',
    bentoTitle: 'ОГЛЯД БРЕНДУ',
    appsDividerTitle: 'НОСІЇ\nБРЕНДУ',
    appsDividerSub: 'Приклади використання айдентики.',
    appsPages: [
      { kind: 'tote' as MockupKind, title: 'ШОПЕРИ (TOTE BAGS)', sub: 'Щоденні аксесуари у кольорах бренду.' },
      { kind: 'bottle' as MockupKind, title: 'ТЕРМОПЛЯШКИ', sub: 'Цілісна айдентика на світлих, акцентних і темних поверхнях.' },
      { kind: 'cards' as MockupKind, title: 'ВІЗИТІВКИ', sub: 'Акуратна подача у палітрі бренду.' },
      { kind: 'folder' as MockupKind, title: 'ПРЕЗЕНТАЦІЙНІ ПАПКИ', sub: 'Оформлення документів та передачі проєктів.' },
      { kind: 'hoodie' as MockupKind, title: 'МЕРЧ ТА ОДЯГ', sub: 'Спокійні силуети та чітке брендування.' },
    ],
    customAppsTitle: 'ВЛАСНІ МОКАПИ БРЕНДУ',
    customAppsSub: 'Завантажені фото-приклади використання.',
  },
};

export async function buildBrandGuidePdf(params: BrandGuideParams): Promise<Blob> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
    compress: true,
  });
  const W = doc.internal.pageSize.getWidth(); // 841.89
  const H = doc.internal.pageSize.getHeight(); // 595.28
  const t = PDF_COPY[params.language];
  const brandUpper = (params.brandName || 'BRAND').toUpperCase();

  const gs = params.customizer ?? DEFAULT_CUSTOMIZER_CONFIG.guide;
  const M = gs.pageMargin;
  const G = gs.cardGap;
  const CR = gs.cardRadius;
  const HS = gs.headerFontSize;
  const BS = gs.bodyFontSize;
  const LS = gs.logoScalePct / 100;
  const pageBg = gs.pdfPageBg;
  const cardBgCol = gs.pdfCardBg;
  const darkCardBg = gs.pdfDarkCardBg;
  const headCol = gs.pdfHeadingColor;
  const bodyCol = gs.pdfBodyColor;
  const coverBg = gs.coverBg;
  const coverText = gs.coverTextColor;

  let fontFamily = 'helvetica';
  if (params.language === 'ua') {
    fontFamily = await tryRegisterCyrillicFont(doc);
  }
  doc.setFont(fontFamily, 'normal');

  const primaryAsset = params.assets.find((a) => a.role === 'primary') ?? params.assets[0];
  const darkAsset = params.assets.find((a) => a.role === 'primary_dark');
  const markAsset = params.assets.find((a) => a.role === 'mark') ?? primaryAsset;

  const palette = params.colors.length
    ? params.colors
    : [
        { id: 'c1', name: 'Off-White', hex: '#F3F2EF', cmykMode: 'auto' as const, cmyk: { c: 0, m: 0, y: 2, k: 5 }, useAsLogo: true, useAsBackground: true },
        { id: 'c2', name: 'Onyx', hex: '#242424', cmykMode: 'auto' as const, cmyk: { c: 0, m: 0, y: 0, k: 86 }, useAsLogo: true, useAsBackground: true },
        { id: 'c3', name: 'Pumpkin', hex: '#FA5008', cmykMode: 'auto' as const, cmyk: { c: 0, m: 68, y: 97, k: 2 }, useAsLogo: true, useAsBackground: true },
      ];

  const sortedByLum = [...palette].sort((a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex));
  const darkColor = sortedByLum[0]?.hex ?? '#242424';
  const onBlackSvg = darkAsset
    ? darkAsset.svgContent
    : primaryAsset
      ? recolorSvg(primaryAsset.svgContent, '#FFFFFF', '#000000')
      : '';

  let hasStartedPage = false;
  const startNewPage = () => {
    if (hasStartedPage) {
      doc.addPage();
    } else {
      hasStartedPage = true;
    }
  };

  let pageNo = 0;
  const drawRunningHeader = (sectionTitle?: string, sectionSub?: string) => {
    startNewPage();
    pageNo++;
    doc.setFillColor(pageBg);
    doc.rect(0, 0, W, H, 'F');

    doc.setTextColor(bodyCol);
    doc.setFont(fontFamily, 'normal');
    doc.setFontSize(8.5);
    doc.text(`${brandUpper} ${t.headerSuffix}`, M, 36);
    doc.text(`${String(pageNo).padStart(2, '0')}`, W - M, 36, { align: 'right' });
    doc.setDrawColor('#E5E3DC');
    doc.setLineWidth(0.75);
    doc.line(M, 46, W - M, 46);

    if (sectionTitle) {
      doc.setTextColor(headCol);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(HS);
      doc.text(sectionTitle, M, 78);
    }
    if (sectionSub) {
      doc.setTextColor(bodyCol);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(BS);
      doc.text(sectionSub, M, 98);
    }
  };

  for (const sec of gs.sections) {
    if (!sec.enabled) continue;

    if (sec.id === 'cover') {
      startNewPage();
      doc.setFillColor(coverBg);
      doc.rect(0, 0, W, H, 'F');
      if (primaryAsset) {
        const covLogoSvg =
          relativeLuminance(coverBg) < 0.35
            ? onBlackSvg || primaryAsset.svgContent
            : primaryAsset.svgContent;
        await embedSvgInPdf(
          doc,
          covLogoSvg,
          M + 16,
          90,
          210 * LS,
          84 * LS,
          primaryAsset.audit.aspectRatio,
        );
      }
      doc.setTextColor(coverText);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(Math.round(HS * 3));
      doc.text(t.coverTitle, M + 16, H - 105);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(Math.max(11, BS + 3));
      doc.setTextColor(bodyCol);
      doc.text(
        `${params.brandName || 'Brand'}${params.industry ? ` · ${params.industry}` : ''}`,
        M + 16,
        H - 72,
      );
      if (params.designedBy?.trim()) {
        doc.setFontSize(Math.max(9, BS));
        doc.text(
          params.language === 'ua'
            ? `Розроблено: ${params.designedBy.trim()}`
            : `Design by ${params.designedBy.trim()}`,
          W - M - 16,
          H - 72,
          { align: 'right' },
        );
      }
    } else if (sec.id === 'package') {
      drawRunningHeader(t.packageTitle);
      let rowY = 122;
      const rowH = 30;
      for (const row of t.packageRows) {
        doc.setDrawColor('#ECEAE5');
        doc.setLineWidth(0.6);
        doc.line(M, rowY + 8, W - M, rowY + 8);
        const iconX = M + 4 + row.indent * 22;
        const isFile = row.path.includes('.zip') || row.path.includes('.pdf');
        doc.setDrawColor('#A1A1AA');
        doc.setLineWidth(0.75);
        if (isFile) {
          doc.roundedRect(iconX, rowY - 8.5, 9, 10.5, 1.2, 1.2);
          doc.line(iconX + 2, rowY - 5, iconX + 7, rowY - 5);
          doc.line(iconX + 2, rowY - 2.5, iconX + 7, rowY - 2.5);
        } else {
          doc.line(iconX, rowY - 7.5, iconX + 4.2, rowY - 7.5);
          doc.line(iconX + 4.2, rowY - 7.5, iconX + 5.6, rowY - 6);
          doc.roundedRect(iconX, rowY - 6, 11, 7.5, 1.2, 1.2);
        }

        doc.setFont('courier', 'normal');
        doc.setFontSize(Math.max(8, BS - 0.5));
        doc.setTextColor(headCol);
        doc.text(row.path, iconX + 16, rowY);
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(Math.max(8, BS - 0.5));
        doc.setTextColor(bodyCol);
        doc.text(row.desc, Math.min(440, M + (W - M * 2) * 0.5), rowY);
        rowY += rowH;
      }
    } else if (sec.id === 'colors') {
      drawRunningHeader(t.colorsTitle);
      const swList = palette.slice(0, 4);
      const swW = (W - M * 2 - G * Math.max(0, swList.length - 1)) / Math.max(1, swList.length);
      swList.forEach((c, idx) => {
        const sx = M + idx * (swW + G);
        const rgb = hexToRgb(c.hex);
        const cmyk = c.cmykMode === 'manual' ? c.cmyk : hexToCmyk(c.hex);
        doc.setFillColor(c.hex);
        doc.setDrawColor('#E5E3DC');
        doc.roundedRect(sx, 128, swW, 110, CR, CR, 'FD');

        doc.setTextColor(headCol);
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(BS + 2);
        doc.text(c.name, sx, 260);
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(Math.max(8, BS - 0.5));
        doc.setTextColor(bodyCol);
        doc.text(`HEX ${c.hex}   RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`, sx, 278);
        doc.text(`CMYK ${cmyk.c}, ${cmyk.m}, ${cmyk.y}, ${cmyk.k}`, sx, 294);
      });
      doc.setFontSize(BS);
      doc.setTextColor(bodyCol);
      doc.text(t.colorsNote, M, H - 56);
    } else if (sec.id === 'primary') {
      drawRunningHeader(t.primaryTitle);
      const twoW = (W - M * 2 - G) / 2;
      const twoH = 260;
      const padIn = 38 + (1 - LS) * 40;
      doc.setFillColor('#FFFFFF');
      doc.setDrawColor('#E5E3DC');
      doc.roundedRect(M, 120, twoW, twoH, CR, CR, 'FD');
      if (primaryAsset) {
        await embedSvgInPdf(
          doc,
          primaryAsset.svgContent,
          M + padIn,
          120 + padIn,
          twoW - padIn * 2,
          twoH - padIn * 2,
          primaryAsset.audit.aspectRatio,
        );
      }
      doc.setTextColor(headCol);
      doc.setFontSize(BS);
      doc.text(t.onWhite, M, 120 + twoH + 18);

      doc.setFillColor('#000000');
      doc.roundedRect(M + twoW + G, 120, twoW, twoH, CR, CR, 'F');
      if (onBlackSvg && primaryAsset) {
        await embedSvgInPdf(
          doc,
          onBlackSvg,
          M + twoW + G + padIn,
          120 + padIn,
          twoW - padIn * 2,
          twoH - padIn * 2,
          primaryAsset.audit.aspectRatio,
        );
      }
      doc.setTextColor(headCol);
      doc.text(t.onBlack, M + twoW + G, 120 + twoH + 18);

      doc.setFontSize(BS + 0.5);
      doc.text(t.primaryNote, M, H - 82);
      doc.setFontSize(Math.max(8, BS - 1));
      doc.setTextColor(bodyCol);
      doc.text(t.assetFolder, M, H - 62);
    } else if (sec.id === 'clearSpace') {
      drawRunningHeader(t.clearSpaceTitle);
      const csRuleKey = params.clearSpaceRule || 'half_x';
      const ruleInfo = RULE_TOKENS[csRuleKey];

      const leftPanelW = (W - M * 2 - G) * 0.64;
      const rightPanelX = M + leftPanelW + G;
      const rightPanelW = W - M - rightPanelX;

      doc.setFillColor('#FFFFFF');
      doc.setDrawColor('#E5E3DC');
      doc.roundedRect(M, 114, leftPanelW, 330, CR, CR, 'FD');
      doc.roundedRect(rightPanelX, 114, rightPanelW, 330, CR, CR, 'FD');

      const refAsset = markAsset ?? primaryAsset;
      const aspect = refAsset ? refAsset.audit.aspectRatio : 1.5;
      let innerW = Math.min(240 * LS, leftPanelW * 0.48 * LS);
      let innerH = innerW / aspect;
      if (innerH > 150 * LS) {
        innerH = 150 * LS;
        innerW = innerH * aspect;
      }
      const marginSize = Math.max(22, Math.min(54, Math.round(innerH * ruleInfo.factor * 0.65)));
      const ix = M + (leftPanelW - innerW) / 2;
      const iy = 114 + (330 - innerH) / 2;

      doc.setFillColor('#ECEAE5');
      doc.rect(ix - marginSize, iy - marginSize, marginSize, marginSize, 'F');
      doc.rect(ix + innerW, iy - marginSize, marginSize, marginSize, 'F');
      doc.rect(ix - marginSize, iy + innerH, marginSize, marginSize, 'F');
      doc.rect(ix + innerW, iy + innerH, marginSize, marginSize, 'F');

      doc.setDrawColor('#A1A1AA');
      doc.setLineDashPattern([3, 3], 0);
      doc.rect(ix - marginSize, iy - marginSize, innerW + marginSize * 2, innerH + marginSize * 2);
      doc.setLineDashPattern([], 0);
      doc.setDrawColor('#D4D4D8');
      doc.rect(ix, iy, innerW, innerH);

      doc.setDrawColor('#71717A');
      doc.setLineWidth(0.6);
      const topTickY = iy - marginSize - 18;
      doc.line(ix - marginSize, topTickY, ix + innerW + marginSize, topTickY);
      doc.line(ix - marginSize, topTickY - 5, ix - marginSize, topTickY + 5);
      doc.line(ix, topTickY - 5, ix, topTickY + 5);
      doc.line(ix + innerW, topTickY - 5, ix + innerW, topTickY + 5);
      doc.line(ix + innerW + marginSize, topTickY - 5, ix + innerW + marginSize, topTickY + 5);

      doc.setTextColor('#52525B');
      doc.setFontSize(8.5);
      doc.text(ruleInfo.label, ix - marginSize / 2, topTickY - 6, { align: 'center' });
      doc.text(`X (${aspect.toFixed(2)}:1)`, ix + innerW / 2, topTickY - 6, { align: 'center' });
      doc.text(ruleInfo.label, ix + innerW + marginSize / 2, topTickY - 6, { align: 'center' });

      const leftTickX = ix - marginSize - 18;
      doc.line(leftTickX, iy - marginSize, leftTickX, iy + innerH + marginSize);
      doc.line(leftTickX - 5, iy - marginSize, leftTickX + 5, iy - marginSize);
      doc.line(leftTickX - 5, iy, leftTickX + 5, iy);
      doc.line(leftTickX - 5, iy + innerH, leftTickX + 5, iy + innerH);
      doc.line(leftTickX - 5, iy + innerH + marginSize, leftTickX + 5, iy + innerH + marginSize);
      doc.text(ruleInfo.label, leftTickX - 8, iy - marginSize / 2 + 3, { align: 'right' });
      doc.text('Y', leftTickX - 8, iy + innerH / 2 + 3, { align: 'right' });

      if (refAsset) {
        await embedSvgInPdf(doc, refAsset.svgContent, ix + 4, iy + 4, innerW - 8, innerH - 8, aspect);
      }

      const minPx = params.minDigitalPx ?? 100;
      const minMm = params.minPrintMm ?? 28;
      doc.setTextColor(headCol);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(BS + 0.5);
      doc.text(t.minSizeTitle, rightPanelX + rightPanelW / 2, 146, { align: 'center' });
      if (primaryAsset) {
        await embedSvgInPdf(doc, primaryAsset.svgContent, rightPanelX + rightPanelW / 2 - 58, 174, 116, 62, primaryAsset.audit.aspectRatio);
      }
      doc.setDrawColor('#71717A');
      doc.line(rightPanelX + rightPanelW / 2 - 58, 246, rightPanelX + rightPanelW / 2 + 58, 246);
      doc.setFont('courier', 'bold');
      doc.setFontSize(BS);
      doc.text(`${minPx}px / ${minMm}mm`, rightPanelX + rightPanelW / 2, 264, { align: 'center' });

      if (markAsset) {
        await embedSvgInPdf(doc, markAsset.svgContent, rightPanelX + rightPanelW / 2 - 14, 304, 28, 28, markAsset.audit.aspectRatio);
        doc.line(rightPanelX + rightPanelW / 2 - 14, 340, rightPanelX + rightPanelW / 2 + 14, 340);
        doc.setFontSize(Math.max(8, BS - 1));
        doc.text('16px / 4mm', rightPanelX + rightPanelW / 2, 356, { align: 'center' });
      }
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(Math.max(8, BS - 1.5));
      doc.setTextColor(bodyCol);
      doc.text(t.minSizeNote(minPx, minMm), rightPanelX + rightPanelW / 2, 392, {
        align: 'center',
        maxWidth: rightPanelW - 32,
      });

      doc.setFontSize(BS);
      doc.setTextColor(headCol);
      doc.text(t.clearSpaceNote(ruleInfo.label, params.clearSpacePct), M, H - 64);
    } else if (sec.id === 'colorVariations') {
      drawRunningHeader(t.variationsTitle, t.variationsSub);
      const varInks = palette.filter((c) => c.useAsLogo).slice(0, 3);
      const varCards = varInks.length ? varInks : palette.slice(0, 3);
      const vW = (W - M * 2 - G * Math.max(0, varCards.length - 1)) / Math.max(1, varCards.length);
      for (let i = 0; i < varCards.length; i++) {
        const vc = varCards[i];
        const vx = M + i * (vW + G);
        const cBg = contrastRatio(vc.hex, '#FFFFFF') < 2.2 ? darkCardBg : '#FFFFFF';
        doc.setFillColor(cBg);
        doc.setDrawColor('#E5E3DC');
        doc.roundedRect(vx, 134, vW, 210, CR, CR, 'FD');
        if (primaryAsset) {
          const padV = 26 + (1 - LS) * 28;
          const recolored = recolorSvg(primaryAsset.svgContent, vc.hex, cBg);
          await embedSvgInPdf(
            doc,
            recolored,
            vx + padV,
            134 + padV,
            vW - padV * 2,
            210 - padV * 2,
            primaryAsset.audit.aspectRatio,
          );
        }
        const rgb = hexToRgb(vc.hex);
        doc.setTextColor(headCol);
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(BS + 0.5);
        doc.text(vc.name, vx, 366);
        doc.setFont(fontFamily, 'normal');
        doc.setFontSize(Math.max(8, BS - 1));
        doc.setTextColor(bodyCol);
        doc.text(`HEX ${vc.hex}   RGB ${rgb.r}, ${rgb.g}, ${rgb.b}`, vx, 382);
      }
      doc.setFontSize(BS);
      doc.text(t.variationsNote, M, H - 56);
    } else if (sec.id === 'backgroundUsage') {
      drawRunningHeader(t.bgUsageTitle);
      const bgPairs = [
        { label: `Original on White`, bg: '#FFFFFF', svg: primaryAsset?.svgContent },
        { label: `Dark Original on Black`, bg: '#000000', svg: onBlackSvg },
        ...palette.slice(0, 4).map((bg) => {
          const isDarkBg = relativeLuminance(bg.hex) < 0.4;
          const ink = isDarkBg ? '#FFFFFF' : darkColor;
          const svg =
            contrastRatio(ink, bg.hex) >= 3
              ? recolorSvg(primaryAsset?.svgContent || '', ink, bg.hex)
              : recolorSvg(primaryAsset?.svgContent || '', isDarkBg ? '#FFFFFF' : '#000000', bg.hex);
          return { label: `Logo on ${bg.name}`, bg: bg.hex, svg };
        }),
      ].slice(0, 6);

      const bW = (W - M * 2 - G * 2) / 3;
      const bH = 148;
      for (let i = 0; i < bgPairs.length; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const bx = M + col * (bW + G);
        const by = 120 + row * (bH + 40);
        const bp = bgPairs[i];
        doc.setFillColor(bp.bg);
        doc.setDrawColor('#E5E3DC');
        doc.roundedRect(bx, by, bW, bH, CR, CR, 'FD');
        if (bp.svg && primaryAsset) {
          const pB = 26 + (1 - LS) * 24;
          await embedSvgInPdf(doc, bp.svg, bx + pB, by + pB, bW - pB * 2, bH - pB * 2, primaryAsset.audit.aspectRatio);
        }
        doc.setTextColor(bodyCol);
        doc.setFontSize(Math.max(8, BS - 1));
        doc.text(bp.label, bx, by + bH + 15);
      }
      doc.setFontSize(BS);
      doc.setTextColor(bodyCol);
      doc.text(t.bgUsageNote, M, H - 48);
    } else if (sec.id === 'incorrectUsage' && primaryAsset) {
      drawRunningHeader(t.dontsTitle);
      const kinds: Array<'stretch' | 'rotate' | 'recolor' | 'shadow' | 'low_contrast' | 'clear_space'> = [
        'stretch',
        'rotate',
        'recolor',
        'shadow',
        'low_contrast',
        'clear_space',
      ];
      const dw = (W - M * 2 - G * 2) / 3;
      const dh = 144;
      for (let i = 0; i < kinds.length; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const dx = M + col * (dw + G);
        const dy = 116 + row * (dh + 38);
        doc.setFillColor(kinds[i] === 'low_contrast' ? '#050505' : '#FFFFFF');
        doc.setDrawColor('#E5E3DC');
        doc.roundedRect(dx, dy, dw, dh, CR, CR, 'FD');
        const imgUrl = await renderDontExampleDataUrl(
          primaryAsset.svgContent,
          primaryAsset.audit.aspectRatio,
          kinds[i],
          darkColor,
        );
        doc.addImage(imgUrl, 'PNG', dx + 6, dy + 6, dw - 12, dh - 12, undefined, 'FAST');
        doc.setDrawColor('#E5E3DC');
        doc.roundedRect(dx, dy, dw, dh, CR, CR, 'D');
        doc.setTextColor('#DC2626');
        doc.setFont(fontFamily, 'bold');
        doc.setFontSize(Math.max(8, BS - 1));
        doc.text('X', dx, dy + dh + 15);
        doc.setTextColor(headCol);
        doc.setFont(fontFamily, 'normal');
        doc.text(`  ${t.dontsLabels[i]}`, dx + 9, dy + dh + 15);
      }
      doc.setFontSize(BS);
      doc.setTextColor(bodyCol);
      doc.text(t.dontsSub, M, H - 46);
    } else if (sec.id === 'typography') {
      drawRunningHeader(t.typoTitle, t.typoSub);
      const pFontCfg: FontConfig = params.typography.skipped
        ? { enabled: true, source: 'google', family: 'Space Grotesk', weight: 700, italic: false }
        : params.typography.primary;
      const sFontCfg: FontConfig = params.typography.skipped
        ? { enabled: true, source: 'google', family: 'Inter', weight: 500, italic: false }
        : params.typography.secondary;

      const pBg = relativeLuminance(darkColor) < 0.35 ? darkColor : darkCardBg;
      const [pSpecUrl, sSpecUrl] = await Promise.all([
        renderTypographySpecimenDataUrl(
          t.primaryType,
          pFontCfg,
          pBg,
          '#FFFFFF',
          params.brandName || 'Brand Headline',
          params.language,
        ),
        renderTypographySpecimenDataUrl(
          t.secondaryType,
          sFontCfg,
          cardBgCol,
          headCol,
          params.tagline || 'Modern visual identity system',
          params.language,
        ),
      ]);
      const specW = (W - M * 2 - G) / 2;
      const specH = specW * (640 / 740);
      doc.addImage(pSpecUrl, 'JPEG', M, 126, specW, specH, undefined, 'FAST');
      doc.addImage(sSpecUrl, 'JPEG', M + specW + G, 126, specW, specH, undefined, 'FAST');
      doc.setDrawColor('#E5E3DC');
      doc.rect(M + specW + G, 126, specW, specH, 'D');
    } else if (sec.id === 'additionalVersions') {
      const extraAssets = params.assets.filter(
        (a) => a.id !== primaryAsset?.id && a.role !== 'primary_dark',
      );
      if (extraAssets.length > 0) {
        const showcaseAssets = extraAssets.slice(0, 3);
        drawRunningHeader(t.markTitle, t.markSub);
        if (showcaseAssets.length === 1) {
          const only = showcaseAssets[0];
          const allLight =
            only.audit.colors.length > 0 && only.audit.colors.every((c) => relativeLuminance(c) > 0.6);
          const boxBg = allLight ? darkCardBg : cardBgCol;
          doc.setFillColor(boxBg);
          doc.setDrawColor('#E5E3DC');
          doc.roundedRect(M, 128, W - M * 2, 230, CR, CR, 'FD');
          await embedSvgInPdf(
            doc,
            only.svgContent,
            W / 2 - 75 * LS,
            168,
            150 * LS,
            150 * LS,
            only.audit.aspectRatio,
          );
          doc.setTextColor(headCol);
          doc.setFont(fontFamily, 'bold');
          doc.setFontSize(BS + 2);
          doc.text(only.role === 'mark' ? 'Logo Mark' : only.name, M, 386);
          doc.setFont(fontFamily, 'normal');
          doc.setFontSize(BS);
          doc.setTextColor(bodyCol);
          doc.text(`Asset folder: 02_${only.role}`, M, H - 56);
        } else {
          const cW = (W - M * 2 - G * (showcaseAssets.length - 1)) / showcaseAssets.length;
          for (let i = 0; i < showcaseAssets.length; i++) {
            const a = showcaseAssets[i];
            const cx = M + i * (cW + G);
            const allLight =
              a.audit.colors.length > 0 && a.audit.colors.every((c) => relativeLuminance(c) > 0.6);
            const boxBg = allLight ? darkCardBg : cardBgCol;
            doc.setFillColor(boxBg);
            doc.setDrawColor('#E5E3DC');
            doc.roundedRect(cx, 134, cW, 220, CR, CR, 'FD');
            await embedSvgInPdf(doc, a.svgContent, cx + 28, 166, cW - 56, 156, a.audit.aspectRatio);
            doc.setTextColor(headCol);
            doc.setFont(fontFamily, 'bold');
            doc.setFontSize(BS + 1);
            doc.text(a.name, cx, 378);
            doc.setFont(fontFamily, 'normal');
            doc.setFontSize(Math.max(8, BS - 1));
            doc.setTextColor(bodyCol);
            doc.text(`02_${a.role}`, cx, 394);
          }
        }
      }
    } else if (sec.id === 'bento') {
      drawRunningHeader(t.bentoTitle);
      const bentoCanvas = await renderBentoBoardCanvas({
        brandName: params.brandName,
        tagline: params.tagline,
        designedBy: params.designedBy,
        layout: params.boardLayout,
        blocks: params.boardBlocks,
        assets: params.assets,
        colors: palette,
        typography: params.typography,
        mockups: params.mockups,
        guideStyle: gs,
      });
      const bentoUrl = bentoCanvas.toDataURL('image/jpeg', 0.92);
      const bBoardW = W - M * 2;
      const bBoardH = bBoardW * (1200 / 2400);
      doc.addImage(bentoUrl, 'JPEG', M, 120, bBoardW, bBoardH, undefined, 'FAST');
    } else if (sec.id === 'applications' && params.includeApplications) {
      startNewPage();
      pageNo++;
      doc.setFillColor(cardBgCol);
      doc.rect(0, 0, W, H, 'F');
      doc.setTextColor(bodyCol);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(8.5);
      doc.text(`${brandUpper} ${t.headerSuffix}`, M, 36);
      doc.text(`${String(pageNo).padStart(2, '0')}`, W - M, 36, { align: 'right' });
      doc.setDrawColor('#E5E3DC');
      doc.line(M, 46, W - M, 46);

      doc.setTextColor(headCol);
      doc.setFont(fontFamily, 'bold');
      doc.setFontSize(Math.round(HS * 2.6));
      doc.text(t.appsDividerTitle, M + 16, H - 150);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(BS + 3);
      doc.setTextColor(bodyCol);
      doc.text(t.appsDividerSub, M + 16, H - 72);

      const prefId = params.applicationsAssetId ?? 'auto';
      const prefAsset =
        prefId !== 'auto' ? params.assets.find((a) => a.id === prefId) : undefined;
      const surfaces = resolveThreeMockupSurfaces(
        palette,
        params.assets,
        params.language,
        prefId,
      );
      const ratio = (prefAsset ?? primaryAsset) ? (prefAsset ?? primaryAsset).audit.aspectRatio : 2;
      const appScale = params.applicationsScale ?? 1;
      for (const appPage of t.appsPages) {
        drawRunningHeader(appPage.title, appPage.sub);
        const spreadUrl = await renderMockupSpreadDataUrl(
          appPage.kind,
          surfaces,
          ratio,
          'image/jpeg',
          appScale,
        );
        const spreadW = W - M * 2;
        const spreadH = spreadW * (680 / 1680);
        doc.addImage(spreadUrl, 'JPEG', M, 134, spreadW, spreadH, undefined, 'FAST');
      }

      if (params.mockups.length > 0) {
        drawRunningHeader(t.customAppsTitle, t.customAppsSub);
        const mCount = Math.min(2, params.mockups.length);
        const mw = (W - M * 2 - (mCount - 1) * G) / mCount;
        params.mockups.slice(0, 2).forEach((m, idx) => {
          const mx = M + idx * (mw + G);
          const r = m.width / Math.max(1, m.height);
          const mh = Math.min(360, mw / r);
          doc.addImage(m.dataUrl, mx, 136, mw, mh, undefined, 'FAST');
        });
      }
    } else if (sec.id === 'backCover') {
      startNewPage();
      doc.setFillColor(pageBg);
      doc.rect(0, 0, W, H, 'F');
      if (primaryAsset) {
        await embedSvgInPdf(
          doc,
          primaryAsset.svgContent,
          W / 2 - 110 * LS,
          H / 2 - 55,
          220 * LS,
          72 * LS,
          primaryAsset.audit.aspectRatio,
        );
      }
      doc.setTextColor(bodyCol);
      doc.setFont(fontFamily, 'normal');
      doc.setFontSize(BS + 1);
      doc.text(t.backTag, W / 2, H / 2 + 48, { align: 'center' });
      if (params.designedBy?.trim()) {
        doc.setFontSize(Math.max(8.5, BS - 0.5));
        doc.text(
          params.language === 'ua'
            ? `Розроблено: ${params.designedBy.trim()}`
            : `Design by ${params.designedBy.trim()}`,
          W / 2,
          H - 52,
          { align: 'center' },
        );
      }
    }
  }

  return doc.output('blob');
}
