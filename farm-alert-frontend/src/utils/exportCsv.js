/**
 * exportToCsv
 * -----------
 * Converts an array of data objects into a CSV file and triggers
 * a browser download.
 *
 * @param {string} filename  - The name for the downloaded file (e.g. 'farms_export.csv')
 * @param {Array<Object>} data - Array of row objects to export
 * @param {Array<{label: string, key: string|function}>} columns
 *   - label: the column header shown in the CSV
 *   - key: a string property name, or a function(row) => value
 *
 * Example:
 *   exportToCsv('farms.csv', farms, [
 *     { label: 'Farm Name',  key: 'farm_name' },
 *     { label: 'Status',     key: row => row.status ?? '—' },
 *   ]);
 */
export function exportToCsv(filename, data, columns) {
  if (!data || data.length === 0) return;

  // Build the header row
  const header = columns.map(col => escapeCsvCell(col.label)).join(',');

  // Build each data row
  const rows = data.map(row =>
    columns
      .map(col => {
        const value = typeof col.key === 'function'
          ? col.key(row)
          : row[col.key];
        return escapeCsvCell(value);
      })
      .join(',')
  );

  const csvContent = [header, ...rows].join('\r\n');

  // Create a Blob and trigger the download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Wraps a cell value in double quotes and escapes any internal double quotes.
 * Handles null, undefined, numbers, and booleans gracefully.
 */
function escapeCsvCell(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If the value contains a comma, newline, or double quote, wrap it in quotes
  if (str.includes(',') || str.includes('\n') || str.includes('"')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
