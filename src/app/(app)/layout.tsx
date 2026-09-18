import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/clientes" className="text-lg font-semibold">
              Ethex
            </Link>
            <Link
              href="/clientes"
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Clientes
            </Link>
            <Link
              href="/imoveis"
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Catálogo
            </Link>
          </div>
          <div className="flex items-center gap-4 text-sm text-neutral-600">
            {user?.email && <span>{user.email}</span>}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-md border border-neutral-300 px-3 py-1.5 hover:bg-neutral-100"
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
