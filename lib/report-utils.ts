export type DateRangePreset =
  | 'current-month'
  | 'last-month'
  | 'last-3-months'
  | 'current-financial-year'
  | 'last-financial-year'
  | 'custom';

export interface DateRange {
  start: Date;
  end: Date;
  label: string;
}

export function getDateRange(
  preset: DateRangePreset,
  customStart?: string,
  customEnd?: string,
  now = new Date()
): DateRange {
  const current = new Date(now);
  const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);

  if (preset === 'custom' && customStart && customEnd) {
    return {
      start: startOfDay(new Date(customStart)),
      end: endOfDay(new Date(customEnd)),
      label: 'Custom Range',
    };
  }

  if (preset === 'last-month') {
    const start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
    const end = new Date(current.getFullYear(), current.getMonth(), 0);
    return { start: startOfDay(start), end: endOfDay(end), label: 'Last Month' };
  }

  if (preset === 'last-3-months') {
    const start = new Date(current.getFullYear(), current.getMonth() - 2, 1);
    return { start: startOfDay(start), end: endOfDay(current), label: 'Last 3 Months' };
  }

  // India financial year: April 1 – March 31
  if (preset === 'current-financial-year') {
    const fyStart = current.getMonth() >= 3 ? current.getFullYear() : current.getFullYear() - 1;
    const start = new Date(fyStart, 3, 1); // April 1
    const end = new Date(fyStart + 1, 2, 31); // March 31
    return { start: startOfDay(start), end: endOfDay(end), label: `FY ${fyStart}-${(fyStart + 1).toString().slice(2)}` };
  }

  if (preset === 'last-financial-year') {
    const year = current.getMonth() >= 3 ? current.getFullYear() - 1 : current.getFullYear() - 2;
    const start = new Date(year, 3, 1);
    const end = new Date(year + 1, 2, 31);
    return { start: startOfDay(start), end: endOfDay(end), label: `FY ${year}-${(year + 1).toString().slice(2)}` };
  }

  const start = new Date(current.getFullYear(), current.getMonth(), 1);
  return { start: startOfDay(start), end: endOfDay(current), label: 'Current Month' };
}

export function isDateInRange(value: string | Date, range: DateRange) {
  const date = value instanceof Date ? value : new Date(value);
  return date >= range.start && date <= range.end;
}

export function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map((row) => row.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadPdf(
  filename: string,
  title: string,
  subtitle: string,
  headers: string[],
  rows: Array<Array<string | number>>
) {
  const [{ default: jsPDF }, autoTableModule] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ]);

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(title, 14, 18);
  doc.setFontSize(10);
  doc.text(subtitle, 14, 26);

  const autoTable = autoTableModule.default;
  autoTable(doc, {
    startY: 32,
    head: [headers],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 34, 34] },
  });

  doc.save(filename);
}
