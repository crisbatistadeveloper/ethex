import { createClient } from "@/lib/supabase/server";
import type { UsuarioRow } from "@/lib/database.types";

export interface UsuarioAtual {
  id: string;
  email: string | null;
  nome: string;
  papel: UsuarioRow["papel"];
}

export async function getUsuarioAtual(): Promise<UsuarioAtual | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: usuario } = await supabase
    .from("usuario")
    .select("id, nome, papel")
    .eq("id", user.id)
    .returns<Pick<UsuarioRow, "id" | "nome" | "papel">[]>()
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    nome: usuario?.nome ?? user.email ?? "Consultor",
    papel: usuario?.papel ?? "consultor",
  };
}
