class PublicView {
    constructor(container) {
        this.container = container;
        this.mesaToken = null;
        this.mesaNumero = null;
        this.categories = [];
        this.products = [];
        this.cartBtn = null;
        this.cartCountEl = null;
        this.cartModalInstance = null;
        this.navbarToggler = null;
        this.navPublic = null;
        this.navAuth = null;
        this._navOldDisplays = null;
    }

    async init() {
        window.appPublic = this;
        const params = new URLSearchParams(window.location.search);
        this.mesaToken = params.get('token');

        if (!this.mesaToken) {
            this.container.innerHTML = `
                <div class="view-card">
                    <div class="view-card-header">Men&uacute; p&uacute;blico</div>
                    <div class="view-card-body text-center py-5">
                        <div class="alert alert-warning">
                            No se ha especificado un token de mesa v&aacute;lido.
                        </div>
                        <p class="text-muted">Escanea el QR de una mesa o accede mediante el enlace proporcionado.</p>
                        <p class="text-muted">Ejemplo: <code>/?token=TOKEN_DE_LA_MESA#public</code></p>
                    </div>
                </div>
            `;
            return;
        }

        this.navbarToggler = document.querySelector('.navbar-toggler');
        this.navPublic = document.getElementById('navPublic');
        this.navAuth = document.getElementById('navAuthenticated');
        this._navOldDisplays = {};
        const hide = (el) => {
            if (el) {
                this._navOldDisplays[el.id || 'toggler'] = el.style.display;
                el.style.display = 'none';
            }
        };
        hide(this.navbarToggler);
        hide(this.navPublic);
        hide(this.navAuth);

        this.container.innerHTML = `
            <div class="view-card">
                <div class="view-card-header">
                    Men&uacute; p&uacute;blico - Mesa <span id="publicMesaNumero">--</span>
                </div>
                <div class="view-card-body">
                    <div id="publicCatalog">
                        <div class="text-center py-4"><div class="spinner-border" role="status"></div><p class="mt-2">Cargando carta...</p></div>
                    </div>
                </div>
            </div>
            <button id="publicCartBtn" class="btn btn-primary public-cart-btn">
                <span class="cart-icon">🛒</span>
                <span id="publicCartCount" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">0</span>
            </button>
            <div class="modal fade" id="publicCartModal" tabindex="-1" aria-hidden="true">
                <div class="modal-dialog modal-dialog-centered modal-lg">
                    <div class="modal-content">
                        <div class="modal-header bg-dark text-white">
                            <h5 class="modal-title">Tu carrito - Mesa <span id="modalMesaNumero">--</span></h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Cerrar"></button>
                        </div>
                        <div class="modal-body">
                            <div id="publicCartListModal" class="mb-3"></div>
                            <div class="d-flex justify-content-between align-items-center mb-3">
                                <strong>Total:</strong>
                                <strong id="publicCartTotalModal">${state.getCartTotal()}</strong>
                            </div>
                            <div class="mb-3">
                                <p class="text-muted small">Los precios se validan al enviar. No se realiza pago aqu&iacute;.</p>
                                <div id="publicOrderStatusModal" class="small"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button id="publicCheckoutBtn" class="btn btn-success w-100" disabled>Confirmar y enviar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        try {
            const mesaData = await api.get(`/public/mesas/${this.mesaToken}`);
            this.mesaNumero = mesaData.data.numero;
            this.container.querySelector('#publicMesaNumero').textContent = this.mesaNumero;
            this.container.querySelector('#modalMesaNumero').textContent = this.mesaNumero;

            const [cats, prods] = await Promise.all([
                api.get('/categories'),
                api.get('/products')
            ]);
            this.categories = cats.data || [];
            this.products = (prods.data || []).filter(p => p.is_active !== false && p.is_available !== false);

            this.render();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    render() {
        const catalogEl = this.container.querySelector('#publicCatalog');

        catalogEl.innerHTML = `
            <div id="publicProductsGrid" class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-3"></div>
        `;

        const catButtons = document.createElement('div');
        catButtons.className = 'mb-3';
        const btnTodas = document.createElement('button');
        btnTodas.type = 'button';
        btnTodas.className = 'btn btn-outline-secondary btn-sm';
        btnTodas.textContent = 'Todas';
        btnTodas.dataset.cat = '';
        catButtons.appendChild(btnTodas);
        this.categories.forEach(c => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'btn btn-outline-secondary btn-sm';
            btn.textContent = c.name;
            btn.dataset.cat = String(c.id);
            catButtons.appendChild(btn);
        });
        catalogEl.insertBefore(catButtons, catalogEl.firstChild);

        catButtons.querySelectorAll('[data-cat]').forEach(btn => {
            btn.addEventListener('click', () => {
                const catId = btn.dataset.cat || null;
                this.container.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.renderProducts(catId);
            });
        });

        // Botón flotante del carrito
        this.cartBtn = this.container.querySelector('#publicCartBtn');
        this.cartCountEl = this.container.querySelector('#publicCartCount');
        this.cartBtn.addEventListener('click', () => {
            this.cartModalInstance = new bootstrap.Modal(document.getElementById('publicCartModal'));
            this.cartModalInstance.show();
        });

        // Checkout button en el modal
        this.container.querySelector('#publicCheckoutBtn').addEventListener('click', () => this.sendOrder());

        this.renderProducts();
        this.updateCartUI();
    }

    productCard(p) {
        const cents = parseFloat(p.price) * 100;
        const col = document.createElement('div');
        col.className = 'col';

        const card = document.createElement('div');
        card.className = 'card h-100';

        const img = document.createElement('img');
        img.className = 'card-img-top';
        img.alt = p.name;
        img.style.height = '160px';
        img.style.objectFit = 'cover';
        const imageUrl = p.image_url || '/static/img/default-product.svg';
        if (/^\/[^/]/.test(imageUrl)) {
            img.src = apiUrl(imageUrl);
        } else {
            img.src = apiUrl('/static/img/default-product.svg');
        }

        const cardBody = document.createElement('div');
        cardBody.className = 'card-body';

        const title = document.createElement('h5');
        title.className = 'card-title';
        title.textContent = p.name;

        const desc = document.createElement('p');
        desc.className = 'card-text text-muted small';
        desc.textContent = p.description || '';

        const flex = document.createElement('div');
        flex.className = 'd-flex justify-content-between align-items-center';

        const price = document.createElement('span');
        price.className = 'fw-bold';
        price.textContent = formatMoney(cents);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-primary btn-sm';
        addBtn.textContent = 'Agregar';
        addBtn.addEventListener('click', () => this.addToCart(p.id));

        flex.appendChild(price);
        flex.appendChild(addBtn);
        cardBody.appendChild(title);
        cardBody.appendChild(desc);
        cardBody.appendChild(flex);
        card.appendChild(img);
        card.appendChild(cardBody);
        col.appendChild(card);

        return col;
    }

    renderProducts(catId = null) {
        const grid = this.container.querySelector('#publicProductsGrid');
        const filtered = catId === null ? this.products : this.products.filter(p => p.categoria_id == catId);
        grid.innerHTML = '';
        filtered.forEach(p => {
            grid.appendChild(this.productCard(p));
        });
    }

    addToCart(productId) {
        const product = this.products.find(p => p.id == productId);
        if (!product) return;
        const cents = parseFloat(product.price) * 100;
        state.addToCart(product.id, product.name, cents);
        flash(`${product.name} agregado al carrito.`, 'success');
        this.updateCartUI();
    }

    updateCartUI() {
        // Actualizar contador del botón flotante
        if (this.cartCountEl) {
            if (state.cart.size === 0) {
                this.cartCountEl.style.display = 'none';
                this.cartBtn.classList.remove('btn-danger');
                this.cartBtn.classList.add('btn-primary');
            } else {
                this.cartCountEl.style.display = 'block';
                this.cartCountEl.textContent = state.cart.size;
            }
        }

        // Actualizar contenido del modal si está renderizado
        const list = this.container.querySelector('#publicCartListModal');
        const totalEl = this.container.querySelector('#publicCartTotalModal');
        const checkoutBtn = this.container.querySelector('#publicCheckoutBtn');
        const orderStatus = this.container.querySelector('#publicOrderStatusModal');

        if (!list) return;

        if (state.cart.size === 0) {
            list.innerHTML = '<p class="text-muted small">El carrito est&aacute; vac&iacute;o.</p>';
            totalEl.textContent = state.getCartTotal();
            checkoutBtn.disabled = true;
            if (orderStatus) orderStatus.textContent = '';
            return;
        }

        list.innerHTML = '';
        for (const [id, item] of state.cart) {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center border-bottom py-2';

            const info = document.createElement('div');
            const nameDiv = document.createElement('div');
            nameDiv.textContent = item.name;
            const qtyDiv = document.createElement('div');
            qtyDiv.className = 'small text-muted';
            qtyDiv.textContent = formatMoney(item.cents) + ' x ' + item.quantity;
            info.appendChild(nameDiv);
            info.appendChild(qtyDiv);

            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-sm btn-outline-danger';
            removeBtn.textContent = '×';
            removeBtn.addEventListener('click', () => this.removeFromCart(id));

            div.appendChild(info);
            div.appendChild(removeBtn);
            list.appendChild(div);
        }
        totalEl.textContent = state.getCartTotal();
        checkoutBtn.disabled = false;
        if (orderStatus) orderStatus.textContent = '';
    }

    async sendOrder() {
        const btn = this.container.querySelector('#publicCheckoutBtn');
        btn.disabled = true;
        btn.textContent = 'Enviando...';

        const items = [...state.cart.values()].map(item => ({
            producto_id: item.id,
            cantidad: item.quantity
        }));

        try {
            const data = await api.post(`/public/mesas/${this.mesaToken}/pedidos`, { items });
            flash(`Pedido #${data.data.id} recibido. Estado: ${estadoLegible(data.data.estado)}.`, 'success');
            state.clearCart();
            this.updateCartUI();
            this.container.querySelector('#publicOrderStatusModal').textContent = `Pedido #${data.data.id} enviado.`;
            if (this.cartModalInstance) this.cartModalInstance.hide();
        } catch (err) {
            flash(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Confirmar y enviar';
        }
    }

    removeFromCart(productId) {
        state.removeFromCart(productId);
        this.updateCartUI();
    }

    destroy() {
        if (this._navOldDisplays) {
            const restore = (el, key) => {
                if (el) {
                    el.style.display = this._navOldDisplays[key] !== undefined ? this._navOldDisplays[key] : '';
                }
            };
            restore(this.navbarToggler, 'toggler');
            restore(this.navPublic, 'navPublic');
            restore(this.navAuth, 'navAuthenticated');
            this._navOldDisplays = null;
        }
        if (this.cartModalInstance) {
            this.cartModalInstance.hide();
        }
    }
}

window.appPublic = null;
