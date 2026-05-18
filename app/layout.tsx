import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'Clearpage',
  description: 'Turn any URL into a clean, readable document in Markdown, TXT, DOCX, or PDF.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
