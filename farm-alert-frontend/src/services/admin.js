import { supabase } from '../lib/supabase';



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
