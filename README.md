# Pinnacle Supply Chain Dashboard

Este repositorio contiene el código fuente de un tablero de control para la cadena de suministro de Pinnacle Chile SpA. La aplicación está construida con **React**, **Vite**, **Tailwind CSS**, **Redux Toolkit** y **Supabase**, y se despliega en Vercel. El tablero permite visualizar y gestionar licitaciones, órdenes de compra, importaciones y métricas de demanda/stock.

## Características

- **Gestión de licitaciones**: crear y seguir licitaciones (tenders) con su estado, fechas y detalles asociados.
- **Órdenes de compra**: importar y mostrar órdenes de compra desde Google Sheets, incluyendo cantidades, fechas de entrega y estados.
- **Módulo de importaciones**: seguimiento de embarques con un timeline y estados (QC, aduana, transporte, entregado), además de documentación (invoice, B/L).
- **Demanda y stock**: cálculo de *days of supply* y alertas de inventario bajo.
- **Internacionalización (i18n)**: soporte para español e inglés mediante archivos de traducción en `src/i18n`.
- **Capa de API centralizada**: manejo de llamadas HTTP y estados de carga/error en `src/api`.
- **Gestión de estado con Redux Toolkit**.
- **Diseño responsive** con Tailwind CSS y animaciones con Framer Motion.

## Estructura del proyecto

- **`src/`**: Código fuente principal.
  - **`components/`**: Componentes reutilizables.
  - **`pages/`**: Vistas principales (licitaciones, importaciones, órdenes, demanda/stock).
  - **`api/`**: Funciones para interactuar con Supabase, Google Sheets y otros servicios.
  - **`i18n/`**: Archivos de traducción `es.json` y `en.json`.
  - **`constants/`**: Valores estáticos (por ejemplo, enumeración de estados).
- **`public/`**: Archivos estáticos.
- **`.env.example`**: Plantilla de variables de entorno.

## Configuración y ejecución

1. **Clonar el repositorio**:

   ```bash
   git clone https://github.com/Neshamalic/pinnacle-supplychain.git
   cd pinnacle-supplychain
   ```

2. **Instalar dependencias**:

   ```bash
   npm install
   ```

3. **Configurar variables de entorno**:

   Copia el archivo `.env.example` a `.env.local` y completa los valores de `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, etc.

4. **Ejecutar en modo desarrollo**:

   ```bash
   npm run dev
   ```

5. **Compilar para producción**:

   ```bash
   npm run build
   ```

## Contribuir

Los PRs son bienvenidos. Por favor:
- Utiliza una rama para tu cambio (`git checkout -b feature/mi-mejora`).
- Asegúrate de que el proyecto compila sin errores.
- Sigue las convenciones de código y estilos establecidos (ESLint/Prettier).
- Incluye pruebas si agregas lógica importante.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Consulta el archivo `LICENSE` para más información.
