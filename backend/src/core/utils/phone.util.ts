export function normalizeBrazilianPhone(value: string): string {
  if (!/^\d+$/.test(value)) return value;

  let digits = value;

  if (digits.length === 10 || digits.length === 11) {
    digits = `55${digits}`;
  }

  if (digits.length === 13 && digits[4] === '9') {
    digits = digits.slice(0, 4) + digits.slice(5);
  }

  return digits;
}
