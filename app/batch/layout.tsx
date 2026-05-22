import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Batch convert URLs and documents to Markdown, TXT, DOCX, or PDF | Clearpage',
  description:
    'Batch convert many URLs or files into readable Markdown, TXT, DOCX, or PDF with usable, partial, degraded, and failed status plus retry controls.',
};

export default function BatchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
