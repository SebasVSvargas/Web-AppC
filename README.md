# CATAPP — Suite Local de Herramientas PDF

CATAPP es una aplicación web seria, minimalista y profesional diseñada para realizar operaciones críticas sobre archivos PDF de forma **100% local** en el navegador. La aplicación está optimizada para el tier gratuito de Vercel gracias a su arquitectura sin servidor (Client-Side), garantizando la total privacidad de los documentos al no subirlos a ningún servidor externo.

La estética de CATAPP rompe con los clichés comunes de plantillas generadas por Inteligencia Artificial (temas ultra-oscuros, luces de neón y sobreuso de iconos), adoptando un diseño claro (Light Mode) en tonos pastel muy suaves, bordes geométricos limpios y un enfoque tipográfico de alta legibilidad inspirado en plataformas SaaS de primer nivel (como Notion o Stripe).

---

## Características Principales

### 📦 Suite de Herramientas PDF
* **Unir PDFs**: Carga múltiples documentos, ordénalos de forma interactiva y fusiónalos en un único archivo en segundos.
* **Dividir PDF**: Carga un PDF y visualiza sus páginas en un esquema limpio. Elige entre extraer rangos específicos (ej. `1-2, 5`) o separar todas las páginas (con descarga automática en un archivo comprimido `.zip`).
* **Quitar Contraseña**: Elimina la protección de apertura y las restricciones de copia/impresión de cualquier PDF local de manera segura ingresando su clave actual.
* **Añadir Contraseña**: Protege tus PDFs encriptándolos localmente con contraseñas de apertura seguras sin exponer las claves en la red.

### 📅 CRM de Cosmetología (Fase 2 - Estructura Visual Lista)
* Panel de administración elegante preparado para la gestión de pacientes y citas cosmetológicas.
* Diseñado para integrarse en la nube con Supabase en la siguiente fase para almacenar datos completos de citas, costos y EPS.

---

## 🔒 Privacidad por Diseño (100% Client-Side)
Toda la lógica de procesamiento binario de los archivos PDF, encriptación, desencriptación y empaquetamiento ZIP se ejecuta directamente en la máquina del usuario utilizando **Web Cryptography API** y procesamiento en memoria. **Ningún archivo toca la red**.

---

## Stack Tecnológico
* **Core**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Compilador**: [Vite 8](https://vite.dev/) (Rendimiento de desarrollo ultra-rápido)
* **Procesamiento de PDF**: [pdf-lib](https://pdf-lib.js.org/)
* **Seguridad (Criptografía local)**: [@pdfsmaller/pdf-decrypt](https://www.npmjs.com/package/@pdfsmaller/pdf-decrypt) y [@pdfsmaller/pdf-encrypt-lite](https://www.npmjs.com/package/@pdfsmaller/pdf-encrypt-lite)
* **Empaquetado**: [jszip](https://stuk.github.io/jszip/)
* **Estilos**: Vanilla CSS personalizado y optimizado (Sin Tailwind para mantener el control completo y ligereza del paquete).

---

## Guía de Desarrollo

### Requisitos Previos
Asegúrate de tener instalado [Node.js](https://nodejs.org/) (versión 18 o superior) y el gestor de paquetes [pnpm](https://pnpm.io/).

### 1. Clonar e Instalar Dependencias
Instala los módulos de CATAPP utilizando el comando nativo:
```bash
pnpm install
```

### 2. Ejecutar Servidor de Desarrollo
Inicia el entorno de pruebas local:
```bash
pnpm dev
```
La aplicación estará disponible en la dirección local `http://localhost:5173`.

### 3. Compilación de Producción
Genera los archivos estáticos optimizados y listos para producción:
```bash
pnpm build
```
Los archivos compilados de alta velocidad se guardarán en la carpeta `/dist`.

---
