import { supabase } from '../lib/supabase';

// ---------------------------------------------------------------------------
// outbreaks.js — Supabase API wrappers for the Outbreak Alerts domain
//
// All reads use the `v_outbreaks_enriched` view (defined in 004_views.sql) which
// already includes barangay_name, disease_name, and acknowledged_by_name.
// ---------------------------------------------------------------------------

const DIFF_DIAG_NOTE_REGEX = /\[Differential Diagnosis:\s*Presumptive\s+(.+?)\s*->\s*Confirmed\s+([^|\]]+?)(?:\s*\|\s*Ref:\s*([^\]]+?))?\]/i;
const DIFF_DIAG_AUDIT_REGEX = /^DiffDiag:\s*Suspected\s+(.+?)\s*->\s*Confirmed\s+([^[]+?)(?:\s*\[([^\]]+)\])?$/i;

/**
 * Parse differential diagnosis metadata from a disease_reports.additional_notes string.
 */
export function parseDiffDiagFromNotes(notes) {
  if (!notes || typeof notes !== 'string') {
    return { hasDiffDiag: false, presumptiveDisease: null, confirmedDisease: null, labRef: null, cleanNotes: notes || '' };
  }
  const match = notes.match(DIFF_DIAG_NOTE_REGEX);
  if (!match) {
    return { hasDiffDiag: false, presumptiveDisease: null, confirmedDisease: null, labRef: null, cleanNotes: notes };
  }
  const presumptiveDisease = match[1]?.trim() || null;
  const confirmedDisease   = match[2]?.trim() || null;
  const labRef             = match[3]?.trim() || null;
  const cleanNotes         = notes.replace(DIFF_DIAG_NOTE_REGEX, '').trim();

  if (!presumptiveDisease || presumptiveDisease === confirmedDisease) {
    return { hasDiffDiag: false, presumptiveDisease: null, confirmedDisease: null, labRef: null, cleanNotes };
  }
  return {
    hasDiffDiag: true,
    presumptiveDisease,
    confirmedDisease,
    labRef,
    cleanNotes,
  };
}

/**
 * Build an updated additional_notes string embedding or clearing the Differential Diagnosis tag.
 */
export function formatDiffDiagNotes(existingNotes, presumptiveDisease, confirmedDisease, labRef) {
  const { cleanNotes } = parseDiffDiagFromNotes(existingNotes || '');
  if (!presumptiveDisease || presumptiveDisease === confirmedDisease) {
    return cleanNotes || null;
  }
  const refSegment = labRef && labRef.trim() ? ` | Ref: ${labRef.trim()}` : '';
  const tag = `[Differential Diagnosis: Presumptive ${presumptiveDisease} -> Confirmed ${confirmedDisease}${refSegment}]`;
  return cleanNotes ? `${tag}\n${cleanNotes}` : tag;
}

/**
 * Parse differential diagnosis metadata from an audit_logs.action string.
 */
export function parseDiffDiagAction(action) {
  if (!action || typeof action !== 'string') return null;
  const match = action.trim().match(DIFF_DIAG_AUDIT_REGEX);
  if (!match) return null;
  return {
    presumptiveDisease: match[1]?.trim() || null,
    confirmedDisease:   match[2]?.trim() || null,
    labRef:             match[3]?.trim() || null,
  };
}

/**
 * Fetch all outbreak alerts, with optional status filtering, enriched with
 * Differential Diagnosis history (presumptive vs confirmed disease) and farm livestock_type_id.
 *
 * @param {object}  options
 * @param {string}  [options.status]    - filter by status ('Active', 'Resolved')
 * @returns {Promise<{ data: Array, error: object|null }>}
 */
export async function getOutbreaks({ status = null } = {}) {
  let query = supabase
    .from('v_outbreaks_enriched')
    .select('*')
    .order('date_triggered', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const [outbreaksRes, diffLogsRes, farmsRes] = await Promise.all([
    query,
    supabase
      .from('audit_logs')
      .select('target_id, action, created_at')
      .eq('target_table', 'outbreak_alerts')
      .ilike('action', 'DiffDiag:%')
      .order('created_at', { ascending: false }),
    supabase
      .from('farms')
      .select('farm_id, livestock_type_id'),
  ]);

  if (outbreaksRes.error || !outbreaksRes.data) {
    return { data: outbreaksRes.data, error: outbreaksRes.error };
  }

  // Map latest differential diagnosis log per outbreak_id
  const diffMap = new Map();
  if (diffLogsRes.data) {
    for (const log of diffLogsRes.data) {
      if (log.target_id && !diffMap.has(log.target_id)) {
        const parsed = parseDiffDiagAction(log.action);
        if (parsed) diffMap.set(log.target_id, parsed);
      }
    }
  }

  // Map farm_id -> livestock_type_id
  const farmTypeMap = new Map();
  if (farmsRes.data) {
    for (const f of farmsRes.data) {
      farmTypeMap.set(f.farm_id, f.livestock_type_id);
    }
  }

  const enriched = outbreaksRes.data.map((o) => {
    const diff = diffMap.get(o.outbreak_id);
    const hasDiff = diff && diff.presumptiveDisease && diff.presumptiveDisease !== o.disease_name;
    return {
      ...o,
      presumptive_disease_name: hasDiff ? diff.presumptiveDisease : (o.presumptive_disease_name || null),
      lab_reference:            hasDiff ? (diff.labRef || null) : (o.lab_reference || null),
      livestock_type_id:        o.farm_id ? (farmTypeMap.get(o.farm_id) ?? null) : null,
    };
  });

  return { data: enriched, error: null };
}

/**
 * Fetch a single outbreak alert by its primary key.
 *
 * @param {string} id  - outbreak_id (UUID)
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function getOutbreakById(id) {
  const { data, error } = await supabase
    .from('v_outbreaks_enriched')
    .select('*')
    .eq('outbreak_id', id)
    .single();

  return { data, error };
}

/**
 * Update an existing outbreak alert (e.g., acknowledging or resolving it).
 *
 * @param {string} id           - outbreak_id (UUID)
 * @param {object} outbreakData - partial object with fields to update
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function updateOutbreak(id, outbreakData) {
  const { data, error } = await supabase
    .from('outbreak_alerts')
    .update(outbreakData)
    .eq('outbreak_id', id)
    .select()
    .single();

  return { data, error };
}

/**
 * Reclassify an incident's disease based on RADDL Differential Diagnosis while
 * preserving the original presumptive (suspected) disease in the case history.
 *
 * @param {object} params
 * @param {object} params.outbreak        - current enriched outbreak object
 * @param {string} params.newDiseaseId    - confirmed disease UUID
 * @param {string} params.newDiseaseName  - confirmed disease display name
 * @param {string} [params.labRef]        - optional RADDL lab reference number
 * @param {string} [params.userId]        - user_id performing the reclassification
 * @returns {Promise<{ data: object|null, error: object|null }>}
 */
export async function reclassifyOutbreakDisease({
  outbreak,
  newDiseaseId,
  newDiseaseName,
  labRef = '',
  userId = null,
}) {
  const presumptiveName = outbreak.presumptive_disease_name || outbreak.disease_name;
  const cleanRef = (labRef || '').trim();

  // 1. Update outbreak_alerts with the confirmed disease_id and mark lab_result = 'Positive'
  const { error: alertErr } = await supabase
    .from('outbreak_alerts')
    .update({
      disease_id: newDiseaseId,
      lab_result: 'Positive',
    })
    .eq('outbreak_id', outbreak.outbreak_id);

  if (alertErr) {
    return { data: null, error: alertErr };
  }

  // 2. Locate linked disease_reports row(s) and update disease_id + additional_notes
  let targetReports = [];
  if (outbreak.report_id) {
    const { data: repData } = await supabase
      .from('disease_reports')
      .select('report_id, additional_notes')
      .eq('report_id', outbreak.report_id);
    if (repData && repData.length > 0) targetReports = repData;
  }

  if (targetReports.length === 0 && outbreak.farm_id && outbreak.disease_id) {
    const { data: repData } = await supabase
      .from('disease_reports')
      .select('report_id, additional_notes')
      .eq('farm_id', outbreak.farm_id)
      .eq('disease_id', outbreak.disease_id)
      .neq('status', 'Resolved');
    if (repData && repData.length > 0) targetReports = repData;
  }

  for (const rep of targetReports) {
    const updatedNotes = formatDiffDiagNotes(
      rep.additional_notes,
      presumptiveName,
      newDiseaseName,
      cleanRef
    );
    await supabase
      .from('disease_reports')
      .update({
        disease_id:       newDiseaseId,
        additional_notes: updatedNotes,
      })
      .eq('report_id', rep.report_id);
  }

  // 3. Record structured Differential Diagnosis entry in audit_logs (capped <= 148 chars for VARCHAR(150))
  const refSuffix = cleanRef ? ` [${cleanRef.slice(0, 24)}]` : '';
  const actionStr = `DiffDiag: Suspected ${presumptiveName} -> Confirmed ${newDiseaseName}${refSuffix}`.slice(0, 148);

  await supabase.from('audit_logs').insert({
    user_id:      userId,
    action:       actionStr,
    target_table: 'outbreak_alerts',
    target_id:    String(outbreak.outbreak_id),
  });

  const isDiff = presumptiveName !== newDiseaseName;

  return {
    data: {
      disease_id:               newDiseaseId,
      disease_name:             newDiseaseName,
      lab_result:               'Positive',
      presumptive_disease_name: isDiff ? presumptiveName : null,
      lab_reference:            isDiff ? (cleanRef || null) : null,
    },
    error: null,
  };
}

/**
 * Returns the count of currently Active outbreaks.
 * Used by the Sidebar badge — avoids fetching full records for a simple count.
 *
 * @returns {Promise<{ count: number, error: object|null }>}
 */
export async function getActiveOutbreakCount() {
  const { count, error } = await supabase
    .from('outbreak_alerts')
    .select('*', { count: 'exact', head: true })
    .neq('status', 'Resolved');

  return { count: count ?? 0, error };
}

