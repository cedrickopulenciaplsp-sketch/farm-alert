import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// CORS headers
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

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function buildCsv(rows: Record<string, unknown>[]): string {
  if (!rows || rows.length === 0) return '';

  const columns = [
    { label: 'Date Reported',    key: (r: Record<string, unknown>) => formatDate(r.date_reported as string) },
    { label: 'Disease',          key: 'disease_name' },
    { label: 'Farm',             key: 'farm_name' },
    { label: 'Barangay',         key: 'barangay_name' },
    { label: 'Severity',         key: 'severity' },
    { label: 'Animals Affected', key: 'animals_affected' },
    { label: 'Mortalities',      key: (r: Record<string, unknown>) => r.mortalities ?? 0 },
    { label: 'Status',           key: 'status' },
    { label: 'Encoded By',       key: 'encoded_by_name' },
  ];

  const header = columns.map(c => escapeCsvCell(c.label)).join(',');
  const dataRows = rows.map(row =>
    columns.map(c => {
      const val = typeof c.key === 'function' ? c.key(row) : row[c.key as string];
      return escapeCsvCell(val);
    }).join(',')
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
    const { search = '', status = null, severity = null } = body;

    // Build query — mirrors getReports() in reports.js
    let query = supabase
      .from('v_reports_enriched')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }
    if (severity) {
      query = query.eq('severity', severity);
    }

    let { data, error } = await query;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Client-side search filter (mirrors DiseaseReports.jsx behavior)
    let rows = data ?? [];
    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter((r: Record<string, unknown>) =>
        (r.farm_name as string)?.toLowerCase().includes(q) ||
        (r.disease_name as string)?.toLowerCase().includes(q) ||
        (r.barangay_name as string)?.toLowerCase().includes(q)
      );
    }

    // Generate CSV string with UTF-8 BOM for Excel compatibility
    const csv = '\uFEFF' + buildCsv(rows);
    const date = new Date().toISOString().slice(0, 10);

    return new Response(csv, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="disease_reports_${date}.csv"`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
