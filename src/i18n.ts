import type { Locale } from './types';

export const COPY: Record<
  Locale,
  {
    appTitle: string;
    navGenerator: string;
    navChecker: string;
    loadDemo: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    brandInfo: string;
    brandName: string;
    brandNamePlaceholder: string;
    industry: string;
    industryPlaceholder: string;
    tagline: string;
    taglinePlaceholder: string;
    uploadTitle: string;
    uploadHint: string;
    roleLabel: string;
    back: string;
    next: string;
    skip: string;
    colorsTitle: string;
    colorsSubtitle: string;
    bwToggle: string;
    bwHint: string;
    keepOriginal: string;
    keepOriginalHint: string;
    addColor: string;
    importPalette: string;
    useAsLogo: string;
    useAsBg: string;
    autoCmyk: string;
    manualCmyk: string;
    liveColorPreview: string;
    typoTitle: string;
    typoSubtitle: string;
    primaryFont: string;
    secondaryFont: string;
    sourceGoogle: string;
    sourceLocal: string;
    sourceUpload: string;
    loadLocalFonts: string;
    localFontsHint: string;
    searchFonts: string;
    weightLabel: string;
    italicLabel: string;
    dropFont: string;
    typoPreviewTitle: string;
    exportTitle: string;
    exportSubtitle: string;
    digitalRgb: string;
    printCmyk: string;
    iconsAvatars: string;
    bentoBoard: string;
    logoGuidePdf: string;
    mockupsTitle: string;
    mockupsHint: string;
    downloadZip: string;
    downloadBentoPng: string;
    downloadGuidePdf: string;
    generating: string;
    checkerTitle: string;
    checkerSubtitle: string;
    checkerPrivacy: string;
    roles: Record<string, string>;
    checks: Record<string, { title: string; desc: string }>;
  }
> = {
  en: {
    appTitle: 'Logopack Studio',
    navGenerator: 'Generator',
    navChecker: 'SVG Checker',
    loadDemo: 'Load Demo',
    step1: 'Assets',
    step2: 'Colors',
    step3: 'Typography',
    step4: 'Export & Board',
    brandInfo: 'Brand Details',
    brandName: 'Brand Name',
    brandNamePlaceholder: 'e.g. Feinschnauze',
    industry: 'Industry',
    industryPlaceholder: 'e.g. Pet Atelier, Fintech, Architecture',
    tagline: 'Tagline / Descriptor',
    taglinePlaceholder: 'Optional short descriptor',
    uploadTitle: 'Drop logo files here',
    uploadHint: 'Up to 12 SVG, EPS or vector PDF files · max 10 MB each',
    roleLabel: 'Role',
    back: 'Back',
    next: 'Continue',
    skip: 'Skip step',
    colorsTitle: 'Brand Palette & Variants',
    colorsSubtitle: 'Extracted from your SVGs. Toggle which colors render as logo ink or backdrop.',
    bwToggle: 'Black & White editions',
    bwHint: 'Adds solid #000000 and #FFFFFF versions',
    keepOriginal: 'Preserve original colors',
    keepOriginalHint: 'Keep source SVG colors intact alongside variants',
    addColor: 'Add color',
    importPalette: 'Import SVG palette',
    useAsLogo: 'Use as logo',
    useAsBg: 'Use as background',
    autoCmyk: 'Auto CMYK',
    manualCmyk: 'Manual CMYK',
    liveColorPreview: 'Live Logo × Background Preview',
    typoTitle: 'Brand Typography',
    typoSubtitle: 'Choose Primary (logo/headings) and Secondary (descriptors/UI) fonts, or skip.',
    primaryFont: 'Primary Font',
    secondaryFont: 'Secondary Font',
    sourceGoogle: 'Google Fonts',
    sourceLocal: 'PC Installed',
    sourceUpload: 'Upload File',
    loadLocalFonts: 'Scan installed PC fonts',
    localFontsHint: 'Uses Chrome Local Font Access API (works on localhost/https; on file:// drag & drop from C:\\Windows\\Fonts).',
    searchFonts: 'Search fonts...',
    weightLabel: 'Weight',
    italicLabel: 'Italic',
    dropFont: 'Drop .ttf, .otf, .woff or .woff2 here',
    typoPreviewTitle: 'Live Typography Specimen',
    exportTitle: 'Export & Brand Board',
    exportSubtitle: 'Configure formats, upload optional mockups, and compile your complete pack.',
    digitalRgb: 'Digital / RGB',
    printCmyk: 'Print / CMYK',
    iconsAvatars: 'Icons & Avatars',
    bentoBoard: 'Brand Board',
    logoGuidePdf: 'Brand Guidelines PDF',
    mockupsTitle: 'Custom Mockups (Optional)',
    mockupsHint: 'Upload 1–2 JPG/PNG mockups to feature inside your Brand Board & PDF Guide.',
    downloadZip: 'Download Full .ZIP Pack',
    downloadBentoPng: 'Save Board PNG',
    downloadGuidePdf: 'Save PDF Guide',
    generating: 'Generating pack...',
    checkerTitle: 'SVG Pre-flight Checker',
    checkerSubtitle: 'Instant 6-point vector audit before generating assets.',
    checkerPrivacy: '100% local in your browser — files never leave your computer.',
    roles: {
      primary: 'Primary Logo',
      primary_dark: 'Primary (Dark)',
      horizontal: 'Horizontal',
      vertical: 'Vertical',
      mark: 'Logo Mark',
      monogram: 'Monogram',
      wordmark: 'Wordmark',
      app_icon: 'App Icon Source',
      custom: 'Custom',
    },
    checks: {
      hidden: { title: 'Hidden & Transparent', desc: 'Invisible layers, display:none or zero opacity' },
      strokes: { title: 'Live Strokes', desc: 'Unexpanded strokes that may scale unevenly' },
      text: { title: 'Live Text', desc: 'Non-outlined <text> elements dependent on fonts' },
      background: { title: 'Background Layers', desc: 'Full-canvas rectangles blocking transparency' },
      images: { title: 'Embedded Images', desc: 'Raster bitmaps (<image>) inside vector SVG' },
      colors: { title: 'ViewBox & Colors', desc: 'Valid viewBox bounds and clean HEX palette' },
    },
  },
  ua: {
    appTitle: 'Logopack Studio',
    navGenerator: 'Генератор',
    navChecker: 'SVG Перевірка',
    loadDemo: 'Демо логотип',
    step1: 'Асети',
    step2: 'Кольори',
    step3: 'Типографіка',
    step4: 'Експорт і Дошка',
    brandInfo: 'Дані бренду',
    brandName: 'Назва бренду',
    brandNamePlaceholder: 'напр. Feinschnauze',
    industry: 'Сфера / Індустрія',
    industryPlaceholder: 'напр. Студія дизайну, Фінтех',
    tagline: 'Слоган / Дескриптор',
    taglinePlaceholder: 'Опціональний короткий опис',
    uploadTitle: 'Перетягніть файли логотипу сюди',
    uploadHint: 'До 12 векторних SVG, EPS або PDF файлів · макс. 10 МБ кожен',
    roleLabel: 'Роль',
    back: 'Назад',
    next: 'Далі',
    skip: 'Пропустити',
    colorsTitle: 'Палітра та варіації',
    colorsSubtitle: 'Витягнуто з ваших SVG. Оберіть, які кольори працюють як колір лого чи фон.',
    bwToggle: 'Чорно-білі версії',
    bwHint: 'Додає суцільні #000000 та #FFFFFF варіанти',
    keepOriginal: 'Зберегти оригінальні кольори',
    keepOriginalHint: 'Лишає вихідні кольори SVG поруч із варіаціями',
    addColor: 'Додати колір',
    importPalette: 'Імпорт SVG-палітри',
    useAsLogo: 'Як колір лого',
    useAsBg: 'Як фон',
    autoCmyk: 'Авто CMYK',
    manualCmyk: 'Ручний CMYK',
    liveColorPreview: 'Живе прев’ю: Лого × Фон',
    typoTitle: 'Типографіка бренду',
    typoSubtitle: 'Оберіть основний (лого/заголовки) та додатковий (дескриптори) шрифти, або пропустіть крок.',
    primaryFont: 'Основний шрифт',
    secondaryFont: 'Додатковий шрифт',
    sourceGoogle: 'Google Fonts',
    sourceLocal: 'Шрифти ПК',
    sourceUpload: 'Файл з ПК',
    loadLocalFonts: 'Сканувати шрифти ПК',
    localFontsHint: 'Працює через Chrome Local Font Access API (на localhost/https; при відкритті через file:// просто перетягніть файл із C:\\Windows\\Fonts).',
    searchFonts: 'Пошук шрифту...',
    weightLabel: 'Вага',
    italicLabel: 'Курсив',
    dropFont: 'Перетягніть .ttf, .otf, .woff або .woff2',
    typoPreviewTitle: 'Живе прев’ю типографіки',
    exportTitle: 'Експорт і Дошка бренду',
    exportSubtitle: 'Налаштуйте формати, додайте мокапи (за бажанням) та зберіть готовий архів.',
    digitalRgb: 'Digital / RGB',
    printCmyk: 'Друк / CMYK',
    iconsAvatars: 'Іконки та Аватари',
    bentoBoard: 'Дошка бренду (Brand Board)',
    logoGuidePdf: 'Бренд-гайд PDF',
    mockupsTitle: 'Власні мокапи (опціонально)',
    mockupsHint: 'Завантажте 1–2 JPG/PNG мокапи для відображення на дошці бренду та у PDF-гайді.',
    downloadZip: 'Завантажити повний .ZIP',
    downloadBentoPng: 'Зберегти Дошку PNG',
    downloadGuidePdf: 'Зберегти PDF Гайд',
    generating: 'Генерую пакет...',
    checkerTitle: 'SVG Передпольотна перевірка',
    checkerSubtitle: 'Миттєвий аудит вектора за 6 критеріями перед генерацією.',
    checkerPrivacy: '100% локально у браузері — файли не залишають ваш ПК.',
    roles: {
      primary: 'Основний логотип',
      primary_dark: 'Основний (Темний)',
      horizontal: 'Горизонтальний',
      vertical: 'Вертикальний',
      mark: 'Знак (Mark)',
      monogram: 'Монограма',
      wordmark: 'Шрифтовий (Wordmark)',
      app_icon: 'Іконка додатку',
      custom: 'Інший',
    },
    checks: {
      hidden: { title: 'Приховані та прозорі', desc: 'Невидимі шари, display:none або нульова прозорість' },
      strokes: { title: 'Живі контури (Strokes)', desc: 'Непереведені в криві обводки' },
      text: { title: 'Живий текст', desc: 'Текстові елементи <text>, що залежать від шрифтів' },
      background: { title: 'Фонові шари', desc: 'Прямокутники на весь артборд, що перекривають прозорість' },
      images: { title: 'Вбудований растр', desc: 'Растрові картинки (<image>) всередині SVG' },
      colors: { title: 'ViewBox і Кольори', desc: 'Коректний viewBox та чиста HEX-палітра' },
    },
  },
};
