import React from "react";
import Link from "next/link";
import { ACButton, ACBadge } from "@/shared/ui";
import {
  CalendarCheck2,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  ExternalLink,
  Code2,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50/70 text-zinc-900 font-sans selection:bg-zinc-900 selection:text-white">
      {/* Navigation */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-zinc-200/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 text-white flex items-center justify-center shadow-xs">
              <CalendarCheck2 className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-zinc-900">
              AgendaCitas
            </span>
            <ACBadge variante="neutral" className="hidden sm:inline-flex text-[10px]">
              SaaS v1.1
            </ACBadge>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/login"
              className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 px-3 py-1.5 transition-colors"
            >
              Iniciar Sesión
            </Link>
            <Link
              href="/admin/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-zinc-900 hover:bg-zinc-800 px-3.5 py-2 rounded-xl transition-all shadow-xs"
            >
              <span>Panel Admin</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pt-16 pb-20 md:pt-24 md:pb-28 text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-zinc-200/80 shadow-2xs mb-6 text-xs text-zinc-600 font-medium">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>Rediseño UI/UX inspirado en Cal.com & Linear</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-zinc-900 max-w-4xl mx-auto leading-[1.1]">
          La plataforma de citas que tus clientes{" "}
          <span className="underline decoration-zinc-300 decoration-wavy decoration-2">
            amarán usar
          </span>
          .
        </h1>

        <p className="mt-6 text-base sm:text-lg text-zinc-600 max-w-2xl mx-auto leading-relaxed">
          AgendaCitas simplifica las reservaciones de servicios para barberías, clínicas y estudios profesionales. Calendario dinámico, cálculo automático de turnos y panel con métricas en tiempo real.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3.5 max-w-md mx-auto">
          <Link
            href="/barberia-clasica"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-zinc-900 text-white font-bold text-sm hover:bg-zinc-800 transition-all shadow-sm group"
          >
            <span>Ver Demo de Reserva Pública</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>

          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 font-semibold text-sm hover:bg-zinc-50 hover:border-zinc-300 transition-all shadow-2xs"
          >
            <span>Explorar Panel Admin</span>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </Link>
        </div>

        {/* Mockup Preview Card */}
        <div className="mt-14 max-w-4xl mx-auto bg-white border border-zinc-200/80 rounded-2xl p-2 sm:p-4 shadow-sm">
          <div className="bg-zinc-50 rounded-xl p-4 sm:p-8 border border-zinc-100 flex flex-col md:flex-row items-center justify-between gap-6 text-left">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Flujo en Vivo
                </span>
              </div>
              <h3 className="text-xl font-bold text-zinc-900">
                Barbería Clásica & Estilo
              </h3>
              <p className="text-xs text-zinc-500 max-w-md">
                Prueba la experiencia de usuario completa: selección de servicios, navegación mensual interactiva en ACCalendar y emisión de confirmación.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/barberia-clasica"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-xs font-bold hover:bg-zinc-800 transition-colors shadow-2xs"
              >
                <span>Probar Ahora</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 border-t border-zinc-200/80">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900">
            Diseñado para la máxima eficiencia
          </h2>
          <p className="text-sm text-zinc-500 mt-2">
            Arquitectura limpia de nivel senior combinada con una interfaz minimalista
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs hover:border-zinc-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">
              Mini-Calendario Interactivo
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Componente ACCalendar nativo con cuadrícula de 7 columnas, bloqueo de fechas pasadas y selección ágil de turnos.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs hover:border-zinc-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">
              Métricas & KPIs en Vivo
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Seguimiento de ingresos estimados, citas confirmadas, tasa de asistencia y filtros segmentados con un clic.
            </p>
          </div>

          <div className="bg-white border border-zinc-200/80 rounded-2xl p-6 shadow-2xs hover:border-zinc-300 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 mb-1.5">
              Clean Architecture
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Separación estricta de responsabilidades (Domain, Data, Presentation) con manejo robusto de errores mediante Failure union.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 bg-white py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-zinc-900 text-white flex items-center justify-center font-bold text-[10px]">
              AC
            </div>
            <span className="font-semibold text-zinc-900">AgendaCitas</span>
            <span>• Portafolio Profesional de Eduardo Maytorena</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/barberia-clasica"
              className="hover:text-zinc-900 transition-colors"
            >
              Demo Pública
            </Link>
            <Link
              href="/admin/dashboard"
              className="hover:text-zinc-900 transition-colors"
            >
              Dashboard
            </Link>
            <a
              href="https://github.com/Eduardomr1/agendacitas"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-zinc-900 transition-colors"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
