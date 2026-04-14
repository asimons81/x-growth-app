import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TWITTER_HANDLE = 'tonysimons_';
const COMMAND_TIMEOUT_MS = 15000;

interface XAnalyticsData {
  profile: ProfileData | null;
  followers: FollowerData[];
  following: FollowingData[];
  recentLikes: LikeData[];
  trending: TrendingData[];
  fetchedAt: string;
  error?: string;
}

interface ProfileData {
  screen_name: string;
  name: string;
  bio: string;
  location: string;
  url: string;
  followers: number;
  following: number;
  tweets: number;
  likes: number;
  verified: boolean;
  created_at: string;
}

interface FollowerData {
  screen_name: string;
  name: string;
  followers: number;
  following: number;
}

interface FollowingData {
  screen_name: string;
  name: string;
  followers: number;
  following: number;
}

interface LikeData {
  author: string;
  name: string;
  text: string;
  likes: number;
  url: string;
}

interface TrendingData {
  rank: number;
  topic: string;
  tweets: number;
  category: string;
}

async function runOpenCLICommand(args: string[]): Promise<string> {
  const cmd = ['opencli', ...args].join(' ');
  const { stdout, stderr } = await execAsync(cmd, {
    cwd: '/home/tony/x-growth-app',
    timeout: COMMAND_TIMEOUT_MS,
  });
  
  if (stderr && !stdout) {
    throw new Error(stderr);
  }
  
  return stdout;
}

function parseJsonOutput<T>(output: string): T | null {
  try {
    const lines = output.trim().split('\n');
    const jsonStr = lines.find(line => {
      try {
        JSON.parse(line);
        return true;
      } catch {
        return false;
      }
    });
    return jsonStr ? JSON.parse(jsonStr) : null;
  } catch {
    return null;
  }
}

async function fetchProfile(): Promise<ProfileData | null> {
  try {
    const output = await runOpenCLICommand(['twitter', 'profile', TWITTER_HANDLE, '--format', 'json']);
    const data = parseJsonOutput<ProfileData[]>(output);
    return data?.[0] ?? null;
  } catch (err) {
    console.error('Failed to fetch profile:', err);
    return null;
  }
}

async function fetchFollowers(): Promise<FollowerData[]> {
  try {
    const output = await runOpenCLICommand(['twitter', 'followers', TWITTER_HANDLE, '--format', 'json']);
    const data = parseJsonOutput<FollowerData[]>(output);
    return data ?? [];
  } catch (err) {
    console.error('Failed to fetch followers:', err);
    return [];
  }
}

async function fetchFollowing(): Promise<FollowingData[]> {
  try {
    const output = await runOpenCLICommand(['twitter', 'following', TWITTER_HANDLE, '--format', 'json']);
    const data = parseJsonOutput<FollowingData[]>(output);
    return data ?? [];
  } catch (err) {
    console.error('Failed to fetch following:', err);
    return [];
  }
}

async function fetchRecentLikes(): Promise<LikeData[]> {
  try {
    const output = await runOpenCLICommand(['twitter', 'likes', TWITTER_HANDLE, '--format', 'json', '--limit', '20']);
    const data = parseJsonOutput<LikeData[]>(output);
    return data ?? [];
  } catch (err) {
    console.error('Failed to fetch likes:', err);
    return [];
  }
}

async function fetchTrending(): Promise<TrendingData[]> {
  try {
    const output = await runOpenCLICommand(['twitter', 'trending', '--format', 'json', '--limit', '20']);
    const data = parseJsonOutput<TrendingData[]>(output);
    return data ?? [];
  } catch (err) {
    console.error('Failed to fetch trending:', err);
    return [];
  }
}

export async function GET() {
  try {
    const [profile, followers, following, recentLikes, trending] = await Promise.all([
      fetchProfile(),
      fetchFollowers(),
      fetchFollowing(),
      fetchRecentLikes(),
      fetchTrending(),
    ]);

    const hasData = profile || followers.length > 0 || following.length > 0 || recentLikes.length > 0 || trending.length > 0;

    const response: XAnalyticsData = {
      profile,
      followers,
      following,
      recentLikes,
      trending,
      fetchedAt: new Date().toISOString(),
    };

    if (!hasData) {
      response.error = 'No data retrieved. Ensure OpenCLI browser bridge is connected and authenticated with X.com';
    }

    return NextResponse.json(response, {
      headers: {
        'Cache-Control': 'private, max-age=60',
      },
    });
  } catch (err) {
    console.error('X Analytics error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Failed to fetch X analytics';

    return NextResponse.json({
      profile: null,
      followers: [],
      following: [],
      recentLikes: [],
      trending: [],
      fetchedAt: new Date().toISOString(),
      error: errorMessage,
    }, { status: 500 });
  }
}
