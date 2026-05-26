import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['playwright', '@sparticuz/chromium', 'better-sqlite3', '@napi-rs/canvas'],
  outputFileTracingIncludes: {
    '/api/**': [
      './node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs',
      './node_modules/pdfjs-dist/standard_fonts/**/*',
      './node_modules/pdfjs-dist/cmaps/**/*',
      './node_modules/pdfjs-dist/wasm/**/*',
      './node_modules/@napi-rs/canvas/**/*',
    ],
  },
};

export default nextConfig;
