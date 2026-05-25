import type { NextApiRequest, NextApiResponse } from 'next';

import { getPublicUsageMetrics } from '@/lib/analytics';
import { getPublishedPublicProof } from '@/lib/publicProof';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed.' });
  }

  const metrics = getPublicUsageMetrics();
  const publicProof = getPublishedPublicProof();
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=300');
  return res.status(200).json({ success: true, metrics, publicProof });
}

