export function toCSV(rows: Record<string, any>[]) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v: any) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = headers.map(esc).join(",");
  const body = rows.map(r => headers.map(h => esc(r[h])).join(",")).join("\n");
  return head + "\n" + body;
}

export function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
