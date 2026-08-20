// Mirror the platform statement stager's canonical filename contract. MIME is
// upload metadata; the server validates the stored bytes before admission.
export const STATEMENT_UPLOAD_EXTENSIONS = Object.freeze([
  'csv',
  'tsv',
  'tab',
  'txt',
  'cat',
  'roy',
  'crd',
  'prt',
  'p01',
  'gdf',
  '021',
  '030',
  '303',
  'xlsx',
  'xltx',
  'xlsm',
  'xls',
  'xlsb',
  'ods',
  'xml',
  'gz',
  'pdf',
  'asc',
  'dat',
  'cp9385146',
] as const);

type StatementUploadExtension = (typeof STATEMENT_UPLOAD_EXTENSIONS)[number];

const STATEMENT_UPLOAD_EXTENSION_SET = new Set<string>(STATEMENT_UPLOAD_EXTENSIONS);

const MIME_BY_EXTENSION: Partial<Record<StatementUploadExtension, string>> = {
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  tab: 'text/tab-separated-values',
  txt: 'text/plain',
  cat: 'text/plain',
  roy: 'text/plain',
  crd: 'text/plain',
  prt: 'text/plain',
  p01: 'text/plain',
  gdf: 'text/plain',
  '021': 'text/plain',
  '030': 'text/plain',
  '303': 'text/plain',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xltx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.template',
  xlsm: 'application/vnd.ms-excel.sheet.macroenabled.12',
  xls: 'application/vnd.ms-excel',
  xlsb: 'application/vnd.ms-excel.sheet.binary.macroenabled.12',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  xml: 'application/xml',
  gz: 'application/gzip',
  pdf: 'application/pdf',
  asc: 'text/plain',
};

export const STATEMENT_UPLOAD_ACCEPT: string = STATEMENT_UPLOAD_EXTENSIONS
  .map((extension) => `.${extension}`)
  .join(',');

export function getStatementUploadExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === fileName.length - 1) return '';
  return fileName.slice(lastDot + 1).trim().toLowerCase();
}

export function isStatementUploadFileNameAccepted(fileName: string): boolean {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === 0) return false;
  if (lastDot < 0 || lastDot === fileName.length - 1) return true;
  return STATEMENT_UPLOAD_EXTENSION_SET.has(getStatementUploadExtension(fileName));
}

export function resolveStatementUploadMimeType(fileName: string): string {
  const extension = getStatementUploadExtension(fileName) as StatementUploadExtension;
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}
