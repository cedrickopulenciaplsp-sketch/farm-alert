import { supabase } from '../lib/supabase';

// ── Users ─────────────────────────────────────────────────────────────────────

/**
 * Fetch all users joined with their role name.
 */
export async function getUsers() {
  const { data, error } = await supabase
    .from('users')
    .select('user_id, full_name, username, role_id, is_active, requires_password_change, created_at, roles(role_name)')
    .order('created_at', { ascending: true });
  return { data, error };
}

/**
 * Fetch all roles from the roles table.
 */
export async function getRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('role_id, role_name')
    .order('role_id', { ascending: true });
  return { data, error };
}

/**
 * Update editable fields on a user profile row.
 */
export async function updateUser(userId, updates) {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  return { data, error };
}

/**
 * Set requires_password_change = true for a given user.
 */
export async function flagPasswordReset(userId) {
  const { error } = await supabase
    .from('users')
    .update({ requires_password_change: true })
    .eq('user_id', userId);
  return { error };
}

/**
 * Create a new user account by calling the secure admin_create_user RPC.
 * The new user will be flagged to change their password on first login.
 * @param {{ email: string, password: string, fullName: string, roleId: number }} params
 */
export async function createUser({ email, password, fullName, roleId }) {
  const { data, error } = await supabase.rpc('admin_create_user', {
    p_email:     email,
    p_password:  password,
    p_full_name: fullName,
    p_role_id:   roleId,
  });
  return { data, error };
}

// ── System Settings ───────────────────────────────────────────────────────────

/**
 * Fetch all rows from system_settings.
 */
export async function getSettings() {
  const { data, error } = await supabase
    .from('system_settings')
    .select('setting_id, setting_key, setting_value, updated_at')
    .order('setting_key', { ascending: true });
  return { data, error };
}

/**
 * Update a single system setting by its ID.
 */
export async function updateSetting(settingId, newValue) {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('system_settings')
    .update({ setting_value: newValue, updated_at: now })
    .eq('setting_id', settingId)
    .select()
    .single();
  return { data, error };
}

// ── Audit Logs ────────────────────────────────────────────────────────────────

/**
 * Fetch paginated audit log entries joined with the actor's full_name.
 * @param {{ page?: number, pageSize?: number }} options
 */
export async function getAuditLogs({ page = 0, pageSize = 30 } = {}) {
  const from = page * pageSize;
  const to   = from + pageSize - 1;

  const { data, count, error } = await supabase
    .from('audit_logs')
    .select('log_id, action, target_table, target_id, created_at, users(full_name)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  return { data, count, error };
}

/**
 * Insert a single row into audit_logs.
 * Call this after any significant admin action.
 */
export async function writeAuditLog({ userId, action, targetTable, targetId } = {}) {
  const { error } = await supabase
    .from('audit_logs')
    .insert({
      user_id:      userId   ?? null,
      action:       action   ?? 'Unknown action',
      target_table: targetTable ?? null,
      target_id:    targetId ?? null,
    });
  return { error };
}
