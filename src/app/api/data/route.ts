import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ensureUserExists, getRequestUserId } from '@/lib/server-user';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type'); // ideas, hooks, topics, drafts, schedule
  const userId = getRequestUserId(request);
  
  try {
    let data;
    
    switch (type) {
      case 'ideas':
        const { data: ideas } = await supabase
          .from('ideas')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = ideas;
        break;
        
      case 'hooks':
        const { data: hooks } = await supabase
          .from('hooks')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = hooks;
        break;
        
      case 'topics':
        const { data: topics } = await supabase
          .from('topics')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        data = topics;
        break;
        
      case 'drafts':
        const { data: posts } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'draft')
          .order('created_at', { ascending: false });
        data = posts;
        break;
        
      case 'schedule':
        const { data: schedule } = await supabase
          .from('schedule_queue')
          .select('*, posts(*)')
          .eq('user_id', userId)
          .eq('status', 'pending')
          .order('scheduled_for', { ascending: true });
        data = schedule;
        break;
        
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
    const userId = getRequestUserId(request);
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
