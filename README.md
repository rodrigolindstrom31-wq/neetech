# Repositorio Académico UEP · Campus Gutenberg

Sitio inicial para un repositorio público de investigaciones en PDF con panel de administración. Diseñado para desplegar en **Cloudflare Pages**, usando **Pages Functions**, **D1** (metadatos) y **R2** (archivos PDF).

> Este proyecto es una base técnica para adaptar. No es un sitio oficial de la UEP ni incluye un logotipo institucional oficial. Antes de publicarlo, obtené autorización para usar nombre, marca y documentos académicos.

## Incluye

- Página pública adaptable a móvil y escritorio.
- Búsqueda por título, autor, tema, palabras clave y categoría.
- Lectura de PDF en el navegador.
- Inicio/cierre de sesión de administrador.
- Panel para publicar y eliminar investigaciones.
- Contraseñas almacenadas como hash PBKDF2, sesión firmada y cookie HttpOnly.
- Límite de carga de 20 MB y comprobación de firma PDF.
- D1 para metadatos y R2 para los PDF.

## Requisitos

- Cuenta Cloudflare con Pages, D1 y R2 disponibles.
- Node.js 20 o superior y Wrangler (`npm install -g wrangler`).
- Un nombre de proyecto de Pages y autorización para publicar documentos.

## 1. Crear los recursos de Cloudflare

Iniciá sesión:

```bash
npx wrangler login
```

Creá la base D1 y el bucket R2:

```bash
npx wrangler d1 create repositorio-uep
npx wrangler r2 bucket create repositorio-uep-pdfs
```

Copiá el `database_id` que devuelve D1 y reemplazá `REEMPLAZAR_CON_ID_DE_D1` en `wrangler.toml`.

Aplicá el esquema a la base remota:

```bash
npx wrangler d1 execute repositorio-uep --remote --file=./schema.sql
```

Si trabajás primero en local, usá `--local` en vez de `--remote`.

## 2. Crear la contraseña del administrador

Generá un hash seguro (no guardamos la contraseña en texto plano):

```bash
node scripts/hash-password.mjs
```

Ingresá una contraseña única de al menos 12 caracteres y copiá la línea `pbkdf2$...` generada. Luego ejecutá el SQL, reemplazando `admin` si querés otro nombre de usuario y pegando el hash completo:

```bash
npx wrangler d1 execute repositorio-uep --remote --command="INSERT INTO admins (username, password_hash) VALUES ('admin', 'PEGAR_HASH_COMPLETO_AQUI');"
```

El hash generado contiene `$`. Verificá que la terminal preserve todos los caracteres; si tenés dudas, usá la consola SQL de Cloudflare D1 y pegá allí el comando.

## 3. Configurar el secreto de sesión

Generá una clave aleatoria larga (mínimo 32 caracteres) y cargala como secreto, nunca como variable pública:

```bash
npx wrangler pages secret put SESSION_SECRET --project-name repositorio-uep-gutenberg
```

Pegá una clave aleatoria de 32 caracteres o más. No la subas a Git ni la incluyas en el frontend.

## 4. Crear el proyecto Pages y conectar recursos

En Cloudflare Dashboard:

1. Entrá a **Workers & Pages → Create → Pages** y creá el proyecto `repositorio-uep-gutenberg`.
2. Para una primera prueba, podés desplegarlo con Wrangler desde la carpeta del proyecto.
3. En **Settings → Functions → D1 database bindings**, agregá el binding `DB` y elegí `repositorio-uep`.
4. En **Settings → Functions → R2 bucket bindings**, agregá el binding `PDFS` y elegí `repositorio-uep-pdfs`.
5. En **Settings → Variables and Secrets**, configurá `SESSION_SECRET` como secreto.
6. Confirmá que los nombres de los bindings coincidan exactamente con `DB`, `PDFS` y `SESSION_SECRET`.

Para desplegar directamente desde esta carpeta, después de crear el proyecto y configurar `wrangler.toml`:

```bash
npx wrangler pages deploy . --project-name repositorio-uep-gutenberg
```

No uses el directorio del proyecto completo si agregaste archivos privados o documentos que no querés publicar. En este repositorio, `functions/`, `assets/`, `index.html`, `admin.html` y `wrangler.toml` son parte de la app. Para producción, lo más ordenado es configurar un directorio de salida separado que contenga solo los archivos públicos y mantener `functions/` en la raíz del proyecto de Pages; seguí la estructura oficial de Pages Functions si adaptás el proceso de build.

## 5. Prueba local (opcional)

Instalá Wrangler y ejecutá:

```bash
npx wrangler pages dev .
```

Los bindings D1 y R2 deben estar configurados para la prueba. Podés probar en remoto con un proyecto de pruebas separado para evitar modificar contenido real.

## Rutas API

| Método | Ruta | Uso |
|---|---|---|
| GET | `/api/articles` | Lista pública de investigaciones |
| GET | `/api/pdf/:id` | Abre el PDF publicado |
| POST | `/api/login` | Inicia sesión de administrador |
| GET | `/api/session` | Verifica la sesión |
| POST | `/api/logout` | Cierra sesión |
| GET | `/api/admin/articles` | Lista privada para administración |
| POST | `/api/admin/articles` | Carga un PDF y sus metadatos |
| DELETE | `/api/admin/articles/:id` | Elimina una publicación |

## Antes de publicar oficialmente

- Reemplazá el bloque de marca `UEP` por el logo autorizado y ajustá la paleta institucional.
- Agregá información de contacto, política de privacidad, reglas de depósito y licencias de uso.
- Publicá solo documentos para los que la institución/autores hayan autorizado la difusión.
- Usá una contraseña robusta y exclusiva; limitá el acceso al panel.
- Considerá incorporar límites de intentos de inicio de sesión (por ejemplo, Cloudflare rate limiting/WAF), recuperación segura de acceso, auditoría de cambios y copias de seguridad de D1/R2.
- Probá el flujo completo en un proyecto de staging antes de abrir el acceso al público.

## Notas técnicas

- La autenticación usa una cookie de sesión `HttpOnly`, `SameSite=Strict` y `Secure` cuando la petición usa HTTPS. La sesión dura ocho horas.
- Los archivos se sirven desde una función, no mediante enlaces públicos directos al bucket R2.
- La interfaz de administración requiere JavaScript.
- Los datos son reales únicamente después de conectar D1/R2 y crear el usuario administrador.
