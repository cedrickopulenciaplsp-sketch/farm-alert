import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * A custom hook to listen for real-time changes on Supabase tables.
 * 
 * @param {string} table - The table name to listen to (e.g., 'disease_reports', 'outbreak_alerts')
 * @param {Function} callback - The function to call when a change is detected. Receives the payload.
 * @param {string} event - The specific event to listen for ('INSERT', 'UPDATE', 'DELETE', or '*'). Default is '*'.
 */
export const useRealtime = (table, callback, event = '*') => {
  useEffect(() => {
    // Ensure table and callback are provided
    if (!table || !callback) return;

    // Create a unique channel name based on the table
    const channelName = `realtime:${table}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: event, schema: 'public', table: table },
        (payload) => {
          console.log(`Realtime update received on ${table}:`, payload);
          callback(payload);
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to realtime changes for ${table}`);
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`Error subscribing to ${table}:`, err);
        }
      });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, callback, event]);
};
