"use client";

import { useState } from "react";

export function CopyLinkButton({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    await navigator.clipboard.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm hover:bg-[#faf8f5]"
    >
      {copiado ? "Copiado ✓" : "Copiar link"}
    </button>
  );
}
