"use client";

import Link from "next/link";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
}

export function MobileNav({
  grupos,
  usuario,
  onSignOut,
}: {
  grupos: NavItem[][];
  usuario: { nome: string; papel: string } | null;
  onSignOut: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label={open ? "Fechar menu" : "Abrir menu"}
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-md border border-[#e4e0d9] text-[#0b1f34]"
      >
        {open ? (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-40 max-h-[calc(100vh-57px)] overflow-y-auto border-b border-[#e4e0d9] bg-white px-4 py-4 shadow-md">
          <nav className="flex flex-col gap-1">
            {grupos.map((grupo, i) => (
              <div
                key={i}
                className={i > 0 ? "mt-3 border-t border-[#e4e0d9] pt-3" : ""}
              >
                {grupo.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-2 py-2 text-sm text-[#0b1f34] hover:bg-[#faf8f5]"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </nav>

          <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#e4e0d9] pt-4">
            {usuario && (
              <span className="text-sm text-[#5b6472]">
                {usuario.nome}
                {usuario.papel === "admin" && (
                  <span className="ml-1.5 rounded-full border border-[#d6b072] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#b8925a]">
                    admin
                  </span>
                )}
              </span>
            )}
            <form action={onSignOut}>
              <button
                type="submit"
                className="rounded-md border border-[#e4e0d9] px-3 py-1.5 text-sm text-[#0b1f34] hover:bg-[#faf8f5]"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
