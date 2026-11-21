const ROUTES = {
    '': 'login',
    '#login': 'login',
    '#public': 'public',
    '#waiter': 'waiter',
    '#kitchen': 'kitchen',
    '#cashier': 'cashier',
    '#admin': 'admin'
};

const ROLE_PATHS = {
    ADMIN: ['#admin'],
    WAITER: ['#waiter'],
    KITCHEN: ['#kitchen'],
    CASHIER: ['#cashier']
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

function updateNav() {
    const navPublic = document.getElementById('navPublic');
    const navAuthenticated = document.getElementById('navAuthenticated');
    const navUser = document.getElementById('navUser');

    if (state.isAuthenticated()) {
        navPublic.style.display = 'none';
        navAuthenticated.style.display = 'flex';
        navUser.textContent = `${state.user.username} (${state.user.rol})`;
    } else {
        navPublic.style.display = 'flex';
        navAuthenticated.style.display = 'none';
    }
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
    container.innerHTML = '';

    if (currentViewInstance && currentViewInstance.destroy) {
        currentViewInstance.destroy();
    }

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

    const userRole = state.user.rol;
    const allowedPaths = ROLE_PATHS[userRole] || [];

    if (!allowedPaths.includes(hash)) {
        flash('No tiene acceso a este panel.', 'warning');
        const firstPath = allowedPaths[0] || '#login';
        window.location.hash = firstPath;
        return false;
    }

    return true;
}

function initRouter() {
    const logoutBtn = document.getElementById('navLogout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    window.addEventListener('hashchange', () => {
        const hash = window.location.hash;
        if (checkRouteAccess(hash)) {
            navigate(hash);
        } else {
            navigate('#login');
        }
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