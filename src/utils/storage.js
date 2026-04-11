import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tpccanguhphlzeqegrtk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_simwWCPL0WrYPLqA37ymEA_8_3Tfmo2';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const HOUSEHOLD_ID = 'default';

export const defaultData = () => ({
  household: null,
  users: [],
  tasks: [],
  events: [],
  completions: [],
  recognitions: [],
  rewards: [],
  redemptions: [],
  notifications: [],
  currentUserId: null,
});

export async function loadData() {
  try {
    const { data, error } = await supabase
      .from('households')
      .select('data')
      .eq('id', HOUSEHOLD_ID)
      .single();

    let appData;
    if (error && error.code === 'PGRST116') {
      appData = defaultData();
      await supabase.from('households').insert({ id: HOUSEHOLD_ID, data: appData });
    } else if (error) {
      throw error;
    } else {
      appData = data?.data || defaultData();
    }

    // Each device tracks its own user locally
    const localUserId = localStorage.getItem('divvy-current-user');
    appData.currentUserId = localUserId || null;

    return appData;
  } catch (e) {
    console.error("Load failed:", e);
    try {
      const raw = localStorage.getItem('divvy-app-data');
      const appData = raw ? JSON.parse(raw) : defaultData();
      const localUserId = localStorage.getItem('divvy-current-user');
      appData.currentUserId = localUserId || null;
      return appData;
    } catch {
      return defaultData();
    }
  }
}

export async function saveData(appData) {
  try {
    // Save current user to this device only
    if (appData.currentUserId) {
      localStorage.setItem('divvy-current-user', appData.currentUserId);
    }

    // Save shared data to Supabase (without currentUserId)
    const sharedData = { ...appData };
    delete sharedData.currentUserId;

    await supabase
      .from('households')
      .upsert({ id: HOUSEHOLD_ID, data: sharedData, updated_at: new Date().toISOString() });

    // Local backup
    localStorage.setItem('divvy-app-data', JSON.stringify(appData));
  } catch (e) {
    console.error("Save failed:", e);
    localStorage.setItem('divvy-app-data', JSON.stringify(appData));
  }
}

// Real-time subscription — calls onUpdate whenever another device changes data
export function subscribeToChanges(onUpdate) {
  const channel = supabase
    .channel('household-changes')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'households', filter: `id=eq.${HOUSEHOLD_ID}` },
      (payload) => {
        const sharedData = payload.new?.data;
        if (sharedData) {
          const localUserId = localStorage.getItem('divvy-current-user');
          onUpdate({ ...sharedData, currentUserId: localUserId || null });
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export const uid = () => Math.random().toString(36).slice(2, 10);
export const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();