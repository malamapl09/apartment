export function formatCurrency(amount: number, locale = "en-US", currency = "USD") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatMonth(month: number, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { month: "long" }).format(
    new Date(2024, month - 1)
  );
}

export function formatMonthShort(month: number, locale = "en-US") {
  return new Intl.DateTimeFormat(locale, { month: "short" }).format(
    new Date(2024, month - 1)
  );
}
