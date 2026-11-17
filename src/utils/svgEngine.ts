import type { AssetRole, SvgAuditResult, SvgCheckItem } from '../types';
import { normalizeHex } from './color';

const PAINT_TAGS = new Set([
  'path',
  'rect',
  'circle',
  'ellipse',
  'polygon',
  'polyline',
  'line',
]);

function parseInlineStyle(styleAttr: string | null): Record<string, string> {
  const map: Record<string, string> = {};
  if (!styleAttr) return map;
  for (const part of styleAttr.split(';')) {
    const idx = part.indexOf(':');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim().toLowerCase();
    const val = part.slice(idx + 1).trim();
    if (key) map[key] = val;
  }
  return map;
}

export function getSvgDimensions(svgEl: SVGSVGElement): {
  viewBox: string;
  width: number;
  height: number;
} {
  const vbAttr = svgEl.getAttribute('viewBox');
  if (vbAttr) {
    const parts = vbAttr
      .trim()
      .split(/[\s,]+/)
      .map(Number);
    if (parts.length === 4 && parts[2] > 0 && parts[3] > 0) {
      return { viewBox: parts.join(' '), width: parts[2], height: parts[3] };
    }
  }
  const w = parseFloat(svgEl.getAttribute('width') || '512') || 512;
  const h = parseFloat(svgEl.getAttribute('height') || '512') || 512;
  return { viewBox: `0 0 ${w} ${h}`, width: w, height: h };
}

export function auditSvg(svgText: string): SvgAuditResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const parserError = doc.querySelector('parsererror');
  const svgEl = doc.documentElement as unknown as SVGSVGElement;

  if (parserError || !svgEl || svgEl.tagName.toLowerCase() !== 'svg') {
    return {
      valid: false,
      viewBox: '0 0 0 0',
      width: 0,
      height: 0,
      aspectRatio: 1,
      colors: [],
      score: 0,
      checks: [
        { id: 'hidden', status: 'fail', count: 0, details: ['Invalid SVG XML'] },
        { id: 'strokes', status: 'fail', count: 0, details: [] },
        { id: 'text', status: 'fail', count: 0, details: [] },
        { id: 'background', status: 'fail', count: 0, details: [] },
        { id: 'images', status: 'fail', count: 0, details: [] },
        { id: 'colors', status: 'fail', count: 0, details: ['Missing <svg> root'] },
      ],
    };
  }

  const { viewBox, width, height } = getSvgDimensions(svgEl);
  const allEls = Array.from(svgEl.querySelectorAll('*'));

  const hiddenDetails: string[] = [];
  const strokeDetails: string[] = [];
  const textDetails: string[] = [];
  const bgDetails: string[] = [];
  const imageDetails: string[] = [];
  const colorSet = new Set<string>();

  const classRules = parseCssRules(svgEl);
  for (const rule of classRules.values()) {
    for (const attr of ['fill', 'stroke', 'stop-color']) {
      if (rule[attr]) {
        const hex = normalizeHex(rule[attr]);
        if (hex) colorSet.add(hex);
      }
    }
  }

  for (const el of allEls) {
    const tag = el.tagName.toLowerCase();
    const style = parseInlineStyle(el.getAttribute('style'));

    const display = el.getAttribute('display') ?? style.display;
    const visibility = el.getAttribute('visibility') ?? style.visibility;
    const opacityRaw = el.getAttribute('opacity') ?? style.opacity;
    const opacity = opacityRaw !== null && opacityRaw !== undefined ? parseFloat(opacityRaw) : 1;

    if (display === 'none' || visibility === 'hidden' || opacity === 0) {
      hiddenDetails.push(`<${tag}> invisible`);
    } else if (!Number.isNaN(opacity) && opacity < 1 && opacity > 0) {
      hiddenDetails.push(`<${tag}> opacity=${opacity}`);
    }

    if (tag === 'text' || tag === 'tspan') {
      const txt = (el.textContent || '').trim().slice(0, 24);
      textDetails.push(`<${tag}>${txt ? `: "${txt}"` : ''}`);
    }

    if (tag === 'image') {
      imageDetails.push('<image> raster bitmap');
    }

    const stroke = getEffectivePaint(el, 'stroke', classRules);
    const strokeWidth = parseFloat(el.getAttribute('stroke-width') ?? style['stroke-width'] ?? '1');
    if (stroke && stroke !== 'none' && stroke !== 'transparent' && strokeWidth > 0) {
      strokeDetails.push(`<${tag}> stroke="${stroke}"`);
    }

    if (tag === 'rect') {
      const rw = parseFloat(el.getAttribute('width') || '0');
      const rh = parseFloat(el.getAttribute('height') || '0');
      const fill = getEffectivePaint(el, 'fill', classRules);
      if (
        width > 0 &&
        height > 0 &&
        rw >= width * 0.94 &&
        rh >= height * 0.94 &&
        fill !== 'none' &&
        fill !== 'transparent'
      ) {
        bgDetails.push(`Full-artboard <rect> (${rw}×${rh})`);
      }
    }

    for (const attr of ['fill', 'stroke', 'stop-color']) {
      const val = getEffectivePaint(el, attr as 'fill' | 'stroke', classRules) ?? style[attr];
      if (val) {
        const hex = normalizeHex(val);
        if (hex) colorSet.add(hex);
      }
    }
  }

  // If SVG has painted elements without explicit fill (default SVG black)
  if (colorSet.size === 0) {
    const hasImplicitBlack = allEls.some(
      (el) => PAINT_TAGS.has(el.tagName.toLowerCase()) && !getEffectivePaint(el, 'fill', classRules),
    );
    if (hasImplicitBlack) colorSet.add('#000000');
  }

  const checks: SvgCheckItem[] = [
    {
      id: 'hidden',
      status: hiddenDetails.length === 0 ? 'pass' : 'warn',
      count: hiddenDetails.length,
      details: hiddenDetails.slice(0, 5),
    },
    {
      id: 'strokes',
      status: strokeDetails.length === 0 ? 'pass' : 'warn',
      count: strokeDetails.length,
      details: strokeDetails.slice(0, 5),
    },
    {
      id: 'text',
      status: textDetails.length === 0 ? 'pass' : 'fail',
      count: textDetails.length,
      details: textDetails.slice(0, 5),
    },
    {
      id: 'background',
      status: bgDetails.length === 0 ? 'pass' : 'warn',
      count: bgDetails.length,
      details: bgDetails.slice(0, 5),
    },
    {
      id: 'images',
      status: imageDetails.length === 0 ? 'pass' : 'fail',
      count: imageDetails.length,
      details: imageDetails.slice(0, 5),
    },
    {
      id: 'colors',
      status: width > 0 && height > 0 ? 'pass' : 'fail',
      count: colorSet.size,
      details: Array.from(colorSet),
    },
  ];

  let score = 100;
  for (const c of checks) {
    if (c.status === 'fail') score -= 25;
    if (c.status === 'warn') score -= 10;
  }

  return {
    valid: width > 0 && height > 0,
    viewBox,
    width,
    height,
    aspectRatio: height > 0 ? width / height : 1,
    colors: Array.from(colorSet),
    checks,
    score: Math.max(0, score),
  };
}

export function sanitizeSvgForExport(svgText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.documentElement as unknown as SVGSVGElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return svgText;
  const { viewBox } = getSvgDimensions(svgEl);
  svgEl.setAttribute('viewBox', viewBox);
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  // Expand <style> CSS class paint rules directly onto elements so standalone PDF/raster
  // renderers (like svg2pdf.js) preserve exact colors and inline SVGs don't leak CSS globally.
  const classRules = parseCssRules(svgEl);
  if (classRules.size > 0) {
    for (const el of Array.from(svgEl.querySelectorAll('[class]'))) {
      const clsAttr = el.getAttribute('class') || '';
      const style = parseInlineStyle(el.getAttribute('style'));
      for (const cls of clsAttr.split(/\s+/)) {
        const rule = classRules.get(cls);
        if (!rule) continue;
        for (const prop of ['fill', 'stroke', 'stroke-width', 'fill-rule', 'clip-rule', 'opacity', 'fill-opacity']) {
          if (rule[prop] && !el.getAttribute(prop) && !style[prop]) {
            el.setAttribute(prop, rule[prop]);
          }
        }
      }
      el.removeAttribute('class');
    }
    for (const styleEl of Array.from(svgEl.querySelectorAll('style'))) {
      if (!/@(keyframes|media|import|font-face)/.test(styleEl.textContent || '')) {
        styleEl.remove();
      }
    }
  }
  return new XMLSerializer().serializeToString(svgEl);
}

function parseCssRules(svgEl: SVGSVGElement): Map<string, Record<string, string>> {
  const classRules = new Map<string, Record<string, string>>();
  for (const styleEl of Array.from(svgEl.querySelectorAll('style'))) {
    const css = (styleEl.textContent || '').replace(/\/\*[\s\S]*?\*\//g, '');
    const blockRe = /([^{}]+)\{([^}]+)\}/g;
    let m: RegExpExecArray | null;
    while ((m = blockRe.exec(css)) !== null) {
      const selectors = m[1].split(',');
      const props = parseInlineStyle(m[2]);
      for (const sel of selectors) {
        const clsMatches = sel.match(/\.([a-zA-Z0-9_-]+)/g);
        if (!clsMatches) continue;
        for (const token of clsMatches) {
          const clsName = token.slice(1);
          classRules.set(clsName, { ...(classRules.get(clsName) || {}), ...props });
        }
      }
    }
  }
  return classRules;
}

function getEffectivePaint(
  el: Element,
  attr: 'fill' | 'stroke',
  classRules: Map<string, Record<string, string>>,
): string | undefined {
  let curr: Element | null = el;
  while (curr && curr.tagName.toLowerCase() !== 'svg') {
    const direct = curr.getAttribute(attr);
    if (direct) return direct;
    const style = parseInlineStyle(curr.getAttribute('style'));
    if (style[attr]) return style[attr];
    const clsAttr = curr.getAttribute('class');
    if (clsAttr) {
      for (const cls of clsAttr.split(/\s+/)) {
        const rule = classRules.get(cls);
        if (rule && rule[attr]) return rule[attr];
      }
    }
    curr = curr.parentElement;
  }
  return undefined;
}

interface BBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

function measureSvgBBoxes(svgEl: SVGSVGElement, paintedEls: Element[]): BBox[] {
  const boxes: BBox[] = [];
  let host: SVGSVGElement | null = null;
  try {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    host.setAttribute(
      'style',
      'position:fixed;left:-99999px;top:-99999px;width:1000px;height:1000px;visibility:hidden;pointer-events:none;',
    );
    const vb = svgEl.getAttribute('viewBox');
    if (vb) host.setAttribute('viewBox', vb);
    document.body.appendChild(host);

    const cloneRoot = svgEl.cloneNode(true) as SVGSVGElement;
    while (cloneRoot.firstChild) {
      host.appendChild(cloneRoot.firstChild);
    }

    const rootScreenCtm = host.getScreenCTM();
    const rootInv = rootScreenCtm ? rootScreenCtm.inverse() : null;

    const clonedPainted = Array.from(host.querySelectorAll('*')).filter((el) =>
      PAINT_TAGS.has(el.tagName.toLowerCase()),
    );
    for (let i = 0; i < paintedEls.length; i++) {
      const target = clonedPainted[i] as SVGGraphicsElement | undefined;
      if (target && typeof target.getBBox === 'function') {
        const b = target.getBBox();
        const elCtm = target.getScreenCTM();
        if (rootInv && elCtm && b.width >= 0 && b.height >= 0) {
          const rel = rootInv.multiply(elCtm);
          const pts = [
            new DOMPoint(b.x, b.y).matrixTransform(rel),
            new DOMPoint(b.x + b.width, b.y).matrixTransform(rel),
            new DOMPoint(b.x, b.y + b.height).matrixTransform(rel),
            new DOMPoint(b.x + b.width, b.y + b.height).matrixTransform(rel),
          ];
          const xs = pts.map((p) => p.x);
          const ys = pts.map((p) => p.y);
          const minX = Math.min(...xs);
          const minY = Math.min(...ys);
          boxes.push({
            x: minX,
            y: minY,
            width: Math.max(...xs) - minX,
            height: Math.max(...ys) - minY,
          });
        } else {
          boxes.push({ x: b.x, y: b.y, width: b.width, height: b.height });
        }
      } else {
        boxes.push({ x: 0, y: 0, width: 0, height: 0 });
      }
    }
  } catch {
    return paintedEls.map(() => ({ x: 0, y: 0, width: 0, height: 0 }));
  } finally {
    if (host && host.parentNode) host.parentNode.removeChild(host);
  }
  return boxes;
}

function bboxContainsCenter(outer: BBox, inner: BBox): boolean {
  if (outer.width <= 0 || outer.height <= 0 || inner.width <= 0 || inner.height <= 0) return false;
  const cx = inner.x + inner.width / 2;
  const cy = inner.y + inner.height / 2;
  const outerArea = outer.width * outer.height;
  const innerArea = inner.width * inner.height;
  return (
    outerArea >= innerArea * 1.04 &&
    cx >= outer.x - 0.5 &&
    cx <= outer.x + outer.width + 0.5 &&
    cy >= outer.y - 0.5 &&
    cy <= outer.y + outer.height + 0.5
  );
}

/**
 * Recolors a logo SVG into a target monochrome/brand ink color while preserving
 * multi-color layered silhouettes (badges, emblems, rings, stroke marks, cutouts).
 * - If `backdropHex` is passed (for PDF vector embedding or solid backgrounds),
 *   contrasting inner cutout shapes are painted with `backdropHex` (no <mask>,
 *   100% compatible with svg2pdf.js).
 * - If `backdropHex` is omitted (transparent SVG/PNG), an SVG <mask> punches out
 *   overlapping contrasting shapes so the background shows through.
 */
export function recolorSvg(svgText: string, hex: string, backdropHex?: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.documentElement as unknown as SVGSVGElement;
  if (!svgEl || svgEl.tagName.toLowerCase() !== 'svg') return svgText;

  const { viewBox } = getSvgDimensions(svgEl);
  svgEl.setAttribute('viewBox', viewBox);
  svgEl.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

  const classRules = parseCssRules(svgEl);

  const paintedEls = Array.from(svgEl.querySelectorAll('*')).filter((el) =>
    PAINT_TAGS.has(el.tagName.toLowerCase()),
  );

  // Measure transform-aware bounding boxes BEFORE removing <style> or mutating groups
  const boxes = measureSvgBBoxes(svgEl, paintedEls);

  const origFills = paintedEls.map((el) => {
    const raw = getEffectivePaint(el, 'fill', classRules);
    if (raw === 'none' || raw === 'transparent') return 'none';
    return normalizeHex(raw || '#000000') ?? '#000000';
  });
  const origStrokes = paintedEls.map((el) => {
    const raw = getEffectivePaint(el, 'stroke', classRules);
    if (!raw || raw === 'none' || raw === 'transparent') return 'none';
    return normalizeHex(raw) ?? 'none';
  });

  // Effective dominant ink per element (supports both filled badges and stroke-only marks)
  const effectiveInks = paintedEls.map((_, idx) =>
    origFills[idx] !== 'none' ? origFills[idx] : origStrokes[idx],
  );

  // Compute alternating depth for elements nested inside a differently-colored enclosing shape
  const depths = new Array<number>(paintedEls.length).fill(0);
  for (let j = 0; j < paintedEls.length; j++) {
    if (effectiveInks[j] === 'none') continue;
    for (let i = j - 1; i >= 0; i--) {
      if (effectiveInks[i] === 'none') continue;
      // Ignore hairline unfilled frames as outer containers for nested fills unless same/stroke
      if (origFills[i] === 'none' && origFills[j] !== 'none') continue;
      if (bboxContainsCenter(boxes[i], boxes[j])) {
        if (effectiveInks[i] !== effectiveInks[j]) {
          depths[j] = depths[i] + 1;
        } else {
          depths[j] = depths[i];
        }
        break;
      }
    }
  }

  for (const styleEl of Array.from(svgEl.querySelectorAll('style'))) {
    styleEl.remove();
  }
  for (const gEl of Array.from(svgEl.querySelectorAll('g'))) {
    if (gEl.getAttribute('fill') && gEl.getAttribute('fill') !== 'none') {
      gEl.removeAttribute('fill');
    }
    if (gEl.getAttribute('stroke') && gEl.getAttribute('stroke') !== 'none') {
      gEl.removeAttribute('stroke');
    }
  }

  const hasCutouts = depths.some((d) => d % 2 === 1);

  if (hasCutouts && !backdropHex) {
    // Transparent SVG mode: attach an SVG <mask> to root <g> or container elements
    const maskId = `mono-cutout-${Math.random().toString(36).slice(2, 8)}`;
    const defs = doc.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const mask = doc.createElementNS('http://www.w3.org/2000/svg', 'mask');
    mask.setAttribute('id', maskId);

    for (let i = 0; i < paintedEls.length; i++) {
      const el = paintedEls[i];
      if (origFills[i] === 'none' && origStrokes[i] === 'none') continue;
      const maskShape = el.cloneNode(true) as Element;
      const isHole = depths[i] % 2 === 1;
      maskShape.setAttribute('fill', origFills[i] === 'none' ? 'none' : isHole ? '#000000' : '#FFFFFF');
      if (origStrokes[i] !== 'none') {
        maskShape.setAttribute('stroke', isHole ? '#000000' : '#FFFFFF');
      }
      maskShape.removeAttribute('style');
      maskShape.removeAttribute('class');
      mask.appendChild(maskShape);
    }

    defs.appendChild(mask);
    svgEl.insertBefore(defs, svgEl.firstChild);

    // Paint all shapes `hex` and wrap content in masked <g>
    const wrapper = doc.createElementNS('http://www.w3.org/2000/svg', 'g');
    wrapper.setAttribute('mask', `url(#${maskId})`);
    const childrenToMove = Array.from(svgEl.children).filter(
      (c) => c.tagName.toLowerCase() !== 'defs',
    );
    for (const c of childrenToMove) {
      wrapper.appendChild(c);
    }
    svgEl.appendChild(wrapper);

    for (let i = 0; i < paintedEls.length; i++) {
      const el = paintedEls[i];
      if (depths[i] % 2 === 1) {
        // Hide inner hole geometry inside masked group so mask controls transparency cleanly
        el.remove();
        continue;
      }
      el.setAttribute('fill', origFills[i] === 'none' ? 'none' : hex);
      if (origStrokes[i] !== 'none') el.setAttribute('stroke', hex);
      el.removeAttribute('style');
      el.removeAttribute('class');
    }

    return new XMLSerializer().serializeToString(svgEl);
  }

  // Solid-backdrop mode (or flat non-overlapping SVG): zero <mask> needed!
  for (let i = 0; i < paintedEls.length; i++) {
    const el = paintedEls[i];
    const style = parseInlineStyle(el.getAttribute('style'));
    const isHole = depths[i] % 2 === 1;
    const paintHex = isHole && backdropHex ? backdropHex : hex;

    if (origFills[i] === 'none') {
      el.setAttribute('fill', 'none');
    } else {
      el.setAttribute('fill', paintHex);
    }

    if (origStrokes[i] !== 'none') {
      el.setAttribute('stroke', paintHex);
    }
    el.removeAttribute('class');
    if (el.hasAttribute('style')) {
      delete style.fill;
      delete style.stroke;
      const rest = Object.entries(style)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      if (rest) el.setAttribute('style', rest);
      else el.removeAttribute('style');
    }
  }

  return new XMLSerializer().serializeToString(svgEl);
}

export function guessRoleFromFilename(name: string): AssetRole {
  const lower = name.toLowerCase();
  if (lower.includes('dark') || lower.includes('inverted')) return 'primary_dark';
  if (lower.includes('horiz') || lower.includes('wide')) return 'horizontal';
  if (lower.includes('vert') || lower.includes('stack')) return 'vertical';
  if (lower.includes('mark') || lower.includes('symbol') || lower.includes('icon')) return 'mark';
  if (lower.includes('mono')) return 'monogram';
  if (lower.includes('word')) return 'wordmark';
  if (lower.includes('app')) return 'app_icon';
  return 'primary';
}

export const DEMO_ASSETS: Array<{ name: string; role: AssetRole; svg: string }> = [
  {
    name: 'acme-primary-logo.svg',
    role: 'primary',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110">
  <path d="M22 86L10 80C6 78 4 74 4 69V16C4 13 7 11 10 13L22 19C26 21 28 25 28 30V83C28 86 25 88 22 86Z" fill="#FA5008"/>
  <path d="M52 98L40 92C36 90 34 86 34 81V28C34 25 37 23 40 25L52 31C56 33 58 37 58 42V95C58 98 55 100 52 98Z" fill="#FA5008"/>
  <path d="M82 74L70 68C66 66 64 62 64 57V16C64 13 67 11 70 13L82 19C86 21 88 25 88 30V71C88 74 85 76 82 74Z" fill="#FA5008"/>
  <path d="M118 74V36H130L146 58V36H158V74H146L130 52V74H118ZM172 74V36H204V46H184V50H201V59H184V64H205V74H172ZM216 74V36H228V64H247V74H216ZM257 74V36H269V74H257ZM282 74V36H296L308 56L320 36H334V74H322V53L312 71H304L294 53V74H282Z" fill="#242424"/>
</svg>`,
  },
  {
    name: 'acme-primary-dark.svg',
    role: 'primary_dark',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 110">
  <path d="M22 86L10 80C6 78 4 74 4 69V16C4 13 7 11 10 13L22 19C26 21 28 25 28 30V83C28 86 25 88 22 86Z" fill="#FA5008"/>
  <path d="M52 98L40 92C36 90 34 86 34 81V28C34 25 37 23 40 25L52 31C56 33 58 37 58 42V95C58 98 55 100 52 98Z" fill="#FA5008"/>
  <path d="M82 74L70 68C66 66 64 62 64 57V16C64 13 67 11 70 13L82 19C86 21 88 25 88 30V71C88 74 85 76 82 74Z" fill="#FA5008"/>
  <path d="M118 74V36H130L146 58V36H158V74H146L130 52V74H118ZM172 74V36H204V46H184V50H201V59H184V64H205V74H172ZM216 74V36H228V64H247V74H216ZM257 74V36H269V74H257ZM282 74V36H296L308 56L320 36H334V74H322V53L312 71H304L294 53V74H282Z" fill="#F3F2EF"/>
</svg>`,
  },
  {
    name: 'acme-logo-mark.svg',
    role: 'mark',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 110 110">
  <path d="M31 91L19 85C15 83 13 79 13 74V21C13 18 16 16 19 18L31 24C35 26 37 30 37 35V88C37 91 34 93 31 91Z" fill="#FA5008"/>
  <path d="M61 103L49 97C45 95 43 91 43 86V33C43 30 46 28 49 30L61 36C65 38 67 42 67 47V100C67 103 64 105 61 103Z" fill="#FA5008"/>
  <path d="M91 79L79 73C75 71 73 67 73 62V21C73 18 76 16 79 18L91 24C95 26 97 30 97 35V76C97 79 94 81 91 79Z" fill="#FA5008"/>
</svg>`,
  },
];
