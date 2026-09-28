"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { anexarArquivoItem } from "@/app/(app)/due-diligence/actions";
import { DD_FINAL_BUCKET } from "@/lib/due-diligence-final";

export function DocumentoOperacaoUploader({
  clienteId,
  dueDiligenceId,
  itemId,
  temArquivo,
}: {
  clienteId: string;
  dueDiligenceId: string;
  itemId: string;
  temArquivo: boolean;
}) {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setEnviando(true);
    setErro(null);

    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${clienteId}/${dueDiligenceId}/${itemId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage.from(DD_FINAL_BUCKET).upload(path, file);
    if (error) {
      setErro(error.message);
      setEnviando(false);
      e.target.value = "";
      return;
    }

    const res = await anexarArquivoItem(itemId, dueDiligenceId, path, file.name);
    setEnviando(false);
    e.target.value = "";
    if (!res.ok) {
      setErro(res.error ?? "Erro ao anexar");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-[#e4e0d9] px-2 py-1 text-xs hover:bg-[#faf8f5]">
        {enviando ? "Enviando…" : temArquivo ? "Substituir arquivo" : "Anexar arquivo"}
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
          onChange={handleFile}
          disabled={enviando}
          className="hidden"
        />
      </label>
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
