import { NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/server-user';
import { deleteUserApiKey, listUserApiKeys, saveUserApiKey } from '@/lib/server/user-keys';
import {
  buildApiError,
  createRequestId,
  normalizeKeyDeleteError,
  normalizeKeyLoadError,
  normalizeKeySaveError,
} from '@/lib/server/errors';

export async function GET(request: Request) {
  const requestId = createRequestId();
  try {
    const userId = getRequestUserId(request);
    const keys = await listUserApiKeys(userId);
    return NextResponse.json(keys);
  } catch (err) {
    console.error('[settings/keys][GET]', { requestId, error: err });
    const mapped = buildApiError(requestId, normalizeKeyLoadError(err));
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function POST(request: Request) {
  const requestId = createRequestId();
  try {
    const userId = getRequestUserId(request);
    const { provider, key, label } = await request.json();

    if (!provider || !key) {
      return NextResponse.json(
        {
          error: 'Provider and key required',
          code: 'KEY_SAVE_VALIDATION',
          requestId,
        },
        { status: 400 }
      );
    }

    const saved = await saveUserApiKey(userId, provider, key, label);
    return NextResponse.json({
      id: saved.id,
      provider: saved.provider,
      label: saved.label,
      isActive: saved.is_active,
      createdAt: saved.created_at,
    });
  } catch (err) {
    console.error('[settings/keys][POST]', { requestId, error: err });
    const mapped = buildApiError(requestId, normalizeKeySaveError(err));
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}

export async function DELETE(request: Request) {
  const requestId = createRequestId();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json(
      { error: 'ID required', code: 'KEY_DELETE_VALIDATION', requestId },
      { status: 400 }
    );
  }

  try {
    const userId = getRequestUserId(request);
    await deleteUserApiKey(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[settings/keys][DELETE]', { requestId, error: err });
    const mapped = buildApiError(requestId, normalizeKeyDeleteError(err));
    return NextResponse.json(mapped.body, { status: mapped.status });
  }
}
