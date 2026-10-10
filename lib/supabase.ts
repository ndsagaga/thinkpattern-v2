import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import { config } from '@/lib/config';

// Accounts, likes and comments. Optional: without Supabase env vars the app
// runs read-only and the reactions UI hides itself.
export const supabase =
  config.supabaseUrl && config.supabaseAnonKey
    ? createClient(config.supabaseUrl, config.supabaseAnonKey, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export type TargetType = 'story' | 'perspective';
