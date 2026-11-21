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
                    <div class="table-responsive" id="kitchenTableContainer"></div>
                </div>
            </div>
        `;

        this.container.querySelector('#kitchenRefresh').addEventListener('click', () => this.load());
        await this.load();
    }

    async load() {
        const container = this.container.querySelector('#kitchenTableContainer');
        loading(container);
        try {
            const data = await api.get('/pedidos');
            this.pedidos = data.data || [];
            const prodData = await api.get('/products');
            this.productos = (prodData.data || []).filter(p => p.is_active !== false);
            const nombres = new Map(this.productos.map(p => [p.id, p.name]));
            const activos = this.pedidos.filter(p => ['RECIBIDO', 'EN_COCINA'].includes(p.estado_preparacion));
            const headers = ['Pedido', 'Servicio', 'Productos', 'Preparación', 'Acciones'];
            const rows = activos.map(pedido => {
                const preparacion = document.createElement('span');
                preparacion.className = `badge text-bg-${badgeColor(pedido.estado_preparacion)}`;
                preparacion.textContent = estadoLegible(pedido.estado_preparacion);
                return [
                    `#${pedido.id}`, `#${pedido.servicio_id}`,
                    this.productosAgrupados(pedido.items || [], nombres), preparacion
                ];
            });

            const table = renderTable(container, headers, rows, (_, index) => {
                const pedido = activos[index];
                const recibido = pedido.estado_preparacion === 'RECIBIDO';
                return createButton(recibido ? 'En cocina' : 'Listo para servir', {
                    className: recibido ? 'btn btn-sm btn-primary' : 'btn btn-sm btn-success',
                    onClick: () => this.cambiarPreparacion(pedido.id, recibido ? 'EN_COCINA' : 'LISTO_PARA_SERVIR')
                });
            });
            table.id = 'kitchenTable';
            table.className = 'table table-sm align-middle';
            const body = table.tBodies[0];
            body.id = 'kitchenBody';

            if (!activos.length) {
                const cell = body.insertRow().insertCell();
                cell.colSpan = headers.length;
                cell.className = 'text-muted text-center';
                cell.textContent = 'No hay pedidos activos.';
            }
        } catch (err) {
            container.textContent = 'No se pudieron cargar los pedidos.';
            flash(err.message, 'danger');
        }
    }

    productosAgrupados(items, nombres) {
        const cantidades = new Map();
        for (const item of items) {
            const id = item?.producto_id;
            const cantidad = item?.cantidad;
            if (!Number.isInteger(id) || id <= 0 || id > 2147483647 ||
                !Number.isInteger(cantidad) || cantidad <= 0 || cantidad > 2147483647) continue;
            cantidades.set(id, (cantidades.get(id) ?? 0n) + BigInt(cantidad));
        }
        return Array.from(cantidades, ([id, cantidad]) =>
            `${cantidad} x ${nombres.get(id) ?? `Producto #${id}`}`
        ).join(', ') || 'Sin productos válidos.';
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