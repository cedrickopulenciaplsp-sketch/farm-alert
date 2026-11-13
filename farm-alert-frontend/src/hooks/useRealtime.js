import { useEffect, useId, useRef } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A custom hook to listen for real-time changes on Supabase tables.
 * 
 * @param {string} table - The table name to listen to (e.g., 'disease_reports', 'outbreak_alerts')
 * @param {Function} callback - The function to call when a change is detected. Receives the payload.
 * @param {string} event - The specific event to listen for ('INSERT', 'UPDATE', 'DELETE', or '*'). Default is '*'.
 */
export const useRealtime = (table, callback, event = '*') => {
  const instanceId  = useId();
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!table) return;

    const channelName = `realtime:${table}:${instanceId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: event, schema: 'public', table: table },
        (payload) => {
          callbackRef.current?.(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to ${table}:`, err);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, instanceId]);
};
