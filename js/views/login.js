class LoginView {
    constructor(container) {
        this.container = container;
        this.form = null;
    }

    init() {
        if (state.isAuthenticated()) {
            const pathMap = {
                ADMIN: '#admin',
                WAITER: '#waiter',
                KITCHEN: '#kitchen',
                CASHIER: '#cashier'
            };
            window.location.hash = pathMap[state.user.rol] || '#login';
            return;
        }
        this.container.innerHTML = `
            <div class="row justify-content-center">
                <div class="col-md-6 col-lg-4">
                    <div class="view-card">
                        <div class="view-card-header">Iniciar sesi&oacute;n</div>
                        <div class="view-card-body">
                            <form id="loginForm">
                                <div class="mb-3">
                                    <label class="form-label">Usuario</label>
                                    <input type="text" name="username" class="form-control" required autofocus>
                                </div>
                                <div class="mb-3">
                                    <label class="form-label">Contrase&ntilde;a</label>
                                    <input type="password" name="password" class="form-control" required>
                                </div>
                                <button type="submit" class="btn btn-primary w-100">Ingresar</button>
                            </form>
                            <div class="mt-3 text-center">
                                <small class="text-muted">&iquest;No tiene cuenta? Contacte al administrador.</small>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.form = this.container.querySelector('#loginForm');
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    async handleSubmit(e) {
        e.preventDefault();
        const btn = this.form.querySelector('button[type="submit"]');
        btn.disabled = true;
        btn.textContent = 'Ingresando...';

        const formData = new FormData(this.form);
        const body = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        try {
            const data = await api.post('/auth/login', body);
            state.setUser(data.data);
            flash('Sesión iniciada correctamente.', 'success');
            const role = data.data.rol;
            const pathMap = {
                ADMIN: '#admin',
                WAITER: '#waiter',
                KITCHEN: '#kitchen',
                CASHIER: '#cashier'
            };
            window.location.hash = pathMap[role] || '#login';
        } catch (err) {
            flash(err.message, 'danger');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Ingresar';
        }
    }

    destroy() {}
}