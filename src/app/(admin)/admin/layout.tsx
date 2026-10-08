"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ACBadge } from "@/shared/ui";
import {
  CalendarCheck2,
  Calendar,
  Layers,
  Store,
  ExternalLink,
  User,
  LogOut,
} from "lucide-react";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Si estamos en la página de login, no mostramos la barra administrativa superior
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const navItems = [
    {
      href: "/admin/dashboard",
      etiqueta: "Agenda & Citas",
      icono: Calendar,
      activo: pathname === "/admin/dashboard",
    },
    {
      href: "/admin/servicios",
      etiqueta: "Servicios & Horarios",
      icono: Layers,
      activo: pathname === "/admin/servicios",
    },
    {
      href: "/admin/negocio",
      etiqueta: "Configuración",
      icono: Store,
      activo: pathname === "/admin/negocio",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo & Marca */}
          <div className="flex items-center gap-6">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-2.5 group focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform duration-200">
                <CalendarCheck2 className="w-5 h-5 text-white" />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-base tracking-tight text-zinc-900">
                  AgendaCitas
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-200/80">
                  Admin
                </span>
              </div>
            </Link>

            {/* Nav items desktop */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icono;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-150 ${
                      item.activo
                        ? "bg-zinc-100 text-zinc-900 font-semibold shadow-xs"
                        : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-50"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.etiqueta}</span>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Acciones Derecha */}
          <div className="flex items-center gap-3">
            <Link
              href="/barberia-clasica"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 hover:border-zinc-300 px-3 py-1.5 rounded-lg transition-colors shadow-2xs"
            >
              <span>Ver página pública</span>
              <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
            </Link>

            {/* Avatar / Usuario */}
            <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
              <div className="w-8 h-8 rounded-full bg-zinc-900 text-white text-xs font-bold flex items-center justify-center ring-2 ring-zinc-100">
                BC
              </div>
              <Link
                href="/admin/login"
                title="Cerrar Sesión"
                className="text-zinc-400 hover:text-red-600 p-1 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>

        {/* Sub-nav móvil */}
        <div className="md:hidden flex items-center justify-around border-t border-zinc-100 py-1.5 px-2 bg-white">
          {navItems.map((item) => {
            const Icon = item.icono;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 py-1 px-3 text-[11px] font-medium rounded-md transition-colors ${
                  item.activo
                    ? "text-zinc-900 font-bold"
                    : "text-zinc-500 hover:text-zinc-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.etiqueta.split(" ")[0]}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {children}
      </div>
    </div>
  );
}
