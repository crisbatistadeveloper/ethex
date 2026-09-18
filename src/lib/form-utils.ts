export function strField(formData: FormData, name: string): string | null {
  const value = formData.get(name);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function numField(formData: FormData, name: string): number | null {
  const value = formData.get(name);
  if (typeof value !== "string" || value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function boolField(formData: FormData, name: string): boolean {
  return formData.get(name) === "on";
}
