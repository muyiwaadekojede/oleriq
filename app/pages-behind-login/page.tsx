import type { Metadata } from 'next';

import { PagesBehindLoginWorkspace } from '@/components/PagesBehindLoginWorkspace';

export const metadata: Metadata = {
  title: 'Pages behind login | Oleriq',
  description:
    'Standalone Oleriq tool for pages you can already access in your own browser after signing in.',
};

export default function PagesBehindLoginPage() {
  return <PagesBehindLoginWorkspace />;
}
