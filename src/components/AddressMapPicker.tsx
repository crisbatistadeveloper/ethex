"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { geocodeAddressAction } from "@/app/(app)/clientes/[id]/imoveis/actions";
import type { GeocodeResult } from "@/lib/geocode";

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [-14.235, -51.9253];

export function AddressMapPicker({
  initialLat,
  initialLon,
  initialEndereco,
}: {
  initialLat?: number | null;
  initialLon?: number | null;
  initialEndereco?: string | null;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [query, setQuery] = useState(initialEndereco ?? "");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [position, setPosition] = useState<{ lat: number; lon: number } | null>(
    initialLat != null && initialLon != null
      ? { lat: initialLat, lon: initialLon }
      : null
  );
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    const center: [number, number] = position
      ? [position.lat, position.lon]
      : DEFAULT_CENTER;
    const map = L.map(mapRef.current).setView(center, position ? 16 : 4);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const marker = L.marker(center, { draggable: true }).addTo(map);
    marker.on("dragend", () => {
      const { lat, lng } = marker.getLatLng();
      setPosition({ lat, lon: lng });
    });

    mapInstance.current = map;
    markerRef.current = marker;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!position || !mapInstance.current || !markerRef.current) return;
    mapInstance.current.setView([position.lat, position.lon], 16);
    markerRef.current.setLatLng([position.lat, position.lon]);
  }, [position]);

  useEffect(() => {
    if (query.trim().length < 3) return;
    const handle = setTimeout(() => {
      startTransition(async () => {
        const results = await geocodeAddressAction(query);
        setSuggestions(results);
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [query]);

  const suggestionsVisiveis = query.trim().length < 3 ? [] : suggestions;

  function selecionarSugestao(sug: GeocodeResult) {
    setPosition({ lat: sug.lat, lon: sug.lon });
    setQuery(sug.displayName);
    setSuggestions([]);
  }

  return (
    <div>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar endereço..."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
        />
        {isPending && (
          <span className="absolute right-3 top-2.5 text-xs text-neutral-400">
            buscando...
          </span>
        )}
        {suggestionsVisiveis.length > 0 && (
          <ul className="absolute z-[1000] mt-1 w-full rounded-md border border-neutral-200 bg-white shadow-lg">
            {suggestionsVisiveis.map((s) => (
              <li key={`${s.lat}-${s.lon}`}>
                <button
                  type="button"
                  onClick={() => selecionarSugestao(s)}
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-neutral-100"
                >
                  {s.displayName}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        ref={mapRef}
        className="mt-3 h-64 w-full rounded-md border border-neutral-200"
      />
      <p className="mt-1 text-xs text-neutral-500">
        Arraste o pino para ajustar a posição exata.
      </p>

      <input type="hidden" name="endereco_texto" value={query} />
      <input type="hidden" name="latitude" value={position?.lat ?? ""} />
      <input type="hidden" name="longitude" value={position?.lon ?? ""} />
    </div>
  );
}
