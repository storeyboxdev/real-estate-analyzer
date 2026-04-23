import { describe, it, expect } from 'vitest';
import { parseListingPaste } from '../../src/core/parsers/listingPaste.js';

// Synthetic fixtures that mimic natural English patterns in real-estate
// listings. Not reproducing any copyrighted content — these are constructed
// to exercise the parser's regexes.

describe('parseListingPaste — happy-path SFR', () => {
  const text = `
    For sale  $325,000
    1234 Maple Ave, Austin, TX 78702
    3 bd · 2 ba · 1,540 sqft
    Single family residence
    Rent Zestimate: $2,400/mo
    Annual tax amount: $4,200
    HOA: $0/mo
  `;
  const result = parseListingPaste(text);

  it('extracts the full address', () => {
    expect(result.property.address).toBe('1234 Maple Ave, Austin, TX 78702');
  });

  it('classifies as single-family with one unit', () => {
    expect(result.property.propertyType).toBe('sfr');
    expect(result.property.units).toBe(1);
  });

  it('extracts price, rent, and taxes into the scenario draft', () => {
    expect(result.scenario.purchasePrice).toBe(325000);
    expect(result.scenario.unitRents).toEqual([2400]);
    expect(result.scenario.taxesAnnual).toBe(4200);
  });

  it('builds a notes summary for beds/baths/sqft', () => {
    expect(result.notes).toBe('3 bd / 2 ba / 1,540 sqft');
  });

  it('has no warnings when everything parses', () => {
    expect(result.warnings).toEqual([]);
  });
});

describe('parseListingPaste — multi-family', () => {
  it('recognizes a duplex as multi-family with 2 units', () => {
    const text = `
      Listed at $485,000
      55 Oak St, Denver, CO 80202
      Duplex · 4 bd · 3 ba
      Rent Zestimate: $3,500/mo
    `;
    const result = parseListingPaste(text);
    expect(result.property.propertyType).toBe('multifamily');
    expect(result.property.units).toBe(2);
    // First unit gets the rent figure; second is left 0 for the user to fill.
    expect(result.scenario.unitRents).toEqual([3500, 0]);
  });

  it('uses explicit "X units" when present', () => {
    const text = `
      4-plex, $650,000
      100 N Pine St, Dallas, TX 75201
      6 units, fully rented
    `;
    const result = parseListingPaste(text);
    expect(result.property.propertyType).toBe('multifamily');
    expect(result.property.units).toBe(6);
    expect(result.scenario.unitRents).toBeUndefined(); // no rent figure
  });
});

describe('parseListingPaste — edge cases', () => {
  it('records warnings for missing fields', () => {
    const result = parseListingPaste('a nonsense blob of text');
    expect(result.warnings).toContain('address');
    expect(result.warnings).toContain('price');
    expect(result.warnings).toContain('rent');
  });

  it('picks the largest plausible price when multiple dollar amounts appear', () => {
    const text = `
      9 Brookside Ln, Seattle, WA 98103
      For sale $899,000
      Monthly payment $5,420/mo · HOA $250/mo · Taxes $625/mo
      Rent estimate: $3,200/mo
    `;
    const result = parseListingPaste(text);
    expect(result.scenario.purchasePrice).toBe(899000);
    // Monthly taxes $625 -> annual $7,500 (12x)
    expect(result.scenario.taxesAnnual).toBe(625 * 12);
    expect(result.scenario.hoaAnnual).toBe(250 * 12);
  });

  it('ignores $/mo and $/sqft amounts when picking price', () => {
    const text = `
      501 Elm St, Boise, ID 83702
      $475,000
      $285/sqft · $2,100/mo rent
    `;
    const result = parseListingPaste(text);
    expect(result.scenario.purchasePrice).toBe(475000);
  });

  it('returns sensible defaults for empty input', () => {
    const result = parseListingPaste('');
    expect(result.property.address).toBe('');
    expect(result.property.propertyType).toBe('sfr');
    expect(result.property.units).toBe(1);
    expect(result.scenario).toEqual({});
  });

  it('tolerates non-string input', () => {
    expect(() => parseListingPaste(null)).not.toThrow();
    expect(() => parseListingPaste(undefined)).not.toThrow();
    expect(() => parseListingPaste(12345)).not.toThrow();
  });
});
