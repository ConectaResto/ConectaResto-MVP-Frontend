const ESTADOS_PEDIDO = {
    PENDIENTE: 'Pendiente',
    EN_PREPARACION: 'En preparacion',
    LISTO: 'Listo',
    ENTREGADO: 'Entregado',
    CANCELADO: 'Cancelado'
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
        CANCELADO: 'danger',
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

const TOAST_COLORS = new Map([
    ['info', 'info'], ['success', 'success'], ['warning', 'warning'],
    ['danger', 'danger'], ['error', 'danger']
]);

function flash(message, type = 'info') {
    const variant = TOAST_COLORS.get(type) || 'info';
    const toast = document.createElement('div');
    toast.className = `toast text-bg-${variant} border-0`;
    toast.setAttribute('aria-atomic', 'true');

    const content = document.createElement('div');
    content.className = 'd-flex align-items-center';
    const text = document.createElement('div');
    text.className = 'toast-body';
    text.textContent = message;

    const close = createButton('', { className: 'btn-close me-2' });
    if (variant === 'danger') close.classList.add('btn-close-white');
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.setAttribute('data-bs-dismiss', 'toast');
    content.append(text, close);
    toast.append(content);
    document.getElementById('toastContainer').append(toast);

    const instance = bootstrap.Toast.getOrCreateInstance(toast, {
        delay: variant === 'danger' ? 8000 : 5000
    });
    toast.addEventListener('hidden.bs.toast', () => {
        instance.dispose();
        toast.remove();
    }, { once: true });
    instance.show();
}

function loading(el) {
    el.innerHTML = '<div class="text-center py-4"><div class="spinner-border" role="status"></div><p class="mt-2">Cargando...</p></div>';
}

function formatMoney(cents) {
    return (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const buttonIconPaths = {
    plus: 'M12 5v14M5 12h14',
    pencil: 'M4 16v4h4L20 8l-4-4L4 16ZM14 6l4 4',
    eye: 'M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z',
    save: 'M4 3h13l3 3v15H4V3Zm4 0v6h8V3M8 21v-8h8v8',
    check: 'm4 12 5 5L20 6',
    close: 'm6 6 12 12M18 6 6 18',
    reactivate: 'M4 10a8 8 0 1 1 1 7M4 4v6h6',
    trash: 'M4 6h16M9 6V3h6v3m3 0-1 15H7L6 6m4 4v7m4-7v7',
    qr: 'M3 3h6v6H3V3Zm12 0h6v6h-6V3ZM3 15h6v6H3v-6Zm12 0h2v2h-2v-2Zm6 0v2m-6 4h2m2-2h2v2',
    send: 'm3 4 18 8-18 8 3-8-3-8Zm3 8h15',
    cooking: 'M5 11h14v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-5ZM2 13h3m14 0h3M4 11h16M9 6V4h6v2M6 8h12',
    ready: 'M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-13 0 3 3 5-6',
    delivered: 'M12 21H4V6l3-3h10l3 3v4M4 6h16M12 3v6m2 7 3 3 5-6',
    card: 'M3 5h18v14H3V5Zm0 5h18M6 15h4',
    lock: 'M6 10h12v11H6V10Zm2 0V7a4 4 0 0 1 8 0v3m-4 5v2',
    logIn: 'M14 4h5v16h-5M3 12h12m-4-4 4 4-4 4',
    logOut: 'M10 4H5v16h5m-1-8h12m-4-4 4 4-4 4',
    arrowLeft: 'M20 12H4m7-7-7 7 7 7',
    minus: 'M5 12h14'
};

function addButtonIcon(button, icon) {
    if (!Object.hasOwn(buttonIconPaths, icon) || button.querySelector(':scope > .action-icon')) return;

    const namespace = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(namespace, 'svg');
    svg.setAttribute('class', 'action-icon me-1 align-text-bottom');
    svg.setAttribute('width', '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(namespace, 'path');
    path.setAttribute('d', buttonIconPaths[icon]);
    svg.append(path);
    button.prepend(svg);
}

function createButton(label, { className = 'btn btn-primary', type = 'button', onClick, icon } = {}) {
    const button = document.createElement('button');
    button.type = type;
    button.className = className;
    button.textContent = label;
    if (icon) addButtonIcon(button, icon);
    if (onClick) button.addEventListener('click', onClick);
    return button;
}

function createInputField({ id, name, label, type = 'text', value = '', options, placeholder, min, step, maxLength, required = false, autofocus = false }) {
    const field = document.createElement('div');
    field.className = 'mb-3';

    const labelEl = document.createElement('label');
    labelEl.className = 'form-label';
    labelEl.htmlFor = id;
    labelEl.textContent = label;

    const input = document.createElement(options ? 'select' : 'input');
    input.className = options ? 'form-select' : 'form-control';
    input.id = id;
    input.name = name;
    if (options) {
        if (placeholder) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = placeholder;
            option.disabled = true;
            input.append(option);
        }
        for (const [optionValue, optionLabel] of Object.entries(options)) {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionLabel;
            input.append(option);
        }
    } else {
        input.type = type;
        if (min !== undefined) input.min = min;
        if (step !== undefined) input.step = step;
        if (maxLength !== undefined) input.maxLength = maxLength;
    }
    input.value = value ?? '';
    input.required = required;
    input.autofocus = autofocus;

    field.append(labelEl, input);
    return field;
}

function createModal({ title, body, footer }) {
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.tabIndex = -1;
    modal.setAttribute('aria-hidden', 'true');
    modal.setAttribute('aria-label', title);
    modal.innerHTML = `
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header bg-dark text-white">
                    <h5 class="modal-title"></h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                </div>
                <div class="modal-body"></div>
                <div class="modal-footer"></div>
            </div>
        </div>
    `;
    modal.querySelector('.modal-title').textContent = title;
    modal.querySelector('.modal-body').append(body);
    if (!footer) {
        footer = createButton('Cerrar', { className: 'btn btn-secondary', icon: 'close' });
        footer.setAttribute('data-bs-dismiss', 'modal');
    }
    modal.querySelector('.modal-footer').append(footer);
    return modal;
}

function openModal(modal) {
    const instance = bootstrap.Modal.getOrCreateInstance(modal);
    instance.show();
    return instance;
}

let nextDialogId = 0;
let activeDialog = null;

function showActionDialog({ title, message, fields = [], renderContent, acceptLabel = 'Guardar',
    acceptClass = 'btn btn-primary', acceptIcon = 'save', canCancel = true, onSubmit }) {
    if (activeDialog) return Promise.resolve(null);

    const form = document.createElement('form');
    form.id = `action-dialog-${++nextDialogId}`;
    if (message) {
        const text = document.createElement('p');
        text.className = 'dialog-message mb-0';
        text.textContent = message;
        form.append(text);
    }
    for (const field of fields) {
        form.append(createInputField({ ...field, id: `${form.id}-${field.name}` }));
    }

    const error = document.createElement('p');
    error.className = 'alert alert-danger mb-0';
    error.setAttribute('role', 'alert');
    error.hidden = true;

    const footer = document.createDocumentFragment();
    const cancel = canCancel ? createButton('Cancelar', { className: 'btn btn-secondary', icon: 'close' }) : null;
    if (cancel) {
        cancel.setAttribute('data-bs-dismiss', 'modal');
        footer.append(cancel);
    }
    const submit = createButton(acceptLabel, { type: 'submit', className: acceptClass, icon: acceptIcon });
    submit.setAttribute('form', form.id);
    if (renderContent) form.append(renderContent(submit));
    if (onSubmit) form.append(error);
    footer.append(submit);
    const modal = createModal({ title, body: form, footer });
    const trigger = document.activeElement;
    document.body.append(modal);
    const instance = bootstrap.Modal.getOrCreateInstance(modal);
    const dialog = { instance, cancelled: false };
    activeDialog = dialog;

    return new Promise(resolve => {
        let result = null;
        let ready = false;
        let submitting = false;
        const controls = [...form.elements, modal.querySelector('.btn-close')];
        if (cancel) controls.push(cancel);
        modal.addEventListener('hide.bs.modal', event => {
            if (submitting && !dialog.cancelled) event.preventDefault();
        });
        modal.addEventListener('shown.bs.modal', () => {
            ready = true;
            if (dialog.cancelled) {
                instance.hide();
                return;
            }
            (form.querySelector('input, select') || cancel || submit).focus();
        }, { once: true });
        form.addEventListener('submit', async event => {
            event.preventDefault();
            if (!ready || submitting || dialog.cancelled || result !== null) return;
            const values = Object.fromEntries(new FormData(form));
            if (onSubmit) {
                submitting = true;
                error.hidden = true;
                form.setAttribute('aria-busy', 'true');
                controls.forEach(control => { control.disabled = true; });
                try {
                    await onSubmit(values);
                } catch (err) {
                    if (!dialog.cancelled) {
                        error.textContent = err.message || 'No se pudo guardar.';
                        error.hidden = false;
                    }
                    return;
                } finally {
                    submitting = false;
                    form.removeAttribute('aria-busy');
                    controls.forEach(control => { control.disabled = false; });
                    if (!error.hidden) (form.querySelector('input, select') || submit).focus();
                }
            }
            if (dialog.cancelled) return;
            result = values;
            instance.hide();
        });
        modal.addEventListener('hidden.bs.modal', () => {
            instance.dispose();
            modal.remove();
            activeDialog = null;
            if (trigger?.isConnected) trigger.focus();
            resolve(dialog.cancelled ? null : result);
        }, { once: true });
        instance.show();
    });
}

async function confirmAction({ title, message, acceptLabel = 'Confirmar', acceptIcon = 'check', danger = false }) {
    const result = await showActionDialog({
        title, message, acceptLabel, acceptIcon, acceptClass: danger ? 'btn btn-danger' : 'btn btn-primary'
    });
    return result !== null;
}

function dismissActionDialog() {
    if (activeDialog) {
        activeDialog.cancelled = true;
        activeDialog.instance.hide();
    }
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
    rows.forEach((row, index) => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            if (cell instanceof Node) td.append(cell);
            else td.textContent = cell;
            tr.appendChild(td);
        });
        if (rowActions) {
            const td = document.createElement('td');
            // Action strings are literal text. Interactive actions must be DOM nodes.
            const action = rowActions(row, index);
            if (action instanceof Node) td.append(action);
            else td.textContent = action ?? '';
            tr.appendChild(td);
        }
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.replaceChildren(table);
    return table;
}