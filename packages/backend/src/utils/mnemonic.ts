/**
 * Generates a mnemonic identifier for a customer.
 * Format: Up to 6 uppercase letters from the surname + 3-digit sequence (e.g. "SILVA001").
 * The caller is responsible for ensuring uniqueness by checking the DB and incrementing.
 */
export function generateMnemonic(fullName: string, sequence: number): string {
  const parts = fullName.trim().toUpperCase().split(/\s+/);
  // Use the last word as the surname base
  const surname = (parts[parts.length - 1] ?? 'CUST').replace(/[^A-Z]/g, '');
  const base = surname.substring(0, 6).padEnd(3, 'X');
  const seq = String(sequence).padStart(3, '0');
  return `${base}${seq}`;
}
