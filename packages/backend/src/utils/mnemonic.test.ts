import { describe, it, expect } from 'vitest';
import { generateMnemonic } from './mnemonic.js';

describe('generateMnemonic', () => {
  it('generates correct mnemonic from full name and sequence', () => {
    expect(generateMnemonic('João da Silva', 1)).toBe('SILVA001');
    expect(generateMnemonic('Maria Costa', 5)).toBe('COSTA005');
  });

  it('pads sequence with zeros', () => {
    expect(generateMnemonic('Smith', 42)).toBe('SMITH042');
  });

  it('truncates surname to 6 characters', () => {
    expect(generateMnemonic('Abcdefghij', 1)).toBe('ABCDEF001');
  });

  it('handles single-word names', () => {
    const result = generateMnemonic('Madonna', 1);
    expect(result).toBe('MADONN001');
  });

  it('strips non-alpha characters from surname', () => {
    const result = generateMnemonic("O'Brien", 1);
    expect(result).toMatch(/^[A-Z0-9]+\d{3}$/);
  });

  it('pads short surname with X', () => {
    const result = generateMnemonic('Li', 1);
    expect(result).toBe('LIX001');
  });
});
