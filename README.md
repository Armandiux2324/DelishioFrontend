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

## Cierre de cuenta del Mesero (8c)

Desde el detalle de `/mesero/orders` se vincula el cliente mediante el UUID de su QR y se cobra una orden POS confirmada. Se admiten efectivo, transferencia y tarjeta, con propina y canje de puntos. Introduce montos base y usa “Asignar resto a tarjeta” para obtener el resto calculado por Laravel; el ajuste por tarjeta se muestra aparte y excluye la propina. La revisión muestra moneda, impuestos reducidos por canje y puntos sobre consumo neto. Cualquier edición invalida la cotización; solo se permite cerrar con diferencia cero. El servidor vuelve a validar y registra pagos y puntos. Los fallos de cierre no se reintentan automáticamente. El cierre registra el pago POS; no ejecuta un cargo en una terminal bancaria.

## Cola del Chef (RFC)

`/chef` muestra partidas confirmadas de la estación asignada al Chef (cocina o bar), con filtros en curso, pendiente, en preparación y listo. No envía una estación elegida por el cliente. Los botones avanzan únicamente pending → in_preparation → ready y respetan las validaciones de Laravel. Muestra cantidades, mesa/tipo de servicio, modificadores y notas de cocina.

Consulta la página actual cada 5 segundos, sin superponer solicitudes; pausa al ocultar la pestaña y limpia el temporizador al salir. Si falla la consulta conserva las tarjetas y la última sincronización, avisa de datos desactualizados y bloquea cambios hasta recuperar la conexión. El modo TV es de solo lectura y rota grupos de hasta 4 tarjetas cada 15 segundos, pasando por las páginas del servidor. El modo táctil conserva controles grandes y paginación manual.

## Área del Cliente

`/cliente` lista restaurantes activos. Su detalle ofrece menú paginado, promociones vigentes y carrito para llevar (cantidad, modificadores y notas). El total definitivo con impuestos y ajuste por tarjeta procede de Laravel y se revisa en `/cliente/orders/:id` antes de autorizar. No envía precios, cuenta Stripe, promociones ni canjes en la creación. Los pedidos en línea acumulan puntos; el canje se realiza con el Mesero, según la API actual.

El flujo usa el SDK oficial `@stripe/stripe-js` y Payment Element en la cuenta Connect recibida del servidor. Ningún número de tarjeta ni CVV pasa por Angular o la API de Delishio. Configura en el backend las claves de Stripe, cuenta de cada restaurante, webhook Connect y tareas de conciliación/reintentos; se requiere caja abierta y disponibilidad. La respuesta del navegador no marca el pedido pagado: el webhook autoriza/captura y el cliente consulta el estado del servidor cada 5 segundos mientras el pedido o reembolso sigue pendiente. La consulta pausa en pestañas ocultas y termina al salir.

Una creación con respuesta perdida se recupera con la misma clave Idempotency-Key y el mismo contenido; la solicitud pendiente se guarda por usuario/restaurante en sessionStorage (con respaldo en memoria cuando el navegador no permite almacenamiento). Historial y saldos se consultan con las rutas del Cliente, sin IDs de otros usuarios. El retorno bancario elimina los parámetros de pago de la URL y la aplicación omite el Referer para proteger esos datos. No se almacenan secretos de pago en el carrito.

La validación local de integración utiliza Laravel con SQLite temporal y Stripe/SDK simulados; no demuestra cobros reales, 3DS bancario ni configuración productiva del webhook. Antes de producción hay que comprobar el flujo con las cuentas Connect y claves de prueba reales de Stripe.

## Ventas por plataforma externa (RFPE-001)

Administrador: `/admin/external-sales`. Mesero: `/mesero/external-sales`. Incluye listado paginado, detalle y registro; no ofrece edición ni eliminación porque la API no las permite. Plataformas: doordash, ubereats, didi y rappi. Captura total, comisión, fecha opcional y de 1 a 100 partidas con descripción, cantidad, precio unitario y vinculación opcional al menú. El neto y la identidad del empleado proceden de Laravel. La fecha se introduce en hora local del dispositivo y se envía como instante ISO; si se omite, la asigna el servidor.

El total de la plataforma es independiente de la suma de partidas. Registrar estas ventas no genera cobros ni órdenes de cocina y no descuenta inventario. Ante un fallo de resultado incierto, el formulario bloquea el reenvío y ofrece revisar las ventas recientes; no hace reintentos automáticos. La API no dispone de clave de idempotencia para este registro.

## Dashboard del Administrador (RFA-001)

`/admin` consulta el dashboard real con Hoy, Ayer, Últimos 7 días o rango personalizado inclusivo. Solo envía period o from/to; el restaurante se obtiene de la sesión. Las fechas efectivas y la zona horaria se muestran tal como las devuelve el backend. La moneda procede de la configuración del restaurante.

Incluye ventas totales, ticket promedio, número de ventas, órdenes creadas/abiertas, las 24 horas con sus importes, métodos de pago con ajuste separado, categorías y top 5 empleados POS. Conserva las agrupaciones del backend y no recalcula totales. Si falla una actualización mantiene el último resultado identificado por sus fechas y muestra el error. No necesita dependencias de gráficas nuevas.

## Reporte de transacciones por tipo de pago (RFA-033)

`/admin/reports/payment-transactions` consulta el rango inclusivo from/to en el endpoint real del backend. Muestra efectivo, tarjeta, transferencia y pedidos en línea, con transacciones, monto base, ajuste por tarjeta y total, junto a los totales devueltos por Laravel. Usa la moneda de configuración y la zona horaria de la respuesta; no recalcula importes ni agrega ventas externas.

“Exportar periodo mostrado (XLSX)” descarga el archivo del mismo endpoint con format=xlsx y las fechas del último reporte correcto, aunque el formulario tenga cambios sin aplicar. Los errores JSON recibidos como Blob se muestran como validación; no se guardan como Excel. La descarga autenticada valida el tipo de archivo, genera un nombre con el rango y libera su URL temporal.

## Reporte de órdenes (RFA-034)

`/admin/reports/orders` consulta los tipos paid, open y online con rango inclusivo from/to. Pagadas filtra por cierre; abiertas incluye open/sent por creación; en línea consulta customer_app por creación. La tabla muestra los datos paginados del backend y ofrece un detalle de solo lectura con importes, fechas y estado del pago en línea cuando existe.

Paginación y XLSX usan los filtros del último resultado correcto, aunque el formulario tenga cambios sin consultar. La exportación no envía page y contiene todas las órdenes que coincidan con el tipo/rango. Conserva el reporte ante errores, valida los archivos y libera la URL de descarga. Los enlaces de Reportes permiten alternar RFA-033 y RFA-034.

## Reporte de asociación de impuestos (RFA-035)

`/admin/reports/tax-associations` muestra la asociación vigente de cada elemento del menú, su estado activo/inactivo, categoría, súper categoría, clase de impuesto y porcentaje literal del backend, incluida tasa cero. No añade filtros por fecha porque la API no los admite.

La consulta se pagina de 20 en 20. El XLSX se descarga desde el mismo endpoint con format=xlsx, sin page, y contiene todos los resultados del restaurante. Mantiene resultados ante errores, rechaza archivos inválidos y libera la URL temporal de descarga. Los enlaces de Reportes conectan RFA-033, RFA-034 y RFA-035.

### Resumen de ventas · RFA-036

`/admin/reports/sales-summary` consulta el rango inclusivo from/to en el backend real. Muestra el desglose de órdenes (descuentos, canje, impuestos, envío, propina y ajuste por tarjeta), ventas externas y comisiones, y los totales consolidados devueltos por Laravel. Usa la moneda de configuración y la zona horaria de la respuesta; no calcula importes en el navegador.

El XLSX se solicita al mismo endpoint con format=xlsx y las fechas del último reporte consultado correctamente, incluso si el formulario tiene cambios sin aplicar. Conserva la vista ante errores temporales y respeta la sesión del Administrador. Incluye horario opcional (ambas horas, con segundos, aplicado a cada día del periodo) y terminal/caja opcional. Las horas se envían como HH:mm:ss y el reporte visible muestra la zona horaria del backend. Al seleccionar una caja se excluyen ventas externas y órdenes no asociadas a esa caja. El selector carga todas las páginas de cajas abiertas y cerradas; permite reintentar si falla. El XLSX conserva las fechas, horario y caja del último reporte consultado correctamente, aunque existan cambios pendientes en el formulario.

### Reporte de productos · RFA-037

`/admin/reports/products` consulta el endpoint real con fechas inclusivas desde/hasta y filtros opcionales de súper categoría, categoría y modificador (texto parcial sin distinguir mayúsculas, hasta 255 caracteres). Los selectores cargan todas las páginas del catálogo del restaurante; cambiar de súper categoría limpia una categoría incompatible.

Presenta cantidades vendidas/devueltas, costo unitario estimado con cuatro decimales, ventas brutas, descuentos/cortesías, canje, devolución de consumo e impuesto, ventas netas, impuesto neto y total con impuesto. Los importes y totales provienen de Laravel. Las ventas usan la fecha de cierre y las devoluciones su propia fecha; se admiten totales negativos para devoluciones de ventas anteriores. El costo estimado usa la receta actual, y el impuesto se distribuye con tasas actuales como ponderación. No incluye propina, envío, ajuste por tarjeta ni ventas externas.

El XLSX se solicita al mismo endpoint con format=xlsx y todos los filtros del último reporte consultado correctamente; editar el formulario sin consultar conserva la exportación del reporte visible.

### Reporte de cortesías · RFA-038

`/admin/reports/courtesies` integra el reporte de órdenes con cortesías otorgadas definido en la especificación. Consulta el endpoint real con fechas inclusivas desde/hasta. Filtra por la fecha del otorgamiento, no por el cierre, e incluye órdenes de cualquier estado. Presenta fecha/hora en la zona horaria devuelta por la API, orden y estado, aplicación a orden/partida, porcentaje, monto autorizado, IDs del empleado solicitante y Administrador autorizante y turno. No muestra ni solicita PIN.

Las cantidades de cortesías, órdenes distintas y monto autorizado vienen del backend; no representan ventas cobradas. El XLSX completo se solicita al mismo endpoint con format=xlsx y las fechas del último reporte consultado correctamente, aunque el formulario tenga cambios pendientes. Incluye traducciones ES/EN, formato USD/MXN y estados de carga, vacío y error.

### Reportes RFA-039 a RFA-045

Las rutas del Administrador integran los endpoints reales con fechas inclusivas desde/hasta y XLSX completo generado por el backend. La exportación conserva los filtros del último reporte visible, aunque el formulario tenga cambios pendientes.

| Requisito | Ruta bajo /admin/reports | Base de fecha y contenido |
| --- | --- | --- |
| RFA-039 | discounts | Fecha de aplicación; monto autorizado, alcance y trazabilidad. Excluye cortesías y canjes. |
| RFA-040 | profit-margins | Cierre; costo y ganancia estimados con receta actual. Costos/márgenes desconocidos se muestran como —. Margen total solo de productos con costo. No descuenta devoluciones. |
| RFA-041 | taxes-and-exemptions | Impuestos por cierre y exenciones por aplicación, en tablas separadas. |
| RFA-042 | tips | Cierre; órdenes con propina positiva. |
| RFA-043 | cancellations | Cancelación de órdenes y partidas por separado. Registros antiguos sin fecha usan creación, indicada por fila. |
| RFA-044 | external-platform-sales | Fecha de venta registrada; importe bruto, comisión y neto por plataforma. Neto no equivale a utilidad. |
| RFA-045 | employee-product-sales | Cierre; empleado y rol actual opcionales. Ventas por empleado/elemento con descuentos y canje. No descuenta devoluciones. |

RFA-045 carga todas las páginas de empleados del restaurante y admite reintento si falla. Todos los totales e importes provienen de Laravel; el cliente solo da formato de fecha, moneda USD/MXN y porcentaje. Incluye español/inglés, estados de carga/vacío/error y protección ante respuestas de una ruta o sesión anterior. El menú común de reportes es desplegable para no ocupar la pantalla en móvil.

### Reportes RFA-046 a RFA-052

Se agregan al menú común los siete reportes finales, con sus filtros reales y exportación XLSX completa. Todos los importes y horas provienen del backend; la interfaz solo formatea moneda y duración.

| Requisito | Ruta bajo /admin/reports | Filtros y comportamiento |
| --- | --- | --- |
| RFA-046 | work-shifts | Fecha, empleado y rol; turnos que se superponen con el periodo, duración recortada y turnos abiertos sin estimación. |
| RFA-047 | payroll | Fecha, empleado y rol; zona horaria del restaurante, umbral semanal y multiplicador vigentes, horas ordinarias/extra y pago estimado. Incluye las marcas de cada turno; los abiertos no generan pago. |
| RFA-048 | sales-vs-labor | Fecha, empleado y rol; misma zona horaria y costo laboral con horas extra de la nómina. Porcentaje indefinido si las ventas son cero. |
| RFA-049 | cash-closures | Fecha de cierre y caja/turno opcional; apertura, ventas y movimientos en efectivo, propinas, efectivo esperado/contado y diferencia. No vuelve a sumar propinas al esperado. |
| RFA-050 | menu-audit | Fecha, empleado y elemento del menú; identidad, acción y valores anteriores/nuevos completos. Muestra los conteos por acción. |
| RFA-051 | inventory-value | Elemento opcional; valoración actual, sin fechas. Conserva cuatro decimales del costo unitario. |
| RFA-052 | inventory-losses | Fecha de registro y elemento opcional; detalle y totales de cantidad por elemento/unidad. No suma unidades diferentes ni inventa un costo histórico de pérdida. |

Los filtros por caja, menú e inventario aceptan IDs con sugerencias de todas las páginas. La auditoría también acepta el ID de un empleado histórico aunque ya no aparezca entre las sugerencias. El backend valida que los IDs pertenezcan al restaurante. Los errores de carga de sugerencias permiten reintentar y no impiden usar un ID conocido.

El XLSX conserva todos los filtros del último reporte consultado, incluso si hay cambios pendientes en el formulario. El valor de inventario se exporta sin fechas. La auditoría muestra JSON escapado sin ejecutar HTML; conserva valores cero, false, null y arreglos vacíos.

### Estado de preparación del Mesero · RFM-004

`/mesero/orders` consulta automáticamente la página actual del listado o el detalle activo cada cinco segundos mediante los endpoints reales del Mesero. El detalle conserva sus componentes mientras recibe cambios pending, in_preparation y ready; no requiere pulsar Actualizar.

El polling evita consultas simultáneas, pausa con la pestaña oculta o cualquier diálogo abierto (edición, autorización o cobro) y se reanuda al volver a la pestaña o cerrar el diálogo. No modifica los formularios. Conserva los últimos datos ante errores temporales y muestra el error; reintenta la consulta. Un 404 del detalle detiene los reintentos hasta una consulta manual. Las órdenes cerradas/canceladas dejan de consultarse automáticamente. Salir de la página cancela el temporizador y el listener; respuestas tardías de una página o sesión anterior no se aplican.

### QR del Cliente y cámara del Mesero · RFM-010

En `/cliente/points`, el UUID obtenido del backend se representa como QR SVG de alto contraste, con margen de lectura, junto al código de texto de respaldo. Se elimina de la vista al cambiar de sesión. No se envía a un servicio externo para generar la imagen.

En Vincular cliente de la orden POS, Escanear QR del Cliente abre la cámara tras la acción del usuario, preferentemente la trasera. Un UUID válido detiene la lectura y realiza una sola petición al endpoint existente de vinculación; URLs y otros contenidos no se aceptan. Conserva la entrada manual y los mensajes de validación del backend.

La cámara requiere HTTPS o localhost y permiso del navegador. Se detiene al leer, cancelar/cerrar el diálogo, ocultar la pestaña, cambiar de orden o sesión, o salir de la vista. También libera un stream autorizado después de cancelar y controles de lectura que terminen de iniciar tarde. Los errores de permisos, cámara ausente o indisponibilidad permiten reintentar o escribir el código.

ZXing se carga bajo demanda para generación/lectura local, con versiones fijadas compatibles con Node 22. Tras hacer pull, ejecuta `npm ci` para instalar las nuevas dependencias. La prueba de integración usa Laravel con SQLite temporal y una cámara simulada de Chrome que recibe vídeo Y4M con un QR real; la cámara física en iPad/Android queda pendiente de verificar.
