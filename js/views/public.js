class PublicView {
    static sendingOrder = false;

    constructor(container) {
        this.container = container;
        this.mesaToken = null;
        this.mesaNumero = null;
        this.categories = [];
        this.products = [];
        this.cartBtn = null;
        this.cartCountEl = null;
        this.menuScreen = null;
        this.cartScreen = null;
        this.menuScrollY = 0;
        this.subtotalFormat = new Intl.NumberFormat('es-ES', {
            minimumFractionDigits: 2, maximumFractionDigits: 2
        });
        this.navbarToggler = null;
        this.navPublic = null;
        this.navAuth = null;
        this._navOldDisplays = null;
    }

    async init() {
        window.appPublic = this;
        document.body.classList.add('public-view');
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
            <section id="publicMenu" class="view-card">
                <div class="view-card-header">
                    Men&uacute; p&uacute;blico - Mesa <span id="publicMesaNumero">--</span>
                </div>
                <div class="view-card-body">
                    <div id="publicCatalog">
                        <div class="text-center py-4"><div class="spinner-border" role="status"></div><p class="mt-2">Cargando carta...</p></div>
                    </div>
                </div>
            </section>
            <button id="publicCartBtn" type="button" class="btn btn-primary public-cart-btn"
                aria-label="Abrir carrito de pedidos" aria-controls="publicCart" disabled>
                <span class="cart-icon" aria-hidden="true">🛒</span>
                <span id="publicCartCount" class="position-absolute badge rounded-pill bg-danger" hidden>0</span>
            </button>
            <section id="publicCart" class="view-card" aria-labelledby="publicCartTitle" hidden></section>
        `;
        this.menuScreen = this.container.querySelector('#publicMenu');
        this.cartScreen = this.container.querySelector('#publicCart');

        try {
            const mesaData = await api.get(`/public/mesas/${this.mesaToken}`);
            this.mesaNumero = mesaData.data.numero;
            this.container.querySelector('#publicMesaNumero').textContent = this.mesaNumero;

            const [cats, prods] = await Promise.all([
                api.get('/categories'),
                api.get('/products')
            ]);
            this.categories = cats.data || [];
            this.products = (prods.data || []).filter(p => p.is_active !== false && p.is_available !== false);

            this.renderMenu();
        } catch (err) {
            flash(err.message, 'danger');
        }
    }

    renderMenu() {
        const catalogEl = this.container.querySelector('#publicCatalog');

        catalogEl.innerHTML = `
            <div id="publicProductsGrid" class="row row-cols-1 row-cols-sm-2 row-cols-lg-4 g-2 g-md-3"></div>
        `;

        const catButtons = document.createElement('div');
        catButtons.className = 'd-flex flex-wrap gap-2 mb-2 mb-md-3';
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

        this.cartBtn = this.container.querySelector('#publicCartBtn');
        this.cartCountEl = this.container.querySelector('#publicCartCount');
        this.cartBtn.disabled = false;
        this.cartBtn.addEventListener('click', () => this.renderCart());

        this.renderProducts();
        this.updateCartSummary();
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
        flex.className = 'd-flex flex-wrap justify-content-between align-items-center gap-2';

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
        if (!product || PublicView.sendingOrder) return;
        const cents = Math.round(Number(product.price) * 100);
        state.addToCart(product.id, product.name, cents);
        flash(`${product.name} agregado al carrito.`, 'success');
        this.updateCartSummary();
    }

    renderCart() {
        if (PublicView.sendingOrder) {
            flash('El pedido se está enviando.', 'info');
            return;
        }
        if (!this.cartScreen.hidden) return;
        this.menuScrollY = window.scrollY;
        this.cartScreen.innerHTML = `
            <div class="view-card-header">
                <h1 class="h5 mb-0" id="publicCartTitle" tabindex="-1">Tu carrito - Mesa <span></span></h1>
            </div>
            <div class="view-card-body">
                <div id="publicCartNavigation" class="mb-3"></div>
                <form id="publicCartForm">
                    <fieldset class="m-0 p-0 border-0">
                        <ul id="publicCartList" class="list-group mb-3"></ul>
                        <div class="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
                            <strong>Total:</strong>
                            <strong id="publicCartTotal" aria-live="polite"></strong>
                        </div>
                        <p class="text-muted small mb-2">Los precios se validan al enviar. No se realiza pago aquí.</p>
                        <p id="publicCartError" class="alert alert-danger" role="alert" hidden></p>
                        <p id="publicOrderStatus" class="alert alert-success" role="status" tabindex="-1" hidden></p>
                        <button id="publicCheckoutBtn" type="submit" class="btn btn-success w-100">Confirmar pedido</button>
                    </fieldset>
                </form>
            </div>
        `;
        const title = this.cartScreen.querySelector('#publicCartTitle');
        title.querySelector('span').textContent = this.mesaNumero;
        const back = createButton('Volver al menú', {
            className: 'btn btn-outline-secondary', onClick: () => this.showMenu()
        });
        back.id = 'publicBackToMenu';
        this.cartScreen.querySelector('#publicCartNavigation').append(back);
        this.cartScreen.querySelector('#publicCartForm').addEventListener('submit', event => {
            event.preventDefault();
            this.sendOrder();
        });

        this.menuScreen.hidden = true;
        this.cartBtn.hidden = true;
        this.cartScreen.hidden = false;
        this.renderCartItems();
        window.scrollTo(0, 0);
        title.focus({ preventScroll: true });
    }

    showMenu() {
        if (PublicView.sendingOrder) return;
        this.cartScreen.hidden = true;
        this.menuScreen.hidden = false;
        this.cartBtn.hidden = false;
        this.cartBtn.focus({ preventScroll: true });
        window.scrollTo(0, this.menuScrollY);
    }

    renderCartItems() {
        const list = this.cartScreen.querySelector('#publicCartList');
        const rows = Array.from(state.cart.values(), item => this.renderCartItem(item));
        if (!rows.length) {
            const empty = document.createElement('li');
            empty.className = 'list-group-item text-muted';
            empty.textContent = 'El carrito está vacío.';
            rows.push(empty);
        }
        list.replaceChildren(...rows);
        this.updateCartSummary();
    }

    renderCartItem(item) {
        const row = document.createElement('li');
        row.className = 'list-group-item public-cart-item';
        const name = document.createElement('div');
        name.className = 'public-cart-item-name fw-semibold';
        name.textContent = item.name;
        const price = document.createElement('div');
        price.className = 'small text-muted';
        price.textContent = `Precio unitario: ${formatMoney(item.cents)}`;
        name.append(price);

        const quantity = createInputField({
            id: `publicCartQuantity-${item.id}`,
            name: `cantidad-${item.id}`,
            label: 'Cantidad',
            type: 'number', value: item.quantity, min: 1, step: 1, required: true
        });
        quantity.classList.replace('mb-3', 'mb-0');
        quantity.classList.add('public-cart-quantity');
        const input = quantity.querySelector('input');
        input.max = '2147483647';
        input.setAttribute('aria-label', `Cantidad de ${item.name}`);
        const feedback = document.createElement('div');
        feedback.id = `publicCartQuantityError-${item.id}`;
        feedback.className = 'invalid-feedback';
        feedback.textContent = 'Ingrese una cantidad entera válida.';
        quantity.append(feedback);
        input.setAttribute('aria-describedby', feedback.id);

        const amount = document.createElement('div');
        amount.className = 'public-cart-subtotal';
        const label = document.createElement('span');
        label.className = 'd-block small text-muted';
        label.textContent = 'Subtotal';
        const subtotal = document.createElement('strong');
        const updateSubtotal = () => {
            const cents = BigInt(item.cents) * BigInt(item.quantity);
            const decimal = `${cents / 100n}.${(cents % 100n).toString().padStart(2, '0')}`;
            subtotal.textContent = this.subtotalFormat.format(decimal);
        };
        updateSubtotal();
        amount.append(label, subtotal);

        input.addEventListener('input', () => {
            if (PublicView.sendingOrder) return;
            const valid = input.validity.valid;
            input.classList.toggle('is-invalid', !valid);
            input.setAttribute('aria-invalid', String(!valid));
            if (valid) {
                state.updateCartQuantity(item.id, input.valueAsNumber);
                updateSubtotal();
            }
            this.updateCartSummary();
        });
        input.addEventListener('keydown', event => {
            if (event.key === 'Enter') event.preventDefault();
        });

        const remove = createButton('Quitar', {
            className: 'btn btn-sm btn-outline-danger public-cart-remove',
            onClick: () => this.removeFromCart(item.id)
        });
        remove.setAttribute('aria-label', `Quitar ${item.name}`);
        row.append(name, quantity, amount, remove);
        return row;
    }

    updateCartSummary() {
        if (this.cartCountEl) {
            this.cartCountEl.hidden = !state.cart.size;
            this.cartCountEl.textContent = state.cart.size;
        }
        if (!this.cartScreen || this.cartScreen.hidden) return;
        this.cartScreen.querySelector('#publicCartTotal').textContent = state.getCartTotal();
        this.cartScreen.querySelector('#publicCheckoutBtn').disabled =
            PublicView.sendingOrder || !state.cart.size || !!this.cartScreen.querySelector('input:invalid');
    }

    async sendOrder() {
        if (PublicView.sendingOrder || this.cartScreen.hidden || !state.cart.size) return;
        const form = this.cartScreen.querySelector('#publicCartForm');
        if (!form.reportValidity()) return;

        const submittedCart = [...state.cart.values()];
        const items = submittedCart.map(item => ({ producto_id: item.id, cantidad: item.quantity }));
        const fields = form.querySelector('fieldset');
        const button = form.querySelector('#publicCheckoutBtn');
        const back = this.cartScreen.querySelector('#publicBackToMenu');
        const error = form.querySelector('#publicCartError');
        const status = form.querySelector('#publicOrderStatus');
        PublicView.sendingOrder = true;
        error.hidden = true;
        status.hidden = true;
        fields.disabled = true;
        back.disabled = true;
        form.setAttribute('aria-busy', 'true');
        button.textContent = 'Enviando…';
        this.updateCartSummary();

        try {
            const data = await api.post(`/public/mesas/${this.mesaToken}/pedidos`, { items });
            const message = `Pedido #${data.data.id} recibido. Estado: ${estadoLegible(data.data.estado)}.`;
            state.clearCart();
            if (this.cartScreen.isConnected) {
                this.renderCartItems();
                status.textContent = message;
                status.hidden = false;
                status.focus();
            }
            flash(message, 'success');
        } catch (err) {
            // The shared API client may clear state on 401; retain this unconfirmed order.
            for (const item of submittedCart) {
                if (!state.cart.has(item.id)) state.cart.set(item.id, item);
            }
            if (this.cartScreen.isConnected) {
                error.textContent = err.message;
                error.hidden = false;
            } else {
                flash(err.message, 'danger');
            }
        } finally {
            PublicView.sendingOrder = false;
            if (this.cartScreen.isConnected) {
                fields.disabled = false;
                back.disabled = false;
                form.removeAttribute('aria-busy');
                button.textContent = 'Confirmar pedido';
                this.updateCartSummary();
            } else if (window.appPublic?.menuScreen?.isConnected) {
                window.appPublic.updateCartSummary();
            }
        }
    }

    removeFromCart(productId) {
        if (PublicView.sendingOrder) return;
        state.removeFromCart(productId);
        this.renderCartItems();
    }

    destroy() {
        document.body.classList.remove('public-view');
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
    }
}

window.appPublic = null;
