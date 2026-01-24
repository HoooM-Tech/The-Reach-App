import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// Client-side Supabase client
export const createSupabaseClient = () => {
  return createClientComponentClient()
}

// Server-side Supabase client
export const createServerSupabaseClient = () => {
  return createServerComponentClient({ cookies })
}

// Admin client with service role key (for server-side operations)
// This client bypasses RLS (Row Level Security) and should be used carefully
export const createAdminSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    const missingVars = []
    if (!supabaseUrl) missingVars.push('NEXT_PUBLIC_SUPABASE_URL')
    if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
    
    console.error('[Admin Client] Missing environment variables:', missingVars)
    throw new Error(`Missing Supabase environment variables: ${missingVars.join(', ')}`)
  }

  try {
    const client = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    // Verify the client is working (optional check)
    if (process.env.NODE_ENV === 'development') {
      console.log('[Admin Client] Admin client created successfully')
    }
    
    return client
  } catch (error) {
    console.error('[Admin Client] Failed to create admin client:', error)
    throw new Error('Failed to initialize Supabase admin client')
  }
}

