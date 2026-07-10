import { badRequestError } from "../../errors";

// Persona Moral: 3 letras/Ñ/& + 6 dígitos (AAMMDD) + 3 caracteres de homoclave alfanumérica.
const RFC_REGEX = /^[A-ZÑ&]{3}\d{6}[A-Z0-9]{3}$/;

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Asunción documentada: un RFC de 2 dígitos de año es inherentemente ambiguo
// de siglo; se asume 2000+AA para validar el día del mes (incluye bisiestos).
// solo se valida el formato.
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
