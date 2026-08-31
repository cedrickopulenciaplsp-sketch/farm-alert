import { useState, useEffect, useCallback } from 'react';
import {
  Settings, Save, RefreshCw, AlertCircle,
  CheckCircle2, Edit2, X,
} from 'lucide-react';
import { getSettings, updateSetting } from '../../services/admin';
import { writeAuditLog } from '../../services/admin';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/shared/Card';
import Button from '../../components/shared/Button';
import SkeletonLoader from '../../components/shared/SkeletonLoader';
import styles from './SystemSettings.module.css';

// ── Human-readable labels for each setting key ───────────────────────────────
const SETTING_LABELS = {
  outbreak_farm_threshold: {
    label:       'Outbreak Farm Threshold',
    description: 'Number of farms in the same barangay reporting the same disease before an outbreak alert is triggered.',
  },
  outbreak_days_window: {
    label:       'Outbreak Detection Window (Days)',
    description: 'The number of days to look back when counting disease reports for outbreak detection.',
  },
  auto_detection_enabled: {
    label:       'Auto Outbreak Detection',
    description: 'When enabled, the system automatically creates outbreak alerts when the threshold is met.',
  },
};

// ── Single setting row ────────────────────────────────────────────────────────
function SettingRow({ setting, onSave }) {
  const [editing, setEditing]   = useState(false);
  const [value,   setValue]     = useState(setting.setting_value);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState('');

  // Keep local value in sync if parent reloads data
  useEffect(() => { setValue(setting.setting_value); }, [setting.setting_value]);

  async function handleSave() {
    setSaving(true);
    setError('');
    const { error: saveErr } = await onSave(setting.setting_id, value);
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    setEditing(false);
  }

  function handleCancel() {
    setValue(setting.setting_value);
    setEditing(false);
    setError('');
  }

  const updatedAt = setting.updated_at
    ? new Date(setting.updated_at).toLocaleString('en-PH', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '—';

  const meta = SETTING_LABELS[setting.setting_key];

  return (
    <div className={styles.settingRow}>
      <div className={styles.settingInfo}>
        <p className={styles.settingKey}>{meta?.label ?? setting.setting_key}</p>
        {meta?.description && (
          <p className={styles.settingDesc}>{meta.description}</p>
        )}
        <p className={styles.settingMeta}>Last updated: {updatedAt}</p>
        {error && (
          <p className={styles.settingError}>
            <AlertCircle size={12} /> {error}
          </p>
        )}
      </div>

      {editing ? (
        <div className={styles.editArea}>
          <input
            id={`setting-input-${setting.setting_id}`}
            className={styles.settingInput}
            value={value}
            onChange={e => setValue(e.target.value)}
            autoFocus
          />
          <button
            id={`setting-save-${setting.setting_id}`}
            className={`${styles.iconBtn} ${styles.iconBtnSave}`}
            onClick={handleSave}
            disabled={saving}
            title="Save"
          >
            {saving ? <RefreshCw size={14} className={styles.spin} /> : <Save size={14} />}
          </button>
          <button
            id={`setting-cancel-${setting.setting_id}`}
            className={styles.iconBtn}
            onClick={handleCancel}
            title="Cancel"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <div className={styles.viewArea}>
          <span className={styles.settingValue}>{setting.setting_value}</span>
          <button
            id={`setting-edit-${setting.setting_id}`}
            className={styles.iconBtn}
            onClick={() => setEditing(true)}
            title="Edit"
          >
            <Edit2 size={14} />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SystemSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [toast,    setToast]    = useState(null);

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: e } = await getSettings();
    if (e) { setError(e.message); setLoading(false); return; }
    setSettings(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(settingId, newValue) {
    const { data, error: saveErr } = await updateSetting(settingId, newValue);
    if (!saveErr) {
      // Resolve the setting key for the human-readable log message
      const settingRow = settings.find(s => s.setting_id === settingId);
      const settingKey = settingRow?.setting_key ?? `ID:${settingId}`;
      const oldValue   = settingRow?.setting_value ?? '?';

      // Update local state immediately without full reload
      setSettings(prev =>
        prev.map(s => s.setting_id === settingId ? { ...s, ...data } : s)
      );
      await writeAuditLog({
        userId:      profile?.user_id,
        action:      `Changed setting '${settingKey}' from '${oldValue}' to '${newValue}'`,
        targetTable: 'system_settings',
        targetId:    String(settingId),
      });
      showToast('Setting saved successfully.');
    }
    return { error: saveErr };
  }

  return (
    <div className={`${styles.page} page-enter`}>

      {/* ── Page Header (standalone — no longer inside AdminLayout) ─────── */}
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <div className={styles.headerIcon}>
            <Settings size={20} />
          </div>
          <div>
            <h1 className={styles.pageTitle}>System Settings</h1>
            <p className={styles.pageSubtitle}>Manage system configuration values for the CVO office.</p>
          </div>
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : ''}`}>
          {toast.type === 'error' ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
          {toast.msg}
        </div>
      )}

      <div className={styles.toolbar}>
        <p className={styles.hint}>
          Edit configuration values that control system behaviour. Changes take effect immediately.
        </p>
        <Button id="refresh-settings-btn" variant="ghost" size="sm" onClick={load}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {error ? (
        <Card>
          <Card.Body className={styles.errorBody}>
            <AlertCircle size={20} />
            <p>{error}</p>
            <Button id="retry-settings-btn" variant="ghost" size="sm" onClick={load}>
              <RefreshCw size={14} /> Retry
            </Button>
          </Card.Body>
        </Card>
      ) : loading ? (
        <SkeletonLoader rows={3} columns={2} type="list" />
      ) : settings.length === 0 ? (
        <Card>
          <Card.Body className={styles.emptyBody}>
            <Settings size={28} />
            <p>No system settings found.</p>
            <p className={styles.emptyHint}>
              Add rows to the <code>system_settings</code> table in Supabase.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <Card className={styles.settingsCard}>
          {settings.map((s, i) => (
            <div key={s.setting_id}>
              <SettingRow setting={s} onSave={handleSave} />
              {i < settings.length - 1 && <hr className={styles.divider} />}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
