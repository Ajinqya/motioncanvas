import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * In production, we can't read the filesystem to list animations.
 * Return an empty array — the chat will work in "create" mode only.
 * The iterate/edit mode requires the dev server.
 */
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Return empty list in production — animations are compiled at build time
  // and source code isn't available on the server
  return res.status(200).json([]);
}
