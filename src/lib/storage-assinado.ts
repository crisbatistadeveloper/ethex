import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

export const URL_ASSINADA_SEGUNDOS = 600;

/** URLs temporárias (sujeitas às policies do Storage do usuário logado), por caminho. */
export async function gerarUrlsAssinadas(
  supabase: Supabase,
  bucket: string,
  paths: (string | null | undefined)[],
  segundos = URL_ASSINADA_SEGUNDOS
): Promise<Map<string, string>> {
  const unicos = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const { data } = await supabase.storage.from(bucket).createSignedUrls(unicos, segundos);
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) mapa.set(s.path, s.signedUrl);
  }
  return mapa;
}
