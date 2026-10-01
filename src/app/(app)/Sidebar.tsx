"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: (props: { className?: string }) => React.JSX.Element;
}

function IconLeads({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3.25" />
      <path d="M3.5 19c0-3.2 2.7-5.5 5.5-5.5 1 0 1.9.25 2.7.7" />
      <path d="M17 12v6M14 15h6" />
    </svg>
  );
}

function IconCRM({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="4.5" height="15" rx="1.2" />
      <rect x="9.75" y="4.5" width="4.5" height="10" rx="1.2" />
      <rect x="16" y="4.5" width="4.5" height="6.5" rx="1.2" />
    </svg>
  );
}

function IconVisitas({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-6.5-5.6-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.25" />
    </svg>
  );
}

function IconNegociacoes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8h13" />
      <path d="M14 4.5 17.5 8 14 11.5" />
      <path d="M20 16H7" />
      <path d="M10 12.5 6.5 16 10 19.5" />
    </svg>
  );
}

function IconDueDiligence({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" />
      <path d="M9 12.5l2 2 4-4.5" />
    </svg>
  );
}

function IconClientes({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="8.5" cy="11" r="2" />
      <path d="M5.5 16c.5-1.8 1.8-2.8 3-2.8s2.5 1 3 2.8" />
      <path d="M14.5 10h4M14.5 13h4" />
    </svg>
  );
}

function IconCatalogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M6 10v9.5a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V10" />
      <path d="M10 20.5v-5h4v5" />
    </svg>
  );
}

function IconParceiros({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9.5" cy="12" r="6" />
      <circle cx="14.5" cy="12" r="6" />
    </svg>
  );
}

function IconCollapse({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  );
}

function IconSignOut({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4" />
      <path d="M14 8l4 4-4 4" />
      <path d="M18 12H9" />
    </svg>
  );
}

const NAV_GRUPOS: NavItem[][] = [
  [
    { label: "Leads", href: "/leads", icon: IconLeads },
    { label: "CRM", href: "/crm", icon: IconCRM },
  ],
  [
    { label: "Visitas", href: "/visitas", icon: IconVisitas },
    { label: "Negociações", href: "/negociacoes", icon: IconNegociacoes },
    { label: "Due diligence", href: "/due-diligence", icon: IconDueDiligence },
  ],
  [
    { label: "Clientes", href: "/clientes", icon: IconClientes },
    { label: "Catálogo", href: "/imoveis", icon: IconCatalogo },
    { label: "Parceiros", href: "/parceiros", icon: IconParceiros },
  ],
];

const COLLAPSE_KEY = "ethex-sidebar-collapsed";

function NavLink({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      className={`flex items-center gap-3 rounded-md border-l-2 px-3 py-2 text-sm transition-colors ${
        active
          ? "border-[#d6b072] bg-[#d6b072]/10 text-[#d6b072]"
          : "border-transparent text-[#aab4c4] hover:bg-white/5 hover:text-white"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarNav({
  pathname,
  collapsed,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
      {NAV_GRUPOS.map((grupo, i) => (
        <div key={i} className={i > 0 ? "mt-2 border-t border-white/10 pt-2" : ""}>
          <div className="flex flex-col gap-1">
            {grupo.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <NavLink
                  key={item.href}
                  item={item}
                  active={active}
                  collapsed={collapsed}
                  onClick={onNavigate}
                />
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter({
  usuario,
  collapsed,
  onSignOut,
}: {
  usuario: { nome: string; papel: string } | null;
  collapsed: boolean;
  onSignOut: () => void;
}) {
  return (
    <div className="border-t border-white/10 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {!collapsed && usuario && (
        <div className="px-1 pb-2 text-xs text-[#aab4c4]">
          <span className="block truncate text-[#e7e2d8]">{usuario.nome}</span>
          {usuario.papel === "admin" && (
            <span className="mt-1 inline-block rounded-full border border-[#d6b072] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#d6b072]">
              admin
            </span>
          )}
        </div>
      )}
      <form action={onSignOut}>
        <button
          type="submit"
          title={collapsed ? "Sair" : undefined}
          className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-[#aab4c4] transition-colors hover:bg-white/5 hover:text-white ${
            collapsed ? "justify-center" : ""
          }`}
        >
          <IconSignOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </form>
    </div>
  );
}

export function Sidebar({
  usuario,
  onSignOut,
}: {
  usuario: { nome: string; papel: string } | null;
  onSignOut: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;
    // No mobile a sidebar sempre começa só com ícones; o usuário expande manualmente.
    if (window.matchMedia("(max-width: 767px)").matches) return true;
    return window.localStorage.getItem(COLLAPSE_KEY) === "1";
  });

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      window.localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  function collapseOnMobile() {
    if (window.matchMedia("(max-width: 767px)").matches) {
      setCollapsed(true);
      window.localStorage.setItem(COLLAPSE_KEY, "1");
    }
  }

  return (
    <>
      {/* Fundo escurecido: só no mobile, quando a sidebar está expandida sobre o conteúdo */}
      {!collapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={collapseOnMobile}
        />
      )}

      <aside
        className={`z-40 flex shrink-0 flex-col bg-[#0b1f34] transition-[width] duration-200 md:sticky md:inset-auto md:top-0 md:h-dvh ${
          collapsed
            ? "sticky top-0 min-h-dvh self-start"
            : "fixed inset-y-0 left-0 h-dvh"
        } ${collapsed ? "w-16" : "w-60"}`}
      >
        <div className={`flex items-center gap-2 px-3 py-4 ${collapsed ? "justify-center" : "justify-between"}`}>
          <Link
            href="/clientes"
            onClick={collapseOnMobile}
            className="flex min-w-0 items-center gap-2"
          >
            <div className="shrink-0 rounded-lg bg-white/5 p-1">
              <Image src="/brand/icon-mark.png" alt="" width={24} height={24} className="h-6 w-6" unoptimized />
            </div>
            {!collapsed && (
              <span className="truncate text-lg font-extrabold tracking-tight text-white">
                Ethex
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              aria-label="Recolher menu"
              onClick={toggleCollapsed}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#aab4c4] hover:bg-white/5 hover:text-white"
            >
              <IconCollapse className="h-[18px] w-[18px]" />
            </button>
          )}
        </div>

        <SidebarNav
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={collapseOnMobile}
        />

        {collapsed && (
          <button
            type="button"
            aria-label="Expandir menu"
            onClick={toggleCollapsed}
            className="mx-2 mb-2 flex h-9 items-center justify-center rounded-md text-[#aab4c4] hover:bg-white/5 hover:text-white"
          >
            <IconCollapse className="h-[18px] w-[18px]" />
          </button>
        )}

        <SidebarFooter usuario={usuario} collapsed={collapsed} onSignOut={onSignOut} />
      </aside>
    </>
  );
}
