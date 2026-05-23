import type { Metadata } from 'next';
import { Geist, Newsreader } from 'next/font/google';

import './globals.css';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Oleriq',
  description: 'Turn any URL into a clean, readable document in Markdown, TXT, DOCX, or PDF.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${newsreader.variable}`} data-font-system="newsreader-geist">
        {children}
      </body>
    </html>
  );
}
