import { supabase } from '../lib/supabase';

export const dashboardService = {
  // Fetch summary counts for the dashboard
  async getSummaryStats() {
    try {
      // 1. Total Farms
      const { count: totalFarms, error: farmsError } = await supabase
        .from('farms')
        .select('*', { count: 'exact', head: true });
      if (farmsError) throw farmsError;

      // 2. Active Outbreaks
      const { count: activeOutbreaks, error: outbreaksError } = await supabase
        .from('outbreak_alerts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'Active');
      if (outbreaksError) throw outbreaksError;

      // 3. New Reports (This month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: newReports, error: reportsError } = await supabase
        .from('disease_reports')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());
      if (reportsError) throw reportsError;

      return {
        totalFarms: totalFarms || 0,
        activeOutbreaks: activeOutbreaks || 0,
        newReports: newReports || 0,
      };
    } catch (error) {
      console.error('Error fetching summary stats:', error);
      throw error;
    }
  },

  // Fetch recent disease reports
  async getRecentReports(limit = 5) {
    try {
      const { data, error } = await supabase
        .from('v_reports_enriched')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching recent reports:', error);
      throw error;
    }
  },

  // Fetch active outbreaks for the banner
  async getActiveOutbreaks() {
    try {
      const { data, error } = await supabase
        .from('v_outbreaks_enriched')
        .select('*')
        .eq('status', 'Active')
        .order('detected_at', { ascending: false });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching active outbreaks:', error);
      throw error;
    }
  }
};
