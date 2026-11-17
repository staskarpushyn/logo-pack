import type { BrandColor, LogoAsset } from '../types';
import { contrastRatio, relativeLuminance } from './color';
import { loadSvgImage } from './rasterAndIco';
import { recolorSvg, sanitizeSvgForExport } from './svgEngine';

export type MockupKind = 'tote' | 'bottle' | 'cards' | 'folder' | 'hoodie';

export interface MockupVariant {
  surfaceName: string;
  surfaceHex: string;
  subtitle: string;
  svgText: string;
}

function shadeColor(hex: string, pct: number): string {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 255) + Math.round(255 * pct)));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 255) + Math.round(255 * pct)));
  const b = Math.min(255, Math.max(0, (num & 255) + Math.round(255 * pct)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function resolveThreeMockupSurfaces(
  colors: BrandColor[],
  assets: LogoAsset[],
  locale: 'en' | 'ua',
  preferredAssetId: string | 'auto' = 'auto',
): MockupVariant[] {
  const explicitAsset =
    preferredAssetId !== 'auto' ? assets.find((a) => a.id === preferredAssetId) : undefined;
  const primary = explicitAsset ?? assets.find((a) => a.role === 'primary') ?? assets[0];
  const darkLogo = explicitAsset ?? assets.find((a) => a.role === 'primary_dark');

  const sorted = [...colors].sort(
    (a, b) => relativeLuminance(a.hex) - relativeLuminance(b.hex),
  );
  const darkSwatch = sorted[0] ?? { name: 'Onyx', hex: '#242424' };
  const lightCandidate = sorted[sorted.length - 1];

  const lightSurface =
    lightCandidate && relativeLuminance(lightCandidate.hex) > 0.78
      ? lightCandidate
      : { name: 'Off-White', hex: '#F3F2EF' };
  const darkSurface =
    relativeLuminance(darkSwatch.hex) < 0.2
      ? darkSwatch
      : { name: 'Onyx', hex: '#1F1F1F' };

  const accentSwatch =
    colors.find(
      (c) =>
        c.hex.toUpperCase() !== darkSwatch.hex.toUpperCase() &&
        c.hex.toUpperCase() !== lightSurface.hex.toUpperCase(),
    ) ??
    (lightCandidate && lightCandidate.hex !== darkSwatch.hex
      ? lightCandidate
      : { name: 'Accent', hex: '#FA5008' });

  const accentInk =
    contrastRatio('#1F1F1F', accentSwatch.hex) >= contrastRatio('#FFFFFF', accentSwatch.hex)
      ? darkSurface.hex
      : '#FFFFFF';
  const accentInkLabel =
    accentInk === '#FFFFFF'
      ? locale === 'ua'
        ? 'Білий логотип'
        : 'White logo'
      : `${darkSurface.name} logo`;

  return [
    {
      surfaceName: lightSurface.name,
      surfaceHex: lightSurface.hex,
      subtitle: locale === 'ua' ? 'Оригінал на світлому' : 'Light-background original',
      svgText: primary ? sanitizeSvgForExport(primary.svgContent) : '',
    },
    {
      surfaceName: accentSwatch.name,
      surfaceHex: accentSwatch.hex,
      subtitle: accentInkLabel,
      svgText: primary ? recolorSvg(primary.svgContent, accentInk, accentSwatch.hex) : '',
    },
    {
      surfaceName: darkSurface.name,
      surfaceHex: darkSurface.hex,
      subtitle: locale === 'ua' ? 'Версія для темного фону' : 'Dark-background original',
      svgText: darkLogo
        ? sanitizeSvgForExport(darkLogo.svgContent)
        : primary
          ? recolorSvg(primary.svgContent, '#FFFFFF', darkSurface.hex)
          : '',
    },
  ];
}

function drawLogoInBox(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  aspect: number,
  cx: number,
  cy: number,
  maxW: number,
  maxH: number,
  rotateRad = 0,
) {
  let dw = maxW;
  let dh = dw / aspect;
  if (dh > maxH) {
    dh = maxH;
    dw = dh * aspect;
  }
  ctx.save();
  ctx.translate(cx, cy);
  if (rotateRad !== 0) ctx.rotate(rotateRad);
  ctx.drawImage(img, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}

export async function renderMockupSpreadDataUrl(
  kind: MockupKind,
  variants: MockupVariant[],
  aspectRatio: number,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png',
  scale = 1,
): Promise<string> {
  const s = Math.max(0.55, Math.min(1.45, scale || 1));
  const W = 1680;
  const H = 680;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, W, H);

  const colW = W / 3;

  for (let i = 0; i < 3; i++) {
    const v = variants[i];
    const cx = colW * i + colW / 2;
    const isLight = relativeLuminance(v.surfaceHex) > 0.7;
    const strokeCol = isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.14)';
    const shadeDark = isLight ? shadeColor(v.surfaceHex, -0.07) : shadeColor(v.surfaceHex, 0.08);
    const shadeDeep = isLight ? shadeColor(v.surfaceHex, -0.14) : shadeColor(v.surfaceHex, -0.08);
    const logoImg = v.svgText ? await loadSvgImage(v.svgText) : null;

    // Ground ellipse shadow
    ctx.fillStyle = 'rgba(0,0,0,0.05)';
    ctx.beginPath();
    ctx.ellipse(cx, 548, 150, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    if (kind === 'tote') {
      // Back inner handle shading (Logopack tote bag look)
      ctx.strokeStyle = shadeDark;
      ctx.lineWidth = 22;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.roundRect(cx - 72, 74, 144, 120, 26);
      ctx.stroke();

      // Front handles
      ctx.strokeStyle = v.surfaceHex;
      ctx.lineWidth = 28;
      ctx.beginPath();
      ctx.roundRect(cx - 88, 62, 176, 130, 32);
      ctx.stroke();

      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 102, 48, 204, 150, 40);
      ctx.stroke();

      // Bag body
      ctx.fillStyle = v.surfaceHex;
      ctx.beginPath();
      ctx.moveTo(cx - 175, 175);
      ctx.lineTo(cx + 175, 175);
      ctx.lineTo(cx + 195, 515);
      ctx.quadraticCurveTo(cx + 195, 535, cx + 172, 535);
      ctx.lineTo(cx - 172, 535);
      ctx.quadraticCurveTo(cx - 195, 535, cx - 195, 515);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.stroke();

      // Top stitch seam + handle patches
      ctx.beginPath();
      ctx.moveTo(cx - 176, 202);
      ctx.lineTo(cx + 176, 202);
      ctx.stroke();

      if (logoImg) {
        drawLogoInBox(ctx, logoImg, aspectRatio, cx, 365, 220 * s, 100 * s);
      }
    } else if (kind === 'bottle') {
      // Handle loop
      ctx.strokeStyle = shadeDeep;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.roundRect(cx - 56, 44, 112, 86, 26);
      ctx.stroke();

      // Cap
      ctx.fillStyle = shadeDark;
      ctx.beginPath();
      ctx.roundRect(cx - 64, 96, 128, 44, 10);
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Bottle cylinder
      ctx.fillStyle = v.surfaceHex;
      ctx.beginPath();
      ctx.roundRect(cx - 72, 136, 144, 398, 24);
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.stroke();

      // Subtle vertical highlight
      ctx.fillStyle = isLight ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(cx - 56, 148, 22, 372);

      if (logoImg) {
        // Rotate wide wordmarks sideways (-90 deg), keep compact/square/emblem logos upright!
        if (aspectRatio > 1.65) {
          drawLogoInBox(ctx, logoImg, aspectRatio, cx, 338, 220 * s, 74 * s, -Math.PI / 2);
        } else {
          drawLogoInBox(ctx, logoImg, aspectRatio, cx, 326, 102 * s, 108 * s, 0);
        }
      }
    } else if (kind === 'cards') {
      // Back tilted card
      ctx.save();
      ctx.translate(cx - 10, 250);
      ctx.rotate(-0.07);
      ctx.fillStyle = shadeDark;
      ctx.beginPath();
      ctx.roundRect(-165, -96, 330, 192, 10);
      ctx.fill();
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      if (logoImg) {
        drawLogoInBox(ctx, logoImg, aspectRatio, 0, 0, 175 * s, 72 * s);
      }
      ctx.restore();

      // Front tilted card
      ctx.save();
      ctx.translate(cx + 12, 390);
      ctx.rotate(0.06);
      ctx.shadowColor = 'rgba(0,0,0,0.08)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = v.surfaceHex;
      ctx.beginPath();
      ctx.roundRect(-165, -96, 330, 192, 10);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = strokeCol;
      ctx.stroke();
      if (logoImg) {
        drawLogoInBox(ctx, logoImg, aspectRatio, 0, 0, 185 * s, 78 * s);
      }
      ctx.restore();
    } else if (kind === 'folder') {
      // Back flap + white sheet
      ctx.fillStyle = shadeDeep;
      ctx.beginPath();
      ctx.roundRect(cx - 120, 104, 280, 424, 12);
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.strokeStyle = '#E5E3DC';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(cx - 134, 86, 250, 420, 6);
      ctx.fill();
      ctx.stroke();

      // Front cover
      ctx.fillStyle = v.surfaceHex;
      ctx.strokeStyle = strokeCol;
      ctx.beginPath();
      ctx.roundRect(cx - 165, 110, 290, 420, 12);
      ctx.fill();
      ctx.stroke();

      // Side pocket tab
      ctx.fillStyle = shadeDark;
      ctx.beginPath();
      ctx.moveTo(cx + 125, 360);
      ctx.lineTo(cx + 160, 336);
      ctx.lineTo(cx + 160, 520);
      ctx.lineTo(cx + 125, 520);
      ctx.closePath();
      ctx.fill();

      if (logoImg) {
        drawLogoInBox(ctx, logoImg, aspectRatio, cx - 20, 305, 180 * s, 82 * s);
      }
    } else if (kind === 'hoodie') {
      // Relaxed garment silhouette + contoured hood (matching Logopack Page 15)
      ctx.fillStyle = v.surfaceHex;
      ctx.strokeStyle = strokeCol;
      ctx.lineWidth = 1.5;

      // Body + sleeves
      ctx.beginPath();
      ctx.moveTo(cx - 106, 198);
      ctx.lineTo(cx - 196, 392);
      ctx.lineTo(cx - 144, 412);
      ctx.lineTo(cx - 102, 312);
      ctx.lineTo(cx - 102, 514);
      ctx.quadraticCurveTo(cx, 524, cx + 102, 514);
      ctx.lineTo(cx + 102, 312);
      ctx.lineTo(cx + 144, 412);
      ctx.lineTo(cx + 196, 392);
      ctx.lineTo(cx + 106, 198);
      ctx.quadraticCurveTo(cx + 58, 178, cx + 44, 176);
      ctx.lineTo(cx - 44, 176);
      ctx.quadraticCurveTo(cx - 58, 178, cx - 106, 198);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hood outer silhouette sitting naturally behind collar
      ctx.fillStyle = v.surfaceHex;
      ctx.beginPath();
      ctx.moveTo(cx - 52, 182);
      ctx.bezierCurveTo(cx - 64, 102, cx - 36, 76, cx, 76);
      ctx.bezierCurveTo(cx + 36, 76, cx + 64, 102, cx + 52, 182);
      ctx.quadraticCurveTo(cx, 206, cx - 52, 182);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Hood interior shadow opening
      ctx.fillStyle = shadeDark;
      ctx.beginPath();
      ctx.moveTo(cx - 38, 176);
      ctx.bezierCurveTo(cx - 44, 118, cx - 22, 98, cx, 98);
      ctx.bezierCurveTo(cx + 22, 98, cx + 44, 118, cx + 38, 176);
      ctx.quadraticCurveTo(cx, 196, cx - 38, 176);
      ctx.closePath();
      ctx.fill();

      // Ribbed bottom hem + kangaroo pocket
      ctx.strokeStyle = strokeCol;
      ctx.beginPath();
      ctx.moveTo(cx - 100, 496);
      ctx.quadraticCurveTo(cx, 504, cx + 100, 496);
      ctx.moveTo(cx - 56, 392);
      ctx.lineTo(cx + 56, 392);
      ctx.lineTo(cx + 70, 466);
      ctx.lineTo(cx - 70, 466);
      ctx.closePath();
      ctx.stroke();

      if (logoImg) {
        drawLogoInBox(ctx, logoImg, aspectRatio, cx, 290, 128 * s, 56 * s);
      }
    }

    // Labels below mockup
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1F1F1F';
    ctx.font = '600 22px "Inter", sans-serif';
    ctx.fillText(v.surfaceName, cx, 608);
    ctx.fillStyle = '#6B6B6B';
    ctx.font = '400 17px "Inter", sans-serif';
    ctx.fillText(v.subtitle, cx, 638);
  }

  return mimeType === 'image/jpeg'
    ? canvas.toDataURL('image/jpeg', 0.92)
    : canvas.toDataURL('image/png');
}
