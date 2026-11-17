export function loadSvgImage(svgText: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

export async function renderSvgToRasterBlob(
  svgText: string,
  targetWidth: number,
  aspectRatio: number,
  format: 'image/png' | 'image/jpeg' | 'image/webp',
  options?: {
    background?: string;
    marginPct?: number;
    squareSize?: number;
    scale?: number;
    roundedRadius?: number;
  },
): Promise<Blob> {
  const img = await loadSvgImage(svgText);
  const w = options?.squareSize ?? targetWidth;
  const h = options?.squareSize ?? Math.max(1, Math.round(targetWidth / aspectRatio));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  if (options?.roundedRadius && options.roundedRadius > 0) {
    const r = options.roundedRadius;
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, r);
    ctx.clip();
  }

  if (options?.background && options.background !== 'transparent') {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, w, h);
  } else if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
  }

  const margin = ((options?.marginPct ?? 0) / 100) * Math.min(w, h);
  const scaleFactor = options?.scale ?? 1;
  const availW = (w - margin * 2) * scaleFactor;
  const availH = (h - margin * 2) * scaleFactor;

  let drawW = availW;
  let drawH = availW / aspectRatio;
  if (drawH > availH) {
    drawH = availH;
    drawW = drawH * aspectRatio;
  }
  const dx = (w - drawW) / 2;
  const dy = (h - drawH) / 2;

  ctx.drawImage(img, dx, dy, drawW, drawH);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob failed'));
      },
      format,
      format === 'image/jpeg' || format === 'image/webp' ? 0.94 : undefined,
    );
  });
}

/**
 * Builds a valid multi-resolution PNG-wrapped .ico file (16x16, 32x32, 48x48)
 */
export async function buildIcoFromSvg(
  svgText: string,
  aspectRatio: number,
  bg: string,
  scale: number,
): Promise<Blob> {
  const sizes = [16, 32, 48];
  const pngBuffers: Uint8Array[] = [];

  for (const s of sizes) {
    const blob = await renderSvgToRasterBlob(svgText, s, aspectRatio, 'image/png', {
      squareSize: s,
      background: bg,
      marginPct: 8,
      scale,
    });
    const ab = await blob.arrayBuffer();
    pngBuffers.push(new Uint8Array(ab));
  }

  const headerSize = 6;
  const entrySize = 16;
  const dirSize = headerSize + entrySize * sizes.length;
  const totalBytes = dirSize + pngBuffers.reduce((acc, b) => acc + b.byteLength, 0);

  const out = new Uint8Array(totalBytes);
  const view = new DataView(out.buffer);
  view.setUint16(0, 0, true); // reserved
  view.setUint16(2, 1, true); // ICO type
  view.setUint16(4, sizes.length, true); // count

  let offset = dirSize;
  sizes.forEach((s, i) => {
    const entryOffset = headerSize + i * entrySize;
    const data = pngBuffers[i];
    out[entryOffset] = s === 256 ? 0 : s;
    out[entryOffset + 1] = s === 256 ? 0 : s;
    out[entryOffset + 2] = 0; // palette
    out[entryOffset + 3] = 0; // reserved
    view.setUint16(entryOffset + 4, 1, true); // planes
    view.setUint16(entryOffset + 6, 32, true); // bpp
    view.setUint32(entryOffset + 8, data.byteLength, true);
    view.setUint32(entryOffset + 12, offset, true);
    out.set(data, offset);
    offset += data.byteLength;
  });

  return new Blob([out], { type: 'image/x-icon' });
}
