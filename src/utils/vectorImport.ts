import { rgbToHex } from './color';

export type VectorSourceFormat = 'svg' | 'eps' | 'pdf';

export interface ImportedVectorResult {
  svgContent: string;
  sourceFormat: VectorSourceFormat;
}

interface Matrix2D {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

interface GState {
  ctm: Matrix2D;
  fill: string;
  stroke: string;
  lineWidth: number;
}

function mulMat(m1: Matrix2D, m2: Matrix2D): Matrix2D {
  return {
    a: m1.a * m2.a + m1.c * m2.b,
    b: m1.b * m2.a + m1.d * m2.b,
    c: m1.a * m2.c + m1.c * m2.d,
    d: m1.b * m2.c + m1.d * m2.d,
    e: m1.a * m2.e + m1.c * m2.f + m1.e,
    f: m1.b * m2.e + m1.d * m2.f + m1.f,
  };
}

function applyMat(m: Matrix2D, x: number, y: number): [number, number] {
  return [m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f];
}

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '0';
  return Number(n.toFixed(3)).toString();
}

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n * 255)));
}

function parseColorGray(g: number): string {
  const v = clampByte(g);
  return rgbToHex(v, v, v);
}

function parseColorRgb(r: number, g: number, b: number): string {
  return rgbToHex(clampByte(r), clampByte(g), clampByte(b));
}

function parseColorCmyk(c: number, m: number, y: number, k: number): string {
  const cc = Math.max(0, Math.min(1, c));
  const mm = Math.max(0, Math.min(1, m));
  const yy = Math.max(0, Math.min(1, y));
  const kk = Math.max(0, Math.min(1, k));
  const r = Math.round(255 * (1 - cc) * (1 - kk));
  const g = Math.round(255 * (1 - mm) * (1 - kk));
  const b = Math.round(255 * (1 - yy) * (1 - kk));
  return rgbToHex(r, g, b);
}

function tokenizeVectorStream(src: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  const len = src.length;
  while (i < len) {
    const ch = src[i];
    if (ch <= ' ') {
      i++;
      continue;
    }
    if (ch === '%') {
      while (i < len && src[i] !== '\n' && src[i] !== '\r') i++;
      continue;
    }
    if (ch === '(') {
      let depth = 1;
      i++;
      while (i < len && depth > 0) {
        if (src[i] === '\\') {
          i += 2;
          continue;
        }
        if (src[i] === '(') depth++;
        else if (src[i] === ')') depth--;
        i++;
      }
      tokens.push('()');
      continue;
    }
    if (ch === '<') {
      if (src[i + 1] === '<') {
        tokens.push('<<');
        i += 2;
      } else {
        let j = i + 1;
        while (j < len && src[j] !== '>') j++;
        tokens.push(src.slice(i, j + 1));
        i = j + 1;
      }
      continue;
    }
    if (ch === '>' && src[i + 1] === '>') {
      tokens.push('>>');
      i += 2;
      continue;
    }
    if (ch === '[' || ch === ']' || ch === '{' || ch === '}') {
      tokens.push(ch);
      i++;
      continue;
    }
    if (ch === '/') {
      let j = i + 1;
      while (j < len && src[j] > ' ' && !'[]{}()<>/%'.includes(src[j])) j++;
      tokens.push(src.slice(i, j));
      i = j;
      continue;
    }
    let j = i;
    while (j < len && src[j] > ' ' && !'[]{}()<>/%'.includes(src[j])) j++;
    tokens.push(src.slice(i, j));
    i = j;
  }
  return tokens;
}

interface BuiltShape {
  tag: 'path';
  d: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  fillRule?: 'evenodd';
}

function buildSvgFromShapes(
  shapes: BuiltShape[],
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
): string {
  const w = Math.max(1, maxX - minX);
  const h = Math.max(1, maxY - minY);
  const body = shapes
    .map((s) => {
      const attrs = [`d="${s.d}"`];
      attrs.push(`fill="${s.fill}"`);
      if (s.fillRule) attrs.push(`fill-rule="${s.fillRule}"`);
      if (s.stroke !== 'none' && s.strokeWidth > 0) {
        attrs.push(`stroke="${s.stroke}"`);
        attrs.push(`stroke-width="${fmt(s.strokeWidth)}"`);
        attrs.push(`stroke-linecap="round"`);
        attrs.push(`stroke-linejoin="round"`);
      }
      return `  <path ${attrs.join(' ')} />`;
    })
    .join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${fmt(minX)} ${fmt(minY)} ${fmt(w)} ${fmt(h)}">\n${body}\n</svg>`;
}

function runPathInterpreter(
  tokens: string[],
  initBox: [number, number, number, number] | null,
  xobjects?: Map<string, { tokens: string[]; matrix?: Matrix2D }>,
): string | null {
  const stack: Array<number | string | number[]> = [];
  const gStack: GState[] = [];
  const defs = new Map<string, string[]>();

  let state: GState = {
    ctm: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 },
    fill: '#000000',
    stroke: 'none',
    lineWidth: 1,
  };

  let curPath: string[] = [];
  let curX = 0;
  let curY = 0;
  let subStartX = 0;
  let subStartY = 0;
  const shapes: BuiltShape[] = [];
  let bbMinX = Infinity;
  let bbMinY = Infinity;
  let bbMaxX = -Infinity;
  let bbMaxY = -Infinity;

  const trackPt = (x: number, y: number) => {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    if (x < bbMinX) bbMinX = x;
    if (y < bbMinY) bbMinY = y;
    if (x > bbMaxX) bbMaxX = x;
    if (y > bbMaxY) bbMaxY = y;
  };

  const popNum = (fallback = 0): number => {
    const v = stack.pop();
    return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  };

  const flushPath = (doFill: boolean, doStroke: boolean, evenodd = false) => {
    if (curPath.length > 0) {
      shapes.push({
        tag: 'path',
        d: curPath.join(' '),
        fill: doFill ? state.fill : 'none',
        stroke: doStroke ? state.stroke : 'none',
        strokeWidth: doStroke
          ? Math.max(0.5, state.lineWidth * Math.hypot(state.ctm.a, state.ctm.b))
          : 0,
        fillRule: evenodd ? 'evenodd' : undefined,
      });
    }
    curPath = [];
  };

  const execTokens = (toks: string[], depth = 0) => {
    if (depth > 8) return;
    let idx = 0;
    while (idx < toks.length) {
      const tok = toks[idx++];

      if (tok === '[') {
        const arr: number[] = [];
        while (idx < toks.length && toks[idx] !== ']') {
          const n = Number(toks[idx++]);
          if (Number.isFinite(n)) arr.push(n);
        }
        if (toks[idx] === ']') idx++;
        stack.push(arr);
        continue;
      }

      if (tok === '{') {
        const proc: string[] = [];
        let bDepth = 1;
        while (idx < toks.length && bDepth > 0) {
          const inner = toks[idx++];
          if (inner === '{') bDepth++;
          else if (inner === '}') {
            bDepth--;
            if (bDepth === 0) break;
          }
          proc.push(inner);
        }
        // Check if followed by def/bd/bind def
        if (toks[idx] === 'def' || toks[idx] === 'bd' || toks[idx] === 'ld') {
          idx++;
          const nameTok = stack.pop();
          if (typeof nameTok === 'string' && nameTok.startsWith('/')) {
            defs.set(nameTok.slice(1), proc);
          }
        } else if (toks[idx] === 'bind' && (toks[idx + 1] === 'def' || toks[idx + 1] === 'bd')) {
          idx += 2;
          const nameTok = stack.pop();
          if (typeof nameTok === 'string' && nameTok.startsWith('/')) {
            defs.set(nameTok.slice(1), proc);
          }
        }
        continue;
      }

      if (tok.startsWith('/')) {
        stack.push(tok);
        continue;
      }

      const num = Number(tok);
      if (tok !== '' && !Number.isNaN(num) && /^-?(?:\d+\.?\d*|\.\d+)$/.test(tok)) {
        stack.push(num);
        continue;
      }

      switch (tok) {
        case 'q':
        case 'gsave':
        case 'gs':
          gStack.push({ ...state, ctm: { ...state.ctm } });
          break;
        case 'Q':
        case 'grestore':
        case 'gr': {
          const prev = gStack.pop();
          if (prev) state = prev;
          break;
        }
        case 'cm':
        case 'concat': {
          const arr = stack.pop();
          if (Array.isArray(arr) && arr.length >= 6) {
            state.ctm = mulMat(state.ctm, {
              a: arr[0],
              b: arr[1],
              c: arr[2],
              d: arr[3],
              e: arr[4],
              f: arr[5],
            });
          } else {
            const f = popNum();
            const e = popNum();
            const d = popNum();
            const c = popNum();
            const b = popNum();
            const a = popNum();
            state.ctm = mulMat(state.ctm, { a, b, c, d, e, f });
          }
          break;
        }
        case 'translate': {
          const ty = popNum();
          const tx = popNum();
          state.ctm = mulMat(state.ctm, { a: 1, b: 0, c: 0, d: 1, e: tx, f: ty });
          break;
        }
        case 'scale': {
          const sy = popNum(1);
          const sx = popNum(1);
          state.ctm = mulMat(state.ctm, { a: sx, b: 0, c: 0, d: sy, e: 0, f: 0 });
          break;
        }
        case 'rotate': {
          const deg = popNum();
          const rad = (deg * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          state.ctm = mulMat(state.ctm, { a: cos, b: sin, c: -sin, d: cos, e: 0, f: 0 });
          break;
        }
        case 'w':
        case 'setlinewidth': {
          state.lineWidth = Math.max(0.1, popNum(1));
          break;
        }
        case 'g':
        case 'setgray': {
          state.fill = parseColorGray(popNum(0));
          break;
        }
        case 'G': {
          state.stroke = parseColorGray(popNum(0));
          break;
        }
        case 'rg':
        case 'setrgbcolor': {
          const b = popNum();
          const g = popNum();
          const r = popNum();
          state.fill = parseColorRgb(r, g, b);
          break;
        }
        case 'RG': {
          const b = popNum();
          const g = popNum();
          const r = popNum();
          state.stroke = parseColorRgb(r, g, b);
          break;
        }
        case 'k':
        case 'setcmykcolor': {
          const k = popNum();
          const y = popNum();
          const m = popNum();
          const c = popNum();
          state.fill = parseColorCmyk(c, m, y, k);
          break;
        }
        case 'K': {
          const k = popNum();
          const y = popNum();
          const m = popNum();
          const c = popNum();
          state.stroke = parseColorCmyk(c, m, y, k);
          break;
        }
        case 'sc':
        case 'scn': {
          // Heuristic for DeviceRGB (3) or DeviceCMYK (4) or Gray (1)
          const nums: number[] = [];
          while (stack.length > 0 && typeof stack[stack.length - 1] === 'number') {
            nums.unshift(popNum());
            if (nums.length === 4) break;
          }
          if (nums.length === 4) state.fill = parseColorCmyk(nums[0], nums[1], nums[2], nums[3]);
          else if (nums.length === 3) state.fill = parseColorRgb(nums[0], nums[1], nums[2]);
          else if (nums.length === 1) state.fill = parseColorGray(nums[0]);
          break;
        }
        case 'SC':
        case 'SCN': {
          const nums: number[] = [];
          while (stack.length > 0 && typeof stack[stack.length - 1] === 'number') {
            nums.unshift(popNum());
            if (nums.length === 4) break;
          }
          if (nums.length === 4) state.stroke = parseColorCmyk(nums[0], nums[1], nums[2], nums[3]);
          else if (nums.length === 3) state.stroke = parseColorRgb(nums[0], nums[1], nums[2]);
          else if (nums.length === 1) state.stroke = parseColorGray(nums[0]);
          break;
        }
        case 'm':
        case 'moveto': {
          const y = popNum();
          const x = popNum();
          curX = x;
          curY = y;
          subStartX = x;
          subStartY = y;
          const [tx, ty] = applyMat(state.ctm, x, y);
          trackPt(tx, ty);
          curPath.push(`M ${fmt(tx)} ${fmt(ty)}`);
          break;
        }
        case 'rmoveto': {
          const dy = popNum();
          const dx = popNum();
          curX += dx;
          curY += dy;
          subStartX = curX;
          subStartY = curY;
          const [tx, ty] = applyMat(state.ctm, curX, curY);
          trackPt(tx, ty);
          curPath.push(`M ${fmt(tx)} ${fmt(ty)}`);
          break;
        }
        case 'l':
        case 'L':
        case 'lineto': {
          const y = popNum();
          const x = popNum();
          curX = x;
          curY = y;
          const [tx, ty] = applyMat(state.ctm, x, y);
          trackPt(tx, ty);
          curPath.push(`L ${fmt(tx)} ${fmt(ty)}`);
          break;
        }
        case 'rlineto': {
          const dy = popNum();
          const dx = popNum();
          curX += dx;
          curY += dy;
          const [tx, ty] = applyMat(state.ctm, curX, curY);
          trackPt(tx, ty);
          curPath.push(`L ${fmt(tx)} ${fmt(ty)}`);
          break;
        }
        case 'c':
        case 'C':
        case 'curveto': {
          const y3 = popNum();
          const x3 = popNum();
          const y2 = popNum();
          const x2 = popNum();
          const y1 = popNum();
          const x1 = popNum();
          curX = x3;
          curY = y3;
          const [tx1, ty1] = applyMat(state.ctm, x1, y1);
          const [tx2, ty2] = applyMat(state.ctm, x2, y2);
          const [tx3, ty3] = applyMat(state.ctm, x3, y3);
          trackPt(tx1, ty1);
          trackPt(tx2, ty2);
          trackPt(tx3, ty3);
          curPath.push(`C ${fmt(tx1)} ${fmt(ty1)} ${fmt(tx2)} ${fmt(ty2)} ${fmt(tx3)} ${fmt(ty3)}`);
          break;
        }
        case 'v': {
          const y3 = popNum();
          const x3 = popNum();
          const y2 = popNum();
          const x2 = popNum();
          const [tx1, ty1] = applyMat(state.ctm, curX, curY);
          const [tx2, ty2] = applyMat(state.ctm, x2, y2);
          const [tx3, ty3] = applyMat(state.ctm, x3, y3);
          curX = x3;
          curY = y3;
          trackPt(tx2, ty2);
          trackPt(tx3, ty3);
          curPath.push(`C ${fmt(tx1)} ${fmt(ty1)} ${fmt(tx2)} ${fmt(ty2)} ${fmt(tx3)} ${fmt(ty3)}`);
          break;
        }
        case 'y': {
          const y3 = popNum();
          const x3 = popNum();
          const y1 = popNum();
          const x1 = popNum();
          const [tx1, ty1] = applyMat(state.ctm, x1, y1);
          const [tx3, ty3] = applyMat(state.ctm, x3, y3);
          curX = x3;
          curY = y3;
          trackPt(tx1, ty1);
          trackPt(tx3, ty3);
          curPath.push(`C ${fmt(tx1)} ${fmt(ty1)} ${fmt(tx3)} ${fmt(ty3)} ${fmt(tx3)} ${fmt(ty3)}`);
          break;
        }
        case 're': {
          const h = popNum();
          const w = popNum();
          const y = popNum();
          const x = popNum();
          const p1 = applyMat(state.ctm, x, y);
          const p2 = applyMat(state.ctm, x + w, y);
          const p3 = applyMat(state.ctm, x + w, y + h);
          const p4 = applyMat(state.ctm, x, y + h);
          trackPt(p1[0], p1[1]);
          trackPt(p2[0], p2[1]);
          trackPt(p3[0], p3[1]);
          trackPt(p4[0], p4[1]);
          curPath.push(
            `M ${fmt(p1[0])} ${fmt(p1[1])} L ${fmt(p2[0])} ${fmt(p2[1])} L ${fmt(p3[0])} ${fmt(p3[1])} L ${fmt(p4[0])} ${fmt(p4[1])} Z`,
          );
          curX = x;
          curY = y;
          subStartX = x;
          subStartY = y;
          break;
        }
        case 'rectfill':
        case 'rectstroke': {
          const h = popNum();
          const w = popNum();
          const y = popNum();
          const x = popNum();
          const p1 = applyMat(state.ctm, x, y);
          const p2 = applyMat(state.ctm, x + w, y);
          const p3 = applyMat(state.ctm, x + w, y + h);
          const p4 = applyMat(state.ctm, x, y + h);
          trackPt(p1[0], p1[1]);
          trackPt(p3[0], p3[1]);
          curPath = [
            `M ${fmt(p1[0])} ${fmt(p1[1])} L ${fmt(p2[0])} ${fmt(p2[1])} L ${fmt(p3[0])} ${fmt(p3[1])} L ${fmt(p4[0])} ${fmt(p4[1])} Z`,
          ];
          flushPath(tok === 'rectfill', tok === 'rectstroke');
          break;
        }
        case 'h':
        case 'closepath':
          curPath.push('Z');
          curX = subStartX;
          curY = subStartY;
          break;
        case 'n':
        case 'newpath':
        case 'W':
        case 'W*':
        case 'clip':
        case 'eoclip':
          // Wait: in PDF W n sets clipping, avoid drawing clip bounds as shapes unless stroked
          if (tok === 'n' || tok === 'newpath') curPath = [];
          break;
        case 'f':
        case 'F':
        case 'fill':
          flushPath(true, false, false);
          break;
        case 'f*':
        case 'eofill':
          flushPath(true, false, true);
          break;
        case 'S':
        case 'stroke':
          flushPath(false, true, false);
          break;
        case 's':
          curPath.push('Z');
          flushPath(false, true, false);
          break;
        case 'B':
        case 'b':
          if (tok === 'b') curPath.push('Z');
          flushPath(true, true, false);
          break;
        case 'B*':
        case 'b*':
          if (tok === 'b*') curPath.push('Z');
          flushPath(true, true, true);
          break;
        case 'Do': {
          const xName = stack.pop();
          if (typeof xName === 'string' && xobjects) {
            const xo = xobjects.get(xName.slice(1));
            if (xo) {
              gStack.push({ ...state, ctm: { ...state.ctm } });
              if (xo.matrix) state.ctm = mulMat(state.ctm, xo.matrix);
              execTokens(xo.tokens, depth + 1);
              const prev = gStack.pop();
              if (prev) state = prev;
            }
          }
          break;
        }
        default: {
          const macro = defs.get(tok);
          if (macro) execTokens(macro, depth + 1);
          break;
        }
      }
    }
  };

  execTokens(tokens);

  if (shapes.length === 0) return null;

  // Determine bounds and flip Y axis into SVG top-left space
  const refMaxY = Number.isFinite(bbMaxY) ? bbMaxY : initBox ? initBox[3] : 100;
  const refMinY = Number.isFinite(bbMinY) ? bbMinY : initBox ? initBox[1] : 0;
  const refMinX = Number.isFinite(bbMinX) ? bbMinX : initBox ? initBox[0] : 0;
  const refMaxX = Number.isFinite(bbMaxX) ? bbMaxX : initBox ? initBox[2] : 100;

  // Ignore trailing whitespace/background full-artboard white rect if we have real bounds
  const yMirror = refMinY + refMaxY;

  const flippedShapes: BuiltShape[] = shapes.map((s) => {
    // Rewrite every coordinate pair X Y inside path `d` with Y -> yMirror - Y
    const parts = s.d.split(' ');
    const out: string[] = [];
    let i = 0;
    while (i < parts.length) {
      const cmd = parts[i++];
      out.push(cmd);
      if (cmd === 'M' || cmd === 'L') {
        const x = Number(parts[i++]);
        const y = Number(parts[i++]);
        out.push(fmt(x), fmt(yMirror - y));
      } else if (cmd === 'C') {
        for (let k = 0; k < 3; k++) {
          const x = Number(parts[i++]);
          const y = Number(parts[i++]);
          out.push(fmt(x), fmt(yMirror - y));
        }
      }
    }
    return { ...s, d: out.join(' ') };
  });

  // Normalize origin neatly to 0 0 width height
  const pad = Math.max(1, Math.min(8, Math.max(refMaxX - refMinX, refMaxY - refMinY) * 0.02));
  const vbMinX = (Number.isFinite(bbMinX) ? bbMinX : refMinX) - pad;
  const vbMinY = (Number.isFinite(bbMinY) ? yMirror - bbMaxY : refMinY) - pad;
  const vbMaxX = (Number.isFinite(bbMaxX) ? bbMaxX : refMaxX) + pad;
  const vbMaxY = (Number.isFinite(bbMinY) ? yMirror - bbMinY : refMaxY) + pad;

  return buildSvgFromShapes(flippedShapes, vbMinX, vbMinY, vbMaxX, vbMaxY);
}

function extractEpsPostScriptText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  // Check DOS EPS Binary Header: C5 D0 D3 C6
  if (
    bytes.length > 20 &&
    bytes[0] === 0xc5 &&
    bytes[1] === 0xd0 &&
    bytes[2] === 0xd3 &&
    bytes[3] === 0xc6
  ) {
    const view = new DataView(buf);
    const psOffset = view.getUint32(4, true);
    const psLength = view.getUint32(8, true);
    if (psOffset < bytes.length && psLength > 0) {
      return new TextDecoder('latin1').decode(
        bytes.slice(psOffset, Math.min(bytes.length, psOffset + psLength)),
      );
    }
  }
  return new TextDecoder('latin1').decode(bytes);
}

export function parseEpsToSvg(buf: ArrayBuffer): string | null {
  const psText = extractEpsPostScriptText(buf);
  const bbMatch =
    psText.match(/%%HiResBoundingBox:\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/) ??
    psText.match(/%%BoundingBox:\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/);
  const initBox: [number, number, number, number] | null = bbMatch
    ? [Number(bbMatch[1]), Number(bbMatch[2]), Number(bbMatch[3]), Number(bbMatch[4])]
    : null;

  // Focus body after %%EndProlog / %%EndSetup if present to reduce dictionary noise
  let body = psText;
  const endPrologIdx = psText.indexOf('%%EndProlog');
  if (endPrologIdx !== -1) body = psText.slice(endPrologIdx + 11);

  // Also grab Illustrator shorthand procedure defs before EndProlog if needed
  const tokens = tokenizeVectorStream(body);
  return runPathInterpreter(tokens, initBox);
}

async function decompressFlateBytes(raw: Uint8Array): Promise<Uint8Array | null> {
  if (typeof DecompressionStream === 'undefined') return null;
  for (const format of ['deflate', 'deflate-raw'] as const) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      await writer.write(raw as unknown as BufferSource);
      await writer.close();
      const outBuf = await new Response(ds.readable).arrayBuffer();
      return new Uint8Array(outBuf);
    } catch {
      // try next format
    }
  }
  return null;
}

export async function parsePdfToSvg(buf: ArrayBuffer): Promise<string | null> {
  const rawBytes = new Uint8Array(buf);
  const latin = new TextDecoder('latin1').decode(rawBytes);

  const mbMatch = latin.match(
    /\/(?:CropBox|MediaBox)\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/,
  );
  const initBox: [number, number, number, number] | null = mbMatch
    ? [Number(mbMatch[1]), Number(mbMatch[2]), Number(mbMatch[3]), Number(mbMatch[4])]
    : null;

  // Locate all PDF streams and decode vector content streams
  const contentStreams: string[] = [];
  const xobjects = new Map<string, { tokens: string[]; matrix?: Matrix2D }>();

  const objRegex = /(\d+)\s+\d+\s+obj\b([\s\S]*?)endobj/g;
  let objMatch: RegExpExecArray | null;
  while ((objMatch = objRegex.exec(latin)) !== null) {
    const objBody = objMatch[2];
    const streamIdx = objBody.indexOf('stream');
    if (streamIdx === -1) continue;

    const dictText = objBody.slice(0, streamIdx);
    // Skip binary images, fonts, metadata XML, ICC profiles
    if (/\/Subtype\s*\/Image\b|\/Type\s*\/Metadata\b|\/FontFile/.test(dictText)) continue;

    let dataStart = streamIdx + 6;
    if (objBody[dataStart] === '\r' && objBody[dataStart + 1] === '\n') dataStart += 2;
    else if (objBody[dataStart] === '\n' || objBody[dataStart] === '\r') dataStart += 1;

    const endStreamIdx = objBody.lastIndexOf('endstream');
    if (endStreamIdx <= dataStart) continue;

    // Exact byte offset in rawBytes
    const bodyStartInFile = objMatch.index + objMatch[0].indexOf(objBody);
    const rawStreamBytes = rawBytes.slice(
      bodyStartInFile + dataStart,
      bodyStartInFile + endStreamIdx,
    );

    let decodedText = '';
    if (/\/FlateDecode\b/.test(dictText)) {
      const dec = await decompressFlateBytes(rawStreamBytes);
      if (dec) decodedText = new TextDecoder('latin1').decode(dec);
    } else if (!/\/ASCII85Decode|\/LZWDecode|\/DCTDecode|\/JPXDecode/.test(dictText)) {
      decodedText = new TextDecoder('latin1').decode(rawStreamBytes);
    }

    if (!decodedText) continue;

    // Check if vector operators exist in stream
    if (!/\b(?:m|l|c|re|f|S|B)\b/.test(decodedText)) continue;

    if (/\/Subtype\s*\/Form\b/.test(dictText)) {
      const matMatch = dictText.match(
        /\/Matrix\s*\[\s*([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)\s*\]/,
      );
      const matrix: Matrix2D | undefined = matMatch
        ? {
            a: Number(matMatch[1]),
            b: Number(matMatch[2]),
            c: Number(matMatch[3]),
            d: Number(matMatch[4]),
            e: Number(matMatch[5]),
            f: Number(matMatch[6]),
          }
        : undefined;
      xobjects.set(`Fm${objMatch[1]}`, {
        tokens: tokenizeVectorStream(decodedText),
        matrix,
      });
    } else {
      contentStreams.push(decodedText);
    }
  }

  // Fallback: map named XObject refs like `/X1 12 0 R` so `Do` resolves
  const xobjRefMatches = latin.matchAll(/\/(X\w+|Fm\w+|Obj\w+)\s+(\d+)\s+\d+\s+R/g);
  for (const xm of xobjRefMatches) {
    const alias = xm[1];
    const objId = xm[2];
    const found = xobjects.get(`Fm${objId}`);
    if (found) xobjects.set(alias, found);
  }

  if (contentStreams.length === 0 && xobjects.size === 0) return null;

  const combined = contentStreams.join('\n');
  const tokens = tokenizeVectorStream(combined);
  const direct = runPathInterpreter(tokens, initBox, xobjects);
  if (direct) return direct;

  // Try first Form XObject if page stream only wrapped it
  for (const xo of xobjects.values()) {
    const res = runPathInterpreter(xo.tokens, initBox, xobjects);
    if (res) return res;
  }

  return null;
}

export async function importVectorFile(file: File): Promise<ImportedVectorResult> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.svg')) {
    return { svgContent: await file.text(), sourceFormat: 'svg' };
  }
  if (lower.endsWith('.eps')) {
    const buf = await file.arrayBuffer();
    const svg = parseEpsToSvg(buf);
    if (!svg) {
      throw new Error(
        `Could not extract vector paths from "${file.name}". Please ensure it contains vector curves (not only embedded bitmap).`,
      );
    }
    return { svgContent: svg, sourceFormat: 'eps' };
  }
  if (lower.endsWith('.pdf')) {
    const buf = await file.arrayBuffer();
    const svg = await parsePdfToSvg(buf);
    if (!svg) {
      throw new Error(
        `Could not extract vector paths from "${file.name}". Export as unencrypted vector PDF or clean SVG.`,
      );
    }
    return { svgContent: svg, sourceFormat: 'pdf' };
  }
  throw new Error(`Unsupported format: ${file.name}`);
}
