// Manual pipeline trigger — for development and debugging
import { NextResponse } from 'next/server';
import { runPipeline } from '@/lib/radar/pipeline';

export async function POST() {
  try {
    const result = await runPipeline();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Pipeline error' },
      { status: 500 }
    );
  }
}
