import {
  DIFERENCIAIS,
  diferenciaisComValor,
  diferencialParaForm,
  resumoQuantitativo,
  type CaracteristicasImovel,
  type DiferencialKey,
  type DiferencialValor,
} from "@/lib/imovel-caracteristicas";

const OPCOES: { valor: DiferencialValor; label: string }[] = [
  { valor: "", label: "Não informado" },
  { valor: "sim", label: "Tem" },
  { valor: "nao", label: "Não tem" },
];

/** Diferenciais com 3 estados; "Não informado" vem pré-marcado. */
export function DiferenciaisFields({
  valores,
  onChange,
  defaults,
}: {
  valores?: Record<DiferencialKey, DiferencialValor>;
  onChange?: (key: DiferencialKey, valor: DiferencialValor) => void;
  defaults?: Partial<Record<DiferencialKey, boolean | null>>;
}) {
  const colunas = "grid grid-cols-[minmax(0,1fr)_repeat(3,4.75rem)] items-center";

  return (
    <fieldset>
      <legend className="block text-sm font-medium text-[#0b1f34]">Diferenciais</legend>
      <div className="mt-2 overflow-hidden rounded-md border border-[#e4e0d9]">
        <div
          className={`${colunas} bg-[#faf8f5] px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-[#5b6472]`}
          aria-hidden
        >
          <span />
          {OPCOES.map((o) => (
            <span key={o.valor || "na"} className="text-center leading-tight">
              {o.label}
            </span>
          ))}
        </div>
        {DIFERENCIAIS.map((d, i) => {
          const atual = valores
            ? valores[d.key]
            : diferencialParaForm(defaults?.[d.key]);
          return (
            <div
              key={d.key}
              role="radiogroup"
              aria-label={d.label}
              className={`${colunas} border-t border-[#e4e0d9] px-3 py-2 text-sm ${
                i % 2 === 1 ? "bg-[#faf8f5]/40" : ""
              }`}
            >
              <span className="pr-2 text-[#0b1f34]">{d.label}</span>
              {OPCOES.map((o) => (
                <label
                  key={o.valor || "na"}
                  className="flex h-full cursor-pointer items-center justify-center"
                >
                  <input
                    type="radio"
                    name={`dif_${d.key}`}
                    value={o.valor}
                    aria-label={`${d.label}: ${o.label}`}
                    className="h-4 w-4 cursor-pointer accent-neutral-900"
                    {...(valores
                      ? {
                          checked: atual === o.valor,
                          onChange: () => onChange?.(d.key, o.valor),
                        }
                      : { defaultChecked: atual === o.valor })}
                  />
                </label>
              ))}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Etiquetas compactas dos diferenciais que o imóvel tem (para cards). */
export function DiferenciaisTags({
  imovel,
}: {
  imovel: Partial<Record<DiferencialKey, boolean | null>>;
}) {
  const tem = diferenciaisComValor(imovel, true);
  if (tem.length === 0) return null;
  return (
    <div className="mt-1.5 flex flex-wrap gap-1">
      {tem.map((label) => (
        <span
          key={label}
          className="rounded-full border border-[#e4e0d9] bg-[#faf8f5] px-2 py-0.5 text-[11px] text-[#5b6472]"
        >
          {label}
        </span>
      ))}
    </div>
  );
}

/** Características preenchidas: números em linha + etiquetas de diferenciais. */
export function CaracteristicasResumo({
  imovel,
  mostrarAusentes = false,
}: {
  imovel: Partial<CaracteristicasImovel>;
  mostrarAusentes?: boolean;
}) {
  const numeros = resumoQuantitativo(imovel);
  const tem = diferenciaisComValor(imovel, true);
  const naoTem = mostrarAusentes ? diferenciaisComValor(imovel, false) : [];
  if (numeros.length === 0 && tem.length === 0 && naoTem.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {numeros.length > 0 && (
        <p className="text-sm text-[#5b6472]">{numeros.join(" · ")}</p>
      )}
      {tem.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tem.map((label) => (
            <span
              key={label}
              className="rounded-full border border-[#e4e0d9] bg-[#faf8f5] px-2 py-0.5 text-xs text-[#0b1f34]"
            >
              {label}
            </span>
          ))}
        </div>
      )}
      {naoTem.length > 0 && (
        <p className="text-xs text-[#5b6472]">Não tem: {naoTem.join(" · ")}</p>
      )}
    </div>
  );
}
