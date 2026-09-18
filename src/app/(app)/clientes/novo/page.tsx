import Link from "next/link";
import { createCliente } from "../actions";

const ORIGENS_SUGERIDAS = [
  "Site",
  "Indicação",
  "Instagram",
  "Facebook Ads",
  "Google Ads",
  "WhatsApp",
];

export default async function NovoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="max-w-lg">
      <Link
        href="/clientes"
        className="text-sm text-neutral-500 hover:underline"
      >
        ← Voltar
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Novo cliente</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cadastro rápido. Depois, inicie a entrevista completa para preencher o
        perfil.
      </p>

      <form
        action={createCliente}
        className="mt-6 space-y-4 rounded-lg border border-neutral-200 bg-white p-6"
      >
        <div>
          <label htmlFor="nome" className="block text-sm font-medium">
            Nome *
          </label>
          <input
            id="nome"
            name="nome"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="telefone" className="block text-sm font-medium">
            Telefone
          </label>
          <input
            id="telefone"
            name="telefone"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="origem_lead" className="block text-sm font-medium">
            Origem do lead
          </label>
          <input
            id="origem_lead"
            name="origem_lead"
            list="origens-sugeridas"
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none"
          />
          <datalist id="origens-sugeridas">
            {ORIGENS_SUGERIDAS.map((origem) => (
              <option key={origem} value={origem} />
            ))}
          </datalist>
        </div>

        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white hover:bg-neutral-800"
        >
          Criar cliente
        </button>
      </form>
    </div>
  );
}
