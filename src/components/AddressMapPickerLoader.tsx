"use client";

import dynamic from "next/dynamic";

// Leaflet toca `window` na avaliação do módulo — precisa ficar fora do SSR,
// e `ssr: false` só é permitido dentro de um Client Component.
export const AddressMapPicker = dynamic(
  () => import("./AddressMapPicker").then((m) => m.AddressMapPicker),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 w-full animate-pulse rounded-md border border-neutral-200 bg-neutral-100" />
    ),
  }
);
