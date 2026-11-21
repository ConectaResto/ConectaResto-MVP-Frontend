const ESTADOS_PEDIDO = {
    PENDIENTE: 'Pendiente',
    EN_PREPARACION: 'En preparacion',
    LISTO: 'Listo',
    ENTREGADO: 'Entregado'
};

const ESTADOS_PREPARACION = {
    NO_ENVIADO: 'No enviado',
    RECIBIDO: 'Recibido',
    EN_COCINA: 'En cocina',
    LISTO_PARA_SERVIR: 'Listo para servir'
};

const ESTADOS_MESA = {
    DISPONIBLE: 'Disponible',
    OCUPADA: 'Ocupada',
    CERRADA: 'Cerrada'
};

function escapeHtml(text) {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

function escapeJsString(text) {
    if (text === null || text === undefined) return '';
    return String(text).replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/"/g, '\\"');
}

function estadoLegible(estado) {
    const map = { ...ESTADOS_PEDIDO, ...ESTADOS_PREPARACION, ...ESTADOS_MESA,
        ACTIVO: 'Activo', CERRADO: 'Cerrado' };
    return map[estado] || estado;
}

function badgeColor(estado) {
    const map = {
        PENDIENTE: 'warning',
        EN_PREPARACION: 'warning',
        LISTO: 'success',
        ENTREGADO: 'info',
        RECIBIDO: 'warning',
        EN_COCINA: 'warning',
        LISTO_PARA_SERVIR: 'success',
        DISPONIBLE: 'success',
        OCUPADA: 'danger',
        CERRADA: 'dark',
        ACTIVO: 'success',
        CERRADO: 'secondary'
    };
    return map[estado] || 'secondary';
}

function flash(message, type = 'info') {
    const container = document.getElementById('flashContainer');
    const div = document.createElement('div');
    div.className = `flash alert alert-${type === 'error' ? 'danger' : type} alert-dismissible fade show`;
    div.textContent = message;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-close';
    btn.setAttribute('data-bs-dismiss', 'alert');
    div.appendChild(btn);
    container.appendChild(div);
    setTimeout(() => {
        const bsAlert = bootstrap.Alert.getOrCreateInstance(div);
        if (bsAlert) bsAlert.close();
    }, 5000);
}

function loading(el) {
    el.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div><p class="mt-2">Cargando...</p></div>';
}

function formatMoney(cents) {
    return (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTable(container, headers, rows, rowActions = null) {
    const table = document.createElement('table');
    table.className = 'table table-striped table-hover align-middle';
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headers.forEach(h => {
        const th = document.createElement('th');
        th.scope = 'col';
        th.textContent = h;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    rows.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = cell;
            tr.appendChild(td);
        });
        if (rowActions) {
            const td = document.createElement('td');
            td.innerHTML = rowActions(row);
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);
}