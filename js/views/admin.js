class AdminView {
    constructor(container) {
        this.container = container;
        this.currentSection = 'mesas';
        this.recordFilters = new Map();
    }

    async init() {
        window.appAdmin = this;
        this.container.innerHTML = `
            <div class="view-card">
                <div class="view-card-header">Panel Administrador</div>
                <div class="view-card-body">
                    <div id="adminTabContent">
                        <div id="adminMesas"></div>
                        <div id="adminCategorias" hidden></div>
                        <div id="adminProductos" hidden></div>
                        <div id="adminUsuarios" hidden></div>
                    </div>
                </div>
            </div>
        `;

        this.loadSection(this.currentSection);
    }

    async loadSection(section, { activate = false } = {}) {
        const container = this.container.querySelector(`#admin${section.charAt(0).toUpperCase() + section.slice(1)}`);
        if (!container) return;
        if (activate) {
            if (section === this.currentSection) return;
            for (const panel of container.parentElement.children) {
                panel.hidden = panel !== container;
            }
            this.currentSection = section;
        }
        if (!container.hasChildNodes()) loading(container);

        try {
            if (section === 'mesas') await this.loadMesas(container);
            if (section === 'categorias') await this.loadCategorias(container);
            if (section === 'productos') await this.loadProductos(container);
            if (section === 'usuarios') await this.loadUsuarios(container);
        } catch (err) {
            if (!container.querySelector('table')) container.textContent = 'No se pudo cargar la sección.';
            flash(err.message, 'danger');
        }
    }

    renderSection(container, { title, bodyId, headers, items, cells, add, actions, filterable = false }) {
        const header = document.createElement('div');
        header.className = 'd-flex flex-wrap align-items-center justify-content-between gap-2 mb-3';
        const heading = document.createElement('h5');
        heading.className = 'mb-0';
        heading.textContent = title;
        header.append(heading);
        const addButton = createButton('Agregar', { onClick: add });

        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        const renderRows = () => {
            const status = this.recordFilters.get(bodyId) ?? 'activos';
            const visible = filterable ? items.filter(item => item.is_active === (status === 'activos')) : items;
            this.disposeActions(tableContainer);
            const table = renderTable(tableContainer, headers, visible.map(cells),
                (row, index) => this.renderActions(row[0], actions(visible[index])));
            const body = table.tBodies[0];
            body.id = bodyId;
            if (!visible.length) {
                const cell = body.insertRow().insertCell();
                cell.colSpan = headers.length;
                cell.className = 'text-muted text-center';
                cell.textContent = filterable ? `No hay registros ${status}.` : 'No hay registros.';
            }
        };

        if (filterable) {
            const controls = document.createElement('div');
            controls.className = 'd-flex flex-wrap align-items-end gap-2';
            const filter = createInputField({
                id: `${bodyId}Filter`, name: 'estado', label: 'Mostrar registros',
                options: { activos: 'Activos', inactivos: 'Inactivos' },
                value: this.recordFilters.get(bodyId) ?? 'activos'
            });
            filter.classList.remove('mb-3');
            filter.querySelector('select').addEventListener('change', event => {
                this.recordFilters.set(bodyId, event.currentTarget.value);
                renderRows();
            });
            controls.append(filter, addButton);
            header.append(controls);
        } else {
            header.append(addButton);
        }

        this.disposeActions(container);
        container.replaceChildren(header, tableContainer);
        renderRows();
    }

    renderActions(recordLabel, actions) {
        const group = document.createElement('div');
        group.className = 'dropdown';
        const toggle = createButton('Acciones', { className: 'btn btn-sm btn-outline-secondary dropdown-toggle' });
        toggle.setAttribute('data-bs-toggle', 'dropdown');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', `Acciones de ${recordLabel}`);

        const menu = document.createElement('ul');
        menu.className = 'dropdown-menu dropdown-menu-end';
        group.append(toggle, menu);

        // Position against the viewport so the responsive table cannot clip the menu.
        const dropdown = new bootstrap.Dropdown(toggle, {
            boundary: document.body,
            popperConfig: defaults => ({ ...defaults, strategy: 'fixed' })
        });
        for (const [label, variant, onClick] of actions) {
            const item = document.createElement('li');
            item.append(createButton(label, {
                className: variant === 'danger' ? 'dropdown-item text-danger' : 'dropdown-item',
                onClick: () => {
                    dropdown.hide();
                    toggle.focus();
                    onClick();
                }
            }));
            menu.append(item);
        }
        return group;
    }

    disposeActions(container) {
        for (const toggle of container.querySelectorAll('button[data-bs-toggle="dropdown"]')) {
            bootstrap.Dropdown.getInstance(toggle)?.dispose();
        }
    }

    showDetails(title, fields) {
        return showActionDialog({
            title,
            message: Object.entries(fields).map(([label, value]) => `${label}: ${value ?? '—'}`).join('\n'),
            acceptLabel: 'Cerrar',
            canCancel: false
        });
    }

    badge(label, variant) {
        const badge = document.createElement('span');
        badge.className = `badge bg-${variant}`;
        badge.textContent = label;
        return badge;
    }

    async saveRecord({ section, title, fields, url, id, payload, success }) {
        const values = await showActionDialog({
            title, fields,
            onSubmit: values => id === undefined
                ? api.post(url, payload(values))
                : api.patch(`${url}/${id}`, payload(values))
        });
        if (!values) return;
        flash(success, 'success');
        await this.loadSection(section);
    }

    async loadMesas(container) {
        const { data: mesas = [] } = await api.get('/admin/mesas');
        this.renderSection(container, {
            title: 'Mesas y QR',
            bodyId: 'adminMesasBody',
            headers: ['Número', 'Estado', 'QR', 'Acciones'],
            items: mesas,
            cells: mesa => [
                `Mesa ${mesa.numero}`,
                this.badge(estadoLegible(mesa.estado), badgeColor(mesa.estado)),
                createButton('Ver QR', {
                    className: 'btn btn-sm btn-outline-primary',
                    onClick: () => this.verQr(mesa.id)
                })
            ],
            add: () => this.saveMesa(),
            actions: mesa => [
                ['Ver detalles', 'secondary', () => this.showDetails('Detalles de mesa', {
                    'Número': mesa.numero,
                    Estado: estadoLegible(mesa.estado)
                })],
                ['Editar', 'secondary', () => this.saveMesa(mesa)]
            ]
        });
    }

    saveMesa(mesa) {
        return this.saveRecord({
            section: 'mesas',
            title: mesa ? 'Editar mesa' : 'Agregar mesa',
            fields: [
                { name: 'numero', label: 'Número de mesa', type: 'number', value: mesa?.numero, min: 1, required: true },
                { name: 'estado', label: 'Estado', value: mesa?.estado ?? 'DISPONIBLE', options: ESTADOS_MESA, required: true }
            ],
            url: '/admin/mesas',
            id: mesa?.id,
            payload: values => ({ numero: parseInt(values.numero, 10), estado: values.estado }),
            success: mesa ? 'Mesa actualizada.' : 'Mesa creada.'
        });
    }

    async verQr(mesaId) {
        try {
            const response = await fetch(apiUrl(`/admin/mesas/${mesaId}/qr.svg`), { credentials: 'include' });
            if (!response.ok) {
                throw new Error('No se pudo cargar el QR de la mesa.');
            }
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.src = url;
            img.alt = 'Código QR de la mesa';
            img.className = 'qr-image';
            const body = document.createElement('div');
            body.className = 'text-center';
            body.append(img);
            const modal = createModal({ title: 'QR Mesa', body });
            document.body.append(modal);
            const instance = openModal(modal);
            modal.addEventListener('hidden.bs.modal', () => {
                instance.dispose();
                URL.revokeObjectURL(url);
                modal.remove();
            }, { once: true });
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    async loadCategorias(container) {
        const { data: categorias = [] } = await api.get('/categories?include_inactive=true');
        this.renderSection(container, {
            title: 'Categorías',
            bodyId: 'adminCategoriasBody',
            filterable: true,
            headers: ['Nombre', 'Descripción', 'Estado', 'Acciones'],
            items: categorias,
            cells: categoria => [
                categoria.name, categoria.description || '-',
                this.badge(categoria.is_active ? 'Activa' : 'Inactiva', categoria.is_active ? 'success' : 'danger')
            ],
            add: () => this.saveCategoria(),
            actions: categoria => [
                ['Ver detalles', 'secondary', () => this.showDetails('Detalles de categoría', {
                    Nombre: categoria.name,
                    'Descripción': categoria.description || '—',
                    Estado: categoria.is_active ? 'Activa' : 'Inactiva'
                })],
                ...(categoria.is_active ? [
                    ['Editar', 'secondary', () => this.saveCategoria(categoria)],
                    ['Eliminar', 'danger', () => this.desactivarCategoria(categoria.id)]
                ] : [
                    ['Reactivar', 'success', () => this.reactivarCategoria(categoria.id)]
                ])
            ]
        });
    }

    saveCategoria(categoria) {
        return this.saveRecord({
            section: 'categorias',
            title: categoria ? 'Editar categoría' : 'Agregar categoría',
            fields: [
                { name: 'name', label: 'Nombre', value: categoria?.name, maxLength: 100, required: true },
                { name: 'description', label: 'Descripción', value: categoria?.description, maxLength: 500 }
            ],
            url: '/categories',
            id: categoria?.id,
            payload: values => {
                if (!values.name.trim()) throw new Error('Nombre requerido.');
                return categoria ? values : { name: values.name.trim(), description: values.description.trim() };
            },
            success: categoria ? 'Categoría actualizada.' : 'Categoría creada.'
        });
    }

    confirmarEliminacionLogica(entidad) {
        return confirmAction({
            title: `Eliminar ${entidad}`,
            message: 'El registro seguirá guardado en MySQL como inactivo y podrá reactivarse desde el filtro Inactivos.',
            acceptLabel: 'Eliminar',
            danger: true
        });
    }

    async desactivarCategoria(id) {
        if (!await this.confirmarEliminacionLogica('categoría')) return;
        try {
            await api.del(`/categories/${id}`);
            flash('Categoría eliminada. Puede reactivarla desde Inactivos.', 'success');
            this.loadSection('categorias');
        } catch (err) { flash(err.message, 'danger'); }
    }

    async reactivarCategoria(id) {
        try {
            await api.patch(`/categories/${id}`, { is_active: true });
            flash('Categoría reactivada.', 'success');
            this.loadSection('categorias');
        } catch (err) { flash(err.message, 'danger'); }
    }

    async loadProductos(container) {
        const [products, categories] = await Promise.all([
            api.get('/admin/products?include_inactive=true'),
            api.get('/categories?include_inactive=true')
        ]);
        const categorias = categories.data || [];
        const nombres = new Map(categorias.map(categoria => [categoria.id, categoria.name]));
        this.renderSection(container, {
            title: 'Productos',
            bodyId: 'adminProductosBody',
            filterable: true,
            headers: ['Nombre', 'Categoría', 'Precio', 'Disponible', 'Activo', 'Acciones'],
            items: products.data || [],
            cells: producto => [
                producto.name, nombres.get(producto.categoria_id) ?? `#${producto.categoria_id}`, producto.price,
                this.badge(producto.is_available ? 'Sí' : 'No', producto.is_available ? 'success' : 'secondary'),
                this.badge(producto.is_active ? 'Sí' : 'No', producto.is_active ? 'success' : 'danger')
            ],
            add: () => this.saveProducto(null, categorias),
            actions: producto => [
                ['Ver detalles', 'secondary', () => this.showDetails('Detalles de producto', {
                    Nombre: producto.name,
                    'Descripción': producto.description || '—',
                    'Categoría': nombres.get(producto.categoria_id) ?? `#${producto.categoria_id}`,
                    Precio: producto.price,
                    Disponible: producto.is_available ? 'Sí' : 'No',
                    Estado: producto.is_active ? 'Activo' : 'Inactivo'
                })],
                ...(producto.is_active ? [
                    ['Editar', 'secondary', () => this.saveProducto(producto, categorias)],
                    ['Eliminar', 'danger', () => this.desactivarProducto(producto.id)]
                ] : [
                    ['Reactivar', 'success', () => this.reactivarProducto(producto.id)]
                ])
            ]
        });
    }

    saveProducto(producto, categorias) {
        const fields = [
            { name: 'name', label: 'Nombre', value: producto?.name, maxLength: 100, required: true },
            { name: 'description', label: 'Descripción', value: producto?.description, maxLength: 500 },
            { name: 'price', label: 'Precio', type: 'number', value: producto?.price, min: 0,
                step: producto ? 'any' : '0.01', required: true }
        ];
        if (!producto) {
            const options = Object.fromEntries(categorias.filter(categoria => categoria.is_active)
                .map(categoria => [categoria.id, categoria.name]));
            if (!Object.keys(options).length) {
                flash('Cree una categoría activa antes de agregar un producto.', 'warning');
                return;
            }
            fields.push({
                name: 'categoria_id', label: 'Categoría', options, placeholder: 'Seleccione una categoría', required: true
            });
        }
        return this.saveRecord({
            section: 'productos',
            title: producto ? 'Editar producto' : 'Agregar producto',
            fields,
            url: '/products',
            id: producto?.id,
            payload: values => {
                if (!values.name.trim()) throw new Error('Nombre requerido.');
                return producto ? values : {
                    name: values.name.trim(), description: values.description.trim(), price: values.price,
                    categoria_id: parseInt(values.categoria_id, 10), is_available: true
                };
            },
            success: producto ? 'Producto actualizado.' : 'Producto creado.'
        });
    }

    async desactivarProducto(id) {
        if (!await this.confirmarEliminacionLogica('producto')) return;
        try {
            await api.del(`/products/${id}`);
            flash('Producto eliminado. Puede reactivarlo desde Inactivos.', 'success');
            this.loadSection('productos');
        } catch (err) { flash(err.message, 'danger'); }
    }

    async reactivarProducto(id) {
        try {
            await api.patch(`/products/${id}`, { is_active: true });
            flash('Producto reactivado.', 'success');
            this.loadSection('productos');
        } catch (err) { flash(err.message, 'danger'); }
    }

    async loadUsuarios(container) {
        const { data } = await api.get('/users');
        this.renderSection(container, {
            title: 'Usuarios',
            bodyId: 'adminUsuariosBody',
            filterable: true,
            headers: ['Usuario', 'Correo', 'Rol', 'Estado', 'Acciones'],
            items: data?.users || data || [],
            cells: usuario => [
                usuario.username, usuario.email, usuario.rol,
                this.badge(usuario.is_active ? 'Activo' : 'Inactivo', usuario.is_active ? 'success' : 'danger')
            ],
            add: () => this.saveUsuario(),
            actions: usuario => [
                ['Ver detalles', 'secondary', () => this.showDetails('Detalles de usuario', {
                    Usuario: usuario.username,
                    Correo: usuario.email,
                    Rol: usuario.rol,
                    Estado: usuario.is_active ? 'Activo' : 'Inactivo'
                })],
                ['Editar', 'secondary', () => this.saveUsuario(usuario)],
                usuario.is_active
                    ? ['Eliminar', 'danger', () => this.desactivarUsuario(usuario.id)]
                    : ['Reactivar', 'success', () => this.reactivarUsuario(usuario.id)]
            ]
        });
    }

    saveUsuario(usuario) {
        const fields = [
            { name: 'username', label: 'Usuario', value: usuario?.username, maxLength: 80, required: true },
            { name: 'email', label: 'Correo', type: 'email', value: usuario?.email, maxLength: 120, required: true },
            { name: 'rol', label: 'Rol', value: usuario?.rol ?? 'WAITER', required: true, options: {
                WAITER: 'Mesero', KITCHEN: 'Cocina', CASHIER: 'Cajero', ADMIN: 'Administrador'
            } }
        ];
        if (!usuario) fields.push({ name: 'password', label: 'Contraseña', type: 'password', required: true });
        return this.saveRecord({
            section: 'usuarios',
            title: usuario ? 'Editar usuario' : 'Agregar usuario',
            fields,
            url: '/users',
            id: usuario?.id,
            payload: values => {
                if (!values.username.trim()) throw new Error('Usuario requerido.');
                return usuario ? values : { ...values, username: values.username.trim(), email: values.email.trim() };
            },
            success: usuario ? 'Usuario actualizado.' : 'Usuario creado.'
        });
    }

    async desactivarUsuario(id) {
        if (!await this.confirmarEliminacionLogica('usuario')) return;
        try {
            await api.del(`/users/${id}`);
            flash('Usuario eliminado. Puede reactivarlo desde Inactivos.', 'success');
            this.loadSection('usuarios');
        } catch (err) { flash(err.message, 'danger'); }
    }

    async reactivarUsuario(id) {
        try {
            await api.patch(`/users/${id}`, { is_active: true });
            flash('Usuario reactivado.', 'success');
            this.loadSection('usuarios');
        } catch (err) { flash(err.message, 'danger'); }
    }

    destroy() {
        this.disposeActions(this.container);
    }
}

window.appAdmin = null;