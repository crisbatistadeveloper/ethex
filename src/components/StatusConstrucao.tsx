import {
  STATUS_CONSTRUCAO_COLORS,
  STATUS_CONSTRUCAO_LABELS,
  STATUS_CONSTRUCAO_VALUES,
} from "@/lib/labels";
import type { ImovelStatusConstrucao } from "@/lib/database.types";

export function StatusConstrucaoBadge({
  status,
}: {
  status: ImovelStatusConstrucao | null | undefined;
}) {
  if (!status) return null;
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_CONSTRUCAO_COLORS[status]}`}
    >
      {STATUS_CONSTRUCAO_LABELS[status]}
    </span>
  );
}

export function StatusConstrucaoRadios({
  value,
  defaultValue,
  onChange,
  required,
}: {
  value?: ImovelStatusConstrucao | "";
  defaultValue?: ImovelStatusConstrucao | null;
  onChange?: (value: ImovelStatusConstrucao) => void;
  required?: boolean;
}) {
  return (
    <fieldset>
      <legend className="block text-sm font-medium text-[#0b1f34]">
        Situação do imóvel{required ? " *" : ""}
      </legend>
      <div className="mt-2 flex flex-wrap gap-4">
        {STATUS_CONSTRUCAO_VALUES.map((s) => (
          <label key={s} className="flex items-center gap-2 text-sm text-[#0b1f34]">
            <input
              type="radio"
              name="status_construcao"
              value={s}
              required={required}
              {...(value !== undefined
                ? { checked: value === s, onChange: () => onChange?.(s) }
                : { defaultChecked: defaultValue === s })}
            />
            {STATUS_CONSTRUCAO_LABELS[s]}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
