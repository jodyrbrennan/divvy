/**
 * storage.js — Data persistence layer for the Divvy app.
 *
 * WHAT CHANGED:
 * - Now imports the shared `supabase` client from auth.js instead of
 *   creating its own. This prevents login state conflicts.
 * - Added `pendingInvites` to the default data model.
 * - Added helper functions for managing pending invites in the database.
 */

import { supabase } from './auth';

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
  pendingInvites: [],      // NEW: tracks email invitations
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

    // Ensure pendingInvites array exists (for existing households)
    if (!appData.pendingInvites) appData.pendingInvites = [];

    // Each device tracks its own user locally
    const localUserId = localStorage.getItem('divvy-current-user');
    appData.currentUserId = localUserId || null;

    return appData;
  } catch (e) {
    console.error("Load failed:", e);
    try {
      const raw = localStorage.getItem('divvy-app-data');
      const appData = raw ? JSON.parse(raw) : defaultData();
      if (!appData.pendingInvites) appData.pendingInvites = [];
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

// ─── Pending Invites (Database Table) ──────────────────────────
// These functions manage the pending_invites table in Supabase,
// which is separate from the JSON blob. We use a separate table
// so we can quickly look up invites by email when a new user signs in.

/**
 * Create a pending invite record in the database.
 * Called when an existing user invites someone by email.
 */
export async function createPendingInvite(email, invitedByUserId, invitedByName) {
  const { data, error } = await supabase
    .from('pending_invites')
    .insert({
      email: email.toLowerCase().trim(),
      household_id: HOUSEHOLD_ID,
      invited_by_user_id: invitedByUserId,
      invited_by_name: invitedByName,
      status: 'sent',
    })
    .select()
    .single();
  return { data, error };
}

/**
 * Look up a pending invite by email.
 * Called when a new user signs in — checks if they were invited.
 */
export async function findPendingInviteByEmail(email) {
  const { data, error } = await supabase
    .from('pending_invites')
    .select('*')
    .eq('email', email.toLowerCase().trim())
    .eq('household_id', HOUSEHOLD_ID)
    .in('status', ['sent', 'accepted'])
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  return { data, error };
}

/**
 * Update the status of a pending invite.
 * sent → accepted (user clicked the link)
 * accepted → completed (user finished profile setup)
 */
export async function updatePendingInviteStatus(inviteId, newStatus) {
  const { data, error } = await supabase
    .from('pending_invites')
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq('id', inviteId)
    .select()
    .single();
  return { data, error };
}

export const uid = () => crypto.randomUUID();
export const makeInviteCode = () => Math.random().toString(36).slice(2, 8).toUpperCase();
