const ROUTES = {
    '': 'login',
    '#login': 'login',
    '#public': 'public',
    '#waiter': 'waiter',
    '#kitchen': 'kitchen',
    '#cashier': 'cashier',
    '#admin': 'admin'
};

const ROLE_NAVIGATION = {
    ADMIN: {
        path: '#admin',
        sections: [
            { label: 'Mesas y QR', tab: '#adminMesas' },
            { label: 'Categorías', tab: '#adminCategorias' },
            { label: 'Productos', tab: '#adminProductos' },
            { label: 'Usuarios', tab: '#adminUsuarios' }
        ]
    },
    WAITER: {
        path: '#waiter',
        sections: [
            { label: 'Mesas y servicios', tab: '#waiterMesas' },
            { label: 'Pedidos', tab: '#waiterPedidos' }
        ]
    },
    KITCHEN: { path: '#kitchen', sections: [{ label: 'Pedidos activos' }] },
    CASHIER: { path: '#cashier', sections: [{ label: 'Servicios activos' }] }
};

const VIEW_MODULES = {
    login: LoginView,
    public: PublicView,
    waiter: WaiterView,
    kitchen: KitchenView,
    cashier: CashierView,
    admin: AdminView
};

let currentViewInstance = null;

function syncRoleNav(activeTab) {
    for (const link of document.querySelectorAll('#navRoleSections a')) {
        const active = window.location.hash === link.hash && link.dataset.tab === activeTab;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', link.dataset.tab ? 'true' : 'page');
        else link.removeAttribute('aria-current');
    }
}

function updateNav() {
    const navPublic = document.getElementById('navPublic');
    const navAuthenticated = document.getElementById('navAuthenticated');
    const navUser = document.getElementById('navUser');
    const roleNav = state.isAuthenticated() ? ROLE_NAVIGATION[state.user.rol] : null;
    const sections = document.getElementById('navRoleSections');

    navPublic.style.display = state.isAuthenticated() ? 'none' : 'flex';
    navAuthenticated.style.display = state.isAuthenticated() ? 'flex' : 'none';
    navUser.textContent = state.isAuthenticated() ? `${state.user.username} (${state.user.rol})` : '';
    document.getElementById('navHome').href = roleNav?.path || '#login';

    sections.replaceChildren();
    for (const section of roleNav?.sections || []) {
        const link = document.createElement('a');
        link.className = 'nav-link';
        link.href = roleNav.path;
        link.textContent = section.label;
        if (section.tab) link.dataset.tab = section.tab;
        const item = document.createElement('li');
        item.className = 'nav-item';
        item.append(link);
        sections.append(item);
    }
    syncRoleNav(roleNav?.sections[0]?.tab);
}

function initRoleNav() {
    document.getElementById('navRoleSections').addEventListener('click', event => {
        const link = event.target.closest('a');
        if (!link || link.hash !== window.location.hash) return;

        event.preventDefault();
        if (link.dataset.tab) {
            const button = document.querySelector(`#viewContainer [data-bs-target="${link.dataset.tab}"]`);
            if (button) bootstrap.Tab.getOrCreateInstance(button).show();
        }
        const mobileNav = document.getElementById('mainNav');
        if (mobileNav.classList.contains('show')) {
            bootstrap.Collapse.getOrCreateInstance(mobileNav, { toggle: false }).hide();
        }
    });

    document.getElementById('viewContainer').addEventListener('shown.bs.tab', event => {
        const tab = event.target.dataset.bsTarget;
        if (tab) syncRoleNav(tab);
    });
}

function logout() {
    api.post('/auth/logout').then(() => {
        state.clearUser();
        updateNav();
        window.location.hash = '#login';
    }).catch(() => {
        state.clearUser();
        updateNav();
        window.location.hash = '#login';
    });
}

function navigate(hash) {
    const route = ROUTES[hash] || ROUTES[''];
    const viewClass = VIEW_MODULES[route];

    const container = document.getElementById('viewContainer');
    dismissActionDialog();

    if (currentViewInstance && currentViewInstance.destroy) {
        currentViewInstance.destroy();
    }
    container.replaceChildren();
    updateNav();

    if (!viewClass) {
        container.innerHTML = '<div class="alert alert-danger">Vista no encontrada.</div>';
        return;
    }

    currentViewInstance = new viewClass(container);
    if (currentViewInstance.init) {
        currentViewInstance.init();
    }
}

function requireAuth(hash) {
    if (!state.isAuthenticated()) {
        window.location.hash = '#login';
        return false;
    }
    return true;
}

function checkRouteAccess(hash) {
    const authenticated = state.isAuthenticated();
    const isLogin = hash === '#login';
    const isPublic = hash === '#public';

    if (isLogin || isPublic) {
        return true;
    }

    if (!authenticated) {
        window.location.hash = '#login';
        return false;
    }

    const rolePath = ROLE_NAVIGATION[state.user.rol]?.path;
    if (rolePath !== hash) {
        flash('No tiene acceso a este panel.', 'warning');
        window.location.hash = rolePath || '#login';
        return false;
    }

    return true;
}

function initRouter() {
    initRoleNav();
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash || '#login';
        if (checkRouteAccess(hash)) navigate(hash);
    });

    window.addEventListener('load', async () => {
        updateNav();
        try {
            const data = await api.get('/auth/me');
            state.setUser(data.data);
            updateNav();
        } catch (err) {
            state.clearUser();
            updateNav();
        }
        const hash = window.location.hash || '#login';
        if (checkRouteAccess(hash)) {
            navigate(hash);
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    initRouter();
});