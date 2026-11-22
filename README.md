# ConectaResto MVP - Frontend

Aplicación de una sola página (SPA) para la demostración local de ConectaResto. Usa **HTML, CSS, JavaScript vanilla y Bootstrap 5 local**. Se sirve desde este repositorio y consume la API Flask del backend independiente. [Repositorio del backend](https://github.com/ConectaResto/ConectaResto-MVP).

## Requisitos previos

- Python 3 para servir los archivos estáticos.
- Navegador web moderno (Chrome, Firefox, Edge o Safari).
- Backend Flask en `http://127.0.0.1:5000`. [README del backend](https://github.com/ConectaResto/ConectaResto-MVP/blob/main/README.md).

## Ejecución local

Inicia el backend y abre otra terminal en la raíz de este repositorio, donde está `index.html`. Ejecuta:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Abre `http://127.0.0.1:8000/#login`. Mantén ambos servidores en ejecución.

### Parámetros utilizados

- `8000` es el puerto del servidor estático.
- `--bind 127.0.0.1` limita el acceso al equipo local.

### Detener el servidor

Presionar `Ctrl+C` en la terminal donde se ejecuta el servidor para detenerlo.

## Integración con la API

`js/api.js` define `API_ORIGIN` como `http://127.0.0.1:5000` y usa `apiUrl()` para resolver las rutas de la API. Las solicitudes incluyen las cookies de sesión mediante `credentials: 'include'`. El cliente obtiene el token con `GET /auth/csrf` y lo envía en `X-CSRF-Token` para `POST`, `PUT`, `PATCH` y `DELETE`, incluso al enviar un pedido público. En desarrollo, Flask permite este intercambio desde el origen exacto `http://127.0.0.1:8000`.

## Roles y navegación

`js/app.js` cambia de vista mediante el fragmento de la URL. Tras iniciar sesión, cada rol entra en su propio panel.

| Vista | Ruta | Uso |
| --- | --- | --- |
| Inicio de sesión | `#login` | Acceso del personal. |
| Administración (`ADMIN`) | `#admin` | Mesas y QR, categorías, productos y usuarios. |
| Mesero (`WAITER`) | `#waiter` | Mesas, servicios, pedidos y entregas. |
| Cocina (`KITCHEN`) | `#kitchen` | Consulta de pedidos y actualización de su preparación. |
| Caja (`CASHIER`) | `#cashier` | Pago simulado y cierre de servicios. |
| Menú público | `#public` | Catálogo, carrito y pedido del cliente mediante QR, sin iniciar sesión. |

## Menú público e imágenes

El QR abre `/?token=<token>#public`. `public.js` lee `token` de la parte anterior a `#public` con `URLSearchParams`, consulta `GET /public/mesas/<token>` y carga el catálogo con `GET /categories` y `GET /products`. Al confirmar el carrito, envía `POST /public/mesas/<token>/pedidos`.

Los productos sin foto muestran `img/default-product.svg`, servido por el frontend. Cuando el catálogo devuelve `image_url` para una fotografía real, la SPA usa `apiUrl()` para solicitarla a Flask mediante `GET /products/<id>/image`.

## Estructura del proyecto

```
frontend/
├── index.html              # Punto de entrada (SPA)
├── css/
│   └── style.css           # Estilos personalizados
├── js/
│   ├── app.js              # Router y navegación por roles
│   ├── api.js              # Cliente de API
│   ├── components.js       # Componentes reutilizables
│   ├── state.js            # Estado de la aplicación
│   └── views/              # Vistas por rol
│       ├── login.js
│       ├── public.js       # Menú público (sin autenticación)
│       ├── waiter.js       # Panel mesero
│       ├── kitchen.js      # Panel cocina
│       ├── cashier.js      # Panel caja
│       └── admin.js        # Panel administrador
├── img/
│   └── default-product.svg # Imagen predeterminada
└── vendor/bootstrap/      # CSS, JavaScript y licencia de Bootstrap local
```

## Versiones

- Bootstrap 5.3.2 (archivos locales en `vendor/bootstrap/`)
- JavaScript ES6+

## Solución de problemas

| Problema | Qué comprobar |
| --- | --- |
| El catálogo o el inicio de sesión no cargan | Confirma que Flask esté en ejecución y que `http://127.0.0.1:5000/health` responda. |
| Error de CORS | Abre `http://127.0.0.1:8000` en el navegador. `localhost`, otro puerto y `file://` son orígenes distintos. |
| Una imagen no carga | Para el SVG, comprueba que `http://127.0.0.1:8000/img/default-product.svg` esté disponible y que el servidor se haya iniciado desde la raíz del frontend. Para fotos reales, comprueba la URL `/products/<id>/image` en Flask y que el producto esté activo y disponible. |
| El menú avisa que falta el token | Abre el enlace completo del QR. Comprueba que `?token=<token>` esté antes de `#public` y que el token corresponda a una mesa. |
| Un puerto está ocupado | Libera el `8000` para la SPA o el `5000` para Flask, según corresponda, y vuelve a iniciar el servidor. |
