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
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import styles from './SystemSettings.module.css';

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

  return (
    <div className={styles.settingRow}>
      <div className={styles.settingInfo}>
        <p className={styles.settingKey}>{setting.setting_key}</p>
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
      // Update local state immediately without full reload
      setSettings(prev =>
        prev.map(s => s.setting_id === settingId ? { ...s, ...data } : s)
      );
      await writeAuditLog({
        userId:      profile?.user_id,
        action:      `Updated system setting ID: ${settingId}`,
        targetTable: 'system_settings',
        targetId:    String(settingId),
      });
      showToast('Setting saved successfully.');
    }
    return { error: saveErr };
  }

  return (
    <div className={styles.page}>

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
        <div className={styles.loadingWrapper}><LoadingSpinner size={36} /></div>
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
