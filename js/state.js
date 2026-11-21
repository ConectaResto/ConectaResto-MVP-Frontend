const state = {
    user: null,
    csrfToken: null,
    cart: new Map(),
    currentView: null,

    setUser(user) {
        this.user = user;
    },

    clearUser() {
        this.user = null;
        this.cart.clear();
    },

    isAuthenticated() {
        return this.user !== null;
    },

    hasRole(role) {
        return this.user && this.user.rol === role;
    },

    addToCart(productId, name, cents, quantity = 1) {
        const existing = this.cart.get(productId);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.cart.set(productId, { id: productId, name, cents, quantity });
        }
    },

    removeFromCart(productId) {
        this.cart.delete(productId);
    },

    updateCartQuantity(productId, quantity) {
        const item = this.cart.get(productId);
        if (item) {
            item.quantity = Math.max(1, parseInt(quantity) || 1);
        }
    },

    clearCart() {
        this.cart.clear();
    },

    getCartTotalCents() {
        let total = 0n;
        for (const item of this.cart.values()) {
            total += BigInt(item.cents) * BigInt(item.quantity);
        }
        return total;
    },

    getCartTotal() {
        const cents = this.getCartTotalCents();
        return (cents / 100n).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
};