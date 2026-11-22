class WaiterView {
    constructor(container) {
        this.container = container;
        this.mesas = [];
        this.servicios = [];
        this.serviciosCargados = false;
        this.mesasEnApertura = new Set();
        this.pedidosEnEnvio = new Set();
        this.pedidos = [];
        this.paginaHistorial = 1;
        this.mesasPorServicio = new Map();
        this.productos = [];
        this.activeTab = 'mesas';
    }

    async init() {
        window.appWaiter = this;
        this.container.innerHTML = `
            <div class="view-card">
                <div class="view-card-header">Panel Mesero</div>
                <div class="view-card-body">
                    <div id="waiterTabContent">
                        <div id="waiterMesas"></div>
                        <div id="waiterPedidos" hidden></div>
                    </div>
                </div>
            </div>
        `;

        await this.loadTab(this.activeTab);
    }

    async loadTab(tab, { activate = false } = {}) {
        const container = this.container.querySelector(`#waiter${tab.charAt(0).toUpperCase()}${tab.slice(1)}`);
        if (!container) return;
        if (activate) {
            if (tab === this.activeTab) return;
            for (const panel of container.parentElement.children) {
                panel.hidden = panel !== container;
            }
            this.activeTab = tab;
        }
        container.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div></div>';

        try {
            if (tab === 'mesas') await this.renderMesasTab(container);
            if (tab === 'pedidos') await this.renderPedidosTab(container);
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    async renderMesasTab(container) {
        container.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-2 mb-2">
                <h5 class="mb-0">Mesas</h5>
                <button id="waiterRefreshMesas" class="btn btn-outline-secondary">Actualizar</button>
            </div>
            <div class="table-responsive mb-3" id="waiterMesasList"></div>
            <h5>Servicios activos</h5>
            <div id="waiterServiciosList"></div>
        `;

        container.querySelector('#waiterRefreshMesas')
            .addEventListener('click', () => this.refreshMesas(container));
        await this.refreshMesas(container);
    }

    async refreshMesas(container) {
        this.serviciosCargados = false;
        await this.loadMesas();
        await this.loadServicios();
        if (!container.isConnected) return;
        this.renderMesasTable(container.querySelector('#waiterMesasList'));
        this.renderServicios(container.querySelector('#waiterServiciosList'));
    }

    async loadMesas() {
        try {
            const data = await api.get('/mesas');
            this.mesas = data.data || [];
        } catch (err) {
            this.mesas = [];
            flash(err.message, 'danger');
        }
    }

    hasActiveService(mesaId) {
        return this.servicios.some(servicio => servicio.mesa_id === mesaId && servicio.estado === 'ACTIVO');
    }

    renderStateBadge(estado) {
        const badge = document.createElement('span');
        badge.className = `badge bg-${badgeColor(estado)}`;
        badge.textContent = estado === 'CANCELADO' ? 'Cancelado' : estadoLegible(estado);
        return badge;
    }

    renderMesasTable(container) {
        const rows = this.mesas.map(mesa => [`Mesa ${mesa.numero}`, this.renderStateBadge(mesa.estado)]);
        const table = renderTable(container, ['Número', 'Estado', 'Acciones'], rows, (_, index) => {
            const mesa = this.mesas[index];
            if (this.hasActiveService(mesa.id)) return 'Servicio activo';
            if (mesa.estado !== 'DISPONIBLE') return 'No disponible';
            if (!this.serviciosCargados) return 'Servicio sin verificar';

            const opening = this.mesasEnApertura.has(mesa.id);
            const button = createButton(opening ? 'Abriendo…' : 'Abrir servicio', {
                icon: 'plus',
                className: 'btn btn-sm btn-primary',
                onClick: event => this.openService(mesa.id, event.currentTarget)
            });
            button.setAttribute('aria-label', `Abrir servicio para mesa ${mesa.numero}`);
            button.disabled = opening;
            return button;
        });
        table.id = 'waiterMesasTable';
        table.className = 'table table-sm align-middle';
        table.tBodies[0].id = 'waiterMesasBody';
    }

    async openService(mesaId, button) {
        const mesa = this.mesas.find(row => row.id === mesaId);
        const container = button.closest('#waiterMesas');
        if (!container || mesa?.estado !== 'DISPONIBLE' || !this.serviciosCargados ||
            this.hasActiveService(mesaId) || this.mesasEnApertura.has(mesaId)) return;

        this.mesasEnApertura.add(mesaId);
        button.disabled = true;
        button.lastChild.textContent = 'Abriendo…';

        try {
            await api.post('/servicios', { mesa_id: mesaId });
            flash('Servicio abierto.', 'success');
        } catch (err) {
            flash(err.message, 'danger');
        } finally {
            this.mesasEnApertura.delete(mesaId);
            if (container.isConnected) await this.refreshMesas(container);
        }
    }

    async loadServicios() {
        try {
            const data = await api.get('/servicios?estado=ACTIVO');
            this.servicios = data.data || [];
            this.serviciosCargados = true;
        } catch (err) {
            this.servicios = [];
            this.serviciosCargados = false;
            flash(err.message, 'danger');
        }
    }

    renderServicios(container) {
        if (!this.serviciosCargados) {
            container.innerHTML = '<p class="text-muted">No se pudieron verificar los servicios activos.</p>';
            return;
        }

        const activos = this.servicios.filter(servicio => servicio.estado === 'ACTIVO');
        if (!activos.length) {
            container.innerHTML = '<p class="text-muted">No hay servicios activos.</p>';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        const numeros = new Map(this.mesas.map(mesa => [mesa.id, mesa.numero]));
        const rows = activos.map(servicio => [
            `#${servicio.id}`, this.nombreMesa(numeros.get(servicio.mesa_id)),
            this.renderStateBadge(servicio.estado), servicio.total
        ]);
        const table = renderTable(wrapper, ['Servicio', 'Mesa', 'Estado', 'Total'], rows);
        table.className = 'table table-sm align-middle';
        container.replaceChildren(wrapper);
    }

    async renderPedidosTab(container) {
        await this.loadPedidosData();

        container.innerHTML = `
            <div class="d-flex align-items-center justify-content-between gap-2 mb-3">
                <h5 class="mb-0">Pedidos</h5>
                <div id="waiterPedidoToolbar"></div>
            </div>
            <section class="border rounded p-3 mb-3" aria-labelledby="waiterActivosTitulo">
                <h5 id="waiterActivosTitulo">Pedidos activos</h5>
                <h6>Pendientes de autorización</h6>
                <div id="waiterPendientes" class="mb-3"></div>
                <h6>En curso</h6>
                <div id="waiterEnCurso"></div>
            </section>
            <section class="border rounded p-3 bg-light" aria-labelledby="waiterHistorialTitulo">
                <h5 id="waiterHistorialTitulo">Historial de entregados y cancelados</h5>
                <div id="waiterHistorial"></div>
                <div id="waiterHistorialPaginacion"></div>
            </section>
        `;
        container.querySelector('#waiterPedidoToolbar')
            .append(createButton('Nuevo pedido', { icon: 'plus', onClick: () => this.openPedidoModal(container) }));
        this.renderPedidosGroups();
    }

    async openPedidoModal(container) {
        const servicios = this.servicios.filter(servicio => servicio.estado === 'ACTIVO');
        if (!servicios.length || !this.productos.length) {
            const message = servicios.length ? 'No hay productos disponibles.' : 'No hay servicios activos.';
            flash(message, 'warning');
            return;
        }

        const options = Object.fromEntries(servicios.map(servicio => [
            servicio.id, this.nombreMesa(this.mesasPorServicio.get(servicio.id))
        ]));
        const productos = new Map(this.productos.map(producto => [producto.id, producto]));
        const items = [];
        const saved = await showActionDialog({
            title: 'Nuevo pedido',
            fields: [{
                name: 'servicio_id', label: 'Servicio', options, placeholder: 'Seleccione un servicio',
                value: servicios.length === 1 ? servicios[0].id : '', required: true
            }],
            renderContent: submit => this.renderPedidoItemsEditor(productos, items, submit),
            acceptLabel: 'Crear pedido',
            acceptIcon: 'plus',
            acceptClass: 'btn btn-success',
            onSubmit: ({ servicio_id }) => {
                const servicioId = Number(servicio_id);
                if (!servicios.some(servicio => servicio.id === servicioId) || !items.length) {
                    throw new Error('Seleccione un servicio y agregue al menos un producto.');
                }
                return api.post(`/servicios/${servicioId}/pedidos`, {
                    items: items.map(({ producto, cantidad }) => ({ producto_id: producto.id, cantidad }))
                });
            }
        });
        if (!saved) return;

        flash('Pedido creado exitosamente.', 'success');
        if (container.isConnected) {
            await this.loadPedidosData();
            if (container.isConnected) this.renderPedidosGroups();
        }
    }

    renderPedidoItemsEditor(productos, items, submit) {
        submit.id = 'waiterPedidoCrear';
        const content = document.createElement('div');
        const controls = document.createElement('div');
        controls.className = 'row g-2 align-items-end';

        const productField = createInputField({
            id: 'waiterPedidoProducto', name: 'producto', label: 'Producto',
            options: Object.fromEntries(Array.from(productos.values(), producto => [
                producto.id, `${producto.name} - $${producto.price}`
            ])),
            value: productos.keys().next().value
        });
        productField.classList.add('col-12', 'col-sm-7');
        const quantityField = createInputField({
            id: 'waiterPedidoCantidad', name: 'cantidad', label: 'Cantidad', type: 'number', value: 1, min: 1
        });
        quantityField.classList.add('col-6', 'col-sm-2');
        const productSelect = productField.querySelector('select');
        const quantityInput = quantityField.querySelector('input');
        const actions = document.createElement('div');
        actions.className = 'col-6 col-sm-3 mb-3';
        actions.append(createButton('Agregar', { className: 'btn btn-primary w-100', icon: 'plus', onClick: addItem }));
        controls.append(productField, quantityField, actions);

        const list = document.createElement('div');
        list.id = 'waiterPedidoItems';
        list.className = 'p-2 border rounded bg-light mb-3';
        list.setAttribute('aria-live', 'polite');
        content.append(controls, list);

        quantityInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                addItem();
            }
        });

        function addItem() {
            const producto = productos.get(Number(productSelect.value));
            const cantidad = quantityInput.valueAsNumber;
            if (!producto || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
                flash('Seleccione un producto y cantidad válida.', 'danger');
                return;
            }
            items.push({ producto, cantidad });
            renderItems();
        }

        function renderItems() {
            list.replaceChildren();
            submit.disabled = items.length === 0;
            if (!items.length) {
                const empty = document.createElement('p');
                empty.className = 'text-muted small mb-0';
                empty.textContent = 'Sin productos agregados.';
                list.append(empty);
                return;
            }

            let total = 0;
            for (const [index, { producto, cantidad }] of items.entries()) {
                total += Number(producto.price) * cantidad;
                const row = document.createElement('div');
                row.className = 'd-flex justify-content-between align-items-center gap-2 mb-1';
                const name = document.createElement('span');
                name.textContent = `${producto.name} x${cantidad}`;
                const remove = createButton('Quitar', {
                    icon: 'minus',
                    className: 'btn btn-sm btn-outline-danger',
                    onClick: () => {
                        items.splice(index, 1);
                        renderItems();
                    }
                });
                remove.setAttribute('aria-label', `Quitar ${producto.name}`);
                row.append(name, remove);
                list.append(row);
            }
            const amount = document.createElement('div');
            amount.className = 'text-end fw-bold';
            amount.textContent = `Total: $${total.toFixed(2)}`;
            list.append(amount);
        }

        renderItems();
        return content;
    }

    async loadPedidosData() {
        try {
            const [pedidosRes, serviciosRes, productosRes] = await Promise.all([
                api.get('/pedidos'),
                api.get('/servicios'),
                api.get('/products')
            ]);
            this.pedidos = pedidosRes.data || [];
            this.servicios = serviciosRes.data || [];
            this.productos = (productosRes.data || []).filter(p => p.is_active !== false);
            this.mesasPorServicio = new Map(this.servicios.map(servicio => [
                servicio.id, servicio.mesa_numero
            ]));
        } catch (err) {
            this.pedidos = [];
            this.servicios = [];
            this.productos = [];
            this.mesasPorServicio.clear();
            flash(err.message, 'danger');
        }
    }

    nombreMesa(numero) {
        return Number.isInteger(numero) && numero > 0 ? `Mesa ${numero}` : 'Mesa sin identificar';
    }

    productosDelPedido(pedido, nombres) {
        return pedido.items.map(item =>
            `${item.cantidad} x ${nombres.get(item.producto_id) ?? 'Producto fuera del catálogo'}`
        );
    }

    pendienteDeAutorizar(pedido) {
        return pedido.estado === 'PENDIENTE' && pedido.estado_preparacion === 'NO_ENVIADO' &&
            pedido.autorizado_por_id === null;
    }

    renderPedidosGroups() {
        const nombres = new Map(this.productos.map(producto => [producto.id, producto.name]));
        const pendientes = [];
        const enCurso = [];
        const historial = [];
        const pedidos = [...this.pedidos].sort((a, b) => b.id - a.id);
        for (const pedido of pedidos) {
            if (pedido.estado === 'ENTREGADO' || pedido.estado === 'CANCELADO') historial.push(pedido);
            else if (this.pendienteDeAutorizar(pedido)) pendientes.push(pedido);
            else enCurso.push(pedido);
        }
        this.renderPedidosTable('waiterPendientes', pendientes, nombres, 'No hay pedidos pendientes de autorización.');
        this.renderPedidosTable('waiterEnCurso', enCurso, nombres, 'No hay pedidos en curso.');
        this.renderHistorial(historial, nombres);
    }

    renderHistorial(historial, nombres) {
        const paginacion = this.container.querySelector('#waiterHistorialPaginacion');
        if (!paginacion) return;

        const pedidosPorPagina = 10;
        const totalPaginas = Math.max(1, Math.ceil(historial.length / pedidosPorPagina));
        this.paginaHistorial = Math.min(this.paginaHistorial, totalPaginas);

        const renderPagina = () => {
            const inicio = (this.paginaHistorial - 1) * pedidosPorPagina;
            const pedidos = historial.slice(inicio, inicio + pedidosPorPagina);
            this.renderPedidosTable('waiterHistorial', pedidos, nombres, 'No hay pedidos entregados ni cancelados.', true);
        };

        renderPagina();
        paginacion.replaceChildren();
        if (totalPaginas === 1) return;

        const controles = document.createElement('nav');
        controles.className = 'd-flex flex-wrap align-items-center justify-content-between gap-2 mt-3';
        controles.setAttribute('aria-label', 'Paginación del historial de pedidos');
        const indicador = document.createElement('span');
        indicador.setAttribute('role', 'status');

        const cambiarPagina = (paso, event) => {
            const conservarFoco = event.currentTarget === document.activeElement;
            this.paginaHistorial += paso;
            renderPagina();
            actualizarControles();
            if (conservarFoco && event.currentTarget.disabled) {
                const otroBoton = paso < 0 ? siguiente : anterior;
                otroBoton.focus();
            }
        };
        const anterior = createButton('Anterior', {
            className: 'btn btn-sm btn-outline-secondary',
            onClick: event => cambiarPagina(-1, event)
        });
        const siguiente = createButton('Siguiente', {
            className: 'btn btn-sm btn-outline-secondary',
            onClick: event => cambiarPagina(1, event)
        });
        const actualizarControles = () => {
            anterior.disabled = this.paginaHistorial === 1;
            siguiente.disabled = this.paginaHistorial === totalPaginas;
            indicador.textContent = `Página ${this.paginaHistorial} de ${totalPaginas}`;
        };

        controles.append(anterior, indicador, siguiente);
        paginacion.append(controles);
        actualizarControles();
    }

    renderPedidosTable(id, pedidos, nombres, emptyMessage, historial = false) {
        const container = this.container.querySelector(`#${id}`);
        if (!container) return;
        if (!pedidos.length) {
            const empty = document.createElement('p');
            empty.className = 'text-muted mb-0';
            empty.textContent = emptyMessage;
            container.replaceChildren(empty);
            return;
        }

        const headers = ['Mesa', 'Productos', 'Estado'];
        if (!historial) headers.push('Preparación');
        headers.push('Total', 'Acciones');
        const rows = pedidos.map(pedido => {
            const row = [
                this.nombreMesa(this.mesasPorServicio.get(pedido.servicio_id)),
                this.productosDelPedido(pedido, nombres).join(', '),
                this.renderStateBadge(pedido.estado)
            ];
            if (!historial) row.push(this.renderStateBadge(pedido.estado_preparacion));
            row.push(pedido.total);
            return row;
        });

        const wrapper = document.createElement('div');
        wrapper.className = 'table-responsive';
        const table = renderTable(wrapper, headers, rows,
            (_, index) => this.renderPedidoActions(pedidos[index], historial));
        table.className = 'table table-sm align-middle mb-0';
        for (const badge of table.querySelectorAll('.badge.bg-warning, .badge.bg-info')) {
            badge.classList.add('text-dark');
        }
        container.replaceChildren(wrapper);
    }

    renderPedidoActions(pedido, historial) {
        const actions = document.createElement('div');
        actions.className = 'd-flex flex-wrap gap-2';
        if (!historial && pedido.estado !== 'CANCELADO') {
            const sinEnviar = pedido.estado === 'PENDIENTE' && pedido.estado_preparacion === 'NO_ENVIADO';
            if (sinEnviar) {
                const enviar = createButton('Autorizar y enviar a Cocina', {
                    icon: 'send',
                    className: 'btn btn-sm btn-primary',
                    onClick: event => this.autorizarYEnviarCocina(pedido.id, event.currentTarget)
                });
                enviar.disabled = this.pedidosEnEnvio.has(pedido.id);
                actions.append(enviar);
            } else if (pedido.estado === 'LISTO') {
                actions.append(createButton('Entregar', {
                    icon: 'delivered',
                    className: 'btn btn-sm btn-success',
                    onClick: () => this.entregar(pedido.id)
                }));
            }
            if (sinEnviar) {
                actions.append(createButton('Cancelar', {
                    icon: 'close',
                    className: 'btn btn-sm btn-outline-danger',
                    onClick: event => this.cancelar(pedido.id, event.currentTarget)
                }));
            }
        }
        actions.append(createButton('Ver detalles', {
            icon: 'eye',
            className: 'btn btn-sm btn-outline-secondary',
            onClick: () => this.detalles(pedido.id)
        }));
        return actions;
    }

    async autorizarYEnviarCocina(pedidoId, button) {
        const panel = button.closest('#waiterPedidos');
        if (!panel || this.pedidosEnEnvio.has(pedidoId)) return;
        this.pedidosEnEnvio.add(pedidoId);
        button.disabled = true;
        try {
            await api.post(`/pedidos/${pedidoId}/autorizar-y-enviar-cocina`, {});
            flash('Pedido autorizado y enviado a Cocina.', 'success');
            if (panel.isConnected) await this.loadPedidosData();
        } catch (err) {
            flash(err.message, 'danger');
        } finally {
            this.pedidosEnEnvio.delete(pedidoId);
            if (panel.isConnected) this.renderPedidosGroups();
        }
    }

    async entregar(pedidoId) {
        try {
            await api.post(`/pedidos/${pedidoId}/entregar`, {});
            flash('Pedido entregado.', 'success');
            await this.loadPedidosData();
            this.paginaHistorial = 1;
            this.renderPedidosGroups();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    async cancelar(pedidoId, button) {
        if (!await confirmAction({
            title: 'Cancelar pedido',
            message: '¿Está seguro de cancelar este pedido? Quedará en el historial.',
            acceptLabel: 'Cancelar pedido',
            acceptIcon: 'close',
            danger: true
        })) return;

        if (!button.isConnected) return;
        button.disabled = true;
        try {
            await api.post(`/pedidos/${pedidoId}/cancelar`, {});
            flash('Pedido cancelado.', 'success');
            await this.loadPedidosData();
            this.paginaHistorial = 1;
            this.renderPedidosGroups();
        } catch (err) {
            flash(err.message, 'danger');
        } finally {
            button.disabled = false;
        }
    }

    async detalles(pedidoId) {
        const pedido = this.pedidos.find(item => item.id === pedidoId);
        if (!pedido) return;
        const nombres = new Map(this.productos.map(producto => [producto.id, producto.name]));
        const estado = pedido.estado === 'CANCELADO' ? 'Cancelado' : estadoLegible(pedido.estado);
        const mesa = this.nombreMesa(this.mesasPorServicio.get(pedido.servicio_id));
        const lines = [mesa, `Estado: ${estado}`];
        if (pedido.estado !== 'ENTREGADO') lines.push(`Preparación: ${estadoLegible(pedido.estado_preparacion)}`);
        lines.push(`Total: $${pedido.total}`, '', 'Productos:', ...this.productosDelPedido(pedido, nombres));
        await showActionDialog({
            title: 'Detalles del pedido',
            message: lines.join('\n'),
            acceptLabel: 'Cerrar',
            acceptIcon: 'close',
            canCancel: false
        });
    }

    destroy() {}
}

window.appWaiter = null;