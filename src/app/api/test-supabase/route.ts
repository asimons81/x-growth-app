import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Test connection by querying users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      // Table might not exist, try creating it
      if (error.code === '42P01') { // relation does not exist
        return NextResponse.json({ 
          status: 'connected', 
          message: 'Supabase connected, tables need to be created',
          tablesExist: false 
        });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ 
      status: 'connected', 
      data,
      tablesExist: true 
    });
  } catch (err) {
    return NextResponse.json({ 
      error: 'Connection failed',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
}
