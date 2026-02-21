import { NextResponse } from 'next/server';
import { getRequestUserId } from '@/lib/server-user';
import { deleteUserApiKey, listUserApiKeys, saveUserApiKey } from '@/lib/server/user-keys';

export async function GET(request: Request) {
  try {
    const userId = getRequestUserId(request);
    const keys = await listUserApiKeys(userId);
    return NextResponse.json(keys);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load keys' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = getRequestUserId(request);
    const { provider, key, label } = await request.json();

    if (!provider || !key) {
      return NextResponse.json({ error: 'Provider and key required' }, { status: 400 });
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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to save key' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID required' }, { status: 400 });
  }

  try {
    const userId = getRequestUserId(request);
    await deleteUserApiKey(userId, id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to delete key' },
      { status: 500 }
    );
  }
}
