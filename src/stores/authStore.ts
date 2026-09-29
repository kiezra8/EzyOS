import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { db } from '../lib/db';
import { syncEngine } from '../lib/syncEngine';
import type { Profile } from '../lib/db';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, businessName: string, businessType: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const user = { id: session.user.id, email: session.user.email ?? '' };
        // Load profile from local DB first, then try Supabase
        let profile = await db.profiles.get(user.id);
        if (!profile) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data) {
            await db.profiles.put(data);
            profile = data;
          }
        }
        set({ user, profile: profile ?? null });
        await syncEngine.init({ userId: user.id });
      }
    } catch (error) {
      console.error('[Auth] Initialize error:', error);
    } finally {
      set({ isLoading: false, isInitialized: true });
    }

    // Listen for auth state changes
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const user = { id: session.user.id, email: session.user.email ?? '' };
        let profile = await db.profiles.get(user.id);
        if (!profile) {
          const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (data) {
            await db.profiles.put(data);
            profile = data;
          }
        }
        set({ user, profile: profile ?? null });
        await syncEngine.init({ userId: user.id });
      } else if (event === 'SIGNED_OUT') {
        syncEngine.stop();
        set({ user: null, profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (data.user) {
        const user = { id: data.user.id, email: data.user.email ?? '' };
        let profile = await db.profiles.get(user.id);
        if (!profile) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          if (profileData) {
            await db.profiles.put(profileData);
            profile = profileData;
          }
        }
        set({ user, profile: profile ?? null });
        await syncEngine.init({ userId: user.id });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signUp: async (email, password, businessName, businessType) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { business_name: businessName, business_type: businessType } },
      });
      if (error) throw error;
      if (data.user) {
        const now = new Date().toISOString();
        const profile: Profile = {
          id: data.user.id,
          business_name: businessName,
          business_type: businessType as 'retail' | 'wholesale' | 'hybrid',
          currency: 'USD',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          tax_rate: 0,
          email,
          created_at: now,
          updated_at: now,
        };
        await db.profiles.put(profile);
        const user = { id: data.user.id, email };
        set({ user, profile });
        await syncEngine.init({ userId: user.id });
      }
    } finally {
      set({ isLoading: false });
    }
  },

  signOut: async () => {
    syncEngine.stop();
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  updateProfile: async (updates) => {
    const { user, profile } = get();
    if (!user || !profile) return;
    const updated = { ...profile, ...updates, updated_at: new Date().toISOString() };
    await db.profiles.put(updated);
    await supabase.from('profiles').update(updates).eq('id', user.id);
    set({ profile: updated });
  },
}));
