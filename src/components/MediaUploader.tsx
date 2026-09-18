"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addMidiaPropria,
  removeMidiaPropria,
} from "@/app/(app)/clientes/[id]/imoveis/actions";

function isVideo(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

export function MediaUploader({
  imovelId,
  clienteId,
  initialUrls,
}: {
  imovelId: string;
  clienteId: string;
  initialUrls: string[];
}) {
  const [urls, setUrls] = useState(initialUrls);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setErro(null);
    const supabase = createClient();

    for (const file of Array.from(files)) {
      const path = `${clienteId}/${imovelId}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage
        .from("midia-imoveis")
        .upload(path, file);

      if (error) {
        setErro(`Falha ao enviar ${file.name}: ${error.message}`);
        continue;
      }

      const { data } = supabase.storage.from("midia-imoveis").getPublicUrl(path);
      setUrls((prev) => [...prev, data.publicUrl]);
      await addMidiaPropria(imovelId, clienteId, data.publicUrl);
    }

    setUploading(false);
    e.target.value = "";
  }

  function handleRemove(url: string) {
    setUrls((prev) => prev.filter((u) => u !== url));
    startTransition(() => {
      removeMidiaPropria(imovelId, clienteId, url);
    });
  }

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
        <p className="mt-1 text-xs text-neutral-500">Enviando...</p>
      )}
      {erro && <p className="mt-1 text-xs text-red-600">{erro}</p>}

      {urls.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {urls.map((url) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-md border border-neutral-200"
            >
              {isVideo(url) ? (
                <video src={url} className="h-full w-full object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-1.5 text-xs text-white opacity-0 group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
