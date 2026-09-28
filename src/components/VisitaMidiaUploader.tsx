"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addVisitaMidia,
  removeVisitaMidia,
  updateVisitaMidiaOrdem,
} from "@/app/(app)/clientes/[id]/imoveis/visita-actions";
import type { VisitaPreviaMidiaRow } from "@/lib/database.types";

function isVideo(url: string, tipo: string): boolean {
  return tipo === "video" || /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function VisitaMidiaUploader({
  visitaId,
  curadoriaId,
  clienteId,
  initialMidias,
}: {
  visitaId: string;
  curadoriaId: string;
  clienteId: string;
  initialMidias: VisitaPreviaMidiaRow[];
}) {
  const [midias, setMidias] = useState(initialMidias);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setErro(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const isVid = file.type.startsWith("video/");
      const safeName = file.name.replace(/[^\w.\-]+/g, "_");
      const path = `${visitaId}/${Date.now()}-${safeName}`;

      const { error } = await supabase.storage
        .from("visitas-imoveis")
        .upload(path, file);

      if (error) {
        setErro(`Falha em ${file.name}: ${error.message}`);
        continue;
      }

      const { data } = supabase.storage
        .from("visitas-imoveis")
        .getPublicUrl(path);

      await addVisitaMidia(visitaId, curadoriaId, clienteId, {
        tipo: isVid ? "video" : "foto",
        url: data.publicUrl,
        storage_path: path,
      });
    }

    setUploading(false);
    e.target.value = "";
    window.location.reload();
  }

  function handleRemove(midia: VisitaPreviaMidiaRow) {
    setMidias((prev) => prev.filter((m) => m.id !== midia.id));
    startTransition(() => {
      removeVisitaMidia(midia.id, visitaId, curadoriaId, clienteId);
    });
  }

  const ordemAction = updateVisitaMidiaOrdem.bind(
    null,
    visitaId,
    curadoriaId,
    clienteId
  );

  return (
    <div>
      <input
        type="file"
        accept="image/*,video/*"
        multiple
        onChange={handleFiles}
        disabled={uploading}
        className="text-sm"
      />
      {uploading && (
        <p className="mt-1 text-xs text-[#5b6472]">Enviando…</p>
      )}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {midias.length > 0 && (
        <ul className="mt-3 space-y-3">
          {midias
            .slice()
            .sort((a, b) => a.ordem - b.ordem)
            .map((m) => (
              <li
                key={m.id}
                className="flex gap-3 rounded-md border border-[#e4e0d9] p-2"
              >
                <div className="h-20 w-28 shrink-0 overflow-hidden rounded bg-[#efe9e0]">
                  {isVideo(m.url, m.tipo) ? (
                    <video
                      src={m.url}
                      className="h-full w-full object-cover"
                      muted
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between text-sm">
                  <p className="text-xs text-[#5b6472]">
                    {m.tipo === "video" ? "Vídeo" : "Foto"} · ordem {m.ordem}
                  </p>
                  <form action={ordemAction} className="flex items-center gap-2">
                    <input type="hidden" name="midia_id" value={m.id} />
                    <label className="text-xs text-[#5b6472]">Ordem</label>
                    <input
                      type="number"
                      name="ordem"
                      min={0}
                      defaultValue={m.ordem}
                      className="w-16 rounded border border-[#e4e0d9] px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      className="rounded border border-[#e4e0d9] px-2 py-0.5 text-xs hover:bg-[#faf8f5]"
                    >
                      Ok
                    </button>
                  </form>
                  <button
                    type="button"
                    onClick={() => handleRemove(m)}
                    className="self-start text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
