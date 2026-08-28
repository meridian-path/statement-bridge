import { extractTextFromPdf } from './pdf/extractText.js';
import { parseStatement } from './parsers/index.js';
import { transactionsToCsv } from './export/csv.js';

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const statusEl = document.getElementById('status');
const reviewSection = document.getElementById('review');
const reviewTbody = document.getElementById('review-tbody');
const skippedNote = document.getElementById('skipped-note');
const confirmCheckbox = document.getElementById('confirm-reviewed');
const exportButton = document.getElementById('export-csv');

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

function renderReview() {
  reviewTbody.innerHTML = '';

  currentTransactions.forEach((tx, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><input type="text" data-field="date" value="${escapeAttr(tx.date)}"></td>
      <td><input type="text" data-field="description" value="${escapeAttr(tx.description)}"></td>
      <td><input type="number" step="0.01" data-field="amount" value="${tx.amount}"></td>
      <td><button type="button" data-action="remove">Remove</button></td>
    `;

    row.querySelectorAll('input[data-field]').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        currentTransactions[index][field] =
          field === 'amount' ? parseFloat(input.value) || 0 : input.value;
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
  exportButton.disabled = true;
}

confirmCheckbox.addEventListener('change', () => {
  exportButton.disabled = !confirmCheckbox.checked || currentTransactions.length === 0;
});

exportButton.addEventListener('click', () => {
  const csv = transactionsToCsv(currentTransactions);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sourceFileName}.csv`;
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
