import Image from "next/image";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f5] px-4">
      <div className="w-full max-w-sm rounded-lg border border-[#e4e0d9] bg-white p-8 shadow-sm">
        <div className="flex items-center gap-2">
          <Image
            src="/brand/icon-mark.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8"
            unoptimized
          />
          <h1 className="text-xl font-extrabold tracking-tight text-[#0b1f34]">
            Ethex
          </h1>
        </div>
        <p className="mt-1 text-sm text-[#5b6472]">
          Acesso restrito ao consultor.
        </p>

        <form action={signIn} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[#0b1f34]"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[#0b1f34]"
            >
              Senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-md border border-[#e4e0d9] px-3 py-2 text-sm focus:border-[#b8925a] focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-[#d6b072] px-3 py-2 text-sm font-semibold text-[#0b1f34] hover:brightness-105"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
