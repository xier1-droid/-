export function yuanToFen(value: string): number {
  const normalized = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    throw new Error("金额格式不正确");
  }
  const [yuan, fraction = ""] = normalized.split(".");
  return Number(yuan) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatFen(amountFen: number, currency = "CNY"): string {
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountFen / 100);
}

export function calculateNetIncome(incomeFen: number, expenseFen: number): number {
  return incomeFen - expenseFen;
}

export function calculateExpectedCash(
  openingCashFen: number,
  cashIncomeFen: number,
  cashExpenseFen: number,
): number {
  return openingCashFen + cashIncomeFen - cashExpenseFen;
}
