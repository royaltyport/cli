import { brand, brandBold, dim, error, accent } from './theme.js';

export function printStatusLine(entries: [string, string | number | undefined | null][]): void {
  const line = entries
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([label, value]) => `${label}: ${value}`)
    .join('  |  ');
  console.log(line);
}

export function printTable(columns: string[], rows: (string | number)[][]): void {
  const widths = columns.map((col, i) => {
    const maxData = rows.reduce((max, row) => Math.max(max, String(row[i] ?? '').length), 0);
    return Math.max(col.length, maxData);
  });

  const header = columns.map((col, i) => col.padEnd(widths[i]!)).join('  ');
  const separator = widths.map(w => '─'.repeat(w)).join('──');

  console.log(brandBold(header));
  console.log(dim(separator));

  for (const row of rows) {
    const line = row.map((cell, i) => String(cell ?? '').padEnd(widths[i]!)).join('  ');
    console.log(line);
  }
}

export function printError(message: string): void {
  console.error(error(`Error: ${message}`));
}

export function printSuccess(message: string): void {
  console.log(brand(message));
}

export function printInfo(message: string): void {
  console.log(accent(message));
}
