import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// CORS headers — allow browser requests from any origin (Supabase handles
// auth via the JWT so CORS is safe to be open here).
// ---------------------------------------------------------------------------
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// CSV helpers
// ---------------------------------------------------------------------------
function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';

  const columns = [
    { label: 'Farm Name',      key: 'farm_name' },
    { label: 'Owner',          key: 'owner_name' },
    { label: 'Barangay',       key: 'barangay_name' },
    { label: 'Livestock Type', key: 'livestock_type_name' },
    { label: 'Head Count',     key: 'head_count' },
    { label: 'Status',         key: 'status' },
    { label: 'Contact',        key: 'contact_number' },
  ];

  const header = columns.map(c => escapeCsvCell(c.label)).join(',');
  const dataRows = rows.map(row =>
    columns.map(c => escapeCsvCell(row[c.key])).join(',')
  );

  return [header, ...dataRows].join('\r\n');
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    // Build an authenticated Supabase client so RLS is respected
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') ?? '' },
        },
      }
    );

    // Parse filter params from the request body
    const body = await req.json().catch(() => ({}));
    const { search = '', barangayId = null, status = null } = body;

    // Build the query — mirrors getFarms() in farms.js
    let query = supabase
      .from('v_farms_enriched')
      .select('*')
      .order('farm_name', { ascending: true });

    if (search) {
      query = query.or(`farm_name.ilike.%${search}%,owner_name.ilike.%${search}%`);
    }
    if (barangayId) {
      query = query.eq('barangay_id', barangayId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Generate CSV string with UTF-8 BOM for Excel compatibility
    const csv = '\uFEFF' + buildCsv(data ?? []);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="farms_export_${date}.csv"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
