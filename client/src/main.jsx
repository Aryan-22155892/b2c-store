import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';

const API_URL = import.meta.env.VITE_API_URL || '/api';

function formatPrice(value) {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(Number(value || 0));
}

async function request(path, { method = 'GET', token, body } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (response.status === 204) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  return data;
}

function useStoredAuth() {
  const [auth, setAuthState] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('b2c-auth')) || { token: '', user: null };
    } catch {
      return { token: '', user: null };
    }
  });

  const setAuth = (next) => {
    setAuthState(next);
    localStorage.setItem('b2c-auth', JSON.stringify(next));
  };

  const logout = () => {
    setAuthState({ token: '', user: null });
    localStorage.removeItem('b2c-auth');
  };

  return { auth, setAuth, logout };
}

function Header({ auth, logout, view, setView, cartCount }) {
  const nav = [
    ['shop', 'Shop'],
    ['cart', `Cart (${cartCount})`],
    ...(auth.user ? [['history', 'Purchase History']] : []),
    ...(auth.user?.role === 'ADMIN' ? [['admin', 'Admin Dashboard']] : []),
  ];

  return (
    <header className="site-header">
      <a className="brand" href="#shop" onClick={() => setView('shop')} aria-label="B2C Store home">
        <span className="brand-icon" aria-hidden="true">🛍️</span>
        <span>B2C Store</span>
      </a>
      <nav aria-label="Main navigation">
        {nav.map(([key, label]) => (
          <button key={key} className={view === key ? 'active' : ''} onClick={() => setView(key)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="auth-area">
        {auth.user ? (
          <>
            <span className="user-pill">{auth.user.name} · {auth.user.role}</span>
            <button onClick={logout} className="ghost">Logout</button>
          </>
        ) : (
          <>
            <button onClick={() => setView('login')}>Login</button>
            <button onClick={() => setView('register')} className="primary">Register</button>
          </>
        )}
      </div>
    </header>
  );
}

function Notice({ type = 'info', children }) {
  if (!children) return null;
  return <div className={`notice ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div>;
}

function AuthPage({ mode, setAuth, setView }) {
  const [form, setForm] = useState({ name: '', email: mode === 'login' ? 'user@store.com' : '', password: mode === 'login' ? 'user123' : '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setError('');
    setForm((old) => ({ ...old, email: mode === 'login' ? old.email || 'user@store.com' : old.email, password: mode === 'login' ? old.password || 'user123' : old.password }));
  }, [mode]);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const payload = mode === 'register'
        ? { name: form.name, email: form.email, password: form.password }
        : { email: form.email, password: form.password };
      const data = await request(`/auth/${mode}`, { method: 'POST', body: payload });
      setAuth(data);
      setView('shop');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel narrow" aria-labelledby="auth-title">
      <h1 id="auth-title">{mode === 'login' ? 'Login' : 'Create account'}</h1>
      <p className="muted">Demo accounts: user@store.com / user123 and admin@store.com / admin123.</p>
      <Notice type="error">{error}</Notice>
      <form onSubmit={submit} className="form-grid">
        {mode === 'register' && (
          <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
        )}
        <label>Email<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
        <label>Password<input type="password" required minLength="6" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
        <button className="primary" type="submit" disabled={loading}>{loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Register'}</button>
      </form>
    </section>
  );
}

function Shop({ auth, onAddToCart }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [order, setOrder] = useState('desc');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '50', sortBy, order });
      if (query) params.set('search', query);
      if (categoryId) params.set('categoryId', categoryId);
      const [productData, categoryData] = await Promise.all([
        request(`/products?${params.toString()}`),
        request('/categories'),
      ]);
      setProducts(productData.data || []);
      setCategories(categoryData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [categoryId, sortBy, order]);

  const submitSearch = (event) => {
    event.preventDefault();
    load();
  };

  const add = async (productId) => {
    if (!auth.token) {
      setError('Please login before adding items to the cart.');
      return;
    }
    try {
      await onAddToCart(productId);
      setMessage('Added to cart.');
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <main>
      <section className="hero">
        <div>
          <p className="eyebrow">Business to Consumer Store</p>
          <h1>Browse products, build your cart, and checkout with mock payment.</h1>
          <p>Search, filter by category, manage cart items, and view purchase history after checkout.</p>
        </div>
      </section>

      <section className="toolbar" aria-label="Product filters">
        <form onSubmit={submitSearch} className="search-form">
          <label className="sr-only" htmlFor="search">Search products</label>
          <input id="search" placeholder="Search by product name" value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit">Search</button>
        </form>
        <label>Category
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
        </label>
        <label>Sort
          <select value={`${sortBy}:${order}`} onChange={(e) => { const [field, dir] = e.target.value.split(':'); setSortBy(field); setOrder(dir); }}>
            <option value="createdAt:desc">Newest</option>
            <option value="price:asc">Price low to high</option>
            <option value="price:desc">Price high to low</option>
            <option value="name:asc">Name A-Z</option>
          </select>
        </label>
      </section>

      <Notice>{message}</Notice>
      <Notice type="error">{error}</Notice>
      {loading ? <p className="loading">Loading products...</p> : (
        <section className="product-grid" aria-label="Products">
          {products.map((product) => (
            <article className="product-card" key={product.id}>
              <img src={product.imageUrl || 'https://placehold.co/500x350?text=Product'} alt="" loading="lazy" />
              <div className="product-body">
                <span className="tag">{product.category?.name}</span>
                <h2>{product.name}</h2>
                <p>{product.description}</p>
                <div className="card-footer">
                  <strong>{formatPrice(product.price)}</strong>
                  <span>{product.stock} in stock</span>
                </div>
                <button className="primary full" onClick={() => add(product.id)} disabled={product.stock < 1} aria-label={`Add ${product.name} to cart`}>
                  {product.stock < 1 ? 'Out of stock' : 'Add to cart'}
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

function Cart({ auth, cart, refreshCart, setView }) {
  const [error, setError] = useState('');
  const [payment, setPayment] = useState({ cardNumber: '4242424242424242', expiry: '12/26', cvv: '123' });
  const [success, setSuccess] = useState('');

  const updateQty = async (productId, quantity) => {
    try {
      await request(`/cart/${productId}`, { method: 'PATCH', token: auth.token, body: { quantity: Number(quantity) } });
      refreshCart();
    } catch (err) { setError(err.message); }
  };

  const remove = async (productId) => {
    try {
      await request(`/cart/${productId}`, { method: 'DELETE', token: auth.token });
      refreshCart();
    } catch (err) { setError(err.message); }
  };

  const checkout = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    try {
      const order = await request('/orders/checkout', { method: 'POST', token: auth.token, body: { paymentDetails: payment } });
      setSuccess(`Payment successful. Order ${order.id.slice(0, 8)} has been created.`);
      refreshCart();
    } catch (err) { setError(err.message); }
  };

  if (!auth.user) return <LoginRequired setView={setView} text="Please login to view your cart." />;

  return (
    <section className="panel" aria-labelledby="cart-title">
      <h1 id="cart-title">Shopping Cart</h1>
      <Notice type="error">{error}</Notice>
      <Notice>{success}</Notice>
      {cart.items.length === 0 ? <p>Your cart is empty.</p> : (
        <div className="cart-layout">
          <div className="cart-list">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <img src={item.product.imageUrl || 'https://placehold.co/120'} alt="" />
                <div>
                  <h2>{item.product.name}</h2>
                  <p>{formatPrice(item.product.price)} each</p>
                </div>
                <label>Qty
                  <input type="number" min="1" max={item.product.stock} value={item.quantity} onChange={(e) => updateQty(item.productId, e.target.value)} />
                </label>
                <strong>{formatPrice(Number(item.product.price) * item.quantity)}</strong>
                <button className="danger" onClick={() => remove(item.productId)}>Remove</button>
              </article>
            ))}
          </div>
          <form className="checkout-card" onSubmit={checkout}>
            <h2>Mock payment</h2>
            <p className="muted">Use 0000 as the card number to simulate a declined payment.</p>
            <label>Card number<input value={payment.cardNumber} onChange={(e) => setPayment({ ...payment, cardNumber: e.target.value })} /></label>
            <label>Expiry<input value={payment.expiry} onChange={(e) => setPayment({ ...payment, expiry: e.target.value })} /></label>
            <label>CVV<input value={payment.cvv} onChange={(e) => setPayment({ ...payment, cvv: e.target.value })} /></label>
            <div className="total-row"><span>Total</span><strong>{formatPrice(cart.subtotal)}</strong></div>
            <button className="primary full" type="submit">Complete purchase</button>
          </form>
        </div>
      )}
    </section>
  );
}

function LoginRequired({ setView, text }) {
  return <section className="panel narrow"><h1>Login required</h1><p>{text}</p><button className="primary" onClick={() => setView('login')}>Login</button></section>;
}

function PurchaseHistory({ auth, setView }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!auth.token) return;
    request('/orders', { token: auth.token }).then((data) => setOrders(data.data || [])).catch((err) => setError(err.message));
  }, [auth.token]);

  if (!auth.user) return <LoginRequired setView={setView} text="Please login to view purchase history." />;

  return (
    <section className="panel" aria-labelledby="history-title">
      <h1 id="history-title">Purchase History</h1>
      <Notice type="error">{error}</Notice>
      {orders.length === 0 ? <p>No purchases yet.</p> : orders.map((order) => (
        <article className="order-card" key={order.id}>
          <div>
            <h2>Order #{order.id.slice(0, 8)}</h2>
            <p>{new Date(order.createdAt).toLocaleString()} · {order.status}</p>
          </div>
          <strong>{formatPrice(order.totalAmount)}</strong>
          <ul>
            {order.items.map((item) => <li key={item.id}>{item.quantity} × {item.product.name}</li>)}
          </ul>
        </article>
      ))}
    </section>
  );
}

function AdminDashboard({ auth, setView }) {
  const [tab, setTab] = useState('products');
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', price: '', imageUrl: '', stock: 0, categoryId: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadAdminData = async () => {
    if (!auth.token) return;
    try {
      const [statsData, productData, categoryData, orderData] = await Promise.all([
        request('/admin/stats', { token: auth.token }),
        request('/products?limit=100', { token: auth.token }),
        request('/categories'),
        request('/admin/orders?limit=100', { token: auth.token }),
      ]);
      setStats(statsData);
      setProducts(productData.data || []);
      setCategories(categoryData || []);
      setOrders(orderData.data || []);
      if (!form.categoryId && categoryData[0]) setForm((old) => ({ ...old, categoryId: categoryData[0].id }));
    } catch (err) { setError(err.message); }
  };

  useEffect(() => { loadAdminData(); }, [auth.token]);

  if (auth.user?.role !== 'ADMIN') return <LoginRequired setView={setView} text="Admin access is required." />;

  const reset = () => { setEditing(null); setForm({ name: '', description: '', price: '', imageUrl: '', stock: 0, categoryId: categories[0]?.id || '' }); };

  const saveProduct = async (event) => {
    event.preventDefault();
    setError(''); setMessage('');
    try {
      const payload = { ...form, price: Number(form.price), stock: Number(form.stock) };
      await request(editing ? `/products/${editing}` : '/products', { method: editing ? 'PATCH' : 'POST', token: auth.token, body: payload });
      setMessage(editing ? 'Product updated.' : 'Product created.');
      reset();
      loadAdminData();
    } catch (err) { setError(err.message); }
  };

  const edit = (product) => {
    setEditing(product.id);
    setForm({ name: product.name, description: product.description || '', price: product.price, imageUrl: product.imageUrl || '', stock: product.stock, categoryId: product.categoryId });
    setTab('products');
  };

  const deleteProduct = async (id) => {
    if (!confirm('Delete this product?')) return;
    try {
      await request(`/products/${id}`, { method: 'DELETE', token: auth.token });
      setMessage('Product deleted.');
      loadAdminData();
    } catch (err) { setError(err.message); }
  };

  return (
    <section className="panel" aria-labelledby="admin-title">
      <h1 id="admin-title">Admin Dashboard</h1>
      <Notice type="error">{error}</Notice><Notice>{message}</Notice>
      {stats && <div className="stats-grid">
        <div><span>Users</span><strong>{stats.totalUsers}</strong></div>
        <div><span>Products</span><strong>{stats.totalProducts}</strong></div>
        <div><span>Paid orders</span><strong>{stats.totalOrders}</strong></div>
        <div><span>Revenue</span><strong>{formatPrice(stats.totalRevenue)}</strong></div>
      </div>}
      <div className="tabs" role="tablist">
        <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}>Manage Products</button>
        <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}>Purchase Records</button>
      </div>
      {tab === 'products' ? (
        <div className="admin-grid">
          <form onSubmit={saveProduct} className="admin-form">
            <h2>{editing ? 'Edit product' : 'Add product'}</h2>
            <label>Name<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
            <label>Price<input type="number" step="0.01" min="0.01" required value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
            <label>Image URL<input value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} /></label>
            <label>Stock<input type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></label>
            <label>Category<select required value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })}>{categories.map((c) => <option value={c.id} key={c.id}>{c.name}</option>)}</select></label>
            <button className="primary" type="submit">{editing ? 'Save changes' : 'Create product'}</button>
            {editing && <button type="button" onClick={reset}>Cancel edit</button>}
          </form>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr></thead>
              <tbody>{products.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.category?.name}</td><td>{formatPrice(product.price)}</td><td>{product.stock}</td><td><button onClick={() => edit(product)}>Edit</button><button className="danger" onClick={() => deleteProduct(product.id)}>Delete</button></td></tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="table-wrap"><table>
          <thead><tr><th>Order</th><th>User</th><th>Date</th><th>Status</th><th>Total</th></tr></thead>
          <tbody>{orders.map((order) => <tr key={order.id}><td>{order.id.slice(0, 8)}</td><td>{order.user?.email}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td><td>{order.status}</td><td>{formatPrice(order.totalAmount)}</td></tr>)}</tbody>
        </table></div>
      )}
    </section>
  );
}

function App() {
  const { auth, setAuth, logout } = useStoredAuth();
  const [view, setView] = useState('shop');
  const [cart, setCart] = useState({ items: [], subtotal: 0, itemCount: 0 });

  const cartCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);

  const refreshCart = async () => {
    if (!auth.token) { setCart({ items: [], subtotal: 0, itemCount: 0 }); return; }
    try {
      const data = await request('/cart', { token: auth.token });
      setCart(data);
    } catch {
      setCart({ items: [], subtotal: 0, itemCount: 0 });
    }
  };

  useEffect(() => { refreshCart(); }, [auth.token]);

  const addToCart = async (productId) => {
    await request('/cart', { method: 'POST', token: auth.token, body: { productId, quantity: 1 } });
    await refreshCart();
  };

  let content;
  if (view === 'login') content = <AuthPage mode="login" setAuth={setAuth} setView={setView} />;
  else if (view === 'register') content = <AuthPage mode="register" setAuth={setAuth} setView={setView} />;
  else if (view === 'cart') content = <Cart auth={auth} cart={cart} refreshCart={refreshCart} setView={setView} />;
  else if (view === 'history') content = <PurchaseHistory auth={auth} setView={setView} />;
  else if (view === 'admin') content = <AdminDashboard auth={auth} setView={setView} />;
  else content = <Shop auth={auth} onAddToCart={addToCart} />;

  return (
    <>
      <Header auth={auth} logout={() => { logout(); setView('shop'); }} view={view} setView={setView} cartCount={cartCount} />
      {content}
      <footer className="site-footer">B2C Store demo app · REST API + React frontend</footer>
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
