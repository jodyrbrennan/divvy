/**
 * auth.js — Handles all authentication logic using Supabase Auth.
 *
 * WHAT THIS FILE DOES:
 * - signUp: Creates a new account with email + password (sends confirmation email)
 * - signIn: Logs in an existing user with email + password
 * - signOut: Logs the user out
 * - getSession: Checks if someone is currently logged in
 * - onAuthChange: Listens for login/logout/email-confirmation events
 * - sendInviteEmail: Calls an Edge Function to send an invite email
 * - sendPasswordReset: Sends a "reset your password" email
 * - setPassword: Updates the current user's password (used after reset link)
 *
 * HOW IT CONNECTS TO THE APP:
 * App.jsx calls onAuthChange() when the app starts. Whenever the user's
 * auth status changes (sign in, sign out, email confirmed), App.jsx
 * updates the screen accordingly.
 *
 * IMPORTANT: This file creates the ONE shared Supabase client.
 * storage.js imports it from here so both files use the same client.
 * Using multiple clients can cause login state conflicts.
 */

import { createClient } from '@supabase/supabase-js';

// ─── Supabase Connection ───────────────────────────────────────
const SUPABASE_URL = 'https://tpccanguhphlzeqegrtk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwY2Nhbmd1aHBobHplcWVncnRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU4NDc2MDUsImV4cCI6MjA5MTQyMzYwNX0.NNbeZyHi-30scgLTXkymWjxgPvUHMR9E9I1PhzagoNc';

// ONE shared Supabase client — imported by storage.js too
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ─── Sign Up ───────────────────────────────────────────────────
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  });
  return { data, error };
}

// ─── Sign In ───────────────────────────────────────────────────
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
}

// ─── Sign Out ──────────────────────────────────────────────────
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

// ─── Get Current Session ───────────────────────────────────────
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

// ─── Listen for Auth Changes ───────────────────────────────────
export function onAuthChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}

// ─── Send Password Reset Email ─────────────────────────────────
// Sends an email with a link to reset the user's password.
// When the user clicks the link, Supabase signs them in with a
// temporary session and fires a PASSWORD_RECOVERY auth event.
// App.jsx listens for that event and shows the "set new password" screen.
export async function sendPasswordReset(email) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: window.location.origin,
  });
  return { data, error };
}

// ─── Set / Update Password ─────────────────────────────────────
// Updates the password for the currently signed-in user.
// Used in two situations:
//   1. After clicking a password reset link (user is temporarily signed in)
//   2. For invited users who joined via magic link and want to set a password
export async function setPassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  });
  return { data, error };
}

// ─── Send Invite Email ─────────────────────────────────────────
export async function sendInviteEmail(email) {
  try {
    const session = await getSession();
    if (!session) {
      return { data: null, error: { message: 'You must be signed in to send invites.' } };
    }

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': SUPABASE_KEY,
      },
      body: JSON.stringify({
        email,
        redirectTo: window.location.origin,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: { message: result.error || 'Failed to send invite' } };
    }

    return { data: result, error: null };
  } catch (e) {
    return { data: null, error: { message: e.message || 'Failed to send invite' } };
  }
}
