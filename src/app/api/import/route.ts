import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { supabase } from '@/lib/supabase';
import { ensureUserExists, getRequestUserId } from '@/lib/server-user';
import {
  getCellValue,
  getExpectedHeaders,
  getNormalizedHeaderList,
  normalizeRow,
  validateAnalyticsCSV,
  validatePostCSV,
} from '@/lib/csv-validation';

interface ImportReport {
  success: boolean;
  type: string;
  imported: number;
  skipped: number;
  errors: string[];
}

const SUPPORTED_FORMATS = [
  'Post-level performance CSV (content/text + optional posted_at/date, impressions, likes, replies, retweets/reposts).',
  'Daily analytics CSV (date/day + optional followers, impressions, engagements, posts_count/posts).',
] as const;

export async function POST(request: Request) {
  try {
    const userId = await getRequestUserId(request);
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
    const normalizedRows = rows.map(normalizeRow);
    const headers = getNormalizedHeaderList(Object.keys(rows[0] || {}));
    const validHeaders = type === 'posts' ? validatePostCSV(headers) : validateAnalyticsCSV(headers);

    if (!validHeaders) {
      return NextResponse.json(
        {
          error: `Invalid ${type} CSV format`,
          headers,
          expected_headers: getExpectedHeaders(type),
          supported_formats: SUPPORTED_FORMATS,
        },
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
      for (const [index, row] of normalizedRows.entries()) {
        const content = getCellValue(row, 'content').trim();
        if (!content) {
          report.skipped += 1;
          report.errors.push(`Row ${index + 2}: missing content`);
          continue;
        }

        const postedAtRaw = getCellValue(row, 'posted_at').trim();
        const postedAt = postedAtRaw ? new Date(postedAtRaw).toISOString() : null;
        const impressions = parseInt(getCellValue(row, 'impressions') || '0', 10) || 0;
        const likes = parseInt(getCellValue(row, 'likes') || '0', 10) || 0;
        const replies = parseInt(getCellValue(row, 'replies') || '0', 10) || 0;
        const retweets = parseInt(getCellValue(row, 'retweets') || '0', 10) || 0;

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
      for (const [index, row] of normalizedRows.entries()) {
        const dateRaw = getCellValue(row, 'date').trim();
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

        const followers = parseInt(getCellValue(row, 'followers') || '0', 10) || 0;
        const impressions = parseInt(getCellValue(row, 'impressions') || '0', 10) || 0;
        const engagements = parseInt(getCellValue(row, 'engagements') || '0', 10) || 0;
        const postsCount = parseInt(getCellValue(row, 'posts_count') || '0', 10) || 0;

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

export { validatePostCSV, validateAnalyticsCSV };
