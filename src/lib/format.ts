export function toWei(amount: string | number): bigint {
  const value = String(amount ?? "0").trim();
  if (!/^\d+(\.\d{0,18})?$/.test(value)) {
    throw new Error("Enter a non-negative amount with no more than 18 decimals.");
  }
  const [whole, fraction = ""] = value.split(".");
  const decimals = (fraction + "0".repeat(18)).slice(0, 18);
  return BigInt(whole || "0") * BigInt(10) ** BigInt(18) + BigInt(decimals || "0");
}

export function fromWei(value: string | bigint | number, decimals = 4): string {
  const wei = BigInt(value || 0);
  const base = BigInt(10) ** BigInt(18);
  const whole = wei / base;
  const fraction = (wei % base)
    .toString()
    .padStart(18, "0")
    .slice(0, decimals)
    .replace(/0+$/, "");
  return fraction ? `${whole}.${fraction}` : whole.toString();
}

export function shortAddress(address: string): string {
  return address && address.length > 12
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : address;
}

export function isAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

export function externalUrl(value: string): string {
  return /^https?:\/\//i.test(value) ? value : "#";
}

export function mandateLabel(value: string): string {
  const number = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(number) ? `Mandate ${number}` : "Mandate";
}

export function criterionLabel(value: string): string {
  const number = Number.parseInt(value.replace(/\D/g, ""), 10);
  return Number.isFinite(number) ? `Criterion ${number}` : "Criterion";
}

export function evidenceLabel(value: string): string {
  const marker = value.match(/-E(\d+)$/i)?.[1];
  const number = Number.parseInt(marker || "", 10);
  return Number.isFinite(number) ? `Evidence ${number}` : "Evidence record";
}

export function walletLabel(address: string, role: string): string {
  return address ? `${role} wallet ending ${address.slice(-4)}` : `${role} wallet`;
}
