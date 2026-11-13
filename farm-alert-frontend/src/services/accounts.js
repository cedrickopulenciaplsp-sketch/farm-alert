import { supabase } from '../lib/supabase';
import { AUTHORIZED_EMAILS } from './auth';

// ---------------------------------------------------------------------------
// accounts.js — Admin-controlled Google account registry (Migration 037)
// Includes automatic fallback to `public.users` if Migration 037 has not yet
// been executed in Supabase, ensuring zero-downtime local testing.
// ---------------------------------------------------------------------------

export const ROLE_LABELS = {
  admin:     'City Veterinarian (Admin)',
  cvo_staff: 'Veterinary Inspector (Staff)',
  farmer:    'Livestock Raiser (Farmer)',
};

export const ROLE_SHORT = {
  admin:     'Admin',
  cvo_staff: 'Staff',
  farmer:    'Farmer',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email) {
  return (email ?? '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_RE.test(normalizeEmail(email));
}

function isMissingTableError(err) {
  if (!err) return false;
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    (err.message && err.message.includes('authorized_accounts'))
  );
}

/**
 * Ask the database what access the signed-in Google account has.
 * Returns `{ data: null, error }` if Migration 037 has not been applied yet,
 * so callers can fall back to the static demo allowlist.
 *
 * @returns {Promise<{ data: { authorized, role, farm_id, is_demo_account, is_active } | null, error }>}
 */
export async function getMyAccountAccess() {
  const { data, error } = await supabase.rpc('get_my_account_access');
  if (error) return { data: null, error };
  const row = Array.isArray(data) ? data[0] : data;
  return { data: row ?? null, error: null };
}

/**
 * Fetch every authorized account, merged with:
 *   - the linked farm name (if farmer)
 *   - the public.users profile (to know whether they have signed in yet)
 *
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getAccounts() {
  const [accRes, usersRes, farmsRes] = await Promise.all([
    supabase
      .from('authorized_accounts')
      .select('*')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('user_id, auth_id, full_name, username, role, role_id, farm_id, created_at, is_active'),
    supabase
      .from('farms')
      .select('farm_id, farm_name, owner_name, farmer_email'),
  ]);

  const usersByEmail = new Map(
    (usersRes.data ?? []).map((u) => [normalizeEmail(u.username), u])
  );
  const farmsById = new Map((farmsRes.data ?? []).map((f) => [f.farm_id, f]));

  // Fallback path if Migration 037 is not yet run in Supabase
  if (accRes.error && isMissingTableError(accRes.error)) {
    const map = new Map();

    // 1. Seed default team accounts (sanielken2@gmail.com is sole Admin)
    for (const email of AUTHORIZED_EMAILS) {
      const norm = normalizeEmail(email);
      const profile = usersByEmail.get(norm) ?? null;
      const defaultRole = norm === 'sanielken2@gmail.com' ? 'admin' : 'cvo_staff';
      const resolvedRole = profile?.role || defaultRole;
      const farm = profile?.farm_id ? farmsById.get(profile.farm_id) ?? null : null;
      map.set(norm, {
        account_id:      profile?.user_id || `team-${norm}`,
        email:           norm,
        full_name:       profile?.full_name || null,
        display_name:    profile?.full_name || norm.split('@')[0],
        role:            resolvedRole,
        farm_id:         profile?.farm_id || null,
        farm_name:       farm?.farm_name || null,
        is_active:       profile?.is_active ?? true,
        is_demo_account: true,
        source:          'system',
        notes:           'Authorized CVO Team Account',
        has_signed_in:   Boolean(profile?.auth_id),
        first_sign_in:   profile?.created_at ?? null,
        created_at:      profile?.created_at ?? new Date().toISOString(),
      });
    }

    // 2. Add any additional rows from public.users
    for (const u of usersRes.data ?? []) {
      const norm = normalizeEmail(u.username);
      if (!norm || map.has(norm)) continue;
      const farm = u.farm_id ? farmsById.get(u.farm_id) ?? null : null;
      const resolvedRole = u.role || (u.role_id === 2 ? 'admin' : u.role_id === 3 ? 'farmer' : 'cvo_staff');
      map.set(norm, {
        account_id:      u.user_id,
        email:           norm,
        full_name:       u.full_name,
        display_name:    u.full_name || norm.split('@')[0],
        role:            resolvedRole,
        farm_id:         u.farm_id || null,
        farm_name:       farm?.farm_name || null,
        is_active:       u.is_active ?? true,
        is_demo_account: AUTHORIZED_EMAILS.includes(norm),
        source:          'admin',
        notes:           null,
        has_signed_in:   Boolean(u.auth_id),
        first_sign_in:   u.created_at ?? null,
        created_at:      u.created_at ?? new Date().toISOString(),
      });
    }

    // 3. Add any farmers linked via farms.farmer_email
    for (const f of farmsRes.data ?? []) {
      const norm = normalizeEmail(f.farmer_email);
      if (!norm || map.has(norm)) continue;
      map.set(norm, {
        account_id:      `farm-${f.farm_id}`,
        email:           norm,
        full_name:       f.owner_name,
        display_name:    f.owner_name || norm.split('@')[0],
        role:            'farmer',
        farm_id:         f.farm_id,
        farm_name:       f.farm_name,
        is_active:       true,
        is_demo_account: false,
        source:          'farm_registry',
        notes:           `Linked via Farm Registry (${f.farm_name})`,
        has_signed_in:   false,
        first_sign_in:   null,
        created_at:      new Date().toISOString(),
      });
    }

    return { data: Array.from(map.values()), error: null };
  }

  if (accRes.error) return { data: [], error: accRes.error };

  const merged = (accRes.data ?? []).map((a) => {
    const profile = usersByEmail.get(a.email) ?? null;
    const farm    = a.farm_id ? farmsById.get(a.farm_id) ?? null : null;
    return {
      ...a,
      display_name:  profile?.full_name || a.full_name || a.email.split('@')[0],
      has_signed_in: Boolean(profile?.auth_id),
      first_sign_in: profile?.created_at ?? null,
      farm_name:     farm?.farm_name ?? null,
    };
  });

  return { data: merged, error: null };
}

/**
 * Authorize a new Google account.
 */
export async function createAccount({ email, full_name, role, farm_id, notes }) {
  const norm = normalizeEmail(email);
  const row = {
    email:     norm,
    full_name: full_name?.trim() || null,
    role,
    farm_id:   role === 'farmer' && farm_id ? farm_id : null,
    notes:     notes?.trim() || null,
    source:    'admin',
    is_active: true,
  };

  const { data, error } = await supabase
    .from('authorized_accounts')
    .insert(row)
    .select()
    .single();

  // Fallback if Migration 037 is not yet run: insert into public.users or update farm
  if (error && isMissingTableError(error)) {
    const roleId = role === 'admin' ? 2 : role === 'farmer' ? 3 : 1;
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .insert({
        full_name: full_name?.trim() || norm.split('@')[0],
        username:  norm,
        role_id:   roleId,
        role,
        farm_id:   role === 'farmer' && farm_id ? farm_id : null,
        is_active: true,
      })
      .select()
      .single();

    if (userErr) return { data: null, error: userErr };
    return {
      data: {
        account_id: userRow.user_id,
        email:      norm,
        full_name:  userRow.full_name,
        role:       userRow.role,
        farm_id:    userRow.farm_id,
        is_active:  userRow.is_active,
      },
      error: null,
    };
  }

  return { data, error };
}

/**
 * Update role / linked farm / name / notes of an existing account.
 */
export async function updateAccount(accountId, { email, full_name, role, farm_id, notes }) {
  const patch = {
    full_name: full_name?.trim() || null,
    role,
    farm_id:   role === 'farmer' && farm_id ? farm_id : null,
    notes:     notes?.trim() || null,
  };

  const { data, error } = await supabase
    .from('authorized_accounts')
    .update(patch)
    .eq('account_id', accountId)
    .select()
    .single();

  if (error && isMissingTableError(error)) {
    const roleId = role === 'admin' ? 2 : role === 'farmer' ? 3 : 1;
    const userPatch = {
      role,
      role_id: roleId,
      farm_id: role === 'farmer' && farm_id ? farm_id : null,
    };
    if (full_name?.trim()) userPatch.full_name = full_name.trim();

    let query = supabase.from('users').update(userPatch);
    if (email) {
      query = query.eq('username', normalizeEmail(email));
    } else {
      query = query.eq('user_id', accountId);
    }
    const { data: uData, error: uErr } = await query.select().maybeSingle();
    if (uErr) return { data: null, error: uErr };
    return {
      data: {
        account_id: accountId,
        email:      normalizeEmail(email || uData?.username),
        full_name:  uData?.full_name || full_name,
        role,
        farm_id:    userPatch.farm_id,
      },
      error: null,
    };
  }

  return { data, error };
}

/**
 * Suspend or reactivate an account. Suspended accounts are blocked at sign-in.
 */
export async function setAccountActive(accountId, isActive, email = null) {
  const { data, error } = await supabase
    .from('authorized_accounts')
    .update({ is_active: isActive })
    .eq('account_id', accountId)
    .select()
    .single();

  if (error && isMissingTableError(error)) {
    let query = supabase.from('users').update({ is_active: isActive });
    if (email) {
      query = query.eq('username', normalizeEmail(email));
    } else {
      query = query.eq('user_id', accountId);
    }
    const { data: uData, error: uErr } = await query.select().maybeSingle();
    return { data: uData ?? { account_id: accountId, is_active: isActive }, error: uErr };
  }

  return { data, error };
}
