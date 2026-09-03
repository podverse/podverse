import { describe, expect, it } from 'vitest';

import { articleStrippedTitle, matchesTitleFilter, normalizeTitle } from './titleFilter.js';

describe('normalizeTitle', () => {
  it('lowercases and trims', () => {
    expect(normalizeTitle('  The Daily  ')).toBe('the daily');
  });
});

describe('articleStrippedTitle', () => {
  it('removes a leading article', () => {
    expect(articleStrippedTitle('The Daily')).toBe('daily');
    expect(articleStrippedTitle('A History of Rome')).toBe('history of rome');
    expect(articleStrippedTitle('An Hour With')).toBe('hour with');
  });

  it('leaves a word that merely starts with an article alone', () => {
    expect(articleStrippedTitle('Theatre Talk')).toBe('theatre talk');
    expect(articleStrippedTitle('Android Weekly')).toBe('android weekly');
  });
});

describe('matchesTitleFilter', () => {
  it('matches everything when the term is empty or only whitespace', () => {
    expect(matchesTitleFilter('The Adam Friedland Show', '')).toBe(true);
    expect(matchesTitleFilter('The Adam Friedland Show', '   ')).toBe(true);
  });

  it('matches a substring anywhere in the title, ignoring case', () => {
    expect(matchesTitleFilter('The Adam Friedland Show', 'adam')).toBe(true);
    expect(matchesTitleFilter('The Adam Friedland Show', 'FRIEDLAND')).toBe(true);
    expect(matchesTitleFilter('The Adam Friedland Show', 'and sh')).toBe(true);
    expect(matchesTitleFilter('The Adam Friedland Show', 'zebra')).toBe(false);
  });

  it('matches the title with a leading article stripped', () => {
    expect(matchesTitleFilter('The Daily', 'daily')).toBe(true);
    expect(matchesTitleFilter('A History of Rome', 'history')).toBe(true);
    expect(matchesTitleFilter('An Hour With', 'hour')).toBe(true);
  });

  it('still matches when the user types the article the title carries', () => {
    expect(matchesTitleFilter('The Daily', 'the daily')).toBe(true);
  });

  it('does not treat an article inside a word as a leading article', () => {
    expect(matchesTitleFilter('Theatre Talk', 'theatre')).toBe(true);
    expect(matchesTitleFilter('Android Weekly', 'android')).toBe(true);
  });

  it('ignores surrounding whitespace in the term', () => {
    expect(matchesTitleFilter('Banana Time', '  banana  ')).toBe(true);
  });

  it('keeps spacing and punctuation, so a term the user is mid-way through still matches', () => {
    expect(matchesTitleFilter('Hard Fork', 'hard f')).toBe(true);
    expect(matchesTitleFilter('99% Invisible', '99%')).toBe(true);
  });
});
