import { createClient } from '@supabase/supabase-js';
export const SUPABASE_URL = 'https://cqzfxlbcewobzrrhqgfy.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxemZ4bGJjZXdvYnpycmhxZ2Z5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1ODkxODcsImV4cCI6MjEwNjE2NTE4N30.AsyDtvWY_UhyXZdgW_3ceRwEwZuw9xfyJmceXiLq2ns';
export const REMEMBER_KEY = 'gv:remember';
export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('TU-PROYECTO') &&
  SUPABASE_ANON_KEY !== 'TU_CLAVE_PUBLICA'
);

function remembered() {
  return localStorage.getItem(REMEMBER_KEY) !== 'false';
}

const customStorage = {
  getItem(key) {
    return sessionStorage.getItem(key) ?? localStorage.getItem(key);
  },
  setItem(key, value) {
    const [use, other] = remembered()
      ? [localStorage, sessionStorage]
      : [sessionStorage, localStorage];
    use.setItem(key, value);
    other.removeItem(key);
  },
  removeItem(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  },
};

const cleanUrl = SUPABASE_URL.trim().replace(/\/+$/, '');

export const supabase = isSupabaseConfigured
  ? createClient(cleanUrl, SUPABASE_ANON_KEY.trim(), {
      auth: {
        storage: customStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;