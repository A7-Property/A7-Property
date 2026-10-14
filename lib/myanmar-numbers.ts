const myanmarDigits = ["၀", "၁", "၂", "၃", "၄", "၅", "၆", "၇", "၈", "၉"];

export function toMyanmarNumber(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => myanmarDigits[Number(d)]);
}

export function formatMyanmarAmount(value: number): string {
  return toMyanmarNumber(Number.isInteger(value) ? value.toString() : value.toFixed(1));
}