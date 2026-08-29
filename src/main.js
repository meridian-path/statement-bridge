import { extractTextFromPdf } from './pdf/extractText.js';
import { parseStatement } from './parsers/index.js';
import { transactionsToCsv } from './export/csv.js';
import { transactionsToXeroCsv } from './export/xeroCsv.js';
import { transactionsToQbo } from './export/qbo.js';
import { validateAmount } from './reviewValidation.js';

// `bom: true` on a format prepends a UTF-8 byte-order-mark (the 3 bytes EF BB BF, written here
// as the single character U+FEFF) to the exported file. Excel's own CSV-opening behavior - the
// common case is a user double-clicking the downloaded file - does not reliably detect UTF-8
// without one: it commonly falls back to a locale-default codepage (e.g. Windows-1252 on US
// English Windows) instead, garbling any non-ASCII character in a transaction description (an
// accented merchant name, a currency symbol, etc.) that a real bank statement can genuinely
// contain. Deliberately NOT set on qbo: that format's own OFX/SGML header explicitly declares
// `CHARSET:1252` (see qbo.js) - prepending a UTF-8 BOM there would contradict that declared
// encoding and risk breaking QuickBooks' own parsing, a separate concern from Excel's CSV-only
// BOM-detection behavior.
const EXPORT_FORMATS = {
  csv: {
    extension: 'csv',
    mimeType: 'text/csv;charset=utf-8;',
    build: (transactions) => transactionsToCsv(transactions),
    bom: true,
  },
  xero: {
    extension: 'csv',
    mimeType: 'text/csv;charset=utf-8;',
    build: (transactions) => transactionsToXeroCsv(transactions),
    bom: true,
  },
  qbo: {
    extension: 'qbo',
    mimeType: 'application/vnd.intu.qbo',
    build: (transactions) => transactionsToQbo(transactions),
  },
};

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const trySampleButton = document.getElementById('try-sample-btn');
const statusEl = document.getElementById('status');
const reviewSection = document.getElementById('review');
const reviewTbody = document.getElementById('review-tbody');
const skippedNote = document.getElementById('skipped-note');
const amountWarning = document.getElementById('amount-warning');
const confirmCheckbox = document.getElementById('confirm-reviewed');
const exportFormatSelect = document.getElementById('export-format');
const exportButton = document.getElementById('export-btn');

let currentTransactions = [];
let currentSkipped = [];
let sourceFileName = 'statement';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle('status-error', isError);
}

function escapeAttr(value) {
  return String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}

function updateExportButtonState() {
  const anyInvalidAmount = [...reviewTbody.querySelectorAll('input[data-field="amount"]')].some(
    (input) => !validateAmount(input.value)
  );
  amountWarning.hidden = !anyInvalidAmount;
  exportButton.disabled = !confirmCheckbox.checked || currentTransactions.length === 0 || anyInvalidAmount;
}

function renderReview() {
  reviewTbody.innerHTML = '';

  currentTransactions.forEach((tx, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" data-field="date" value="${escapeAttr(tx.date)}"></td>
      <td><input type="text" data-field="description" value="${escapeAttr(tx.description)}"></td>
      <td>
        <input type="number" step="0.01" data-field="amount" value="${tx.amount}">
        <span class="field-error" hidden>Enter a number</span>
      </td>
      <td><button type="button" data-action="remove">Remove</button></td>
    `;

    row.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        if (field === 'amount') {
          // A full-string check, not just "does it parse": partial garbage like "12abc" would
          // otherwise silently truncate to 12 via parseFloat rather than being flagged.
          const valid = validateAmount(input.value);
          input.classList.toggle('amount-invalid', !valid);
          const errorSpan = input.nextElementSibling;
          if (errorSpan) errorSpan.hidden = valid;
          // Only write a real, parsed value into the transaction - never a guessed 0. An
          // invalid/empty field leaves the transaction's last known valid amount untouched
          // internally; updateExportButtonState() below is what actually blocks export while
          // this is true, not a silently-corrupted amount.
          if (valid) {
            currentTransactions[index].amount = parseFloat(input.value);
          }
        } else {
          currentTransactions[index][field] = input.value;
        }
        // Any edit after the reviewer has confirmed invalidates that confirmation - it attested
        // to rows as they stood at that moment, not to whatever they get edited into next.
        if (confirmCheckbox.checked) {
          confirmCheckbox.checked = false;
        }
        updateExportButtonState();
      });
    });

    row.querySelector('[data-action="remove"]').addEventListener('click', () => {
      currentTransactions.splice(index, 1);
      renderReview();
    });

    reviewTbody.appendChild(row);
  });

  if (currentSkipped.length > 0) {
    skippedNote.hidden = false;
    const preview = currentSkipped.slice(0, 5).join(' | ');
    const more = currentSkipped.length > 5 ? ' ...' : '';
    skippedNote.textContent = `${currentSkipped.length} line(s) had a date but no amount this parser recognized - check your original statement for anything missing: ${preview}${more}`;
  } else {
    skippedNote.hidden = true;
  }

  reviewSection.hidden = currentTransactions.length === 0;
  confirmCheckbox.checked = false;
  updateExportButtonState();
}

confirmCheckbox.addEventListener('change', updateExportButtonState);

exportButton.addEventListener('click', () => {
  const format = EXPORT_FORMATS[exportFormatSelect.value] || EXPORT_FORMATS.csv;
  const content = format.build(currentTransactions);
  const blob = new Blob([format.bom ? '\uFEFF' + content : content], { type: format.mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sourceFileName}.${format.extension}`;
  link.click();
  URL.revokeObjectURL(url);
});

async function handleFile(file) {
  if (!file) return;

  const looksLikePdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
  if (!looksLikePdf) {
    setStatus('That file does not look like a PDF. Choose a bank statement PDF.', true);
    return;
  }

  sourceFileName = file.name.replace(/\.pdf$/i, '') || 'statement';
  setStatus('Reading PDF...');
  reviewSection.hidden = true;

  try {
    const buffer = await file.arrayBuffer();
    const text = await extractTextFromPdf(buffer);
    const { transactions, skipped, matchedBank } = parseStatement(text);

    currentTransactions = transactions;
    currentSkipped = skipped;

    if (transactions.length === 0) {
      setStatus(
        "Couldn't find any transaction-shaped lines in this PDF. This early version only " +
          "understands a generic date / description / amount layout, and can't read a " +
          'scanned/image-only PDF - it may not recognize your bank\'s format yet.',
        true
      );
      return;
    }

    const bankNote = matchedBank ? ` using the ${matchedBank} layout` : '';
    setStatus(
      `Found ${transactions.length} transaction(s)${bankNote}. Review them below before exporting.`
    );
    renderReview();
  } catch (err) {
    console.error(err);
    setStatus(
      'Could not read that PDF. It may be a scanned image (not supported yet) or a corrupted file.',
      true
    );
  }
}

fileInput.addEventListener('change', (event) => handleFile(event.target.files[0]));

trySampleButton.addEventListener('click', async () => {
  trySampleButton.disabled = true;
  setStatus('Loading sample statement...');
  try {
    const response = await fetch('/sample-statement.pdf');
    if (!response.ok) throw new Error(`sample fetch failed: ${response.status}`);
    const blob = await response.blob();
    const sampleFile = new File([blob], 'sample-statement.pdf', { type: 'application/pdf' });
    await handleFile(sampleFile);
  } catch (err) {
    console.error(err);
    setStatus('Could not load the sample statement. Try choosing your own file instead.', true);
  } finally {
    trySampleButton.disabled = false;
  }
});

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('dropzone-active');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('dropzone-active');
  });
});

dropzone.addEventListener('drop', (event) => {
  handleFile(event.dataTransfer.files[0]);
});
