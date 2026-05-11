import { supabase } from '../lib/supabase';

export const mapService = {
  // Fetch all farms with their latest disease status for mapping
  async getMapFarms() {
    try {
      const { data, error } = await supabase
        .from('v_map_farms')
        .select('*');

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching map farms:', error);
      throw error;
    }
  }
};
