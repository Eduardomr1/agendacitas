# AgendaCitas — Sistema SaaS de Reservas y Gestión de Citas

Plataforma web moderna y responsiva diseñada para que negocios de servicios (barberías, consultorios, estudios, spas) permitan a sus clientes reservar citas en línea sin fricción, con control total de horarios y prevención estricta de colisiones.

Diseñada bajo los principios de **Clean Architecture** (Domain, Data, Presentation) y organización **Feature-First** con contratos tipados de error (`Failure`), validaciones desacopladas y desacoplamiento entre cliente y servidor.

---

## 🚀 Características Principales

- **Página Pública de Reserva ([slug]):** Interfaz intuitiva en 3 pasos (Servicio → Fecha/Horario → Datos del cliente) que consume el motor de cálculo de disponibilidad.
- **Motor Matemático Anti-Colisión:** Algoritmo que cruza horarios laborales, duración del servicio y citas existentes para garantizar que no existan traslapes ni reservas fuera de horario.
- **Panel Administrativo del Negocio:**
  - **Catálogo de Servicios:** Creación, edición, activación/desactivación y fijación de precios en centavos para precisión monetaria.
  - **Horarios Laborales:** Configuración de rangos de apertura y cierre por día de la semana.
  - **Agenda en Tiempo Real:** Monitor de citas con filtros de estado (`confirmada`, `completada`, `cancelada`) y acciones directas.
- **Manejo Seguro de Errores con `Failure`:** Mapeo de errores de Postgres/Supabase a tipos semánticos amigables (`HORARIO_OCUPADO`, `SIN_CONEXION`, `DATOS_INVALIDOS`), protegiendo a la interfaz de exponer detalles técnicos o códigos de base de datos.
- **Design System Propio:** Componentes accesibles construidos desde cero (`ACButton`, `ACInput`, `ACCard`) respetando lineamientos de accesibilidad web (tamaños táctiles mínimos de 44px, estados de carga y feedback visual).

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
|---|---|
| **Framework Web** | [Next.js 16](https://nextjs.org/) (App Router + Turbopack + React 19) |
| **Lenguaje** | [TypeScript](https://www.typescriptlang.org/) (Strict Mode) |
| **Estilos** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Base de Datos & ORM** | [PostgreSQL (Supabase)](https://supabase.com/) + [Drizzle ORM](https://orm.drizzle.team/) |
| **Pruebas Automatizadas** | [Vitest](https://vitest.dev/) (Unitarias en todas las capas) |
| **Control de Versiones** | Git Flow (`main`, `dev`, ramas `feat/*`) |

---

## 🏛️ Arquitectura del Sistema (Clean Architecture + Feature-First)

El código fuente en `src/` sigue un aislamiento estricto de responsabilidades:

```
src/
├── app/                              # Rutas y envoltorios de Next.js App Router
│   ├── (admin)/                      # Panel administrativo (/admin/dashboard, /admin/servicios, etc.)
│   ├── [slug]/                       # Página pública de reserva para clientes
│   └── page.tsx                      # Landing page principal
├── features/
│   ├── reservas/                     # Flujo público de cliente
│   │   ├── domain/                   # Entidades puras y UseCases (CrearCitaUseCase)
│   │   ├── data/                     # Implementación Drizzle (ReservasRepositoryImpl)
│   │   ├── presentation/             # Vista interactiva (ReservasView)
│   │   └── index.ts / server.ts      # Barrels desacoplados (cliente vs servidor)
│   ├── auth/                         # Autenticación y gestión de sesión de dueños
│   ├── negocio/                      # Configuración de perfil, slug y zona horaria
│   ├── servicios/                    # Catálogo de servicios y horarios semanales
│   └── citas-admin/                  # Panel y control de estados de citas
└── shared/
    ├── errors/                       # Tipos de Failure y traductor de base de datos
    ├── ui/                           # Design System (ACButton, ACInput, ACCard)
    └── lib/                          # Motor de disponibilidad matemática
```

### Reglas de Dependencia
1. **Dominio Puro:** Los Casos de Uso (`usecases`) no importan frameworks, bases de datos ni UI. Contienen exclusivamente reglas de negocio y validaciones.
2. **Barrels Separados:** Se implementan barrels diferenciados (`index.ts` para componentes de cliente y `server.ts` para repositorios de servidor) evitando la fuga accidental de dependencias de Node.js al navegador.
3. **Cero `any`:** Tipado estricto en el 100% de contratos, entidades e interfaces.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con una suite integral de pruebas unitarias que cubren el motor matemático de disponibilidad, la traducción de errores y la lógica de los casos de uso:

```bash
# Ejecutar todas las pruebas con Vitest
npm test

# Ejecutar pruebas en modo observador
npx vitest
```

---

## 💻 Instalación y Ejecución Local

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/Eduardomr1/agendacitas.git
   cd agendacitas
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno:**
   Copia `.env.example` a `.env.local` y agrega tus credenciales de Supabase / Postgres:
   ```env
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   NEXT_PUBLIC_SUPABASE_URL=https://[PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[TU-ANON-KEY]
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```
   Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 📄 Licencia

Este proyecto es de código abierto bajo la licencia MIT. Desarrollado por [Eduardo Maytorena](https://github.com/Eduardomr1).
