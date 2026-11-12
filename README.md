# DelishioFrontend

## Precuenta del Mesero

Inicia el backend en `http://127.0.0.1:8000` y ejecuta `npm ci` y `npm start` en este repositorio. Abre `/login`, inicia sesión con una cuenta de mesero y elige **Generar precuenta** en una orden confirmada con caja abierta. **Imprimir precuenta** abre el diálogo del navegador.

El proxy de desarrollo reenvía `/api` al backend. Para producción, publica el frontend y enruta `/api` al backend en el mismo origen.

## Estructura del frontend

La aplicación usa NgModules y Axios. `AppRoutingModule` carga cada área bajo demanda.

- `pages/` contiene `auth`, `super-admin`, `admin`, `waiter`, `chef` y `customer`.
- `layouts/` contiene los contenedores de navegación de cada área.
- `services/api.service.ts` concentra las llamadas HTTP y agrega el token desde `SessionService`.
- `SessionService` publica los cambios de sesión y guarda solo el token en `sessionStorage`. Al recargar una ruta protegida, el guard consulta `GET /api/v1/user` antes de permitir el acceso.
- `guards/` verifica sesión y rol. `shared/` reúne componentes reutilizables.
- `environments/` define la URL de la API. La compilación de producción reemplaza `environment.ts` por `environment.prod.ts`. Ambos usan `/api/v1` con la configuración actual.

El login maneja usuario/contraseña y OTP cuando el backend solicita 2FA. Redirige a `/super-admin`, `/admin`, `/mesero`, `/chef` o `/cliente` según el usuario validado. Super Admin dispone de la gestión de restaurantes y Mesero de la precuenta. Administrador dispone del catálogo y de la configuración del restaurante. Chef y Cliente conservan el layout base para incorporar sus páginas.

## Base visual compartida

Los layouts de Super Admin y Administrador comparten navegación lateral y un menú móvil basado en el diálogo nativo. Cliente utiliza navegación inferior. El modo claro u oscuro sigue la preferencia del sistema.

- `src/styles/_tokens.scss` centraliza colores, tipografía, radios y espaciado.
- `src/styles/_controls.scss` contiene los estilos de formularios, tablas, botones y etiquetas de estado.
- `SharedModule` exporta `AppShellComponent`, `NavigationComponent`, `PageHeadingComponent`, `PanelComponent`, `FeedbackComponent`, `DialogComponent` y la directiva `dButton`.
- `DialogComponent.open()` abre el diálogo y `close()` lo cierra. El diálogo tiene título accesible y restaura el foco al cerrarse.
- `layout-navigation.ts` define las etiquetas en español e inglés. Las secciones que todavía no tienen página aparecen deshabilitadas con la indicación Próximamente.

Las etiquetas `.d-badge[data-status]` conservan los estados `pending`, `in_preparation`, `ready`, `cancelled`, `error`, `suspended` y `active`. El texto visible debe localizarse al consumirlas. Los controles nativos usan `d-field`, `d-input`, `d-select`, `d-field-hint` y `d-field-error`; cada campo debe conservar su etiqueta y enlazar sus mensajes con `aria-describedby`.
## Restaurantes del Super Admin

Inicia sesión con una cuenta Super Admin (incluye OTP). En `/super-admin` se muestra el listado paginado por el backend, con detalle de cada restaurante.

**Nuevo restaurante** solicita nombre, dirección, teléfono y los datos del Administrador: nombre, correo y contraseña confirmada. **Ver detalle** permite editar la información general, el logo y la cuenta Stripe Connect, así como activar, suspender y eliminar con confirmación. La eliminación es una baja lógica y conserva el historial según el backend. Laravel aplica las reglas de acceso y las validaciones.

## Catálogo del Administrador

Abre **Catálogo** en la navegación del Administrador o entra en `/admin/catalog`. Las secciones **Clases de impuesto**, **Súper categorías** y **Categorías** permiten listar, agregar, editar y eliminar con confirmación.

Cada súper categoría requiere una clase de impuesto y cada categoría requiere una súper categoría del restaurante. Los selectores incluyen todas las páginas de la relación. El impuesto admite de 0 a 999.99 con hasta dos decimales; la descripción opcional de categoría admite hasta 65535 bytes UTF-8.

La edición consulta el registro actual y utiliza `PUT`. Laravel impide eliminar registros relacionados; el mensaje se muestra en la confirmación y el registro se conserva. Las listas usan la paginación de 20 registros del backend. Los formularios envían únicamente los campos editables, sin identificadores de restaurante.

## Configuración del restaurante (RFA-055)

Como Administrador, abre **Configuración** en la navegación o entra en `/admin/settings`. La página consulta la configuración del restaurante de la sesión y guarda mediante `PATCH /api/v1/admin/restaurant/configuration`, enviando solo los campos modificados.

Incluye información general, moneda, límites, puntos, precios duales, zona horaria IANA y política de horas extra. Los decimales se conservan como texto para evitar redondeos al enviarlos. Los factores se requieren al habilitar puntos y el ajuste al habilitar precios duales; al deshabilitarlos se conservan los valores guardados. **Descartar cambios** restaura la última configuración cargada o guardada.

Laravel valida la zona horaria y bloquea cambios de moneda si ya se abrió una caja. Si rechaza un guardado, se muestran sus mensajes y se conservan las modificaciones para corregirlas.

## Autenticación y perfil

El acceso comienza en `/login`. Desde ahí se puede registrar una cuenta de Cliente en `/register`, verificar el correo en `/verify-email` y recuperar la contraseña mediante `/forgot-password` y `/reset-password`.

El registro requiere nombre, correo, teléfono y contraseña confirmada. El usuario es opcional y el idioma puede ser español o inglés. La cuenta debe verificarse con el código enviado por correo antes de iniciar sesión. El login solicita un segundo código cuando el backend indica que se requiere 2FA.

El enlace de perfil del encabezado abre `/profile` para cualquier rol autenticado. Permite actualizar nombre, usuario, idioma y teléfono. El teléfono aplica a Clientes y empleados. El correo se muestra para consulta. Los cambios de 2FA requieren la contraseña actual y el Super Admin tiene 2FA permanente.

Para probar los correos localmente, usa `MAIL_MAILER=log` y `QUEUE_CONNECTION=sync` en el backend y consulta los códigos en su log. En producción, configura el transporte de correo y los workers de la cola cuando corresponda. La recuperación utiliza los códigos del backend y revoca las sesiones anteriores de esa cuenta.
This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 19.2.27.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Karma](https://karma-runner.github.io) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
