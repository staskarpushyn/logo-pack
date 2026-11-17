import JSZip from 'jszip';
import type {
  BrandColor,
  CmykValues,
  CustomizerConfig,
  ExportConfig,
  LogoAsset,
  TypographyConfig,
} from '../types';
import { renderBentoBoardBlob } from './bentoBoard';
import { contrastRatio, hexToCmyk } from './color';
import { svgToEps } from './epsExporter';
import { collectUsedFontFilesForZip } from './fontLoader';
import { buildBrandGuidePdf, svgToVectorPdfBlob } from './pdfGuide';
import { buildIcoFromSvg, renderSvgToRasterBlob } from './rasterAndIco';
import { recolorSvg, sanitizeSvgForExport } from './svgEngine';

export interface ZipBuildInput {
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
  customizerGuide?: CustomizerConfig['guide'];
  onProgress?: (pct: number, label: string) => void;
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

function ensureUniqueLabel(base: string, seen: Set<string>): string {
  let candidate = base;
  let n = 2;
  while (seen.has(candidate)) {
    candidate = `${base}-${n++}`;
  }
  seen.add(candidate);
  return candidate;
}

export async function buildFullZipPack(input: ZipBuildInput): Promise<Blob> {
  const zip = new JSZip();
  const slug = slugify(input.brandName);
  const { exportConfig, assets, colors } = input;
  const customCmyk = new Map<string, CmykValues>();
  for (const c of colors) {
    customCmyk.set(c.hex, c.cmykMode === 'manual' ? c.cmyk : hexToCmyk(c.hex));
  }

  const seenInkLabels = new Set<string>();
  const logoInks: Array<{ id: string; label: string; hex: string | null }> = [];
  if (input.keepOriginal) {
    logoInks.push({ id: 'orig', label: ensureUniqueLabel('original', seenInkLabels), hex: null });
  }
  for (const c of colors) {
    if (c.useAsLogo) {
      logoInks.push({ id: c.id, label: ensureUniqueLabel(slugify(c.name), seenInkLabels), hex: c.hex });
    }
  }
  if (input.bwEditions) {
    logoInks.push({ id: 'bw-black', label: ensureUniqueLabel('black', seenInkLabels), hex: '#000000' });
    logoInks.push({ id: 'bw-white', label: ensureUniqueLabel('white', seenInkLabels), hex: '#FFFFFF' });
  }

  const seenBgLabels = new Set<string>(['white']);
  const seenBgHexes = new Set<string>(['#FFFFFF']);
  const allBgs: Array<{ label: string; hex: string }> = [{ label: 'white', hex: '#FFFFFF' }];
  for (const c of colors) {
    if (!c.useAsBackground) continue;
    const up = c.hex.toUpperCase();
    if (seenBgHexes.has(up)) continue;
    seenBgHexes.add(up);
    allBgs.push({ label: ensureUniqueLabel(slugify(c.name), seenBgLabels), hex: up });
  }

  const totalSteps = Math.max(1, assets.length * logoInks.length + 4);
  let done = 0;
  const bump = (label: string) => {
    done++;
    input.onProgress?.(Math.min(98, Math.round((done / totalSteps) * 100)), label);
  };

  for (let idx = 0; idx < assets.length; idx++) {
    const asset = assets[idx];
    const folderPrefix = `${String(idx + 1).padStart(2, '0')}_${asset.role}`;
    const root = zip.folder(folderPrefix)!;

    for (const ink of logoInks) {
      bump(`${asset.role} · ${ink.label}`);
      const svgStr = ink.hex
        ? recolorSvg(asset.svgContent, ink.hex)
        : sanitizeSvgForExport(asset.svgContent);
      const baseName = `${slug}-${asset.role}-${ink.label}`;

      if (exportConfig.digital.enabled) {
        const dig = root.folder('01_RGB_Digital')!;
        if (exportConfig.digital.svg) {
          dig.folder('01_SVG')!.file(`${baseName}.svg`, svgStr);
        }
        if (exportConfig.digital.png) {
          const pngDir = dig.folder('02_PNG_Transparent')!;
          for (const w of exportConfig.digital.pngSizes) {
            const blob = await renderSvgToRasterBlob(svgStr, w, asset.audit.aspectRatio, 'image/png');
            pngDir.file(`${baseName}-${w}w.png`, blob);
          }
        }
        if (exportConfig.digital.webp) {
          const webpDir = dig.folder('03_WEBP')!;
          const blob = await renderSvgToRasterBlob(svgStr, 1024, asset.audit.aspectRatio, 'image/webp');
          webpDir.file(`${baseName}-1024w.webp`, blob);
        }
        if (exportConfig.digital.jpg) {
          const jpgDir = dig.folder('04_JPG')!;
          for (const bg of allBgs) {
            const inkHex = ink.hex ?? (asset.audit.colors[0] || '#18181B');
            const ratio = contrastRatio(inkHex, bg.hex);
            if (ratio < 1.35) continue;
            const pairKey = `${ink.id}__${bg.hex}`;
            const override = exportConfig.digital.manualJpgOverrides?.[pairKey];
            const isEnabled =
              override !== undefined
                ? override
                : !exportConfig.digital.disabledJpgPairs.includes(pairKey) && ratio >= 3;
            if (!isEnabled) continue;
            for (const w of exportConfig.digital.jpgSizes) {
              const jpgSvg = ink.hex ? recolorSvg(asset.svgContent, ink.hex, bg.hex) : svgStr;
              const blob = await renderSvgToRasterBlob(jpgSvg, w, asset.audit.aspectRatio, 'image/jpeg', {
                background: bg.hex,
                marginPct: exportConfig.digital.jpgMarginPct,
              });
              jpgDir.file(`${baseName}-on-${bg.label}-${w}w.jpg`, blob);
            }
          }
        }
        if (exportConfig.digital.pdf) {
          const pdfBg = ink.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
          const pdfSvg = ink.hex ? recolorSvg(asset.svgContent, ink.hex, pdfBg) : svgStr;
          const pdfBlob = await svgToVectorPdfBlob(pdfSvg, asset.audit.aspectRatio);
          dig.folder('05_PDF')!.file(`${baseName}.pdf`, pdfBlob);
        }
        if (exportConfig.digital.eps) {
          const epsText = svgToEps(svgStr, 'rgb', customCmyk);
          dig.folder('06_EPS')!.file(`${baseName}.eps`, epsText);
        }
      }

      if (exportConfig.print.enabled) {
        const prn = root.folder('02_CMYK_Print')!;
        if (exportConfig.print.eps) {
          prn.folder('EPS')!.file(`${baseName}-cmyk.eps`, svgToEps(svgStr, 'cmyk', customCmyk));
        }
        if (exportConfig.print.pdf) {
          const pdfBg = ink.hex === '#FFFFFF' ? '#000000' : '#FFFFFF';
          const pdfSvg = ink.hex ? recolorSvg(asset.svgContent, ink.hex, pdfBg) : svgStr;
          const pdfBlob = await svgToVectorPdfBlob(pdfSvg, asset.audit.aspectRatio);
          prn.folder('PDF')!.file(`${baseName}-print.pdf`, pdfBlob);
        }
      }
    }
  }

  // Icons & Avatars
  if (exportConfig.icons.enabled && assets.length > 0) {
    bump('Icons & Avatars');
    const iconSrc =
      (exportConfig.icons.sourceAssetId !== 'auto'
        ? assets.find((a) => a.id === exportConfig.icons.sourceAssetId)
        : assets.find((a) => a.role === 'mark') ?? assets[0]) ?? assets[0];

    const favSvg = recolorSvg(iconSrc.svgContent, exportConfig.icons.faviconColor);
    const favDir = zip.folder('03_Favicon')!;
    favDir.file('favicon.svg', favSvg);
    favDir.file(
      'favicon-96.png',
      await renderSvgToRasterBlob(favSvg, 96, iconSrc.audit.aspectRatio, 'image/png', {
        squareSize: 96,
        background: exportConfig.icons.faviconBg,
        marginPct: 8,
        scale: exportConfig.icons.faviconScale,
      }),
    );
    favDir.file(
      'favicon.ico',
      await buildIcoFromSvg(
        favSvg,
        iconSrc.audit.aspectRatio,
        exportConfig.icons.faviconBg,
        exportConfig.icons.faviconScale,
      ),
    );
    favDir.file(
      'setup.html',
      `<link rel="icon" type="image/svg+xml" href="/favicon.svg" />\n<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96.png" />\n<link rel="shortcut icon" href="/favicon.ico" />\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />\n`,
    );

    const appDir = zip.folder('04_App_Icon')!;
    const appSvgTransparent = recolorSvg(iconSrc.svgContent, exportConfig.icons.appIconColor);
    const appSvgSolid = recolorSvg(
      iconSrc.svgContent,
      exportConfig.icons.appIconColor,
      exportConfig.icons.appIconBg,
    );
    appDir.file(
      'apple-touch-icon.png',
      await renderSvgToRasterBlob(appSvgSolid, 180, iconSrc.audit.aspectRatio, 'image/png', {
        squareSize: 180,
        background: exportConfig.icons.appIconBg,
        marginPct: 14,
        scale: exportConfig.icons.appIconScale,
      }),
    );
    appDir.file(
      'icon-1024.png',
      await renderSvgToRasterBlob(appSvgSolid, 1024, iconSrc.audit.aspectRatio, 'image/png', {
        squareSize: 1024,
        background: exportConfig.icons.appIconBg,
        marginPct: 14,
        scale: exportConfig.icons.appIconScale,
        roundedRadius: 224,
      }),
    );
    const icDir = appDir.folder('Icon_Composer')!;
    icDir.file('foreground.svg', appSvgTransparent);
    icDir.file(
      'foreground-1024.png',
      await renderSvgToRasterBlob(appSvgTransparent, 1024, iconSrc.audit.aspectRatio, 'image/png', {
        squareSize: 1024,
        background: 'transparent',
        marginPct: 14,
        scale: exportConfig.icons.appIconScale,
      }),
    );

    const avDir = zip.folder('05_Avatar')!;
    const avSvg = recolorSvg(
      iconSrc.svgContent,
      exportConfig.icons.avatarColor,
      exportConfig.icons.avatarBg,
    );
    avDir.file(
      'avatar-1024.png',
      await renderSvgToRasterBlob(avSvg, 1024, iconSrc.audit.aspectRatio, 'image/png', {
        squareSize: 1024,
        background: exportConfig.icons.avatarBg,
        marginPct: 16,
        scale: exportConfig.icons.avatarScale,
      }),
    );
  }

  // Brand Overview Board
  if (exportConfig.bento.enabled) {
    bump('Brand Board');
    const bentoBlob = await renderBentoBoardBlob({
      brandName: input.brandName,
      tagline: input.tagline,
      designedBy: input.designedBy,
      layout: exportConfig.bento.layout,
      blocks: exportConfig.bento.blocks,
      assets,
      colors,
      typography: input.typography,
      mockups: exportConfig.bento.mockups,
      guideStyle: input.customizerGuide,
    });
    zip.folder('06_Brand_Board')!.file(`${slug}-brand-board.png`, bentoBlob);
  }

  // Package Used Brand Fonts for easy client installation
  bump('Packaging Fonts');
  const fontAssets = await collectUsedFontFilesForZip(input.typography, exportConfig.guide.language);
  if (fontAssets.length > 0) {
    const fontsDir = zip.folder('07_Fonts')!;
    for (const fa of fontAssets) {
      fontsDir.file(fa.path, fa.data);
    }
  }

  // Brand Guidelines PDF
  if (exportConfig.guide.enabled) {
    bump('Brand Guide PDF');
    const guideBlob = await buildBrandGuidePdf({
      brandName: input.brandName,
      industry: input.industry,
      tagline: input.tagline,
      designedBy: input.designedBy,
      language: exportConfig.guide.language,
      assets,
      colors,
      typography: input.typography,
      clearSpacePct: exportConfig.guide.clearSpacePct,
      clearSpaceRule: exportConfig.guide.clearSpaceRule,
      minDigitalPx: exportConfig.guide.minDigitalPx,
      minPrintMm: exportConfig.guide.minPrintMm,
      includeApplications: exportConfig.guide.includeApplications,
      applicationsAssetId: exportConfig.guide.applicationsAssetId,
      applicationsScale: exportConfig.guide.applicationsScale,
      boardLayout: exportConfig.bento.layout,
      boardBlocks: exportConfig.bento.blocks,
      mockups: exportConfig.bento.mockups,
      customizer: input.customizerGuide,
    });
    zip.file(`${slug}-logo-guide-${exportConfig.guide.language}.pdf`, guideBlob);
  }

  input.onProgress?.(100, 'Compressing ZIP...');
  return zip.generateAsync({ type: 'blob' });
}
