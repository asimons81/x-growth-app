import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ensureUserExists, getRequestUserId } from '@/lib/server-user';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // ideas, hooks, topics, drafts, schedule, dashboard-stats
  const userId = await getRequestUserId(request);
  
  try {
    let data;
    
    switch (type) {
      case 'dashboard-stats': {
        // Get stats from daily_metrics for the user
        const { data: metrics } = await supabase
          .from('daily_metrics')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(30);

        // Calculate totals from metrics
        const totalImpressions = metrics?.reduce((sum, m) => sum + (m.impressions || 0), 0) || 0;
        const totalEngagements = metrics?.reduce((sum, m) => sum + (m.engagements || 0), 0) || 0;
        const totalFollowers = metrics?.[0]?.followers || 0;

        // Get counts for other entities
        const [{ count: draftsCount }, { count: scheduledCount }, { count: ideasCount }, { count: hooksCount }] = await Promise.all([
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'draft'),
          supabase.from('schedule_queue').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'pending'),
          supabase.from('ideas').select('*', { count: 'exact', head: true }).eq('user_id', userId),
          supabase.from('hooks').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        ]);

        // Check for voice profile and API keys
        const { data: voiceProfile } = await supabase
          .from('voice_profiles')
          .select('id')
          .eq('user_id', userId)
          .single();

        const { data: apiKeys } = await supabase
          .from('user_api_keys')
          .select('id')
          .eq('user_id', userId)
          .eq('is_active', true)
          .limit(1);

        data = {
          totalDrafts: draftsCount || 0,
          scheduledPosts: scheduledCount || 0,
          ideasCount: ideasCount || 0,
          hooksCount: hooksCount || 0,
          voiceProfileReady: !!voiceProfile,
          apiKeyConfigured: !!(apiKeys && apiKeys.length > 0),
          // Analytics from imported X data
          totalImpressions,
          totalEngagements,
          currentFollowers: totalFollowers,
          metricsDays: metrics?.length || 0,
        };
        break;
      }

      case 'ideas': {
        const { data: ideas } = await supabase
          .from('ideas')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = ideas;
        break;
      }
        
      case 'hooks': {
        const { data: hooks } = await supabase
          .from('hooks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = hooks;
        break;
      }
        
      case 'topics': {
        const { data: topics } = await supabase
          .from('topics')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = topics;
        break;
      }
        
      case 'drafts': {
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        data = posts;
        break;
      }
        
      case 'schedule': {
        const { data: schedule } = await supabase
          .from('schedule_queue')
          .select('*, posts(*)')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('scheduled_for', { ascending: true });
        data = schedule;
        break;
      }

      case 'posts': {
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .eq('source', 'imported')
          .order('posted_at', { ascending: false });
        data = posts;
        break;
      }

      case 'posting-times': {
        // Analyze best posting times from historical post engagement
        const { data: posts } = await supabase
          .from('posts')
          .select('posted_at, impressions, likes, replies, retweets')
          .eq('user_id', userId)
          .not('posted_at', 'is', null)
          .order('posted_at', { ascending: false })
          .limit(500);

        if (!posts || posts.length === 0) {
          data = { slots: [], bestTime: null };
          break;
        }

        // Group by day of week + hour
        const slots: Record<string, { day: number; hour: number; totalEngagement: number; count: number; avgImpressions: number }> = {};

        for (const post of posts) {
          if (!post.posted_at) continue;
          const date = new Date(post.posted_at);
          const day = date.getDay();
          const hour = date.getHours();
          const key = `${day}-${hour}`;
          const engagement = (post.likes || 0) + (post.replies || 0) + (post.retweets || 0);

          if (!slots[key]) {
            slots[key] = { day, hour, totalEngagement: 0, count: 0, avgImpressions: 0 };
          }
          slots[key].totalEngagement += engagement;
          slots[key].avgImpressions += post.impressions || 0;
          slots[key].count += 1;
        }

        // Calculate averages and score each slot
        const scoredSlots = Object.values(slots).map(slot => ({
          day: slot.day,
          hour: slot.hour,
          avgEngagement: slot.totalEngagement / slot.count,
          avgImpressions: slot.avgImpressions / slot.count,
          postCount: slot.count,
          // Score: weighted combination of engagement and impressions, normalized
          score: ((slot.totalEngagement / slot.count) * 0.7 + (slot.avgImpressions / slot.count) * 0.3) / 10,
        }));

        // Sort by score descending
        scoredSlots.sort((a, b) => b.score - a.score);

        // Get the best single time
        const bestSlot = scoredSlots[0];

        // Get day names
        const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const bestTime = bestSlot
          ? `${DAY_NAMES[bestSlot.day]} at ${bestSlot.hour}:00`
          : null;

        data = {
          slots: scoredSlots.slice(0, 10), // Top 10 time slots
          bestTime,
          totalPostsAnalyzed: posts.length,
        };
        break;
      }

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }
    
    return NextResponse.json({ data });
  } catch (err) {
    console.error('DB GET error:', err);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getRequestUserId(request);
    await ensureUserExists(userId);
    const body = await request.json();
    const { type, action, data: itemData } = body;
    
    switch (type) {
      case 'ideas': {
        if (action === 'create') {
          const { data, error } = await supabase
            .from('ideas')
            .insert({
              user_id: userId,
              content: itemData.content,
              topics: itemData.topics || [],
              status: 'raw'
            })
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data });
        }
        
        if (action === 'delete') {
          await supabase.from('ideas').delete().eq('id', itemData.id).eq('user_id', userId);
          return NextResponse.json({ success: true });
        }
        break;
      }
      
      case 'hooks': {
        if (action === 'create') {
          const { data, error } = await supabase
            .from('hooks')
            .insert({
              user_id: userId,
              hook_text: itemData.text,
              hook_type: itemData.hookType
            })
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data });
        }
        
        if (action === 'delete') {
          await supabase.from('hooks').delete().eq('id', itemData.id).eq('user_id', userId);
          return NextResponse.json({ success: true });
        }
        break;
      }
      
      case 'topics': {
        if (action === 'create') {
          const { data, error } = await supabase
            .from('topics')
            .insert({
              user_id: userId,
              topic: itemData.name,
              frequency: 1
            })
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data });
        }
        
        if (action === 'delete') {
          await supabase.from('topics').delete().eq('id', itemData.id).eq('user_id', userId);
          return NextResponse.json({ success: true });
        }
        break;
      }
      
      case 'drafts': {
        if (action === 'create') {
          const { data, error } = await supabase
            .from('posts')
            .insert({
              user_id: userId,
              content: itemData.content,
              source: 'manual',
              status: 'draft'
            })
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data });
        }
        
        if (action === 'update') {
          const { data, error } = await supabase
            .from('posts')
            .update({
              content: itemData.content,
              algorithm_score: itemData.score,
              status: itemData.status || 'draft'
            })
            .eq('id', itemData.id)
            .eq('user_id', userId)
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data });
        }
        
        if (action === 'delete') {
          await supabase.from('posts').delete().eq('id', itemData.id).eq('user_id', userId);
          return NextResponse.json({ success: true });
        }
        break;
      }
      
      case 'schedule': {
        if (action === 'create') {
          // First create the post, then schedule it
          const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
              user_id: userId,
              content: itemData.content,
              source: 'manual',
              status: 'scheduled'
            })
            .select()
            .single();
          
          if (postError) throw postError;
          
          const { data, error } = await supabase
            .from('schedule_queue')
            .insert({
              post_id: post.id,
              user_id: userId,
              scheduled_for: itemData.scheduledTime
            })
            .select()
            .single();
          
          if (error) throw error;
          return NextResponse.json({ data: { ...data, posts: post } });
        }
        
        if (action === 'delete') {
          const scheduleItem = await supabase
            .from('schedule_queue')
            .select('post_id')
            .eq('id', itemData.id)
            .eq('user_id', userId)
            .single();
          
          if (scheduleItem.data) {
            await supabase.from('posts').delete().eq('id', scheduleItem.data.post_id).eq('user_id', userId);
          }
          await supabase.from('schedule_queue').delete().eq('id', itemData.id).eq('user_id', userId);
          return NextResponse.json({ success: true });
        }
        break;
      }
    }
    
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('DB POST error:', err);
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 });
  }
}
