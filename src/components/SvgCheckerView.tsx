import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import type { Locale, SvgAuditResult } from '../types';
import { COPY } from '../i18n';
import { auditSvg, DEMO_ASSETS } from '../utils/svgEngine';
import { importVectorFile } from '../utils/vectorImport';

export const SvgCheckerView: React.FC<{ locale: Locale }> = ({ locale }) => {
  const t = COPY[locale];
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string>('');
  const [sourceFmt, setSourceFmt] = useState<'SVG' | 'EPS' | 'PDF'>('SVG');
  const [svgContent, setSvgContent] = useState<string>('');
  const [audit, setAudit] = useState<SvgAuditResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError('');
    const lower = file.name.toLowerCase();
    if (!lower.endsWith('.svg') && !lower.endsWith('.eps') && !lower.endsWith('.pdf')) {
      setError(
        locale === 'ua'
          ? `Файл "${file.name}" пропущено — підтримуються лише .svg, .eps та .pdf`
          : `"${file.name}" skipped — only .svg, .eps and .pdf files are supported.`,
      );
      return;
    }
    try {
      const imported = await importVectorFile(file);
      setFileName(file.name);
      setSourceFmt(imported.sourceFormat.toUpperCase() as 'SVG' | 'EPS' | 'PDF');
      setSvgContent(imported.svgContent);
      setAudit(auditSvg(imported.svgContent));
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to parse "${file.name}"`);
    }
  };

  const loadSample = () => {
    setError('');
    const sample = DEMO_ASSETS[0];
    setFileName(sample.name);
    setSourceFmt('SVG');
    setSvgContent(sample.svg);
    setAudit(auditSvg(sample.svg));
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#1f1f1f]">{t.checkerTitle}</h1>
          <p className="mt-1 text-sm text-[#6b6b6b]">{t.checkerSubtitle}</p>
        </div>
        <button
          onClick={loadSample}
          className="rounded-full border border-[#e5e3dc] bg-white px-4 h-9 text-xs font-medium text-[#1f1f1f] hover:border-[#fa5008] transition"
        >
          {t.loadDemo}
        </button>
      </div>

      {/* Unified Dropzone matching Step 1 & Step 2 — no dot pattern, supports SVG / EPS / PDF */}
      <div
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-9 text-center transition focus-visible:outline-2 focus-visible:outline-[#fa5008] ${
          isDragging
            ? 'border-[#fa5008] bg-[#fa5008]/[0.07]'
            : 'border-[#d6d2c8] bg-[hsl(40_16%_93%/0.4)] hover:border-[#fa5008] hover:bg-white'
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".svg,.eps,.pdf,image/svg+xml,application/pdf,application/postscript"
          className="hidden"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#e5e3dc] bg-white text-[#6b6b6b] shadow-2xs">
          <Upload className="h-5 w-5" />
        </div>
        <p className="font-display text-base font-semibold text-[#1f1f1f]">{t.uploadTitle}</p>
        <p className="mt-1 text-xs text-[#6b6b6b] font-mono">{t.checkerPrivacy}</p>
        <div className="mt-3.5 flex items-center justify-center gap-2">
          {(['SVG', 'EPS', 'PDF'] as const).map((ext) => (
            <span
              key={ext}
              className="rounded-md border border-[#e5e3dc] bg-white px-2.5 py-0.5 text-[10px] font-mono font-semibold text-[#6b6b6b]"
            >
              {ext}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          {error}
        </div>
      )}

      {audit && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-5 flex flex-col justify-between">
            <div className="checkerboard-bg flex h-56 items-center justify-center rounded-xl border border-[#e5e3dc] p-6">
              <div
                className="h-full w-full flex items-center justify-center [&>svg]:max-h-full [&>svg]:max-w-full [&>svg]:w-auto [&>svg]:h-auto"
                dangerouslySetInnerHTML={{ __html: svgContent }}
              />
            </div>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs font-mono text-[#6b6b6b]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate text-[#1f1f1f]">{fileName}</span>
                <span className="rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 shrink-0">
                  {sourceFmt}
                </span>
              </div>
              <span className="shrink-0">
                {Math.round(audit.width)}×{Math.round(audit.height)} · {audit.score}/100
              </span>
            </div>
          </div>

          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {audit.checks.map((chk) => {
              const info = t.checks[chk.id];
              return (
                <div
                  key={chk.id}
                  className="rounded-2xl border border-[#e5e3dc] bg-[hsl(40_16%_93%/0.4)] p-4 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-semibold text-[#1f1f1f]">{info.title}</h3>
                      <p className="mt-0.5 text-xs text-[#6b6b6b]">{info.desc}</p>
                    </div>
                    {chk.status === 'pass' ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    ) : chk.status === 'warn' ? (
                      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-red-600" />
                    )}
                  </div>
                  {chk.details.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {chk.details.map((d, i) => (
                        <span
                          key={i}
                          className="rounded-md bg-white border border-[#e5e3dc] px-2 py-0.5 text-[11px] font-mono text-[#52525b]"
                        >
                          {d}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
