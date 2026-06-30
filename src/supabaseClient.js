import { createClient } from '@supabase/supabase-js'

// Strip UTF-8 BOM (U+FEFF) that may be prepended to env vars in some editors/environments
const strip = (s) => (s ?? '').replace(/^﻿/, '')
const SUPABASE_URL = strip(import.meta.env.VITE_SUPABASE_URL)
const SUPABASE_ANON_KEY = strip(import.meta.env.VITE_SUPABASE_ANON_KEY)

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  }
})
