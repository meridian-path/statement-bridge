// Thin integration wrapper around pdf.js: extracts a digital (text-layer) PDF's content as
// plain text, grouping items into lines by y-position and reading order by x-position. A
// scanned/image-based PDF has no text layer and will simply extract nothing - that's a known,
// deliberate MVP limitation (see README), not a bug to fix here.
//
// This module is integration glue, not independently unit-tested - it has no branching logic
// of its own worth asserting against, and testing it would mean either shipping a real PDF
// fixture or mocking pdf.js's own internals. The parsing logic this feeds
// (src/parsers/generic.js) is the testable part and is tested there.
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const SAME_LINE_TOLERANCE_PX = 2;

export async function extractTextFromPdf(arrayBuffer) {
  const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const lines = [];

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();

    const byLineY = [];
    for (const item of content.items) {
      if (!('str' in item) || !item.str.trim()) continue;
      const y = item.transform[5];
      const x = item.transform[4];
      let bucket = byLineY.find((entry) => Math.abs(entry.y - y) <= SAME_LINE_TOLERANCE_PX);
      if (!bucket) {
        bucket = { y, pieces: [] };
        byLineY.push(bucket);
      }
      bucket.pieces.push({ x, str: item.str });
    }

    byLineY
      .sort((a, b) => b.y - a.y)
      .forEach((bucket) => {
        const line = bucket.pieces
          .sort((a, b) => a.x - b.x)
          .map((piece) => piece.str)
          .join(' ');
        lines.push(line);
      });
  }

  return lines.join('\n');
}
