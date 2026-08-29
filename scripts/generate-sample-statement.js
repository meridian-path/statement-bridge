// One-off generator for public/sample-statement.pdf, the fixture behind the "Try a sample"
// button (src/main.js). Hand-rolls a minimal single-page PDF (base-14 Helvetica, one Tj text
// run per line so pdf.js's own y-position line grouping in src/pdf/extractText.js reconstructs
// exactly one row per line) rather than pulling in a PDF-authoring dependency for one static
// fixture. Re-run with `node scripts/generate-sample-statement.js` if the sample content below
// ever needs to change - it overwrites public/sample-statement.pdf.
//
// All names, dates, and amounts below are fabricated for this fixture only - not a real
// person's or bank's real data, and deliberately not shaped like any of this repo's own
// per-bank parsers' signatures, so the sample exercises the generic fallback parser exactly
// the way a real never-seen-before bank's statement would.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const LINES = [
  'Sample Bank',
  'Demo Checking Account - Statement Period 07/01/2026 to 07/31/2026',
  'This is a sample statement for trying Statement Bridge. Every name, date, and amount below',
  'is fictional, made up for this demo only.',
  '',
  'Date        Description                             Amount',
  '07/02/2026  Direct Deposit - Employer Payroll        1850.00',
  '07/05/2026  Grocery Store Purchase                   -84.32',
  '07/09/2026  Electric Utility Payment                 -110.45',
  '07/14/2026  Coffee Shop Purchase                      -6.75',
  '07/18/2026  Online Transfer to Savings                -300.00',
  '07/22/2026  Refund - Returned Item                     42.10',
  '07/28/2026  ATM Withdrawal                            -100.00',
  '',
  'End of sample statement.',
];

function escapePdfString(text) {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function buildContentStream() {
  const parts = ['BT', '/F1 10 Tf', '50 740 Td', '14 TL'];
  LINES.forEach((line, index) => {
    if (index > 0) parts.push('T*');
    parts.push(`(${escapePdfString(line)}) Tj`);
  });
  parts.push('ET');
  return parts.join('\n');
}

function buildPdf() {
  const contentStream = buildContentStream();
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 612 792] /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${Buffer.byteLength(contentStream, 'latin1')} >>\nstream\n${contentStream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, 'latin1'));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, 'latin1');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

const outPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'sample-statement.pdf');
writeFileSync(outPath, buildPdf());
console.log(`Wrote ${outPath}`);
