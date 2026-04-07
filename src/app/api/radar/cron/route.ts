// Vercel Cron endpoint — run every 10 minutes
// Add to vercel.json: { "crons": [{ "path": "/api/radar/cron", "schedule": "*/10 * * * *" }] }
// Protected by CRON_SECRET header.

import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/radar/pipeline';

export const maxDuration = 300; // 5 minute timeout for Vercel Pro

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Vercel Cron also sends this header
  const isVercelCron = request.headers.get('x-vercel-cron') === '1';
  if (!isVercelCron && !authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runPipeline();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error('[Radar Cron] Pipeline failed:', err);
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Pipeline error' }, { status: 500 });
  }
}

// Allow GET for easy manual triggering during development
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Use POST in production' }, { status: 405 });
  }

  try {
    const result = await runPipeline();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'Pipeline error' }, { status: 500 });
  }
}
