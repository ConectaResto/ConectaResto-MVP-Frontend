const API_ORIGIN = 'http://127.0.0.1:5000';

function apiUrl(path) {
    return new URL(path, API_ORIGIN).href;
}

let cachedCsrfToken = null;

async function getCsrfToken() {
    const response = await fetch(apiUrl('/auth/csrf'), {
        credentials: 'include',
        headers: { Accept: 'application/json' }
    });
    if (!response.ok) {
        throw new Error('No se pudo obtener el token CSRF');
    }
    const data = await response.json();
    cachedCsrfToken = data.data.csrf_token;
    return cachedCsrfToken;
}

async function apiRequest(url, options = {}) {
    const headers = {
        Accept: 'application/json',
        ...options.headers
    };

    const needsBody = options.body && !(options.body instanceof FormData);
    if (needsBody) {
        headers['Content-Type'] = 'application/json';
    }

    if (options.method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(options.method)) {
        if (!cachedCsrfToken) {
            cachedCsrfToken = await getCsrfToken();
        }
        headers['X-CSRF-Token'] = cachedCsrfToken;
    }

    const response = await fetch(apiUrl(url), {
        credentials: 'include',
        ...options,
        headers
    });

    if (response.status === 401) {
        state.clearUser();
        throw new Error('Sesion expirada. Inicie sesion nuevamente.');
    }

    if (response.status === 403) {
        throw new Error('No tiene permisos para esta operacion.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok || (data && data.success === false)) {
        throw new Error(data ? data.error : 'Error en la solicitud');
    }

    if (url === '/auth/login' || url === '/auth/logout') {
        cachedCsrfToken = null;
    }

    return data;
}

const api = {
    get: (url) => apiRequest(url, { method: 'GET' }),
    post: (url, body) => apiRequest(url, { method: 'POST', body: JSON.stringify(body) }),
    put: (url, body) => apiRequest(url, { method: 'PUT', body: JSON.stringify(body) }),
    patch: (url, body) => apiRequest(url, { method: 'PATCH', body: JSON.stringify(body) }),
    del: (url) => apiRequest(url, { method: 'DELETE' }),
    postForm: (url, formData) => apiRequest(url, { method: 'POST', body: formData }),
    putForm: (url, formData) => apiRequest(url, { method: 'PUT', body: formData }),
};