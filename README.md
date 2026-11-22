# ConectaResto MVP - Frontend

Frontend del MVP de ConectaResto. Aplicación de una sola página (SPA) desarrollada en JavaScript vanilla con Bootstrap 5.

## Requisitos previos

- Python 3 instalado en el sistema
- Navegador web moderno (Chrome, Firefox, Edge, Safari)

## Ejecución local

Abrir una terminal en la carpeta raíz del frontend (`frontend/`) y ejecutar:

```bash
python -m http.server 8000 --bind 127.0.0.1
```

Luego abrir en el navegador:

```
http://127.0.0.1:8000
```

### Parámetros utilizados

- `8000`: Puerto en el que se expone el servidor.
- `--bind 127.0.0.1`: Restringe el acceso únicamente al equipo local (localhost). El servidor no será accesible desde otros equipos de la red.

### Detener el servidor

Presionar `Ctrl+C` en la terminal donde se ejecuta el servidor para detenerlo.

## Notas importantes

- El servidor Python sirve únicamente los archivos estáticos del frontend (HTML, CSS, JavaScript, imágenes).
- **No inicia el backend Flask.** Para el funcionamiento completo de la aplicación (autenticación, pedidos, cocina, caja, administración) es necesario tener el backend Flask ejecutándose por separado y accesible desde el frontend.
- Las rutas de la aplicación utilizan anclas (`#login`, `#public`, `#waiter`, `#kitchen`, `#cashier`, `#admin`) y no requieren recarga de página para navegar entre vistas.

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
└── vendor/bootstrap/       # Bootstrap 5 (versión local)
```

## Versiones

- Bootstrap 5.3.2 (archivos locales en `vendor/bootstrap/`)
- JavaScript ES6+