import Image from "next/image";
import Link from "next/link";
import { getUsuarioAtual } from "@/lib/auth";
import { signOut } from "./actions";

const NAV_GRUPOS: { label: string; href: string }[][] = [
  [
    { label: "Leads", href: "/leads" },
    { label: "CRM", href: "/crm" },
  ],
  [
    { label: "Visitas", href: "/visitas" },
    { label: "Negociações", href: "/negociacoes" },
    { label: "Due diligence", href: "/due-diligence" },
  ],
  [
    { label: "Clientes", href: "/clientes" },
    { label: "Catálogo", href: "/imoveis" },
    { label: "Parceiros", href: "/parceiros" },
  ],
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#e4e0d9] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
          <div className="flex items-center gap-6">
            <Link href="/clientes" className="flex shrink-0 items-center gap-2">
              <Image src="/brand/icon-mark.png" alt="" width={28} height={28} className="h-7 w-7" unoptimized />
              <span className="text-lg font-extrabold tracking-tight text-[#0b1f34]">
                Ethex
              </span>
            </Link>
            <nav className="flex flex-wrap items-center gap-x-5 gap-y-1">
              {NAV_GRUPOS.map((grupo, i) => (
                <span key={i} className="flex items-center gap-x-5">
                  {i > 0 && (
                    <span className="hidden h-4 w-px bg-[#e4e0d9] sm:block" />
                  )}
                  {grupo.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="text-sm text-[#5b6472] transition-colors hover:text-[#0b1f34]"
                    >
                      {item.label}
                    </Link>
                  ))}
                </span>
              ))}
            </nav>
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm text-[#5b6472]">
            {usuario && (
              <span>
                {usuario.nome}
                {usuario.papel === "admin" && (
                  <span className="ml-1.5 rounded-full border border-[#d6b072] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b8925a]">
                    admin
                  </span>
                )}
              </span>
            )}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-[#0b1f34] hover:bg-[#faf8f5]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
