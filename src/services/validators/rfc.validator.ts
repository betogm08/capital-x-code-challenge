import { badRequestError } from "../../errors";

// Persona Moral: 3 letters/Ñ/& + 6 digits (AAMMDD) + 3 alphanumeric homoclave characters.
const RFC_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Documented assumption: a 2-digit RFC year is inherently century-ambiguous;
// 2000+YY is assumed to validate the day of month (leap years included).
// The real homoclave check digit (SAT's proprietary algorithm) is not
// implemented — only the format is validated.
function isEmbeddedDateValid(yy: string, mm: string, dd: string): boolean {
  const month = Number(mm);
  const day = Number(dd);
  const year = 2000 + Number(yy);

  if (month < 1 || month > 12) return false;

  const daysPerMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return day >= 1 && day <= daysPerMonth[month - 1];
}

export function normalizeAndValidateRfc(rawRfc: string): string {
  const rfc = rawRfc.toUpperCase().trim();

  if (!RFC_REGEX.test(rfc)) {
    throw badRequestError(
      "El RFC debe tener el formato de Persona Moral: 3 letras + 6 dígitos (AAMMDD) + 3 caracteres de homoclave.",
    );
  }

  const yy = rfc.slice(3, 5);
  const mm = rfc.slice(5, 7);
  const dd = rfc.slice(7, 9);

  if (!isEmbeddedDateValid(yy, mm, dd)) {
    throw badRequestError(
      "El RFC contiene una fecha inválida (AAMMDD) en la posición esperada.",
    );
  }

  return rfc;
}
