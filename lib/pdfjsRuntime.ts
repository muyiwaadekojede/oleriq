import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

export type PdfJsRuntime = {
  pdfjs: any;
  standardFontDataUrl: string;
  cMapUrl: string;
  wasmUrl: string;
};

let runtimePromise: Promise<PdfJsRuntime> | null = null;

function directoryUrl(dirPath: string): string {
  return `${path.resolve(dirPath).replace(/\\/g, '/')}/`;
}

export async function getPdfJsRuntime(): Promise<PdfJsRuntime> {
  if (runtimePromise) return runtimePromise;

  runtimePromise = (async () => {
    const packageDir = (() => {
      const cwdPackageDir = path.join(process.cwd(), 'node_modules', 'pdfjs-dist');
      if (fs.existsSync(cwdPackageDir)) {
        return cwdPackageDir;
      }

      const require = createRequire(import.meta.url);
      const packageJsonPath = require.resolve('pdfjs-dist/package.json');
      return path.dirname(packageJsonPath);
    })();
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');

    return {
      pdfjs,
      standardFontDataUrl: directoryUrl(path.join(packageDir, 'standard_fonts')),
      cMapUrl: directoryUrl(path.join(packageDir, 'cmaps')),
      wasmUrl: directoryUrl(path.join(packageDir, 'wasm')),
    };
  })();

  return runtimePromise;
}
