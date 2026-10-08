"use client";

import { LoginView } from "@/features/auth";
import React from "react";

export default function PaginaLoginAdmin() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center p-4 selection:bg-zinc-900 selection:text-white">
      <LoginView
        onIniciarSesion={async (email, pass) => {
          console.log("Login con:", email);
        }}
        onRegistrarse={async (email, pass) => {
          console.log("Registro con:", email);
        }}
      />
    </main>
  );
}
