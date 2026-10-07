"use client";

import { LoginView } from "@/features/auth";
import React from "react";

export default function PaginaLoginAdmin() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center">
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
