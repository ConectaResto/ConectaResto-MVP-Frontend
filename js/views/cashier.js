class CashierView {
    constructor(container) {
        this.container = container;
        this.servicios = [];
        this.selectedServiceId = null;
    }

    async init() {
        window.appCashier = this;
        this.container.innerHTML = `
            <div class="view-card">
                <div class="view-card-header">Panel Caja</div>
                <div class="view-card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5>Servicios activos</h5>
                        <button id="cashierRefresh" class="btn btn-outline-primary btn-sm">Actualizar</button>
                    </div>
                    <div class="row g-3">
                        <div class="col-lg-8" id="cashierServices"></div>
                        <div class="col-lg-4" id="cashierDetail"></div>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#cashierRefresh').addEventListener('click', () => this.load());
        await this.load();
    }

    async load() {
        try {
            const data = await api.get('/servicios?estado=ACTIVO');
            this.servicios = data.data || [];
            this.renderServices();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    renderServices() {
        const container = this.container.querySelector('#cashierServices');
        if (this.servicios.length === 0) {
            container.innerHTML = '<p class="text-muted">No hay servicios activos pendientes de cobro.</p>';
            return;
        }

        const wrapper = document.createElement('div');
        wrapper.className = 'list-group list-group-flush';
        this.servicios.forEach(s => {
            const pagoEstado = s.pago ? 'Pago registrado' : 'Sin pago';
            const badgeClass = s.pago ? 'bg-success' : 'bg-warning text-dark';

            const item = document.createElement('div');
            item.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center cursor-pointer';
            item.addEventListener('click', () => this.selectService(s.id));

            const left = document.createElement('div');
            const servicioDiv = document.createElement('div');
            servicioDiv.className = 'fw-bold';
            servicioDiv.textContent = 'Mesa ' + (Number.isInteger(s.mesa_numero) && s.mesa_numero > 0 ? s.mesa_numero : 'sin identificar') + ' (Servicio #' + s.id + ')';
            const estadoDiv = document.createElement('div');
            estadoDiv.className = 'small text-muted';
            estadoDiv.textContent = 'Estado: ' + estadoLegible(s.estado);
            left.appendChild(servicioDiv);
            left.appendChild(estadoDiv);

            const right = document.createElement('div');
            const totalDiv = document.createElement('div');
            totalDiv.className = 'fw-bold';
            totalDiv.textContent = s.total;
            const badgeDiv = document.createElement('div');
            badgeDiv.className = 'badge ' + badgeClass;
            badgeDiv.textContent = pagoEstado;
            right.appendChild(totalDiv);
            right.appendChild(badgeDiv);

            item.appendChild(left);
            item.appendChild(right);
            wrapper.appendChild(item);
        });
        container.innerHTML = '';
        container.appendChild(wrapper);
    }

    async selectService(serviceId) {
        this.selectedServiceId = serviceId;
        try {
            const data = await api.get(`/servicios/${serviceId}`);
            const servicio = data.data;
            this.renderDetail(servicio);
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    centavosDe(importe) {
        if (typeof importe !== 'string') return null;
        const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(importe);
        if (!partes) return null;
        return BigInt(partes[1]) * 100n + BigInt((partes[2] ?? '').padEnd(2, '0'));
    }

    formatearCentavos(centavos) {
        return `${centavos / 100n}.${(centavos % 100n).toString().padStart(2, '0')}`;
    }

    renderItemsAgrupados(items) {
        const grupos = new Map();
        for (const item of items) {
            const id = item?.producto_id;
            const cantidad = item?.cantidad;
            if (!Number.isInteger(id) || id <= 0 || id > 2147483647 ||
                !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) continue;
            const precio = this.centavosDe(item.precio_unitario);
            if (precio === null) continue;

            const clave = `${id}:${precio}`;
            const grupo = grupos.get(clave) ?? { id, precio, cantidad: 0n };
            grupo.cantidad += BigInt(cantidad);
            grupos.set(clave, grupo);
        }

        if (!grupos.size) return document.createTextNode('No hay ítems válidos.');

        const lista = document.createElement('ul');
        lista.className = 'list-unstyled mb-0';
        for (const { id, precio, cantidad } of grupos.values()) {
            const fila = document.createElement('li');
            fila.className = 'mb-2';
            const producto = document.createElement('div');
            producto.className = 'fw-semibold';
            producto.textContent = `${cantidad} x Producto #${id}`;
            const importes = document.createElement('small');
            importes.className = 'd-block text-muted';
            importes.textContent = `Unitario: ${this.formatearCentavos(precio)} · Subtotal: ${this.formatearCentavos(precio * cantidad)}`;
            fila.append(producto, importes);
            lista.append(fila);
        }
        return lista;
    }

    renderDetail(servicio) {
        const container = this.container.querySelector('#cashierDetail');

        const pedidosHtml = servicio.pedidos.map(p => {
            const tr = document.createElement('tr');

            const tdId = document.createElement('td');
            tdId.textContent = '#' + p.id;
            tr.appendChild(tdId);

            const tdItems = document.createElement('td');
            tdItems.append(this.renderItemsAgrupados(p.items || []));
            tr.appendChild(tdItems);

            const tdTotal = document.createElement('td');
            tdTotal.textContent = p.total;
            tr.appendChild(tdTotal);

            const tdEstado = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'badge bg-' + badgeColor(p.estado);
            badge.textContent = p.estado === 'CANCELADO' ? 'Cancelado' : estadoLegible(p.estado);
            tdEstado.appendChild(badge);
            tr.appendChild(tdEstado);

            return tr;
        });

        const pedidosFinalizados = servicio.pedidos.every(p => p.estado === 'ENTREGADO' || p.estado === 'CANCELADO');
        const tienePago = !!servicio.pago;

        const card = document.createElement('div');
        card.className = 'card';

        const header = document.createElement('div');
        header.className = 'card-header bg-dark text-white';
        const h6 = document.createElement('h6');
        h6.className = 'mb-0';
        h6.textContent = 'Mesa ' + (Number.isInteger(servicio.mesa_numero) && servicio.mesa_numero > 0 ? servicio.mesa_numero : 'sin identificar') + ' (Servicio #' + servicio.id + ')';
        header.appendChild(h6);
        card.appendChild(header);

        const body = document.createElement('div');
        body.className = 'card-body';

        const estadoDiv = document.createElement('div');
        estadoDiv.className = 'mb-3';
        const estadoLabel = document.createElement('strong');
        estadoLabel.textContent = 'Estado: ';
        const estadoBadge = document.createElement('span');
        estadoBadge.className = 'badge bg-' + badgeColor(servicio.estado);
        estadoBadge.textContent = estadoLegible(servicio.estado);
        estadoDiv.appendChild(estadoLabel);
        estadoDiv.appendChild(estadoBadge);
        body.appendChild(estadoDiv);

        const table = document.createElement('table');
        table.className = 'table table-sm mb-3';
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        ['Pedido', 'Productos', 'Total', 'Estado'].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        pedidosHtml.forEach(tr => tbody.appendChild(tr));
        table.appendChild(tbody);
        const tableContainer = document.createElement('div');
        tableContainer.className = 'table-responsive';
        tableContainer.append(table);
        body.append(tableContainer);

        const totalDiv = document.createElement('div');
        totalDiv.className = 'd-flex justify-content-between align-items-center mb-3';
        const totalLabel = document.createElement('span');
        totalLabel.innerHTML = '<strong>Total del servicio:</strong>';
        const totalValue = document.createElement('span');
        totalValue.className = 'fw-lg fs-5';
        totalValue.textContent = servicio.total;
        totalDiv.appendChild(totalLabel);
        totalDiv.appendChild(totalValue);
        body.appendChild(totalDiv);

        const pagoDiv = document.createElement('div');
        pagoDiv.className = 'mb-3';
        const pagoLabel = document.createElement('strong');
        pagoLabel.textContent = 'Pago: ';
        const pagoBadge = document.createElement('span');
        pagoBadge.className = 'badge ' + (tienePago ? 'bg-success' : 'bg-warning text-dark') + ' ms-2';
        pagoBadge.textContent = tienePago ? 'Registrado' : 'Sin pago';
        pagoDiv.appendChild(pagoLabel);
        pagoDiv.appendChild(pagoBadge);
        body.appendChild(pagoDiv);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'd-grid gap-2';

        const totalCentavos = this.centavosDe(servicio.total);
        const puedePagar = pedidosFinalizados && !tienePago && totalCentavos !== null && totalCentavos > 0n;
        const btnPay = createButton('Registrar pago simulado', {
            className: 'btn btn-success', icon: 'card',
            onClick: puedePagar ? () => this.registrarPago(servicio.id) : undefined
        });
        btnPay.id = 'cashierPay';
        btnPay.disabled = !puedePagar;
        actionsDiv.appendChild(btnPay);

        const puedeCerrar = pedidosFinalizados && totalCentavos !== null && (tienePago
            ? this.centavosDe(servicio.pago.importe) === totalCentavos
            : totalCentavos === 0n);
        const btnClose = createButton('Cerrar servicio', {
            className: 'btn btn-danger', icon: 'lock',
            onClick: puedeCerrar ? () => this.cerrarServicio(servicio.id) : undefined
        });
        btnClose.id = 'cashierClose';
        btnClose.disabled = !puedeCerrar;
        actionsDiv.appendChild(btnClose);

        body.appendChild(actionsDiv);
        card.appendChild(body);
        container.innerHTML = '';
        container.appendChild(card);
    }

    async registrarPago(serviceId) {
        try {
            await api.post(`/servicios/${serviceId}/pago-simulado`, {});
            flash('Pago registrado correctamente.', 'success');
            this.selectService(serviceId);
            this.load();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    async cerrarServicio(serviceId) {
        if (!await confirmAction({
            title: 'Cerrar servicio',
            message: '¿Está seguro de cerrar este servicio?',
            acceptLabel: 'Cerrar servicio',
            acceptIcon: 'lock',
            danger: true
        })) return;
        try {
            const data = await api.post(`/servicios/${serviceId}/cerrar`, {});
            flash('Servicio cerrado. Mesa ' + (Number.isInteger(data.data.mesa_numero) && data.data.mesa_numero > 0 ? data.data.mesa_numero : 'sin identificar') + ' disponible.', 'success');
            this.selectedServiceId = null;
            this.container.querySelector('#cashierDetail').innerHTML = '';
            this.load();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    destroy() {}
}

window.appCashier = null;