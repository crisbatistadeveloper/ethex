import type { ParceiroRow } from "@/lib/database.types";
import { PARCEIRO_TIPOS, PARCEIRO_TIPO_LABELS } from "@/lib/parceiros";

const inputClass =
  "mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none";
const labelClass = "block text-sm font-medium text-[#0b1f34]";

export function ParceiroFormFields({
  parceiro,
  showAtivo,
}: {
  parceiro?: ParceiroRow | null;
  showAtivo?: boolean;
}) {
  return (
    <>
      <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold">Cadastro</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="tipo" className={labelClass}>
              Tipo
            </label>
            <select
              id="tipo"
              name="tipo"
              required
              defaultValue={parceiro?.tipo ?? "corretor"}
              className={inputClass}
            >
              {PARCEIRO_TIPOS.map((t) => (
                <option key={t} value={t}>
                  {PARCEIRO_TIPO_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="nome" className={labelClass}>
              Nome
            </label>
            <input
              id="nome"
              name="nome"
              required
              defaultValue={parceiro?.nome ?? ""}
              className={inputClass}
              placeholder="Nome do parceiro"
            />
          </div>
          <div>
            <label htmlFor="imobiliaria_nome" className={labelClass}>
              Nome da imobiliária / empresa
            </label>
            <input
              id="imobiliaria_nome"
              name="imobiliaria_nome"
              defaultValue={parceiro?.imobiliaria_nome ?? ""}
              className={inputClass}
              placeholder="Opcional — imobiliária, incorporadora vinculada, etc."
            />
          </div>
          <div>
            <label htmlFor="creci" className={labelClass}>
              CRECI
            </label>
            <input
              id="creci"
              name="creci"
              defaultValue={parceiro?.creci ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contato_telefone" className={labelClass}>
              Telefone
            </label>
            <input
              id="contato_telefone"
              name="contato_telefone"
              defaultValue={parceiro?.contato_telefone ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="whatsapp" className={labelClass}>
              WhatsApp
            </label>
            <input
              id="whatsapp"
              name="whatsapp"
              defaultValue={parceiro?.whatsapp ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="contato_email" className={labelClass}>
              E-mail
            </label>
            <input
              id="contato_email"
              name="contato_email"
              type="email"
              defaultValue={parceiro?.contato_email ?? ""}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="cidade_regiao" className={labelClass}>
              Cidade / região
            </label>
            <input
              id="cidade_regiao"
              name="cidade_regiao"
              defaultValue={parceiro?.cidade_regiao ?? ""}
              className={inputClass}
              placeholder="Ex.: Florianópolis — Campeche"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="contato_nome" className={labelClass}>
              Contato (pessoa)
            </label>
            <input
              id="contato_nome"
              name="contato_nome"
              defaultValue={parceiro?.contato_nome ?? ""}
              className={inputClass}
              placeholder="Opcional — pessoa de referência"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="observacoes" className={labelClass}>
              Observações
            </label>
            <textarea
              id="observacoes"
              name="observacoes"
              rows={3}
              defaultValue={parceiro?.observacoes ?? ""}
              className={inputClass}
            />
          </div>
          {showAtivo && (
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="ativo"
                name="ativo"
                defaultChecked={parceiro?.ativo ?? true}
              />
              <label htmlFor="ativo" className="text-sm text-[#0b1f34]">
                Parceiro ativo
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg border border-[#e4e0d9] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold">Política de parceria</h2>
        <p className="text-xs text-[#5b6472]">
          Cada parceiro pode ter condições diferentes — registre o que já
          conhecemos para não renegociar do zero.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="politica_comissao" className={labelClass}>
              Comissão / percentual padrão
            </label>
            <input
              id="politica_comissao"
              name="politica_comissao"
              defaultValue={parceiro?.politica_comissao ?? ""}
              className={inputClass}
              placeholder="Ex.: 6% ou 50% da comissão"
            />
          </div>
          <div>
            <label htmlFor="modelo_divisao" className={labelClass}>
              Modelo de divisão
            </label>
            <input
              id="modelo_divisao"
              name="modelo_divisao"
              defaultValue={parceiro?.modelo_divisao ?? ""}
              className={inputClass}
              placeholder="Ex.: 50/50"
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="condicoes_parceria" className={labelClass}>
              Condições da parceria
            </label>
            <textarea
              id="condicoes_parceria"
              name="condicoes_parceria"
              rows={3}
              defaultValue={parceiro?.condicoes_parceria ?? ""}
              className={inputClass}
              placeholder="Exceções, prazos, exclusividade…"
            />
          </div>
        </div>
      </section>
    </>
  );
}
