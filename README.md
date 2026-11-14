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

El login maneja usuario/contraseña y OTP cuando el backend solicita 2FA. Redirige a `/super-admin`, `/admin`, `/mesero`, `/chef` o `/cliente` según el usuario validado. Super Admin dispone de la gestión de restaurantes y Mesero de la precuenta. Administrador dispone de turnos, caja, movimientos de efectivo, consulta de clientes, promociones, empleados, elementos de menú, catálogo, inventario y configuración del restaurante. Chef dispone de Turnos y Cliente conserva el layout base para incorporar sus páginas.

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

## Turnos, caja y movimientos (RFE-001 a RFE-003, RFA-056)

**Turnos** está disponible en `/admin/shifts`, `/mesero/shifts` y `/chef/shifts`. Cada empleado registra su propia entrada y salida con confirmación; el servidor asigna la identidad y los horarios. Administrador consulta todos los turnos del restaurante y Mesero/Chef consultan los propios. Nadie cierra el turno de otro empleado.

**Caja** se abre en `/admin/cash/registers` o `/mesero/cash`, indicando el monto de apertura. Solo puede haber una caja abierta por restaurante. El detalle permite a Mesero cerrarla con el efectivo contado; el backend rechaza el cierre con órdenes pendientes y calcula efectivo esperado y diferencia. Los importes de cierre se muestran como pendientes hasta que la API los devuelve.

**Movimientos de efectivo**, en `/admin/cash/movements`, permite al Administrador registrar `cash_in` y `cash_out` en cajas abiertas. Las salidas requieren `payroll`, `minor_purchase` u `other`. Nómina requiere empleado y fechas del periodo; esos campos se omiten para otros motivos y las entradas no envían motivo.

Los movimientos son de consulta una vez registrados. La API valida efectivo disponible, límites y estado de caja. Los formularios conservan los datos ante rechazos y evitan solicitudes duplicadas mientras se procesa una operación. Los montos se envían como texto con hasta dos decimales; las fechas de nómina se conservan como `YYYY-MM-DD`.

Los enlaces de Mesero conservan la precuenta existente y añaden Turnos/Caja. Chef dispone de Turnos. Los formularios reutilizan los mismos componentes visuales y respetan los permisos del backend.

## Clientes y promociones del Administrador

**Clientes**, en `/admin/customers`, permite consultar el listado paginado y el detalle de clientes vinculados al restaurante. Muestra nombre, correo, teléfono, estado y saldo de puntos de ese restaurante. Esta página es de consulta.

**Promociones**, en `/admin/promotions`, permite listar, crear, editar, activar/desactivar y dar de baja con confirmación. Integra las condiciones `min_amount`, `product_quantity` y `category_discount`, y descuentos `percentage` o `fixed_amount`.

Las cantidades de productos deben ser enteras y positivas. El descuento por categoría requiere al menos una categoría y no usa valor de condición. Los descuentos porcentuales admiten hasta 100 y los montos hasta 99999999.99, con hasta dos decimales.

Las fechas mantienen el formato `YYYY-MM-DD`. Los días se envían como abreviaciones `Mon` a `Sun` separadas por comas; no seleccionar días elimina la restricción. El horario requiere ambas horas diferentes o ninguna y admite cruzar medianoche. Las horas conservan sus segundos y se envían sin conversión de zona horaria.

Los selectores múltiples incluyen todas las páginas de elementos de menú y categorías del restaurante. La edición consulta el registro actual y envía solo los cambios mediante `PUT`; quitar todas las asociaciones envía listas vacías. Los errores de Laravel conservan los datos para corregirlos.

## Empleados del Administrador (RFA-024)

Abre **Empleados** o entra en `/admin/employees`. Permite consultar, crear, editar y dar de baja cuentas del restaurante. Integra nombre, correo, usuario opcional, idioma, teléfono, rol (`admin`, `waiter`, `chef`), tarifa por hora y estado activo. Solo Chef tiene estación (`kitchen` o `bar`).

El alta requiere contraseña confirmada. Al editar, dejar contraseña y PIN vacíos conserva las credenciales. El PIN admite de 4 a 6 dígitos y promover a Administrador requiere asignar uno nuevo. Laravel rechaza PIN duplicados de Administradores del mismo restaurante.

Si se omite el PIN al crear, el backend lo genera y la interfaz lo muestra una sola vez, hasta cerrar el aviso. La interfaz no lo guarda en almacenamiento del navegador. Los campos secretos se limpian al enviar o cerrar el formulario y nunca se rellenan con datos guardados.

La edición usa `PUT` con solo los cambios. Cambiar las propias credenciales o permisos cierra la sesión, de acuerdo con la revocación del backend. Laravel impide eliminar, desactivar o degradar al último Administrador activo; sus errores se muestran sin descartar los datos no secretos del formulario.

## Elementos de menú del Administrador (RFA-013)

Abre **Menú** o entra en `/admin/menu`. Permite listar, crear, editar y dar de baja elementos con categoría, nombre, precio de venta, descripción e imagen opcionales, estación (`none`, `kitchen`, `bar`), indicador de edad legal y estado activo.

La receta admite ingredientes del restaurante, sin duplicados, y cantidades positivas de hasta tres decimales en la unidad de cada ingrediente. Puede quedar vacía y no exige ni descuenta stock al guardarse. Los selectores cargan todas las páginas de categorías e ingredientes.

La edición consulta el elemento actualizado y envía por `PUT` solo lo modificado. Los cambios de datos generales conservan la receta; quitar todas sus partidas envía `ingredients: []`. La baja requiere confirmación y muestra los conflictos que devuelva Laravel. Los cambios usan la auditoría existente del backend y no requieren PIN.

## Inventario del Administrador (RFA-023)

Abre **Inventario** o entra en `/admin/inventory`. **Ingredientes y existencias** permite listar, crear, editar y dar de baja ingredientes con nombre, unidad, costo unitario y existencias. Las unidades son `g`, `kg`, `oz`, `lb`, `ml`, `l`, `fl_oz`, `gal` y `pza`.

Las existencias se editan como saldo absoluto. La edición consulta el registro actual y envía únicamente los campos modificados mediante `PUT`, para no reemplazar existencias al cambiar solo el nombre o costo. Laravel bloquea cambios de unidad cuando hay pérdidas, consumos o recetas y bajas de ingredientes usados en recetas activas.

**Pérdidas** permite registrar ingrediente, cantidad y motivo, además de consultar el historial y su detalle. El backend descuenta las existencias en una transacción y rechaza cantidades superiores al stock. Las pérdidas son de consulta y conservan su historial tras la baja del ingrediente; cuando la API ya no ofrece el nombre del ingrediente, se muestra su identificador. El empleado y la fecha son datos asignados por el servidor.

Los costos conservan hasta cuatro decimales y las existencias y cantidades hasta tres. Los selectores incluyen todas las páginas de ingredientes disponibles. Los formularios conservan sus datos ante errores y no reintentan automáticamente registros de pérdidas.

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

## Órdenes del Mesero (8a)

En `/mesero/orders`, el Mesero consulta sus órdenes, crea borradores para comer aquí, para llevar o a domicilio, agrega/edita/elimina partidas y confirma. Requiere una caja abierta. Precios, estación, impuestos, totales e inventario los determina Laravel; la confirmación consume existencias y bloquea la edición del borrador. La precuenta conserva `/mesero`. Los errores del backend permanecen visibles sin perder los campos ingresados.

## Ajustes de órdenes del Mesero (8b)

Desde el detalle de `/mesero/orders` se aplican descuentos por porcentaje o monto a toda la orden o una partida, cortesías a toda la orden, exenciones con motivo y cancelaciones de orden o partida. Se requiere PIN para descuentos, cortesías y cancelaciones de órdenes enviadas; las exenciones y cancelaciones de borradores no lo piden. Descuentos y cortesías requieren turno abierto y respetan los límites de configuración. El PIN se elimina del formulario tras cada intento enviado y al cerrar el diálogo; los errores de autorización y bloqueo temporal permanecen visibles. Totales e identidades de auditoría proceden del backend. Las cancelaciones no reintegran automáticamente el inventario consumido.
