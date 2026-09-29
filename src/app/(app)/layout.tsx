import { getUsuarioAtual } from "@/lib/auth";
import { signOut } from "./actions";
import { Sidebar } from "./Sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioAtual();

  return (
    <div className="flex min-h-screen flex-col bg-[#faf8f5] md:flex-row">
      <Sidebar usuario={usuario} onSignOut={signOut} />
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
