import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// ---------------------------------------------------------------------------
// NotificationContext — real-time alerts for outbreaks and critical reports
// Read state is persisted in localStorage to survive page refreshes.
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'farmalert-read-notifications';
const REPORT_WINDOW_HOURS = 48;

const NotificationContext = createContext(null);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getReadIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveReadIds(ids) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
}

function buildOutbreakNotification(outbreak) {
  return {
    id: `outbreak-${outbreak.outbreak_id}`,
    type: 'outbreak',
    severity: 'critical',
    title: `⚠️ Outbreak: ${outbreak.disease_name}`,
    message: `Active outbreak detected in ${outbreak.barangay_name}. ${outbreak.farms_affected_count ?? 0} farm(s) affected.`,
    timestamp: outbreak.date_triggered,
    link: '/outbreaks',
    raw: outbreak,
  };
}

function buildReportNotification(report) {
  const sev = report.severity?.toLowerCase();
  return {
    id: `report-${report.report_id}`,
    type: 'report',
    severity: sev,
    title: `${sev === 'critical' ? '🔴' : '🟠'} ${report.severity} Report: ${report.disease_name ?? 'Unknown Disease'}`,
    message: `A ${report.severity?.toLowerCase()} disease report was logged${report.barangay_name ? ` in ${report.barangay_name}` : ''}.`,
    timestamp: report.date_reported ?? report.created_at,
    link: '/reports',
    raw: report,
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export function NotificationProvider({ children }) {
  const { session, loading: authLoading } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readIds, setReadIds] = useState(() => getReadIds());
  const notifRef = useRef(notifications);
  notifRef.current = notifications;

  // ── Initial fetch — only run once auth session is ready ──────────────────
  const loadInitial = useCallback(async () => {
    if (!session) return; // Don't fetch without auth

    const windowStart = new Date(
      Date.now() - REPORT_WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const [{ data: outbreaks, error: e1 }, { data: reports, error: e2 }] =
      await Promise.all([
        // Active outbreaks — use the enriched view (has disease_name, barangay_name)
        supabase
          .from('v_outbreaks_enriched')
          .select('*')
          .eq('status', 'Active')
          .order('date_triggered', { ascending: false }),

        // Recent Severe/Critical reports — use enriched view (has disease_name, barangay_name)
        supabase
          .from('v_reports_enriched')
          .select('report_id, disease_name, severity, date_reported, created_at, barangay_name')
          .in('severity', ['Severe', 'Critical'])
          .gte('created_at', windowStart)
          .order('created_at', { ascending: false })
          .limit(20),
      ]);

    if (e1) console.error('[NotificationContext] outbreaks fetch error:', e1);
    if (e2) console.error('[NotificationContext] reports fetch error:', e2);

    const outbreakNotifs = (outbreaks ?? []).map(buildOutbreakNotification);
    const reportNotifs   = (reports   ?? []).map(buildReportNotification);

    // Merge and sort by timestamp descending
    const merged = [...outbreakNotifs, ...reportNotifs].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );

    setNotifications(merged);
  }, [session]);

  // Load once auth is ready
  useEffect(() => {
    if (!authLoading && session) {
      loadInitial();
    }
  }, [authLoading, session, loadInitial]);

  // ── Real-time: outbreak_alerts ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('notif-outbreaks')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'outbreak_alerts' },
        async (payload) => {
          // Fetch enriched record from the view (raw table doesn't have disease_name etc.)
          const { data } = await supabase
            .from('v_outbreaks_enriched')
            .select('*')
            .eq('outbreak_id', payload.new.outbreak_id)
            .single();
          if (!data) return;
          const notif = buildOutbreakNotification(data);
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'outbreak_alerts' },
        (payload) => {
          // Remove from notifications list when outbreak is no longer Active
          if (payload.new.status !== 'Active') {
            const removeId = `outbreak-${payload.new.outbreak_id}`;
            setNotifications(prev => prev.filter(n => n.id !== removeId));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // ── Real-time: disease_reports ────────────────────────────────────────────
  useEffect(() => {
    if (!session) return;

    const channel = supabase
      .channel('notif-reports')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disease_reports' },
        async (payload) => {
          const sev = payload.new.severity;
          if (sev !== 'Severe' && sev !== 'Critical') return;

          // Fetch enriched record from v_reports_enriched (has disease_name, barangay_name)
          const { data } = await supabase
            .from('v_reports_enriched')
            .select('report_id, disease_name, severity, date_reported, created_at, barangay_name')
            .eq('report_id', payload.new.report_id)
            .single();

          const notif = buildReportNotification(data ?? payload.new);
          setNotifications(prev => {
            if (prev.some(n => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session]);

  // ── Read state management ─────────────────────────────────────────────────
  const markAsRead = useCallback((id) => {
    setReadIds(prev => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      saveReadIds(next);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    const allIds = notifRef.current.map(n => n.id);
    setReadIds(prev => {
      const next = [...new Set([...prev, ...allIds])];
      saveReadIds(next);
      return next;
    });
  }, []);

  const clearNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    setReadIds(prev => {
      const next = prev.filter(rid => rid !== id);
      saveReadIds(next);
      return next;
    });
  }, []);

  // ── Derived values ────────────────────────────────────────────────────────
  const enriched = notifications.map(n => ({ ...n, read: readIds.includes(n.id) }));
  const unreadCount = enriched.filter(n => !n.read).length;

  const value = {
    notifications: enriched,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotification,
    refresh: loadInitial,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationProvider>');
  return ctx;
}
