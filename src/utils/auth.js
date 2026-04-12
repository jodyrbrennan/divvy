/**
 * auth.js — Handles all authentication logic using Supabase Auth.
 *
 * ┌─────────────────────────────────────────────────────────────────┐
 * │  EMAIL_AUTH_ENABLED — Master switch for email authentication.   │
 * │                                                                 │
 * │  false = Email auth is OFF. Sign-up skips Supabase entirely,   │
 * │          sign-in matches email against existing users locally.  │
 * │          No emails are sent, no SMTP needed.                    │
 * │                                                                 │
 * │  true  = Email auth is ON. Full Supabase Auth with email       │
 * │          confirmation, password reset, and invite emails.       │
 * │          Requires SMTP configuration in Supabase Dashboard.     │
 * └─────────────────────────────────────────────────────────────────┘
 */
export const EMAIL_AUTH_ENABLED = false;

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tpccanguhphlzeqegrtk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY2Nhbmd1aHBobHplcWVncnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc2MDUsImV4cCI6MjA5MTQyMzYwNX0.NNbeZyHi-30scgLTXkymWjxgPvUHMR9E9I1PhzagoNc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── All functions below only run real Supabase calls when EMAIL_AUTH_ENABLED is true ───

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { emailRedirectTo: window.location.origin },
  });
  return { data, error };
}

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return { data, error };
}

export async function setPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  return { data, error };
}

export async function sendInviteEmail(email) {
  try {
    const session = await getSession();
    if (!session) return { data: null, error: { message: 'You must be signed in to send invites.' } };
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}`, 'apikey': SUPABASE_KEY },
      body: JSON.stringify({ email, redirectTo: window.location.origin }),
    });
    const result = await response.json();
    if (!response.ok) return { data: null, error: { message: result.error || 'Failed to send invite' } };
    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message || 'Failed to send invite' } };
  }
}
