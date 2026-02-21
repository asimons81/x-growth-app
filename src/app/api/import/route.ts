import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { ensureUserExists, getRequestUserId } from '@/lib/server-user';

interface ImportReport {
  success: boolean;
  type: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export async function POST(request: Request) {
  try {
    const userId = getRequestUserId(request);
    await ensureUserExists(userId);
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string | null) || 'posts';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (type !== 'posts' && type !== 'analytics') {
      return NextResponse.json({ error: 'Invalid import type' }, { status: 400 });
    }

    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      return NextResponse.json(
        {
          error: 'CSV parse failed',
          details: parsed.errors.map((e) => `${e.type}: ${e.message}`),
        },
        { status: 400 }
      );
    }

    const rows = parsed.data;
    const headers = Object.keys(rows[0] || {}).map((h) => h.toLowerCase().trim());
    const validHeaders = type === 'posts' ? validatePostCSV(headers) : validateAnalyticsCSV(headers);

    if (!validHeaders) {
      return NextResponse.json(
        { error: `Invalid ${type} CSV format`, headers },
        { status: 400 }
      );
    }

    const report: ImportReport = {
      success: true,
      type,
      imported: 0,
      skipped: 0,
      errors: [],
    };

    if (type === 'posts') {
      for (const [index, row] of rows.entries()) {
        const content = String(row.content || row.text || '').trim();
        if (!content) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: missing content`);
          continue;
        }

        const postedAtRaw = String(row.posted_at || row.date || '').trim();
        const postedAt = postedAtRaw ? new Date(postedAtRaw).toISOString() : null;
        const impressions = parseInt(String(row.impressions || '0'), 10) || 0;
        const likes = parseInt(String(row.likes || '0'), 10) || 0;
        const replies = parseInt(String(row.replies || '0'), 10) || 0;
        const retweets = parseInt(String(row.retweets || row.reposts || '0'), 10) || 0;

        const { error } = await supabase.from('posts').insert({
          user_id: userId,
          content,
          source: 'imported',
          status: postedAt ? 'posted' : 'draft',
          posted_at: postedAt,
          impressions,
          likes,
          replies,
          retweets,
          word_count: content.split(/\s+/).filter(Boolean).length,
        });

        if (error) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: ${error.message}`);
        } else {
          report.imported += 1;
        }
      }
    }

    if (type === 'analytics') {
      for (const [index, row] of rows.entries()) {
        const dateRaw = String(row.date || '').trim();
        if (!dateRaw) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: missing date`);
          continue;
        }

        const date = new Date(dateRaw);
        if (Number.isNaN(date.getTime())) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: invalid date "${dateRaw}"`);
          continue;
        }

        const followers = parseInt(String(row.followers || '0'), 10) || 0;
        const impressions = parseInt(String(row.impressions || '0'), 10) || 0;
        const engagements = parseInt(String(row.engagements || '0'), 10) || 0;
        const postsCount = parseInt(String(row.posts_count || row.posts || '0'), 10) || 0;

        const { error } = await supabase.from('daily_metrics').insert({
          user_id: userId,
          date: date.toISOString(),
          posts_count: postsCount,
          followers,
          impressions,
          engagements,
        });

        if (error) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: ${error.message}`);
        } else {
          report.imported += 1;
        }
      }
    }

    return NextResponse.json(report);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Import failed',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export function validatePostCSV(headers: string[]): boolean {
  const required = ['content'];
  return required.every((h) => headers.includes(h) || headers.includes('text'));
}

export function validateAnalyticsCSV(headers: string[]): boolean {
  const required = ['date'];
  return required.every((h) => headers.includes(h));
}
