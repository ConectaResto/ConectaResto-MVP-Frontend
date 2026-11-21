class KitchenView {
    constructor(container) {
        this.container = container;
        this.pedidos = [];
        this.productos = [];
    }

    async init() {
        window.appKitchen = this;
        this.container.innerHTML = `
            <div class="view-card">
                <div class="view-card-header">Panel Cocina</div>
                <div class="view-card-body">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5>Pedidos activos</h5>
                        <button id="kitchenRefresh" class="btn btn-outline-primary btn-sm">Actualizar</button>
                    </div>
                    <div class="table-responsive">
                        <table class="table table-sm align-middle" id="kitchenTable">
                            <thead><tr>
                                <th>Pedido</th><th>Servicio</th><th>Productos</th><th>Estado</th><th>Preparaci&oacute;n</th><th>Total</th><th>Acciones</th>
                            </tr></thead>
                            <tbody id="kitchenBody"></tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        this.container.querySelector('#kitchenRefresh').addEventListener('click', () => this.load());
        await this.load();
    }

    async load() {
        this.container.querySelector('#kitchenBody').innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border" role="status"></div></td></tr>';
        try {
            const data = await api.get('/pedidos');
            this.pedidos = data.data || [];
            const prodData = await api.get('/products');
            this.productos = (prodData.data || []).filter(p => p.is_active !== false);
            const nombres = new Map(this.productos.map(p => [p.id, p.name]));

            const activos = this.pedidos.filter(p => ['RECIBIDO', 'EN_COCINA'].includes(p.estado_preparacion));
            const tbody = this.container.querySelector('#kitchenBody');
            tbody.innerHTML = '';

            activos.forEach(p => {
                const itemsText = p.items.map(i => i.cantidad + ' x ' + (nombres.get(i.producto_id) || 'Producto #' + i.producto_id)).join(', ');

                const tr = document.createElement('tr');

                const tdId = document.createElement('td');
                tdId.textContent = '#' + p.id;
                tr.appendChild(tdId);

                const tdServicio = document.createElement('td');
                tdServicio.textContent = '#' + p.servicio_id;
                tr.appendChild(tdServicio);

                const tdItems = document.createElement('td');
                tdItems.textContent = itemsText;
                tr.appendChild(tdItems);

                const tdEstado = document.createElement('td');
                const badgeEstado = document.createElement('span');
                badgeEstado.className = 'badge bg-secondary';
                badgeEstado.textContent = estadoLegible(p.estado);
                tdEstado.appendChild(badgeEstado);
                tr.appendChild(tdEstado);

                const tdPrep = document.createElement('td');
                const badgePrep = document.createElement('span');
                badgePrep.className = 'badge bg-' + badgeColor(p.estado_preparacion);
                badgePrep.textContent = estadoLegible(p.estado_preparacion);
                tdPrep.appendChild(badgePrep);
                tr.appendChild(tdPrep);

                const tdTotal = document.createElement('td');
                tdTotal.textContent = p.total;
                tr.appendChild(tdTotal);

                const tdAcciones = document.createElement('td');
                if (p.estado_preparacion === 'RECIBIDO') {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn btn-sm btn-primary';
                    btn.textContent = 'En cocina';
                    btn.addEventListener('click', () => this.cambiarPreparacion(p.id, 'EN_COCINA'));
                    tdAcciones.appendChild(btn);
                }
                if (p.estado_preparacion === 'EN_COCINA') {
                    const btn = document.createElement('button');
                    btn.type = 'button';
                    btn.className = 'btn btn-sm btn-success';
                    btn.textContent = 'Listo para servir';
                    btn.addEventListener('click', () => this.cambiarPreparacion(p.id, 'LISTO_PARA_SERVIR'));
                    tdAcciones.appendChild(btn);
                }
                tr.appendChild(tdAcciones);

                tbody.appendChild(tr);
            });

            if (activos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No hay pedidos activos.</td></tr>';
            }
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    async cambiarPreparacion(pedidoId, nuevoEstado) {
        try {
            await api.patch(`/pedidos/${pedidoId}/preparacion`, { estado: nuevoEstado });
            flash(`Pedido #${pedidoId} ${estadoLegible(nuevoEstado)}.`, 'success');
            await this.load();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    destroy() {}
}

window.appKitchen = null;