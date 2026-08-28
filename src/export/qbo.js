// QBO export: QuickBooks Web Connect's own OFX 1.02 SGML format (not XML - OFX SGML leaf tags
// are valid with no closing tag, which is what every real .qbo file looks like).
//
// The one correctness stake named explicitly in this feature's own task: FITID (the
// transaction's unique id) must be STABLE across repeated exports of the same reviewed
// transaction list, or QuickBooks silently double-books every transaction on a re-import.
// stableFitid() below is a deterministic hash of a transaction's own fields plus its
// occurrence count among same-day/same-description/same-amount duplicates (keyed by content,
// not list position, so reordering the same set of transactions still produces the same set
// of FITIDs) - never random, and never derived from anything that changes between two exports
// of the same reviewed data.
import { toOfxDate, toOfxDateTime } from './dateFormat.js';

// djb2 - not cryptographic, doesn't need to be; FITID only needs to be stable and
// collision-resistant enough for one statement's worth of transactions, not secure.
function stableHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

// OFX SGML has no quoting mechanism for these characters - strip rather than escape.
function ofxSafe(value) {
  return String(value).replace(/[<>&\r\n]/g, ' ').trim();
}

export function stableFitid(tx, occurrenceIndex, referenceDate = new Date()) {
  const dtposted = toOfxDate(tx.date, referenceDate) || 'UNKNOWNDATE';
  const key = `${dtposted}|${tx.description}|${tx.amount.toFixed(2)}|${occurrenceIndex}`;
  return stableHash(key);
}

export function transactionsToQbo(
  transactions,
  { bankId = '000000000', acctId = '000000000', acctType = 'CHECKING', currency = 'USD', now = new Date() } = {}
) {
  const seenKeys = new Map();
  const dtserver = toOfxDateTime(now);

  const postedDates = transactions
    .map((tx) => toOfxDate(tx.date, now))
    .filter(Boolean)
    .sort();
  const dtstart = postedDates[0] || toOfxDate('01/01', now);
  const dtend = postedDates[postedDates.length - 1] || dtstart;

  const stmttrnBlocks = transactions.map((tx) => {
    const dtposted = toOfxDate(tx.date, now) || dtstart;
    const dedupeKey = `${dtposted}|${tx.description}|${tx.amount.toFixed(2)}`;
    const occurrenceIndex = seenKeys.get(dedupeKey) || 0;
    seenKeys.set(dedupeKey, occurrenceIndex + 1);

    const fitid = stableFitid(tx, occurrenceIndex, now);
    const trntype = tx.amount < 0 ? 'DEBIT' : 'CREDIT';

    return [
      '<STMTTRN>',
      `<TRNTYPE>${trntype}`,
      `<DTPOSTED>${dtposted}`,
      `<TRNAMT>${tx.amount.toFixed(2)}`,
      `<FITID>${fitid}`,
      `<NAME>${ofxSafe(tx.description)}`,
      '</STMTTRN>',
    ].join('\n');
  });

  return `OFXHEADER:100
DATA:OFXSGML
VERSION:102
SECURITY:NONE
ENCODING:USASCII
CHARSET:1252
COMPRESSION:NONE
OLDFILEUID:NONE
NEWFILEUID:NONE

<OFX>
<SIGNONMSGSRSV1>
<SONRS>
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<DTSERVER>${dtserver}
<LANGUAGE>ENG
</SONRS>
</SIGNONMSGSRSV1>
<BANKMSGSRSV1>
<STMTTRNRS>
<TRNUID>1
<STATUS>
<CODE>0
<SEVERITY>INFO
</STATUS>
<STMTRS>
<CURDEF>${currency}
<BANKACCTFROM>
<BANKID>${bankId}
<ACCTID>${acctId}
<ACCTTYPE>${acctType}
</BANKACCTFROM>
<BANKTRANLIST>
<DTSTART>${dtstart}
<DTEND>${dtend}
${stmttrnBlocks.join('\n')}
</BANKTRANLIST>
<LEDGERBAL>
<BALAMT>0.00
<DTASOF>${dtserver}
</LEDGERBAL>
</STMTRS>
</STMTTRNRS>
</BANKMSGSRSV1>
</OFX>
`;
}
