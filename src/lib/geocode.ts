export interface GeocodeResult {
  displayName: string;
  lat: number;
  lon: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
// Identificação exigida pela política de uso do Nominatim — não usa dado pessoal do usuário.
const USER_AGENT = "Ethex-Internal-CRM/1.0 (+https://ethex.local)";

export async function geocodeAddress(query: string): Promise<GeocodeResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL(NOMINATIM_URL);
  url.searchParams.set("q", trimmed);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");
  url.searchParams.set("countrycodes", "br");

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) return [];
    const data: { display_name: string; lat: string; lon: string }[] =
      await res.json();
    return data.map((item) => ({
      displayName: item.display_name,
      lat: Number(item.lat),
      lon: Number(item.lon),
    }));
  } catch {
    return [];
  }
}
