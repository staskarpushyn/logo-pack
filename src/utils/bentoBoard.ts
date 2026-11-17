import type {
  BoardBlockId,
  BoardBlockItem,
  BoardLayoutPreset,
  BrandColor,
  CustomizerConfig,
  LogoAsset,
  MockupImage,
  TypographyConfig,
} from '../types';
import { contrastRatio, relativeLuminance } from './color';
import { ensureConfigFontLoaded } from './fontLoader';
import { loadSvgImage } from './rasterAndIco';
import { recolorSvg, sanitizeSvgForExport } from './svgEngine';

export interface BentoRenderParams {
  brandName: string;
  tagline: string;
  designedBy?: string;
  layout?: BoardLayoutPreset;
  blocks?: BoardBlockItem[];
  assets: LogoAsset[];
  colors: BrandColor[];
  typography: TypographyConfig;
  mockups: MockupImage[];
  guideStyle?: CustomizerConfig['guide'];
}

export function getPresetBoardBlocks(layout: BoardLayoutPreset): BoardBlockItem[] {
  const all: BoardBlockId[] = [
    'primary',
    'matrix',
    'logomarkSplit',
    'accentSign',
    'swatches',
    'statement',
    'typography',
    'icons',
    'clearSpace',
    'application',
  ];

  let enabledOrder: BoardBlockId[];
  if (layout === 'logomark') {
    enabledOrder = ['primary', 'matrix', 'logomarkSplit', 'accentSign', 'swatches', 'statement', 'typography'];
  } else if (layout === 'showcase') {
    enabledOrder = ['primary', 'matrix', 'application', 'icons', 'swatches', 'statement', 'typography'];
  } else if (layout === 'monolith') {
    enabledOrder = ['primary', 'matrix', 'logomarkSplit', 'application', 'swatches', 'statement', 'typography'];
  } else if (layout === 'product') {
    enabledOrder = ['primary', 'accentSign', 'matrix', 'clearSpace', 'swatches', 'statement', 'typography'];
  } else {
    // 'swiss'
    enabledOrder = ['primary', 'matrix', 'icons', 'clearSpace', 'swatches', 'statement', 'typography'];
  }

  const enabledSet = new Set(enabledOrder);
  return [
    ...enabledOrder.map((id) => ({ id, enabled: true })),
    ...all.filter((id) => !enabledSet.has(id)).map((id) => ({ id, enabled: false })),
  ];
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function loadImgFromDataUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function drawContained(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  aspect: number,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  padPct = 0.18,
) {
  const availW = boxW * (1 - padPct * 2);
  const availH = boxH * (1 - padPct * 2);
  let dw = availW;
  let dh = dw / Math.max(0.05, aspect);
  if (dh > availH) {
    dh = availH;
    dw = dh * aspect;
  }
  ctx.drawImage(img, boxX + (boxW - dw) / 2, boxY + (boxH - dh) / 2, dw, dh);
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.save();
  drawRoundedRect(ctx, x, y, w, h, r);
  ctx.clip();
  const imgRatio = img.width / Math.max(1, img.height);
  const boxRatio = w / Math.max(1, h);
  let dw = w;
  let dh = h;
  if (imgRatio > boxRatio) {
    dh = h;
    dw = h * imgRatio;
  } else {
    dw = w;
    dh = w / imgRatio;
  }
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  ctx.restore();
}

export async function renderBentoBoardCanvas(
  params: BentoRenderParams,
): Promise<HTMLCanvasElement> {
  const pFam = params.typography.skipped
    ? 'Space Grotesk'
    : params.typography.primary.family || 'Space Grotesk';
  const sFam = params.typography.skipped
    ? 'Inter'
    : params.typography.secondary.family || 'Inter';
  await Promise.all([
    ensureConfigFontLoaded(
      params.typography.skipped
        ? { enabled: true, source: 'google', family: pFam, weight: 700, italic: false }
        : params.typography.primary,
    ),
    ensureConfigFontLoaded(
      params.typography.skipped
        ? { enabled: true, source: 'google', family: sFam, weight: 500, italic: false }
        : params.typography.secondary,
    ),
  ]);

  const gs = params.guideStyle;
  const W = 2400;
  const H = 1200;
  const PAD = gs ? Math.max(24, Math.min(72, Math.round(gs.pageMargin * 0.92))) : 44;
  const GAP = gs ? gs.bentoGap : 22;
  const R = gs ? gs.bentoRadius : 32;
  const logoScale = gs ? gs.bentoLogoScalePct / 100 : 1;
  const padFor = (basePad: number) => Math.max(0.05, Math.min(0.42, 0.5 - (0.5 - basePad) * logoScale));

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Backdrop
  ctx.fillStyle = gs?.bentoBackdrop || '#F5F5F7';
  ctx.fillRect(0, 0, W, H);

  const primaryAsset = params.assets.find((a) => a.role === 'primary') ?? params.assets[0];
  const darkAsset = params.assets.find((a) => a.role === 'primary_dark');
  const markCandidates = params.assets.filter(
    (a) => a.role === 'mark' || a.role === 'monogram' || a.role === 'app_icon',
  );
  const compactSquareAsset = [...params.assets]
    .filter((a) => a.audit.aspectRatio <= 1.65)
    .sort((a, b) => Math.abs(a.audit.aspectRatio - 1) - Math.abs(b.audit.aspectRatio - 1))[0];
  const markAsset = markCandidates[0] ?? compactSquareAsset ?? primaryAsset;
  const layout: BoardLayoutPreset = params.layout ?? 'logomark';

  const makeMonogramSvg = (ink: string): string => {
    const letter = ((params.brandName || 'B').trim()[0] || 'B').toUpperCase();
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="14" y="14" width="72" height="72" rx="18" fill="none" stroke="${ink}" stroke-width="5"/><text x="50" y="66" text-anchor="middle" font-family="${pFam}, sans-serif" font-weight="700" font-size="48" fill="${ink}">${letter}</text></svg>`;
  };
  const iconGraphicFor = (ink: string, bg: string): { svg: string; ratio: number } => {
    if (markAsset && markAsset.audit.aspectRatio <= 1.65) {
      return {
        svg: recolorSvg(markAsset.svgContent, ink, bg),
        ratio: markAsset.audit.aspectRatio,
      };
    }
    return { svg: makeMonogramSvg(ink), ratio: 1 };
  };

  // Deduplicate palette by uppercase hex so swatches never repeat identical entries
  const rawPalette = params.colors.length
    ? params.colors
    : [
        { id: 'd1', name: 'Jet Black', hex: '#1A242E', cmykMode: 'auto' as const, cmyk: { c: 43, m: 22, y: 0, k: 82 }, useAsLogo: true, useAsBackground: true },
        { id: 'd2', name: 'International Orange', hex: '#FA5008', cmykMode: 'auto' as const, cmyk: { c: 0, m: 68, y: 97, k: 2 }, useAsLogo: true, useAsBackground: true },
        { id: 'd3', name: 'Off-White', hex: '#F3F2EF', cmykMode: 'auto' as const, cmyk: { c: 0, m: 0, y: 2, k: 5 }, useAsLogo: false, useAsBackground: true },
      ];
  const seenHex = new Set<string>();
  const palette = rawPalette.filter((c) => {
    const h = c.hex.toUpperCase();
    if (seenHex.has(h)) return false;
    seenHex.add(h);
    return true;
  });

  const sortedByLum = [...palette].sort(
    (a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex),
  );
  const darkColor = sortedByLum[0]?.hex ?? '#1D1D1F';
  const lightest = sortedByLum[sortedByLum.length - 1]?.hex ?? '#FFFFFF';
  const lightColor = relativeLuminance(lightest) > 0.78 ? lightest : '#F3F2EF';
  const accentColor =
    palette.find(
      (c) =>
        c.hex.toUpperCase() !== darkColor.toUpperCase() &&
        c.hex.toUpperCase() !== lightColor.toUpperCase(),
    )?.hex ?? (lightest.toUpperCase() !== darkColor.toUpperCase() ? lightest : '#FA5008');
  const accentInk =
    contrastRatio('#1D1D1F', accentColor) >= contrastRatio('#FFFFFF', accentColor)
      ? darkColor
      : '#FFFFFF';

  // Extra 4th palette color (distinct from dark, light, and accent) for unique combinations
  const extraColor =
    palette.find((c) => {
      const u = c.hex.toUpperCase();
      return (
        u !== darkColor.toUpperCase() &&
        u !== lightColor.toUpperCase() &&
        u !== accentColor.toUpperCase() &&
        u !== '#FFFFFF'
      );
    })?.hex ?? null;

  const drawTileShell = (x: number, y: number, w: number, h: number, bg: string) => {
    ctx.fillStyle = bg;
    drawRoundedRect(ctx, x, y, w, h, R);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // --- INDIVIDUAL BLOCK RENDERERS (accept dynamic x, y, w, h) ---

  const drawPrimaryBlock = async (x: number, y: number, w: number, h: number) => {
    drawTileShell(x, y, w, h, '#FFFFFF');
    ctx.fillStyle = '#6E6E73';
    ctx.font = '600 18px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('PRIMARY IDENTITY', x + 36, y + 32);
    if (primaryAsset) {
      const img = await loadSvgImage(sanitizeSvgForExport(primaryAsset.svgContent));
      drawContained(ctx, img, primaryAsset.audit.aspectRatio, x, y + 44, w, h - 72, padFor(0.16));
    }
  };

  const drawStatementBlock = async (x: number, y: number, w: number, h: number) => {
    if (params.mockups[0]) {
      const mImg = await loadImgFromDataUrl(params.mockups[0].dataUrl);
      drawCoverImage(ctx, mImg, x, y, w, h, R);
      return;
    }
    ctx.fillStyle = '#1D1D1F';
    drawRoundedRect(ctx, x, y, w, h, R);
    ctx.fill();
    if (params.designedBy?.trim()) {
      ctx.fillStyle = 'rgba(245,245,247,0.48)';
      ctx.font = '500 18px "Inter", sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`DESIGNED BY ${params.designedBy.trim().toUpperCase()}`, x + 40, y + 34);
    }
    ctx.fillStyle = '#F5F5F7';
    ctx.font = `700 ${Math.min(54, Math.max(36, Math.round(h * 0.12)))}px "${pFam}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(params.brandName || 'Brand', x + 40, y + h - 76);
    if (params.tagline) {
      ctx.fillStyle = 'rgba(245,245,247,0.65)';
      ctx.font = `400 26px "${sFam}", sans-serif`;
      ctx.fillText(params.tagline, x + 40, y + h - 36);
    }
  };

  const drawMatrixBlock = async (tx: number, ty: number, tw: number, th: number) => {
    ctx.save();
    drawRoundedRect(ctx, tx, ty, tw, th, R);
    ctx.clip();
    const halfW = tw / 2;
    const halfH = th / 2;
    const quadrants = [
      { x: tx, y: ty, bg: '#FFFFFF', svg: primaryAsset ? sanitizeSvgForExport(primaryAsset.svgContent) : '' },
      { x: tx + halfW, y: ty, bg: accentColor, svg: primaryAsset ? recolorSvg(primaryAsset.svgContent, accentInk, accentColor) : '' },
      {
        x: tx,
        y: ty + halfH,
        bg: '#1D1D1F',
        svg: darkAsset
          ? sanitizeSvgForExport(darkAsset.svgContent)
          : primaryAsset
            ? recolorSvg(primaryAsset.svgContent, '#FFFFFF', '#1D1D1F')
            : '',
      },
      { x: tx + halfW, y: ty + halfH, bg: lightColor, svg: primaryAsset ? recolorSvg(primaryAsset.svgContent, '#1D1D1F', lightColor) : '' },
    ];
    for (const q of quadrants) {
      ctx.fillStyle = q.bg;
      ctx.fillRect(q.x, q.y, halfW + 1, halfH + 1);
      if (q.svg && primaryAsset) {
        const qImg = await loadSvgImage(q.svg);
        drawContained(ctx, qImg, primaryAsset.audit.aspectRatio, q.x, q.y, halfW, halfH, padFor(0.22));
      }
    }
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tx, ty, tw, th, R);
    ctx.stroke();
  };

  // Screenshot-1 style 3-cell Logomark Split with ZERO duplicate ink/bg combinations
  const drawLogomarkSplitBlock = async (tx: number, ty: number, tw: number, th: number) => {
    ctx.save();
    drawRoundedRect(ctx, tx, ty, tw, th, R);
    ctx.clip();
    const halfW = tw / 2;
    const halfH = th / 2;

    // Pair 1 (Left tall half): Crisp White bg + Dark mark
    const leftBg = '#FFFFFF';
    const leftInk = darkColor;

    // Pair 2 (Right top quarter): Dark bg + White mark
    const topRightBg = darkColor;
    const topRightInk = '#FFFFFF';

    // Pair 3 (Right bottom quarter): Distinct 3rd combo — NEVER repeats Pair 1, Pair 2, or Accent+AccentInk
    let botRightBg: string;
    let botRightInk: string;
    if (extraColor) {
      botRightBg = extraColor;
      botRightInk = contrastRatio('#FFFFFF', extraColor) >= contrastRatio(darkColor, extraColor) ? '#FFFFFF' : darkColor;
    } else {
      const warmTint = lightColor.toUpperCase() !== '#FFFFFF' ? lightColor : '#ECEAE5';
      botRightBg = warmTint;
      botRightInk = contrastRatio(accentColor, warmTint) >= 2.2 ? accentColor : darkColor;
      // Ensure not identical to white+dark
      if (botRightBg.toUpperCase() === leftBg && botRightInk.toUpperCase() === leftInk.toUpperCase()) {
        botRightBg = '#E6E3DC';
        botRightInk = accentColor;
      }
    }

    // Draw Left Half
    ctx.fillStyle = leftBg;
    ctx.fillRect(tx, ty, halfW + 1, th);
    const mLeft = iconGraphicFor(leftInk, leftBg);
    const imgLeft = await loadSvgImage(mLeft.svg);
    drawContained(ctx, imgLeft, mLeft.ratio, tx, ty, halfW, th, padFor(0.24));

    // Draw Top Right Quarter
    ctx.fillStyle = topRightBg;
    ctx.fillRect(tx + halfW, ty, halfW, halfH + 1);
    const mTopR = iconGraphicFor(topRightInk, topRightBg);
    const imgTopR = await loadSvgImage(mTopR.svg);
    drawContained(ctx, imgTopR, mTopR.ratio, tx + halfW, ty, halfW, halfH, padFor(0.28));

    // Draw Bottom Right Quarter (scale test: smaller mark on distinct surface)
    ctx.fillStyle = botRightBg;
    ctx.fillRect(tx + halfW, ty + halfH, halfW, halfH);
    const mBotR = iconGraphicFor(botRightInk, botRightBg);
    const imgBotR = await loadSvgImage(mBotR.svg);
    drawContained(ctx, imgBotR, mBotR.ratio, tx + halfW, ty + halfH, halfW, halfH, padFor(0.35));

    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 2;
    drawRoundedRect(ctx, tx, ty, tw, th, R);
    ctx.stroke();
  };

  const drawAccentSignBlock = async (tx: number, ty: number, tw: number, th: number) => {
    if (params.mockups[1] && layout !== 'logomark') {
      const mImg2 = await loadImgFromDataUrl(params.mockups[1].dataUrl);
      drawCoverImage(ctx, mImg2, tx, ty, tw, th, R);
      return;
    }
    drawTileShell(tx, ty, tw, th, accentColor);
    const sig = iconGraphicFor(accentInk, accentColor);
    const sigImg = await loadSvgImage(sig.svg);
    drawContained(ctx, sigImg, sig.ratio, tx, ty, tw, th, padFor(0.27));
  };

  const drawAppIconBlock = async (tx: number, ty: number, tw: number, th: number) => {
    drawTileShell(tx, ty, tw, th, '#FFFFFF');
    ctx.fillStyle = '#6E6E73';
    ctx.font = '600 15px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('APP ICON & FAVICON', tx + 32, ty + 28);

    const cx = tx + tw / 2;
    const sqSize = Math.min(152, Math.round(Math.min(tw, th) * 0.36));
    const sqX = cx - sqSize / 2;
    const sqY = ty + Math.max(76, Math.round((th - sqSize - 88) * 0.45));

    ctx.fillStyle = accentColor;
    drawRoundedRect(ctx, sqX, sqY, sqSize, sqSize, Math.round(sqSize * 0.24));
    ctx.fill();

    const appG = iconGraphicFor(accentInk, accentColor);
    const appImg = await loadSvgImage(appG.svg);
    drawContained(ctx, appImg, appG.ratio, sqX, sqY, sqSize, sqSize, padFor(0.24));

    const pillW = Math.min(tw - 64, 240);
    const pillH = 50;
    const pillX = cx - pillW / 2;
    const pillY = sqY + sqSize + 30;
    ctx.fillStyle = darkColor;
    drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 16);
    ctx.fill();

    const favG = iconGraphicFor('#FFFFFF', darkColor);
    const favImg = await loadSvgImage(favG.svg);
    drawContained(ctx, favImg, favG.ratio, pillX + 14, pillY + 10, 30, 30, 0.04);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '500 17px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const bLabel = params.brandName || 'Brand';
    const clipped = bLabel.length > 14 ? `${bLabel.slice(0, 13)}…` : bLabel;
    ctx.fillText(clipped, pillX + 54, pillY + pillH / 2);
  };

  const drawClearSpaceBlock = async (tx: number, ty: number, tw: number, th: number) => {
    drawTileShell(tx, ty, tw, th, '#FFFFFF');
    ctx.fillStyle = '#6E6E73';
    ctx.font = '600 15px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('CLEAR SPACE SYSTEM', tx + 32, ty + 28);

    const csAsset = primaryAsset ?? markAsset;
    if (csAsset) {
      const ratio = csAsset.audit.aspectRatio;
      let boxW = tw * 0.54;
      let boxH = boxW / Math.max(0.2, ratio);
      const maxH = th * 0.42;
      if (boxH > maxH) {
        boxH = maxH;
        boxW = boxH * ratio;
      }
      const pad = Math.min(28, Math.round(Math.min(tw, th) * 0.08));
      const cx = tx + tw / 2;
      const cy = ty + th * 0.56;

      ctx.save();
      ctx.strokeStyle = 'rgba(250, 80, 8, 0.45)';
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(cx - boxW / 2 - pad, cy - boxH / 2 - pad, boxW + pad * 2, boxH + pad * 2);
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
      ctx.restore();

      const img = await loadSvgImage(sanitizeSvgForExport(csAsset.svgContent));
      drawContained(ctx, img, ratio, cx - boxW / 2, cy - boxH / 2, boxW, boxH, 0.08);
    }
  };

  const drawApplicationBlock = async (tx: number, ty: number, tw: number, th: number) => {
    if (params.mockups[1]) {
      const mImg2 = await loadImgFromDataUrl(params.mockups[1].dataUrl);
      drawCoverImage(ctx, mImg2, tx, ty, tw, th, R);
      return;
    }
    drawTileShell(tx, ty, tw, th, accentColor);
    ctx.fillStyle = accentInk === '#FFFFFF' ? 'rgba(255,255,255,0.72)' : 'rgba(29,29,31,0.6)';
    ctx.font = '600 15px "Inter", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('BRAND APPLICATION', tx + 32, ty + 28);

    const cardW = Math.min(tw - 72, Math.round(th * 0.92));
    const cardH = Math.round(cardW * 0.58);
    const cardX = tx + (tw - cardW) / 2;
    const cardY = ty + (th - cardH) / 2 + 14;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.22)';
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 12;
    ctx.fillStyle = darkColor;
    drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
    ctx.fill();
    ctx.restore();

    if (primaryAsset) {
      const mCard = await loadSvgImage(recolorSvg(primaryAsset.svgContent, '#FFFFFF', darkColor));
      drawContained(ctx, mCard, primaryAsset.audit.aspectRatio, cardX + 26, cardY + 24, cardW * 0.55, cardH * 0.36, 0.04);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = `500 16px "${sFam}", sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText((params.brandName || 'Brand').slice(0, 22), cardX + 28, cardY + cardH - 22);
  };

  const drawSwatchesRow = (x: number, y: number, w: number, h: number) => {
    const swatches = palette.slice(0, 6);
    if (!swatches.length) return;
    const swW = (w - GAP * (swatches.length - 1)) / swatches.length;
    swatches.forEach((sw, idx) => {
      const sx = x + idx * (swW + GAP);
      ctx.fillStyle = sw.hex;
      drawRoundedRect(ctx, sx, y, swW, h, R);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.07)';
      ctx.lineWidth = 2;
      ctx.stroke();

      const isLight = relativeLuminance(sw.hex) > 0.55;
      ctx.fillStyle = isLight ? '#1D1D1F' : '#FFFFFF';
      ctx.font = '500 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(sw.hex, sx + 26, y + h - 26);
      ctx.font = '600 20px "Inter", sans-serif';
      const maxChars = Math.max(8, Math.floor((swW - 52) / 11));
      const label = sw.name.length > maxChars ? `${sw.name.slice(0, maxChars - 1)}…` : sw.name;
      ctx.fillText(label, sx + 26, y + h - 54);
    });
  };

  const drawTypographyRow = (x: number, y: number, w: number, h: number) => {
    const typoW = (w - GAP) / 2;
    const typoCards = [
      {
        x,
        bg: '#FFFFFF',
        fg: '#1D1D1F',
        muted: '#6E6E73',
        label: 'PRIMARY TYPEFACE',
        family: pFam,
        weight: params.typography.skipped ? 700 : params.typography.primary.weight,
        italic: !params.typography.skipped && params.typography.primary.italic,
      },
      {
        x: x + typoW + GAP,
        bg: darkColor,
        fg: '#F5F5F7',
        muted: 'rgba(245,245,247,0.65)',
        label: 'SECONDARY TYPEFACE',
        family: sFam,
        weight: params.typography.skipped ? 500 : params.typography.secondary.weight,
        italic: !params.typography.skipped && params.typography.secondary.italic,
      },
    ];

    const glyphPx = Math.min(148, Math.max(76, Math.round(h * 0.36)));
    for (const tc of typoCards) {
      ctx.fillStyle = tc.bg;
      drawRoundedRect(ctx, tc.x, y, typoW, h, R);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = tc.muted;
      ctx.font = '600 16px "Inter", sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${tc.label} · ${tc.weight}`, tc.x + 36, y + 30);

      ctx.fillStyle = tc.fg;
      ctx.font = `${tc.italic ? 'italic ' : ''}${tc.weight} 34px "${tc.family}", sans-serif`;
      ctx.fillText(tc.family, tc.x + 36, y + 60);

      ctx.textAlign = 'right';
      ctx.font = `${tc.italic ? 'italic ' : ''}${tc.weight} ${glyphPx}px "${tc.family}", sans-serif`;
      ctx.textBaseline = 'bottom';
      ctx.fillText('Aa', tc.x + typoW - 36, y + h - 18);
    }
  };

  // --- AUTO-ADAPTIVE LAYOUT ENGINE ---
  const activeBlocks = (params.blocks && params.blocks.length ? params.blocks : getPresetBoardBlocks(layout))
    .filter((b) => b.enabled)
    .map((b) => b.id);

  if (!activeBlocks.length) {
    return canvas;
  }

  const isLeftBlock = (id: BoardBlockId) => id === 'primary' || id === 'statement';
  const leftIds = activeBlocks.filter(isLeftBlock);
  const rightIds = activeBlocks.filter((id) => !isLeftBlock(id));

  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2;
  const hasLeft = leftIds.length > 0;
  const hasRight = rightIds.length > 0;

  const leftColW = hasRight ? 680 : innerW;
  const rightAreaX = hasLeft ? PAD + leftColW + GAP : PAD;
  const rightAreaW = hasLeft ? innerW - leftColW - GAP : innerW;

  // 1. Render Left Column blocks in user order (60/40 when 2, 100% when 1)
  if (hasLeft) {
    if (leftIds.length === 1) {
      const id = leftIds[0];
      if (id === 'primary') await drawPrimaryBlock(PAD, PAD, leftColW, innerH);
      else await drawStatementBlock(PAD, PAD, leftColW, innerH);
    } else {
      const topH = Math.round((innerH - GAP) * 0.6);
      const botH = innerH - GAP - topH;
      const slots = [
        { id: leftIds[0], y: PAD, h: topH },
        { id: leftIds[1], y: PAD + topH + GAP, h: botH },
      ];
      for (const s of slots) {
        if (s.id === 'primary') await drawPrimaryBlock(PAD, s.y, leftColW, s.h);
        else await drawStatementBlock(PAD, s.y, leftColW, s.h);
      }
    }
  }

  // 2. Group Right Area blocks into horizontal rows preserving exact user order
  if (hasRight) {
    type RowGroup = { kind: 'tiles'; ids: BoardBlockId[]; weight: number } | { kind: 'wide'; id: 'swatches' | 'typography'; weight: number };
    const maxTilesPerRow = hasLeft ? 3 : 4;
    const rows: RowGroup[] = [];
    let pendingTiles: BoardBlockId[] = [];

    const flushTiles = () => {
      if (!pendingTiles.length) return;
      if (pendingTiles.length <= maxTilesPerRow) {
        rows.push({ kind: 'tiles', ids: pendingTiles, weight: 44 });
      } else {
        // Split evenly across 2 rows (e.g. 4 -> 2+2, 5 -> 3+2, 6 -> 3+3)
        const firstCount = Math.ceil(pendingTiles.length / 2);
        rows.push({ kind: 'tiles', ids: pendingTiles.slice(0, firstCount), weight: 40 });
        rows.push({ kind: 'tiles', ids: pendingTiles.slice(firstCount), weight: 40 });
      }
      pendingTiles = [];
    };

    for (const id of rightIds) {
      if (id === 'swatches' || id === 'typography') {
        flushTiles();
        rows.push({ kind: 'wide', id, weight: id === 'swatches' ? 24 : 42 });
      } else {
        pendingTiles.push(id);
      }
    }
    flushTiles();

    const totalWeight = rows.reduce((acc, r) => acc + r.weight, 0);
    const availH = innerH - GAP * Math.max(0, rows.length - 1);
    let curY = PAD;

    for (let rIdx = 0; rIdx < rows.length; rIdx++) {
      const row = rows[rIdx];
      const rowH =
        rIdx === rows.length - 1
          ? PAD + innerH - curY
          : Math.round((availH * row.weight) / totalWeight);

      if (row.kind === 'wide') {
        if (row.id === 'swatches') drawSwatchesRow(rightAreaX, curY, rightAreaW, rowH);
        else drawTypographyRow(rightAreaX, curY, rightAreaW, rowH);
      } else {
        const count = row.ids.length;
        const tileW = (rightAreaW - GAP * Math.max(0, count - 1)) / count;
        for (let i = 0; i < count; i++) {
          const tx = rightAreaX + i * (tileW + GAP);
          const tid = row.ids[i];
          if (tid === 'matrix') await drawMatrixBlock(tx, curY, tileW, rowH);
          else if (tid === 'logomarkSplit') await drawLogomarkSplitBlock(tx, curY, tileW, rowH);
          else if (tid === 'accentSign') await drawAccentSignBlock(tx, curY, tileW, rowH);
          else if (tid === 'icons') await drawAppIconBlock(tx, curY, tileW, rowH);
          else if (tid === 'clearSpace') await drawClearSpaceBlock(tx, curY, tileW, rowH);
          else if (tid === 'application') await drawApplicationBlock(tx, curY, tileW, rowH);
        }
      }
      curY += rowH + GAP;
    }
  }

  return canvas;
}

export async function renderBentoBoardBlob(params: BentoRenderParams): Promise<Blob> {
  const canvas = await renderBentoBoardCanvas(params);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Failed to export Bento Board PNG'));
    }, 'image/png');
  });
}
