import * as cheerio from "cheerio";

export interface LinkMetadata {
  titulo: string | null;
  imagem: string | null;
  descricao: string | null;
  preco: number | null;
}

const FETCH_TIMEOUT_MS = 8000;
const MAX_BODY_BYTES = 3_000_000;

function parsePrecoFromJsonLd($: cheerio.CheerioAPI): number | null {
  const scripts = $('script[type="application/ld+json"]');
  for (const el of scripts.toArray()) {
    const raw = $(el).contents().text();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const candidatos = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of candidatos) {
        const preco = extractPrecoFromNode(item);
        if (preco !== null) return preco;
      }
    } catch {
      // JSON-LD malformado ou não relacionado — ignora.
    }
  }
  return null;
}

function extractPrecoFromNode(node: unknown): number | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  const direct = obj.price ?? obj.priceRange;
  if (typeof direct === "number") return direct;
  if (typeof direct === "string") {
    const parsed = Number(direct.replace(/[^\d.,]/g, "").replace(",", "."));
    if (!Number.isNaN(parsed)) return parsed;
  }

  if (obj.offers) {
    const offers = Array.isArray(obj.offers) ? obj.offers[0] : obj.offers;
    const fromOffers = extractPrecoFromNode(offers);
    if (fromOffers !== null) return fromOffers;
  }

  return null;
}

export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; EthexCRM/1.0)",
        Accept: "text/html",
      },
    });

    if (!res.ok || !res.headers.get("content-type")?.includes("text/html")) {
      return { titulo: null, imagem: null, descricao: null, preco: null };
    }

    const reader = res.body?.getReader();
    let html = "";
    let bytes = 0;
    if (reader) {
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.length;
        html += decoder.decode(value, { stream: true });
        if (bytes > MAX_BODY_BYTES) {
          controller.abort();
          break;
        }
      }
    } else {
      html = await res.text();
    }

    const $ = cheerio.load(html);
    const metaContent = (prop: string) =>
      $(`meta[property="${prop}"]`).attr("content") ??
      $(`meta[name="${prop}"]`).attr("content") ??
      null;

    const titulo = metaContent("og:title") || $("title").first().text() || null;
    const imagem = metaContent("og:image");
    const descricao = metaContent("og:description") || metaContent("description");
    const preco = parsePrecoFromJsonLd($);

    return {
      titulo: titulo?.trim() || null,
      imagem: imagem?.trim() || null,
      descricao: descricao?.trim() || null,
      preco,
    };
  } catch {
    return { titulo: null, imagem: null, descricao: null, preco: null };
  } finally {
    clearTimeout(timeout);
  }
}
