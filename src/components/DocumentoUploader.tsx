"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { attachDocumentoArquivo } from "@/app/(app)/clientes/[id]/imoveis/due-diligence-actions";
import { DOCUMENTOS_IMOVEIS_BUCKET } from "@/lib/due-diligence";

export function DocumentoUploader({
  documentoId,
  curadoriaId,
  clienteId,
  imovelId,
  currentUrl,
}: {
  documentoId: string;
  curadoriaId: string;
  clienteId: string;
  imovelId: string;
  currentUrl: string | null;
}) {
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setErro(null);

    const supabase = createClient();
    const safeName = file.name.replace(/[^\w.\-]+/g, "_");
    const path = `${imovelId}/${documentoId}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from(DOCUMENTOS_IMOVEIS_BUCKET)
      .upload(path, file);

    if (error) {
      setErro(error.message);
      setUploading(false);
      e.target.value = "";
      return;
    }

    const res = await attachDocumentoArquivo(documentoId, curadoriaId, clienteId, path);

    setUploading(false);
    e.target.value = "";
    if (!res.ok) {
      setErro(res.error ?? "Erro ao anexar arquivo");
      return;
    }
    window.location.reload();
  }

  return (
    <div className="mt-1">
      {currentUrl && (
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mb-1 block text-xs text-[#5b6472] hover:underline"
        >
          Ver arquivo atual ↗
        </a>
      )}
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
        onChange={handleFile}
        disabled={uploading}
        className="text-xs"
      />
      {uploading && (
        <p className="mt-1 text-xs text-[#5b6472]">Enviando…</p>
      )}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}
    </div>
  );
}
