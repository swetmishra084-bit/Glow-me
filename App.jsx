import React, { useEffect, useMemo, useState } from "react";
import { Search, ShoppingBag, Heart, Menu, X, Plus, Pencil, Trash2, Store, Package, ArrowRight, SlidersHorizontal, Sparkles, LogIn, LogOut } from "lucide-react";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth, firebaseConfigured } from "./firebase";
import { createProduct, updateProduct, deleteProduct, subscribeToProducts, isAdminUser, uploadProductImage, createOrder, subscribeToOrders, updateOrderStatus } from "./firebaseStore";

const starterProducts = [
  { id: 1, name: "Radiant Glow Serum", brand: "Minimalist", category: "Skincare", price: 599, oldPrice: 699, stock: 24, tag: "BESTSELLER", image: "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85", description: "A lightweight daily serum for a fresh, hydrated-looking glow." },
  { id: 2, name: "Velvet Matte Lipstick", brand: "Maybelline", category: "Makeup", price: 499, oldPrice: 599, stock: 18, tag: "TRENDING", image: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85", description: "Comfortable colour with a soft matte finish." },
  { id: 3, name: "Hydra Boost Moisturizer", brand: "Neutrogena", category: "Skincare", price: 750, oldPrice: 899, stock: 12, tag: "POPULAR", image: "https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85", description: "A daily moisturizer that leaves skin feeling soft and comfortable." },
  { id: 4, name: "Nourishing Hair Oil", brand: "Mamaearth", category: "Haircare", price: 349, oldPrice: 399, stock: 31, tag: "", image: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85", description: "A nourishing hair-care essential for your routine." },
  { id: 5, name: "Soft Focus Foundation", brand: "Lakmé", category: "Makeup", price: 699, oldPrice: 799, stock: 9, tag: "NEW", image: "https://images.unsplash.com/photo-1631214540242-6cb3b2c7b2f5?auto=format&fit=crop&w=900&q=85", description: "Buildable coverage with a natural-looking finish." },
  { id: 6, name: "Daily Sunscreen SPF 50", brand: "Aqualogica", category: "Skincare", price: 449, oldPrice: 549, stock: 20, tag: "", image: "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85", description: "A lightweight sunscreen for everyday sun protection." }
];

const money = n => "₹" + Number(n || 0).toLocaleString("en-IN");
const read = (key, fallback) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };

export default function App() {
  const [products, setProducts] = useState(() => read("aditi-products", starterProducts));
  const [productsLoading, setProductsLoading] = useState(firebaseConfigured);
  const [cloudError, setCloudError] = useState("");
  const [user, setUser] = useState(null);
  const [adminVerified, setAdminVerified] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [cart, setCart] = useState(() => read("aditi-cart", []));
  const [page, setPage] = useState("shop");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("featured");
  const [cartOpen, setCartOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [notice, setNotice] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [adminSection, setAdminSection] = useState("products");

  useEffect(() => localStorage.setItem("aditi-cart", JSON.stringify(cart)), [cart]);

  useEffect(() => {
    if (!auth) { setAuthLoading(false); return; }
    return onAuthStateChanged(auth, async currentUser => {
      setUser(currentUser);
      setAdminVerified(false);
      if (currentUser) {
        try { setAdminVerified(await isAdminUser(currentUser.uid)); }
        catch (error) { setCloudError(error.message); }
      }
      setAuthLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!firebaseConfigured) { setProductsLoading(false); setCloudError("Firebase config is missing. Check .env.local."); return; }
    const unsubscribe = subscribeToProducts(items => {
      setProducts(items);
      setProductsLoading(false);
      setCloudError("");
    }, error => { setCloudError(error.message); setProductsLoading(false); });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!adminVerified) { setOrders([]); return; }
    setOrdersLoading(true);
    const unsubscribe = subscribeToOrders(items => {
      setOrders(items);
      setOrdersLoading(false);
    }, error => {
      setCloudError(error.message);
      setOrdersLoading(false);
    });
    return unsubscribe;
  }, [adminVerified]);

  const placeOrder = async e => {
    e.preventDefault();
    if (!cart.length) return;
    setPlacingOrder(true);
    setCloudError("");
    try {
      const fd = new FormData(e.currentTarget);
      const customer = {
        name: String(fd.get("customerName") || "").trim(),
        phone: String(fd.get("phone") || "").trim(),
        email: String(fd.get("email") || "").trim(),
        address: String(fd.get("address") || "").trim(),
        city: String(fd.get("city") || "").trim(),
        state: String(fd.get("state") || "").trim(),
        pincode: String(fd.get("pincode") || "").trim()
      };
      await createOrder({
        customer,
        items: cart.map(({ id, name, brand, price, qty, image }) => ({ productId: String(id), name, brand, price: Number(price), quantity: Number(qty), image })),
        subtotal: cartTotal,
        shipping: cartTotal >= 999 ? 0 : 60,
        total: cartTotal + (cartTotal >= 999 ? 0 : 60),
        paymentMethod: "Cash on Delivery",
        paymentStatus: "Pending",
        status: "New"
      });
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setNotice("Order placed successfully! Our team will contact you.");
    } catch (error) {
      setCloudError(error.message || "Could not place your order. Please try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const changeOrderStatus = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      setNotice("Order status updated");
    } catch (error) { setCloudError(error.message); }
  };

  const filtered = useMemo(() => {
    let list = products.filter(p => (category === "All" || p.category === category) &&
      [p.name, p.brand, p.category].join(" ").toLowerCase().includes(search.toLowerCase()));
    if (sort === "low") list.sort((a,b) => a.price-b.price);
    if (sort === "high") list.sort((a,b) => b.price-a.price);
    return list;
  }, [products, category, search, sort]);

  const cartCount = cart.reduce((n, item) => n + item.qty, 0);
  const cartTotal = cart.reduce((n, item) => n + item.price * item.qty, 0);
  const addToCart = p => {
    setCart(old => old.some(i => i.id === p.id) ? old.map(i => i.id === p.id ? {...i, qty:i.qty+1} : i) : [...old, {...p, qty:1}]);
    setNotice(`${p.name} added to your bag`);
    setTimeout(() => setNotice(""), 2200);
  };
  const updateQty = (id, delta) => setCart(old => old.map(i => i.id === id ? {...i, qty:i.qty+delta} : i).filter(i => i.qty > 0));
  const loginAdmin = async e => {
    e.preventDefault();
    try {
      if (!auth) throw new Error("Firebase is not configured.");
      const credential = await signInWithEmailAndPassword(auth, loginEmail.trim(), loginPassword);
      const allowed = await isAdminUser(credential.user.uid);
      if (!allowed) { await signOut(auth); throw new Error("This account is not listed as an admin in Firestore."); }
      setAdminVerified(true); setNotice("Admin login successful"); setLoginPassword("");
    } catch (error) { setCloudError(error.message); }
  };
  const logoutAdmin = async () => { if (auth) await signOut(auth); setAdminVerified(false); };
  const removeProduct = async id => {
    if (!adminVerified || !confirm("Delete this product from your store?")) return;
    try { await deleteProduct(id); setNotice("Product deleted"); }
    catch (error) { setCloudError(error.message); }
  };
  const saveProduct = async e => {
    e.preventDefault();
    if (!adminVerified) return;
    setSaving(true); setCloudError("");
    try {
      const fd = new FormData(e.currentTarget);
      let image = fd.get("image") || "https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85";
      if (imageFile) image = await uploadProductImage(imageFile);
      const p = { name: fd.get("name"), brand: fd.get("brand"), category: fd.get("category"), price: Number(fd.get("price")), oldPrice: Number(fd.get("oldPrice") || fd.get("price")), stock: Number(fd.get("stock") || 0), image, description: fd.get("description"), tag: fd.get("tag") };
      if (editing) await updateProduct(editing.id, p); else await createProduct(p);
      setFormOpen(false); setEditing(null); setImageFile(null); setNotice("Product saved to Firebase");
    } catch (error) { setCloudError(error.message); }
    finally { setSaving(false); }
  };

  return <div className="app">
    <div className="topline">A LITTLE BEAUTY, A LOT OF YOU <span>✦</span> FREE SHIPPING ON ORDERS ABOVE ₹999</div>
    <header className="header">
      <button className="icon-btn mobile-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">{mobileMenu ? <X/> : <Menu/>}</button>
      <button className="brandmark" onClick={() => setPage("shop")}><span className="brand-script">aditi</span><span className="brand-sub">COSMETICS</span></button>
      <nav className={mobileMenu ? "nav open" : "nav"}>
        <button className={page==="shop"?"active":""} onClick={() => {setPage("shop");setMobileMenu(false)}}>Shop all</button>
        <button onClick={() => {setCategory("Skincare");setPage("shop");setMobileMenu(false)}}>Skincare</button>
        <button onClick={() => {setCategory("Makeup");setPage("shop");setMobileMenu(false)}}>Makeup</button>
        <button onClick={() => {setCategory("Haircare");setPage("shop");setMobileMenu(false)}}>Haircare</button>
        <button className={page==="admin"?"active":""} onClick={() => {setPage("admin");setMobileMenu(false)}}>Admin</button>
      </nav>
      <div className="header-actions">
        <label className="searchbox"><Search size={17}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search beauty..."/></label>
        <button className="icon-btn bag-btn" onClick={() => setCartOpen(true)} aria-label="Shopping bag"><ShoppingBag/><span>{cartCount}</span></button>
      </div>
    </header>

    {page === "shop" ? <>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow"><Sparkles size={14}/> YOUR BEAUTY, YOUR WAY</div>
          <h1>Find your<br/><em>everyday glow.</em></h1>
          <p>Thoughtfully picked beauty favourites from the brands you love. A little something for every version of you.</p>
          <button className="dark-button" onClick={() => {setCategory("All");document.getElementById("collection")?.scrollIntoView({behavior:"smooth"})}}>EXPLORE THE COLLECTION <ArrowRight size={16}/></button>
          <div className="hero-note">BEAUTY THAT FEELS LIKE YOU <span>✳</span></div>
        </div>
        <div className="hero-art"><img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1400&q=90" alt="Curated beauty products"/><div className="hero-stamp">BEAUTY<br/>EDIT<br/><b>01</b></div></div>
      </section>
      <section className="trust-row"><div>✧ CURATED BRANDS</div><div>✧ BEAUTY ESSENTIALS</div><div>✧ EASY SHOPPING</div><div>✧ YOUR DAILY RITUAL</div></section>
      <main className="collection section-wrap" id="collection">
        <div className="section-heading"><div><div className="eyebrow">THE GOOD STUFF</div><h2>Shop the collection<span>.</span></h2><p>Beauty finds to make your routine feel special.</p></div><div className="result-count">{filtered.length} PRODUCTS</div></div>
        <div className="filters"><div className="category-pills">{["All","Skincare","Makeup","Haircare"].map(c=><button key={c} className={category===c?"selected":""} onClick={()=>setCategory(c)}>{c}</button>)}</div><label className="sort"><SlidersHorizontal size={15}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="low">Price: low to high</option><option value="high">Price: high to low</option></select></label></div>
        <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id}><div className="product-image"><img src={p.image} alt={p.name} onError={e=>e.currentTarget.src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85"}/>{p.tag && <span className="product-tag">{p.tag}</span>}<button className="quick-add" onClick={()=>addToCart(p)}>ADD TO BAG <Plus size={14}/></button><button className="wish" aria-label="Wishlist"><Heart size={17}/></button></div><div className="product-meta"><span>{p.brand}</span><span>{p.category}</span></div><h3>{p.name}</h3><div className="price-line"><b>{money(p.price)}</b>{p.oldPrice>p.price&&<del>{money(p.oldPrice)}</del>}</div></article>)}</div>
        {filtered.length===0&&<div className="empty">No products found. Try another search or category.</div>}
      </main>
      <section className="newsletter"><div className="eyebrow">A NOTE FROM ADITI</div><h2>Make room for a little <em>self-care.</em></h2><p>Discover your next beauty favourite.</p><button className="outline-button" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>BACK TO TOP ↑</button></section>
    </> : <main className="admin section-wrap">
      {!adminVerified ? <section className="product-form admin-login"><div className="eyebrow">SECURE STORE ACCESS</div><h2>Admin sign in<span>.</span></h2><p>Sign in with the Firebase Authentication account whose UID is registered in the Firestore <b>admins</b> collection.</p>
        {authLoading ? <p>Checking sign-in status…</p> : <form onSubmit={loginAdmin} className="form-grid"><label className="wide">Admin email<input type="email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} required autoComplete="username"/></label><label className="wide">Password<input type="password" value={loginPassword} onChange={e=>setLoginPassword(e.target.value)} required autoComplete="current-password"/></label><button className="dark-button full wide" type="submit"><LogIn size={16}/> SIGN IN</button></form>}
        {cloudError&&<p className="admin-warning">{cloudError}</p>}
      </section> : <>
      <div className="admin-title"><div><div className="eyebrow">STORE CONTROL</div><h2>Admin dashboard<span>.</span></h2><p>Manage your products and keep your catalogue fresh.</p></div><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="outline-button" onClick={logoutAdmin}><LogOut size={15}/> SIGN OUT</button><button className="dark-button" onClick={()=>{setEditing(null);setImageFile(null);setFormOpen(true)}}><Plus size={16}/> ADD PRODUCT</button></div></div>
      {cloudError&&<p className="admin-warning">{cloudError}</p>}
      <div className="category-pills" style={{margin:"22px 0"}}>
        <button className={adminSection==="products"?"selected":""} onClick={()=>setAdminSection("products")}>Products</button>
        <button className={adminSection==="orders"?"selected":""} onClick={()=>setAdminSection("orders")}>Orders ({orders.length})</button>
      </div>
      {adminSection==="products" ? <>
      {productsLoading&&<p>Loading products from Firebase…</p>}
      <div className="stats"><div><span><Package/></span><small>TOTAL PRODUCTS</small><strong>{products.length}</strong></div><div><span><Store/></span><small>BRANDS</small><strong>{new Set(products.map(p=>p.brand)).size}</strong></div><div><span><ShoppingBag/></span><small>ITEMS IN CARTS</small><strong>{cartCount}</strong></div></div>
      <div className="table-head"><h3>Product inventory</h3><span>{products.length} items</span></div>
      <div className="inventory">{products.map(p=><div className="inventory-row" key={p.id}><img src={p.image} alt=""/><div className="inv-name"><b>{p.name}</b><span>{p.brand} · {p.category}</span></div><strong>{money(p.price)}</strong><span className={p.stock<10?"low-stock":"stock"}>{p.stock} in stock</span><div className="row-actions"><button onClick={()=>{setEditing(p);setFormOpen(true)}} aria-label="Edit"><Pencil size={16}/></button><button onClick={()=>removeProduct(p.id)} aria-label="Delete"><Trash2 size={16}/></button></div></div>)}</div>
      <p className="admin-warning">Changes are saved to Firebase Firestore. Product images are uploaded to Firebase Storage.</p>
      </> : <section>
        <div className="table-head"><h3>Customer orders</h3><span>{orders.length} orders</span></div>
        {ordersLoading ? <p>Loading orders…</p> : orders.length===0 ? <p className="empty">No orders yet. New customer orders will appear here.</p> : <div className="inventory">
          {orders.map(order=><article className="product-form" key={order.id} style={{marginBottom:16}}>
            <div className="drawer-head"><div><b>Order #{order.id.slice(-7).toUpperCase()}</b><p>{order.customer?.name} · {order.customer?.phone}</p></div><strong>{money(order.total)}</strong></div>
            <p>{order.customer?.address}, {order.customer?.city}, {order.customer?.state} - {order.customer?.pincode}</p>
            <div>{(order.items||[]).map((item,i)=><p key={i}>{item.name} × {item.quantity} — {money(item.price*item.quantity)}</p>)}</div>
            <p><b>Payment:</b> {order.paymentMethod} · {order.paymentStatus}</p>
            <label>Order status <select value={order.status||"New"} onChange={e=>changeOrderStatus(order.id,e.target.value)}>
              {["New","Confirmed","Packed","Shipped","Delivered","Cancelled"].map(s=><option key={s}>{s}</option>)}
            </select></label>
          </article>)}
        </div>}
      </section>}
      </>}
    </main>}

    {cartOpen&&<div className="overlay" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><h2>Your bag ({cartCount})</h2><button className="icon-btn" onClick={()=>setCartOpen(false)}><X/></button></div>{cart.length===0?<div className="empty">Your bag is waiting for something lovely.</div>:<><div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><img src={i.image} alt=""/><div><b>{i.name}</b><span>{i.brand}</span><strong>{money(i.price)}</strong><div className="qty"><button onClick={()=>updateQty(i.id,-1)}>−</button><span>{i.qty}</span><button onClick={()=>updateQty(i.id,1)}>+</button></div></div></div>)}</div><div className="cart-bottom"><div><span>Subtotal</span><b>{money(cartTotal)}</b></div><small>Shipping and taxes calculated at checkout.</small><button className="dark-button full" onClick={()=>{setCartOpen(false);setCheckoutOpen(true);setCloudError("");}}>CONTINUE TO CHECKOUT <ArrowRight size={16}/></button></div></>}</aside></div>}

    {checkoutOpen&&<div className="overlay modal-overlay" onClick={()=>!placingOrder&&setCheckoutOpen(false)}><form className="product-form" onSubmit={placeOrder} onClick={e=>e.stopPropagation()}>
      <div className="drawer-head"><h2>Checkout</h2><button type="button" className="icon-btn" onClick={()=>setCheckoutOpen(false)}><X/></button></div>
      <p>Delivery details</p>
      <div className="form-grid">
        <label className="wide">Full name<input name="customerName" required minLength="2" autoComplete="name"/></label>
        <label>Mobile number<input name="phone" type="tel" required pattern="[6-9][0-9]{9}" title="Enter a 10-digit Indian mobile number" autoComplete="tel"/></label>
        <label>Email (optional)<input name="email" type="email" autoComplete="email"/></label>
        <label className="wide">Full delivery address<textarea name="address" rows="2" required minLength="8" autoComplete="street-address"/></label>
        <label>City<input name="city" required autoComplete="address-level2"/></label>
        <label>State<input name="state" required autoComplete="address-level1"/></label>
        <label>PIN code<input name="pincode" required pattern="[0-9]{6}" title="Enter a 6-digit PIN code" autoComplete="postal-code"/></label>
      </div>
      <div className="cart-bottom">
        <div><span>Subtotal</span><b>{money(cartTotal)}</b></div>
        <div><span>Shipping</span><b>{cartTotal>=999?"FREE":money(60)}</b></div>
        <div><span>Total</span><b>{money(cartTotal+(cartTotal>=999?0:60))}</b></div>
        <p><b>Payment method:</b> Cash on Delivery</p>
        <small>Online payments are not enabled yet. Your order will be saved to the store database.</small>
        {cloudError&&<p className="admin-warning">{cloudError}</p>}
        <button className="dark-button full" type="submit" disabled={placingOrder}>{placingOrder?"PLACING ORDER…":"PLACE ORDER"} <ArrowRight size={16}/></button>
      </div>
    </form></div>}

    {formOpen&&<div className="overlay modal-overlay" onClick={()=>setFormOpen(false)}><form className="product-form" onSubmit={saveProduct} onClick={e=>e.stopPropagation()}><div className="drawer-head"><h2>{editing?"Edit product":"Add a product"}</h2><button type="button" className="icon-btn" onClick={()=>setFormOpen(false)}><X/></button></div><div className="form-grid"><label>Product name<input name="name" required defaultValue={editing?.name}/></label><label>Brand<input name="brand" required defaultValue={editing?.brand}/></label><label>Category<select name="category" defaultValue={editing?.category||"Skincare"}><option>Skincare</option><option>Makeup</option><option>Haircare</option><option>Fragrance</option><option>Bodycare</option></select></label><label>Price (₹)<input name="price" type="number" min="0" required defaultValue={editing?.price}/></label><label>Original price (₹)<input name="oldPrice" type="number" min="0" defaultValue={editing?.oldPrice}/></label><label>Stock quantity<input name="stock" type="number" min="0" defaultValue={editing?.stock??0}/></label><label className="wide">Image URL<input name="image" type="url" placeholder="https://..." defaultValue={editing?.image}/></label><label className="wide">Or upload image (max 5 MB)<input type="file" accept="image/*" onChange={e=>setImageFile(e.target.files?.[0]||null)}/><small>{imageFile ? imageFile.name : "Choose a product photo from your computer"}</small></label><label>Badge<input name="tag" placeholder="NEW / BESTSELLER" defaultValue={editing?.tag}/></label><label className="wide">Description<textarea name="description" rows="3" defaultValue={editing?.description}/></label></div><button className="dark-button full" type="submit" disabled={saving}>{saving ? "SAVING…" : "SAVE PRODUCT"} <ArrowRight size={16}/></button></form></div>}
    {notice&&<div className="toast">{notice}</div>}
    <footer><span className="brand-script">aditi</span><span>© 2026 ADITI COSMETICS</span><span>BEAUTY, CURATED WITH CARE</span></footer>
  </div>;
}