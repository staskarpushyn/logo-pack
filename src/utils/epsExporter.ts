import type { CmykValues } from '../types';
import { hexToCmyk, hexToRgb, normalizeHex } from './color';
import { getSvgDimensions } from './svgEngine';

/**
 * Pure client-side SVG -> Vector EPS (PostScript Level 2) converter.
 * Supports path, rect, circle, ellipse, polygon, polyline, line with RGB or CMYK colors.
 */
function psColorCmd(hex: string, mode: 'rgb' | 'cmyk', customCmyk?: Map<string, CmykValues>): string {
  if (mode === 'cmyk') {
    const cmyk = customCmyk?.get(hex) ?? hexToCmyk(hex);
    return `${(cmyk.c / 100).toFixed(3)} ${(cmyk.m / 100).toFixed(3)} ${(cmyk.y / 100).toFixed(3)} ${(cmyk.k / 100).toFixed(3)} setcmykcolor`;
  }
  const { r, g, b } = hexToRgb(hex);
  return `${(r / 255).toFixed(3)} ${(g / 255).toFixed(3)} ${(b / 255).toFixed(3)} setrgbcolor`;
}

function tokenizePath(d: string): string[] {
  return d.match(/[a-zA-Z]|[-+]?(?:\d*\.\d+|\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

function pathToPostScript(d: string, h: number): string {
  const tokens = tokenizePath(d);
  const out: string[] = ['newpath'];
  let i = 0;
  let cmd = '';
  let cx = 0;
  let cy = 0;
  let sx = 0;
  let sy = 0;
  let lastCpX = 0;
  let lastCpY = 0;

  const num = () => parseFloat(tokens[i++] || '0');
  const flipY = (y: number) => h - y;

  while (i < tokens.length) {
    const t = tokens[i];
    if (/^[a-zA-Z]$/.test(t)) {
      cmd = t;
      i++;
      if (cmd === 'Z' || cmd === 'z') {
        out.push('closepath');
        cx = sx;
        cy = sy;
        continue;
      }
    }

    switch (cmd) {
      case 'M':
        cx = num();
        cy = num();
        sx = cx;
        sy = cy;
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} moveto`);
        cmd = 'L';
        break;
      case 'm':
        cx += num();
        cy += num();
        sx = cx;
        sy = cy;
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} moveto`);
        cmd = 'l';
        break;
      case 'L':
        cx = num();
        cy = num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'l':
        cx += num();
        cy += num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'H':
        cx = num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'h':
        cx += num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'V':
        cy = num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'v':
        cy += num();
        out.push(`${cx.toFixed(2)} ${flipY(cy).toFixed(2)} lineto`);
        break;
      case 'C': {
        const x1 = num();
        const y1 = num();
        const x2 = num();
        const y2 = num();
        cx = num();
        cy = num();
        lastCpX = x2;
        lastCpY = y2;
        out.push(
          `${x1.toFixed(2)} ${flipY(y1).toFixed(2)} ${x2.toFixed(2)} ${flipY(y2).toFixed(2)} ${cx.toFixed(2)} ${flipY(cy).toFixed(2)} curveto`,
        );
        break;
      }
      case 'c': {
        const x1 = cx + num();
        const y1 = cy + num();
        const x2 = cx + num();
        const y2 = cy + num();
        cx += num();
        cy += num();
        lastCpX = x2;
        lastCpY = y2;
        out.push(
          `${x1.toFixed(2)} ${flipY(y1).toFixed(2)} ${x2.toFixed(2)} ${flipY(y2).toFixed(2)} ${cx.toFixed(2)} ${flipY(cy).toFixed(2)} curveto`,
        );
        break;
      }
      case 'S':
      case 's': {
        const rel = cmd === 's';
        const x1 = 2 * cx - lastCpX;
        const y1 = 2 * cy - lastCpY;
        const x2 = (rel ? cx : 0) + num();
        const y2 = (rel ? cy : 0) + num();
        cx = (rel ? cx : 0) + num();
        cy = (rel ? cy : 0) + num();
        lastCpX = x2;
        lastCpY = y2;
        out.push(
          `${x1.toFixed(2)} ${flipY(y1).toFixed(2)} ${x2.toFixed(2)} ${flipY(y2).toFixed(2)} ${cx.toFixed(2)} ${flipY(cy).toFixed(2)} curveto`,
        );
        break;
      }
      case 'Q':
      case 'q': {
        const rel = cmd === 'q';
        const qx = (rel ? cx : 0) + num();
        const qy = (rel ? cy : 0) + num();
        const ex = (rel ? cx : 0) + num();
        const ey = (rel ? cy : 0) + num();
        const c1x = cx + (2 / 3) * (qx - cx);
        const c1y = cy + (2 / 3) * (qy - cy);
        const c2x = ex + (2 / 3) * (qx - ex);
        const c2y = ey + (2 / 3) * (qy - ey);
        lastCpX = qx;
        lastCpY = qy;
        cx = ex;
        cy = ey;
        out.push(
          `${c1x.toFixed(2)} ${flipY(c1y).toFixed(2)} ${c2x.toFixed(2)} ${flipY(c2y).toFixed(2)} ${cx.toFixed(2)} ${flipY(cy).toFixed(2)} curveto`,
        );
        break;
      }
      default:
        // Advance safely on unsupported arc/T commands to prevent infinite loop
        i++;
        break;
    }
  }
  return out.join('\n');
}

export function svgToEps(
  svgText: string,
  mode: 'rgb' | 'cmyk',
  customCmyk?: Map<string, CmykValues>,
): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgText, 'image/svg+xml');
  const svgEl = doc.documentElement as unknown as SVGSVGElement;
  const { width, height } = getSvgDimensions(svgEl);
  const w = Math.max(1, Math.round(width));
  const h = Math.max(1, Math.round(height));

  const body: string[] = [];

  for (const el of Array.from(svgEl.querySelectorAll('*'))) {
    const tag = el.tagName.toLowerCase();
    const fillAttr = el.getAttribute('fill');
    const strokeAttr = el.getAttribute('stroke');
    const fillHex = fillAttr === 'none' ? null : normalizeHex(fillAttr || '#000000');
    const strokeHex = strokeAttr && strokeAttr !== 'none' ? normalizeHex(strokeAttr) : null;
    const strokeWidth = parseFloat(el.getAttribute('stroke-width') || '1');

    let psGeom = '';
    if (tag === 'path') {
      const d = el.getAttribute('d');
      if (d) psGeom = pathToPostScript(d, h);
    } else if (tag === 'rect') {
      const x = parseFloat(el.getAttribute('x') || '0');
      const y = parseFloat(el.getAttribute('y') || '0');
      const rw = parseFloat(el.getAttribute('width') || '0');
      const rh = parseFloat(el.getAttribute('height') || '0');
      const rx = Math.min(parseFloat(el.getAttribute('rx') || '0'), rw / 2, rh / 2);
      if (rx > 0) {
        const top = h - y;
        const bot = h - (y + rh);
        psGeom = [
          'newpath',
          `${(x + rx).toFixed(2)} ${top.toFixed(2)} moveto`,
          `${(x + rw - rx).toFixed(2)} ${top.toFixed(2)} lineto`,
          `${(x + rw - rx).toFixed(2)} ${(top - rx).toFixed(2)} ${rx.toFixed(2)} 90 0 arcn`,
          `${(x + rw).toFixed(2)} ${(bot + rx).toFixed(2)} lineto`,
          `${(x + rw - rx).toFixed(2)} ${(bot + rx).toFixed(2)} ${rx.toFixed(2)} 0 270 arcn`,
          `${(x + rx).toFixed(2)} ${bot.toFixed(2)} lineto`,
          `${(x + rx).toFixed(2)} ${(bot + rx).toFixed(2)} ${rx.toFixed(2)} 270 180 arcn`,
          `${x.toFixed(2)} ${(top - rx).toFixed(2)} lineto`,
          `${(x + rx).toFixed(2)} ${(top - rx).toFixed(2)} ${rx.toFixed(2)} 180 90 arcn`,
          'closepath',
        ].join('\n');
      } else {
        const bot = h - (y + rh);
        psGeom = [
          'newpath',
          `${x.toFixed(2)} ${bot.toFixed(2)} moveto`,
          `${rw.toFixed(2)} 0 rlineto`,
          `0 ${rh.toFixed(2)} rlineto`,
          `${(-rw).toFixed(2)} 0 rlineto`,
          'closepath',
        ].join('\n');
      }
    } else if (tag === 'circle') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = h - parseFloat(el.getAttribute('cy') || '0');
      const r = parseFloat(el.getAttribute('r') || '0');
      psGeom = `newpath\n${cx.toFixed(2)} ${cy.toFixed(2)} ${r.toFixed(2)} 0 360 arc\nclosepath`;
    } else if (tag === 'ellipse') {
      const cx = parseFloat(el.getAttribute('cx') || '0');
      const cy = h - parseFloat(el.getAttribute('cy') || '0');
      const rx = parseFloat(el.getAttribute('rx') || '1');
      const ry = parseFloat(el.getAttribute('ry') || '1');
      psGeom = `gsave\n${cx.toFixed(2)} ${cy.toFixed(2)} translate\n1 ${(ry / rx).toFixed(4)} scale\nnewpath 0 0 ${rx.toFixed(2)} 0 360 arc closepath\ngrestore`;
    } else if (tag === 'polygon' || tag === 'polyline') {
      const pts = (el.getAttribute('points') || '')
        .trim()
        .split(/[\s,]+/)
        .map(Number);
      if (pts.length >= 4) {
        const lines = ['newpath', `${pts[0].toFixed(2)} ${(h - pts[1]).toFixed(2)} moveto`];
        for (let k = 2; k < pts.length; k += 2) {
          lines.push(`${pts[k].toFixed(2)} ${(h - pts[k + 1]).toFixed(2)} lineto`);
        }
        if (tag === 'polygon') lines.push('closepath');
        psGeom = lines.join('\n');
      }
    } else if (tag === 'line') {
      const x1 = parseFloat(el.getAttribute('x1') || '0');
      const y1 = h - parseFloat(el.getAttribute('y1') || '0');
      const x2 = parseFloat(el.getAttribute('x2') || '0');
      const y2 = h - parseFloat(el.getAttribute('y2') || '0');
      psGeom = `newpath\n${x1.toFixed(2)} ${y1.toFixed(2)} moveto\n${x2.toFixed(2)} ${y2.toFixed(2)} lineto`;
    }

    if (!psGeom) continue;

    if (fillHex) {
      body.push('gsave');
      body.push(psColorCmd(fillHex, mode, customCmyk));
      body.push(psGeom);
      body.push('fill');
      body.push('grestore');
    }
    if (strokeHex) {
      body.push('gsave');
      body.push(`${strokeWidth.toFixed(2)} setlinewidth`);
      body.push(psColorCmd(strokeHex, mode, customCmyk));
      body.push(psGeom);
      body.push('stroke');
      body.push('grestore');
    }
  }

  return [
    '%!PS-Adobe-3.0 EPSF-3.0',
    `%%BoundingBox: 0 0 ${w} ${h}`,
    '%%Creator: Logopack Studio Local',
    `%%DocumentData: Clean7Bit`,
    '%%EndComments',
    ...body,
    '%%EOF',
  ].join('\n');
}
