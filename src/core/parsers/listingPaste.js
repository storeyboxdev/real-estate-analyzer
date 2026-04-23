// Parses text copied from a residential listing page (Zillow, Redfin, Trulia,
// an MLS sheet, a plain-text email blast) into a structured draft. The parser
// is intentionally loose: it looks for common English patterns, returns every
// successful extraction, and records field names it couldn't find as warnings
// so the UI can prompt for them.
//
// Returns { property, scenario, notes, warnings }.
// - property: { address, propertyType, units }
// - scenario: partial inputs the user can finish filling in
// - notes: a human-readable summary string (beds/baths/sqft) for Property.notes
// - warnings: array of field names that couldn't be parsed

export function parseListingPaste(text) {
  if (typeof text !== 'string') text = String(text ?? '');

  const warnings = [];
  const note = (field, value) => {
    if (value === null || value === undefined) warnings.push(field);
    return value;
  };

  const address = note('address', extractAddress(text));
  const price = note('price', extractPrice(text));

  const propertyType = extractPropertyType(text);
  const typeHint = extractUnitsFromType(text);
  const explicitUnits = extractUnitCount(text);
  const units = explicitUnits ?? typeHint ?? (propertyType === 'multifamily' ? 2 : 1);

  const { beds, baths, sqft } = extractBedsBathsSqft(text);
  const rentMonthly = extractRentEstimate(text);
  if (rentMonthly === null) warnings.push('rent');
  const taxesAnnual = extractTaxesAnnual(text);
  const hoaMonthly = extractHoaMonthly(text);

  const notesSummary = buildNotesSummary({ beds, baths, sqft });

  const scenario = {};
  if (price !== null) scenario.purchasePrice = price;
  // If we have a monthly rent and only one unit, use it directly.
  // If we have multiple units but only one rent figure (typical Zillow), populate
  // the first slot and leave the rest empty for the user to fill in.
  if (rentMonthly !== null) {
    scenario.unitRents = Array(units).fill(0);
    scenario.unitRents[0] = rentMonthly;
  }
  if (taxesAnnual !== null) scenario.taxesAnnual = taxesAnnual;
  if (hoaMonthly !== null) scenario.hoaAnnual = hoaMonthly * 12;

  return {
    property: {
      address: address ?? '',
      propertyType,
      units,
    },
    scenario,
    notes: notesSummary,
    warnings,
  };
}

// ---- extractors ----

function extractAddress(text) {
  // "123 Main St, City, ST 12345" (with optional unit/apt phrases).
  // `(?<![\d$])` stops the match from eating trailing digits of a preceding
  // price. `[^\S\n]+` is "whitespace but not a newline" so the street number
  // and street name stay on the same line.
  const re = /(?<![\d$])(\d+[^\S\n]+[^,\n]{2,60}?,\s*[A-Za-z .'\-]{2,40},\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)/;
  const m = text.match(re);
  return m ? tidySpaces(m[1]) : null;
}

// Looks for a standalone dollar amount that fits a plausible list-price range.
// Returns the largest match in range (handles pages where other big numbers
// appear, e.g. "Home value $280,000" vs "For sale $275,000"). Falls back to
// the largest overall dollar amount if nothing else fits.
function extractPrice(text) {
  const re = /\$\s*([\d,]{3,12})(?!\s*\/)/g; // "/" excludes $/mo, $/sqft
  const candidates = [];
  let m;
  while ((m = re.exec(text)) !== null) {
    const n = toNumber(m[1]);
    if (Number.isFinite(n)) candidates.push(n);
  }
  if (candidates.length === 0) return null;
  const priced = candidates.filter((n) => n >= 20_000 && n <= 50_000_000);
  const pool = priced.length ? priced : candidates;
  return Math.max(...pool);
}

function extractPropertyType(text) {
  if (/\b(multi[- ]?family|duplex|triplex|fourplex|quad[\s\-]*plex|4[\s\-]*plex|apartment(s)?\b)/i.test(text)) {
    return 'multifamily';
  }
  return 'sfr';
}

// Maps words like "duplex" / "triplex" to a unit count.
function extractUnitsFromType(text) {
  if (/\bduplex\b/i.test(text)) return 2;
  if (/\btriplex\b/i.test(text)) return 3;
  if (/\b(fourplex|quad[\s\-]*plex|4[\s\-]*plex)\b/i.test(text)) return 4;
  return null;
}

// Explicit "X units" phrasing wins when present.
function extractUnitCount(text) {
  const re = /\b(\d{1,3})\s*units?\b/i;
  const m = text.match(re);
  if (!m) return null;
  const n = Number(m[1]);
  return n >= 1 && n <= 200 ? n : null;
}

function extractBedsBathsSqft(text) {
  const beds = firstNumber(text, /(\d+(?:\.\d+)?)\s*(?:bd|beds?|bedrooms?)\b/i);
  const baths = firstNumber(text, /(\d+(?:\.\d+)?)\s*(?:ba|baths?|bathrooms?)\b/i);
  const sqftMatch = text.match(/([\d,]{3,8})\s*(?:sqft|sq\s*ft|square\s*feet)\b/i);
  const sqft = sqftMatch ? toNumber(sqftMatch[1]) : null;
  return { beds, baths, sqft };
}

// "Rent Zestimate: $2,400" or "Estimated rent $2,400/mo" or "$2,400/mo rent"
function extractRentEstimate(text) {
  const patterns = [
    /rent\s*zestimate[^\$\n]{0,30}\$\s*([\d,]+)/i,
    /(?:estimated|projected)\s*rent[^\$\n]{0,30}\$\s*([\d,]+)/i,
    /\$\s*([\d,]+)\s*\/\s*(?:mo|month)\b[^\n]{0,40}\brent/i,
    /\brent[^\$\n]{0,30}\$\s*([\d,]+)\s*\/\s*(?:mo|month)\b/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const n = toNumber(m[1]);
      if (Number.isFinite(n) && n >= 200 && n <= 100_000) return n;
    }
  }
  return null;
}

// "Annual taxes $X,XXX" or "Property taxes $X,XXX/yr". Zillow's property card
// shows "Annual tax amount"; the mortgage card shows a monthly figure labeled
// "Property taxes" — prefer explicit annual phrasing first.
function extractTaxesAnnual(text) {
  const annual = text.match(/(?:annual\s*tax(?:es)?|property\s*tax(?:es)?[^\$\n]{0,20}\/\s*(?:yr|year))[^\$\n]{0,30}\$\s*([\d,]+)/i);
  if (annual) {
    const n = toNumber(annual[1]);
    if (Number.isFinite(n) && n >= 100 && n <= 1_000_000) return n;
  }
  // Fallback: a "Property taxes" or just "Taxes" figure that's a monthly — multiply by 12.
  const monthly = text.match(/\b(?:property\s*)?tax(?:es)?[^\$\n]{0,30}\$\s*([\d,]+)\s*\/\s*(?:mo|month)\b/i);
  if (monthly) {
    const n = toNumber(monthly[1]);
    if (Number.isFinite(n) && n >= 10 && n <= 100_000) return n * 12;
  }
  return null;
}

function extractHoaMonthly(text) {
  const m = text.match(/\bhoa[^\$\n]{0,30}\$\s*([\d,]+)(?:\s*\/\s*(?:mo|month))?/i);
  if (!m) return null;
  const n = toNumber(m[1]);
  if (!Number.isFinite(n)) return null;
  // Most listings show monthly HOA. Clamp to a plausible range.
  if (n >= 10 && n <= 5000) return n;
  return null;
}

function buildNotesSummary({ beds, baths, sqft }) {
  const parts = [];
  if (beds !== null) parts.push(`${stripTrailingZero(beds)} bd`);
  if (baths !== null) parts.push(`${stripTrailingZero(baths)} ba`);
  if (sqft !== null) parts.push(`${sqft.toLocaleString()} sqft`);
  return parts.length ? parts.join(' / ') : '';
}

// ---- helpers ----
function toNumber(s) {
  if (typeof s !== 'string') return NaN;
  return Number(s.replace(/[,\s]/g, ''));
}
function firstNumber(text, re) {
  const m = text.match(re);
  return m ? Number(m[1]) : null;
}
function tidySpaces(s) {
  return s.replace(/\s+/g, ' ').trim();
}
function stripTrailingZero(n) {
  return Number.isInteger(n) ? String(n) : String(n).replace(/\.0+$/, '');
}
