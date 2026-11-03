(() => {
"use strict";

if (window.__verroStorefrontInitialized) return;
window.__verroStorefrontInitialized = true;

// =====================================
// VÉRRO — COMPLETE STORE SYSTEM
// =====================================

const SUPABASE_URL = "https://slkuvuygbmltldgnacnj.supabase.co";
const SUPABASE_KEY = "sb_publishable_Nh6muXD3DzdyZhz4Or31VQ_uWRPrHc2";
const ADMIN_EMAIL = "abdullahbinkhalil79@gmail.com";
const ADMIN_WHATSAPP = "01604711009";
const BUCKET = "product-images";

const db = window.supabase?.createClient(SUPABASE_URL, SUPABASE_KEY);
const $ = id => document.getElementById(id);
const money = n => "৳" + Number(n || 0).toLocaleString("en-BD");

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

let products = [];
let cart = readCart();
let category = "All";
let search = "";
let adminOrders = [];

if (!db) {
  const grid = $("productGrid");
  if (grid) grid.textContent = "Database library did not load. Refresh the page.";
  return;
}

// =====================================
// HELPERS
// =====================================

function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? "#d77" : "#a9bd8b";
}

function makeId() {
  return window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

// =====================================
// ANALYTICS
// =====================================

function getSessionId() {
  try {
    let id = localStorage.getItem("verroAnalyticsSession");
    if (!id) {
      id = makeId();
      localStorage.setItem("verroAnalyticsSession", id);
    }
    return id;
  } catch {
    return makeId();
  }
}

async function trackEvent(eventType) {
  const allowed = ["page_view", "product_view", "add_to_cart", "checkout_start"];
  if (!allowed.includes(eventType)) return;

  try {
    const { error } = await db.from("site_events").insert({
      event_type: eventType,
      source: document.referrer || "direct",
      page_path: location.pathname,
      session_id: getSessionId()
    });
    if (error) console.warn("Analytics:", error.message);
  } catch (err) {
    console.warn("Analytics unavailable:", err);
  }
}

// =====================================
// CART STORAGE
// =====================================

function readCart() {
  try {
    const x = JSON.parse(localStorage.getItem("verroCart") || "[]");
    return Array.isArray(x)
      ? x.filter(i => i && Number(i.id) > 0 && Number(i.quantity) > 0)
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("verroCart", JSON.stringify(cart));
  } catch (err) {
    console.warn("Cart save failed:", err);
  }
}

// =====================================
// CATEGORIES
// =====================================

function renderCategories() {
  const list = $("categoryList");
  if (!list) return;

  const cats = [...new Set(
    products.filter(p => p.active)
      .map(p => p.category)
      .filter(Boolean)
  )].sort();

  if (category !== "All" && !cats.includes(category)) category = "All";

  list.innerHTML =
    `<button class="category ${category === "All" ? "active" : ""}" data-category="All">All products</button>` +
    cats.map(c => `
      <button class="category ${category === c ? "active" : ""}"
        data-category="${esc(c)}">${esc(c)}</button>
    `).join("");
}

// =====================================
// PRODUCTS
// =====================================

function renderProducts() {
  const grid = $("productGrid");
  if (!grid) return;

  const rows = products.filter(p =>
    p.active &&
    (category === "All" || p.category === category) &&
    (
      String(p.name || "").toLowerCase().includes(search) ||
      String(p.description || "").toLowerCase().includes(search)
    )
  );

  grid.innerHTML = rows.length ? rows.map(p => `
    <article class="product-card" data-view="${p.id}">
      <img class="product-image"
        src="${esc(p.image_url || "https://placehold.co/700x500?text=VERRO")}"
        alt="${esc(p.name)}" loading="lazy">
      <div class="product-info">
        <p class="product-category">${esc(p.category)}</p>
        <h3>${esc(p.name)}</h3>
        <p>${esc(p.description || "")}</p>
        <p class="product-price">${money(p.price)}</p>
        <button class="add-to-cart" data-add="${p.id}"
          ${p.stock < 1 ? "disabled" : ""}>
          ${p.stock < 1 ? "OUT OF STOCK" : "ADD TO BAG +"}
        </button>
      </div>
    </article>
  `).join("") : '<p class="loading-message">No products found.</p>';
}

async function loadProducts() {
  const grid = $("productGrid");
  if (grid) grid.textContent = "Loading products…";

  const { data, error } = await db
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    if (grid) grid.textContent = "Could not load products. Please refresh.";
    return false;
  }

  products = data || [];

  cart = cart.reduce((result, item) => {
    const p = products.find(x => Number(x.id) === Number(item.id));
    if (!p || !p.active || Number(p.stock) < 1) return result;

    result.push({
      ...p,
      quantity: Math.min(10, Number(p.stock), Math.max(1, Number(item.quantity) || 1))
    });
    return result;
  }, []);

  saveCart();
  renderCategories();
  renderProducts();
  renderCart();
  return true;
}

// =====================================
// CART
// =====================================

function renderCart() {
  const count = $("cartCount");
  const total = $("cartTotal");
  const items = $("cartItems");

  if (!count || !total || !items) return;

  count.textContent = cart.reduce((n, x) => n + Number(x.quantity), 0);

  total.textContent = money(
    cart.reduce((n, x) => n + Number(x.price) * x.quantity, 0)
  );

  items.innerHTML = cart.length ? cart.map(x => `
    <div class="cart-product">
      <div>
        <strong>${esc(x.name)}</strong>
        <p>${money(x.price)} × ${x.quantity}</p>
      </div>
      <div class="cart-controls">
        <button data-q="${x.id}" data-d="-1">−</button>
        <span>${x.quantity}</span>
        <button data-q="${x.id}" data-d="1"
          ${x.quantity >= Math.min(10, x.stock) ? "disabled" : ""}>+</button>
        <button data-r="${x.id}">Remove</button>
      </div>
    </div>
  `).join("") : "<p>Your shopping bag is empty.</p>";
}

function openCart() {
  $("cartDrawer")?.classList.add("show");
  $("cartOverlay")?.classList.add("show");
}

function closeCart() {
  $("cartDrawer")?.classList.remove("show");
  $("cartOverlay")?.classList.remove("show");
}

// =====================================
// PRODUCT EVENTS
// =====================================

$("productGrid").addEventListener("click", e => {
  const card = e.target.closest("[data-view]");
  const button = e.target.closest("[data-add]");

  if (card && !button) trackEvent("product_view");
  if (!button) return;

  const p = products.find(x => Number(x.id) === Number(button.dataset.add));
  if (!p || !p.active || p.stock < 1) return;

  const old = cart.find(x => Number(x.id) === Number(p.id));

  if (old) {
    if (old.quantity >= Math.min(10, p.stock)) return;
    old.quantity++;
  } else {
    cart.push({ ...p, quantity: 1 });
  }

  trackEvent("add_to_cart");
  saveCart();
  renderCart();
  openCart();
});

// =====================================
// CATEGORY + SEARCH
// =====================================

$("categoryList").addEventListener("click", e => {
  const b = e.target.closest("[data-category]");
  if (!b) return;
  category = b.dataset.category;
  renderCategories();
  renderProducts();
});

$("searchButton").addEventListener("click", () => {
  $("searchArea").classList.toggle("show");
  $("searchInput").focus();
});

$("searchInput").addEventListener("input", e => {
  search = e.target.value.toLowerCase().trim();
  renderProducts();
});

// =====================================
// CART CONTROLS
// =====================================

$("cartButton").addEventListener("click", openCart);
$("closeCart").addEventListener("click", closeCart);
$("cartOverlay").addEventListener("click", closeCart);

$("cartItems").addEventListener("click", e => {
  const q = e.target.closest("[data-q]");
  const r = e.target.closest("[data-r]");

  if (q) {
    const x = cart.find(i => Number(i.id) === Number(q.dataset.q));
    const p = products.find(i => Number(i.id) === Number(q.dataset.q));

    if (x && p) {
      const next = x.quantity + Number(q.dataset.d);
      if (next < 1) {
        cart = cart.filter(i => i.id !== x.id);
      } else {
        x.quantity = Math.min(next, 10, Number(p.stock));
      }
    }
  }

  if (r) cart = cart.filter(i => Number(i.id) !== Number(r.dataset.r));

  saveCart();
  renderCart();
});

// =====================================
// COD CHECKOUT — FIXED
// =====================================

$("checkoutForm").addEventListener("submit", async e => {
  e.preventDefault();

  // Keep form reference before asynchronous operations
  const form = e.currentTarget;

  message("checkoutMessage", "");
  $("whatsappNotice").hidden = true;

  if (!cart.length) {
    message("checkoutMessage", "Your bag is empty.", true);
    return;
  }

  trackEvent("checkout_start");

  const fd = new FormData(form);
  const id = makeId();

  const order = {
    id,
    customer_name: String(fd.get("customerName") || "").trim(),
    phone: String(fd.get("phone") || "").trim(),
    address: String(fd.get("address") || "").trim(),
    payment_method: "COD",
    items: cart.map(x => ({
      id: Number(x.id),
      name: x.name,
      price: Number(x.price),
      quantity: Number(x.quantity)
    })),
    total: cart.reduce((n, x) => n + Number(x.price) * x.quantity, 0),
    status: "pending"
  };

  if (!order.customer_name || !order.phone || !order.address) {
    message("checkoutMessage", "Please complete all customer details.", true);
    return;
  }

  const btn = $("checkoutButton");
  btn.disabled = true;
  btn.textContent = "Placing order…";

  try {
    const { data: latest, error: pe } = await db
      .from("products")
      .select("id,name,price,stock,active")
      .in("id", order.items.map(x => x.id));

    if (pe) throw pe;

    for (const item of order.items) {
      const p = (latest || []).find(x => Number(x.id) === item.id);

      if (!p || !p.active ||
          Number(p.price) !== item.price ||
          Number(p.stock) < item.quantity) {
        throw Error("A product price or stock changed. Please refresh your bag.");
      }
    }

    const { error } = await db.from("orders").insert(order);
    if (error) throw error;

    // Clear cart only after successful order insertion
    cart = [];
    saveCart();
    renderCart();

    // Fixed: reset saved form reference
    form.reset();

    const ref = id.slice(0, 8).toUpperCase();

    message(
      "checkoutMessage",
      `Order received! Reference: ${ref}. We will contact you to confirm.`
    );

    const whatsappText = [
      `New VÉRRO COD order ${ref}`,
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Address: ${order.address}`,
      ...order.items.map(i =>
        `${i.name} × ${i.quantity} — ${money(i.price * i.quantity)}`
      ),
      `Total: ${money(order.total)}`
    ].join("\n");

    const wa = ADMIN_WHATSAPP.replace(/\D/g, "").replace(/^0/, "88");

    $("whatsappNotice").href =
      `https://wa.me/${wa}?text=${encodeURIComponent(whatsappText)}`;

    $("whatsappNotice").hidden = false;

    await loadProducts();

  } catch (err) {
    console.error("Checkout error:", err);
    message(
      "checkoutMessage",
      err.message || "Order could not be submitted.",
      true
    );
  } finally {
    btn.disabled = false;
    btn.textContent = "Place COD Order";
  }
});

// =====================================
// ADMIN DASHBOARD STYLES
// =====================================

function injectAdminStyles() {
  if ($("verroAdminStyles")) return;

  const s = document.createElement("style");
  s.id = "verroAdminStyles";
  s.textContent = `
    #adminSection {
      background:#11110f;color:#f4f1e9;padding:55px 7%;
    }
    #adminSection h2,#adminSection h3 {color:#f4f1e9;}
    .va-stats,.va-formgrid {
      display:grid;grid-template-columns:repeat(4,minmax(0,1fr));
      gap:12px;margin:20px 0;
    }
    .va-card,.va-panel {
      background:#1c1c19;border:1px solid #393831;padding:17px;
    }
    .va-card span {display:block;color:#aaa;font-size:11px;}
    .va-card strong {display:block;color:#d2b98b;font-size:23px;margin-top:8px;}
    .va-tabs {display:flex;gap:8px;flex-wrap:wrap;margin:24px 0;}
    .va-tabs button,.va-btn {
      padding:10px 13px;border:1px solid #625b4d;
      background:transparent;color:#eee;font-size:12px;cursor:pointer;
    }
    .va-tabs button.active,.va-btn.primary {background:#c0a477;color:#171714;}
    .va-panel {margin:12px 0;}
    .va-formgrid {grid-template-columns:repeat(2,minmax(0,1fr));}
    .va-formgrid label {display:grid;gap:6px;font-size:12px;color:#ddd;}
    .va-formgrid input,.va-formgrid textarea {
      padding:10px;background:#10100e;color:#fff;border:1px solid #555;
    }
    .va-wide {grid-column:1/-1;}
    .va-tablewrap {overflow:auto;}
    .va-table {border-collapse:collapse;width:100%;min-width:620px;font-size:12px;}
    .va-table td,.va-table th {padding:11px;border-bottom:1px solid #444;text-align:left;}
    .va-table th {color:#c9b58e;}
    .va-actions {display:flex;gap:8px;flex-wrap:wrap;}
    .va-order,.va-review {padding:15px;border:1px solid #444;margin:12px 0;font-size:13px;}
    .va-order p,.va-review p {margin:7px 0;color:#ccc;}
    .va-order select {padding:8px;background:#111;color:white;border:1px solid #555;}
    .va-muted {color:#aaa;font-size:12px;}
    @media(max-width:650px) {
      .va-stats {grid-template-columns:repeat(2,1fr);}
      .va-formgrid {grid-template-columns:1fr;}
      .va-wide {grid-column:auto;}
      #adminSection {padding:35px 5%;}
    }
  `;
  document.head.appendChild(s);
}

// =====================================
// BUILD ADMIN DASHBOARD
// =====================================

function buildAdmin() {
  injectAdminStyles();

  $("adminSection").innerHTML = `
    <div class="admin-heading">
      <div>
        <p class="eyebrow">PRIVATE AREA</p>
        <h2>VÉRRO Management</h2>
      </div>
      <div class="admin-actions">
        <button class="secondary-button" id="vaRefresh">Refresh</button>
        <button class="secondary-button" id="vaLogout">Sign out</button>
      </div>
    </div>

    <p id="vaMessage" class="form-message"></p>
    <div class="va-stats" id="vaStats"></div>

    <div class="va-tabs">
      <button class="active" data-tab="products">Products</button>
      <button data-tab="orders">Orders</button>
      <button data-tab="reviews">Reviews</button>
      <button data-tab="customers">Customers</button>
      <button data-tab="analytics">Analytics</button>
    </div>

    <section class="va-panel" id="vaProducts">
      <h3>Product management</h3>
      <p class="va-muted">Upload products you want to sell.</p>

      <form id="vaProductForm" class="va-formgrid">
        <input type="hidden" name="id">
        <label>Product name<input name="name" required maxlength="150"></label>
        <label>Category<input name="category" required maxlength="80"></label>
        <label>Price (BDT)<input name="price" type="number" min="1" step="1" required></label>
        <label>Stock quantity<input name="stock" type="number" min="0" step="1" value="0" required></label>
        <label class="va-wide">Description<textarea name="description" rows="3"></textarea></label>
        <label class="va-wide">Product image<input name="image" type="file" accept="image/*"></label>
        <label class="va-wide"><span><input name="active" type="checkbox" checked> Publish product</span></label>
        <div class="va-wide va-actions">
          <button class="va-btn primary" type="submit">Save product</button>
          <button class="va-btn" type="button" id="vaClear">Clear</button>
        </div>
        <p class="va-wide" id="vaProductMsg"></p>
      </form>

      <div class="va-tablewrap">
        <table class="va-table">
          <thead><tr><th>Product</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="vaProductRows"></tbody>
        </table>
      </div>
    </section>

    <section class="va-panel" id="vaOrders" hidden>
      <h3>Orders</h3><div id="vaOrderRows"></div>
    </section>

    <section class="va-panel" id="vaReviews" hidden>
      <h3>Customer reviews</h3><div id="vaReviewRows"></div>
    </section>

    <section class="va-panel" id="vaCustomers" hidden>
      <h3>Customers</h3>
      <div class="va-tablewrap">
        <table class="va-table">
          <thead><tr><th>Name</th><th>Phone</th><th>Orders</th><th>Order value</th></tr></thead>
          <tbody id="vaCustomerRows"></tbody>
        </table>
      </div>
    </section>

    <section class="va-panel" id="vaAnalytics" hidden>
      <h3>Website events</h3>
      <div class="va-stats" id="vaAnalyticsRows"></div>
      <p class="va-muted">Facebook/Instagram Ads metrics require a separate authorized Meta API connection.</p>
    </section>
  `;

  $("vaRefresh").onclick = loadAdminData;

  $("vaLogout").onclick = async () => {
    const { error } = await db.auth.signOut();
    if (error) {
      message("vaMessage", error.message, true);
      return;
    }
    $("adminSection").hidden = true;
  };

  document.querySelectorAll(".va-tabs button").forEach(b => {
    b.onclick = () => {
      document.querySelectorAll(".va-tabs button")
        .forEach(x => x.classList.toggle("active", x === b));

      ["products", "orders", "reviews", "customers", "analytics"].forEach(k => {
        $("va" + k[0].toUpperCase() + k.slice(1)).hidden = k !== b.dataset.tab;
      });
    };
  });

  $("vaClear").onclick = resetProductForm;
  $("vaProductForm").onsubmit = saveProduct;
  $("vaProductRows").onclick = productAction;
  $("vaOrderRows").onchange = updateOrderStatus;
  $("vaReviewRows").onclick = reviewAction;
}

// =====================================
// PRODUCT FORM
// =====================================

function resetProductForm() {
  const f = $("vaProductForm");
  if (!f) return;
  f.reset();
  f.elements.id.value = "";
  f.elements.active.checked = true;
  message("vaProductMsg", "");
}

async function renderProductTable() {
  $("vaProductRows").innerHTML = products.map(p => `
    <tr>
      <td>${esc(p.name)}<br><span class="va-muted">${esc(p.category)}</span></td>
      <td>${money(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.active ? "Active" : "Hidden"}</td>
      <td><div class="va-actions">
        <button class="va-btn" data-edit="${p.id}">Edit</button>
        <button class="va-btn" data-delete="${p.id}">Delete</button>
      </div></td>
    </tr>
  `).join("") || '<tr><td colspan="5">No products added yet.</td></tr>';
}

// =====================================
// SAVE PRODUCT
// =====================================

async function saveProduct(e) {
  e.preventDefault();

  const f = e.currentTarget;
  const fd = new FormData(f);
  const id = fd.get("id");
  const price = Number(fd.get("price"));
  const stock = Number(fd.get("stock"));

  if (!Number.isInteger(price) || price <= 0 ||
      !Number.isInteger(stock) || stock < 0) {
    message("vaProductMsg", "Enter a valid price and stock quantity.", true);
    return;
  }

  const btn = f.querySelector('[type="submit"]');
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    let image_url = id
      ? products.find(p => Number(p.id) === Number(id))?.image_url || ""
      : "";

    const file = f.elements.image.files[0];

    if (file) {
      if (!file.type.startsWith("image/")) throw Error("Choose an image file.");
      if (file.size > 5 * 1024 * 1024) throw Error("Image must be 5 MB or smaller.");

      const ext = (file.name.split(".").pop() || "jpg")
        .toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";

      const path = `${makeId()}.${ext}`;

      const { error: upErr } = await db.storage.from(BUCKET)
        .upload(path, file, { contentType: file.type });

      if (upErr) throw upErr;
      image_url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    }

    const payload = {
      name: String(fd.get("name")).trim(),
      category: String(fd.get("category")).trim(),
      price,
      stock,
      description: String(fd.get("description") || "").trim(),
      active: f.elements.active.checked
    };

    if (image_url) payload.image_url = image_url;

    const result = id
      ? await db.from("products").update(payload).eq("id", Number(id))
      : await db.from("products").insert(payload);

    if (result.error) throw result.error;

    resetProductForm();
    await loadProducts();
    await renderProductTable();
    message("vaMessage", id ? "Product updated." : "Product added.");

  } catch (err) {
    console.error(err);
    message("vaProductMsg", err.message || "Save failed.", true);
  } finally {
    btn.disabled = false;
    btn.textContent = "Save product";
  }
}

// =====================================
// EDIT / DELETE PRODUCT
// =====================================

async function productAction(e) {
  const edit = e.target.closest("[data-edit]");
  const del = e.target.closest("[data-delete]");

  if (edit) {
    const p = products.find(x => Number(x.id) === Number(edit.dataset.edit));
    const f = $("vaProductForm");
    if (!p || !f) return;

    f.elements.id.value = p.id;
    f.elements.name.value = p.name;
    f.elements.category.value = p.category;
    f.elements.price.value = p.price;
    f.elements.stock.value = p.stock;
    f.elements.description.value = p.description || "";
    f.elements.active.checked = p.active;
    f.scrollIntoView({ behavior: "smooth" });
  }

  if (del) {
    const p = products.find(x => Number(x.id) === Number(del.dataset.delete));

    if (p && confirm(`Delete ${p.name}?`)) {
      const { error } = await db.from("products").delete().eq("id", p.id);

      if (error) {
        message("vaMessage", error.message, true);
      } else {
        await loadProducts();
        await renderProductTable();
        message("vaMessage", "Product deleted.");
      }
    }
  }
}

// =====================================
// ADMIN DATA — ORDERS INCLUDED
// =====================================

async function loadAdminData() {
  message("vaMessage", "Loading dashboard…");

  const [ord, rev, events] = await Promise.all([
    db.from("orders").select("*").order("created_at", { ascending: false }),
    db.from("reviews").select("*").order("created_at", { ascending: false }),
    db.from("site_events").select("event_type")
  ]);

  const errors = [ord, rev, events].filter(x => x.error);

  if (errors.length) {
    console.error("Dashboard errors:", errors.map(x => x.error));
    message(
      "vaMessage",
      "Some dashboard data could not load: " +
      errors.map(x => x.error.message).join(" | "),
      true
    );
  }

  adminOrders = ord.data || [];

  const delivered = adminOrders.filter(o => o.status === "delivered");
  const customers = new Map();

  adminOrders.forEach(o => {
    const key = String(o.phone || "");
    const c = customers.get(key) || {
      name: o.customer_name,
      phone: o.phone,
      count: 0,
      total: 0
    };
    c.count++;
    c.total += Number(o.total);
    customers.set(key, c);
  });

  $("vaStats").innerHTML = [
    ["Delivered revenue", money(delivered.reduce((n, o) => n + Number(o.total), 0))],
    ["Total orders", adminOrders.length],
    ["Delivered orders", delivered.length],
    ["Customers", customers.size]
  ].map(x => `<div class="va-card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

  $("vaOrderRows").innerHTML = adminOrders.map(o => `
    <article class="va-order">
      <strong>Order ${esc(String(o.id).slice(0, 8).toUpperCase())} · ${money(o.total)}</strong>
      <p>${esc(o.customer_name)} · ${esc(o.phone)}</p>
      <p>${esc(o.address)}</p>
      <p>${(o.items || []).map(i => `${esc(i.name)} × ${i.quantity} — ${money(i.price * i.quantity)}`).join("<br>")}</p>
      <p>Payment: ${esc(o.payment_method || "COD")}</p>
      <label>Status
        <select data-status="${esc(o.id)}">
          ${["pending", "confirmed", "shipped", "delivered", "cancelled"]
            .map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`)
            .join("")}
        </select>
      </label>
    </article>
  `).join("") || "<p>No orders yet.</p>";

  $("vaReviewRows").innerHTML = (rev.data || []).map(r => `
    <article class="va-review">
      <strong>${esc(r.customer_name)} · ${r.rating}/5</strong>
      <p>${esc(r.comment)}</p>
      <span class="va-muted">${r.approved ? "Published" : "Pending approval"}</span>
      <div class="va-actions">
        ${!r.approved ? `<button class="va-btn" data-approve="${r.id}">Approve</button>` : ""}
        <button class="va-btn" data-rdelete="${r.id}">Delete</button>
      </div>
    </article>
  `).join("") || "<p>No reviews yet.</p>";

  $("vaCustomerRows").innerHTML = [...customers.values()].map(c => `
    <tr>
      <td>${esc(c.name)}</td>
      <td>${esc(c.phone)}</td>
      <td>${c.count}</td>
      <td>${money(c.total)}</td>
    </tr>
  `).join("") || "<tr><td colspan='4'>No customers yet.</td></tr>";

  const counts = {};
  (events.data || []).forEach(x => {
    counts[x.event_type] = (counts[x.event_type] || 0) + 1;
  });

  $("vaAnalyticsRows").innerHTML = [
    ["Page views", counts.page_view || 0],
    ["Product views", counts.product_view || 0],
    ["Add to cart", counts.add_to_cart || 0],
    ["Checkout starts", counts.checkout_start || 0]
  ].map(x => `<div class="va-card"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("");

  await renderProductTable();

  if (!errors.length) message("vaMessage", "Dashboard updated.");
}

// =====================================
// ORDER STATUS UPDATE
// =====================================

async function updateOrderStatus(e) {
  const s = e.target.closest("[data-status]");
  if (!s) return;

  s.disabled = true;

  try {
    const { error } = await db.from("orders")
      .update({ status: s.value })
      .eq("id", s.dataset.status);

    if (error) throw error;

    const order = adminOrders.find(o => String(o.id) === s.dataset.status);
    if (order) order.status = s.value;

    message("vaMessage", "Order status updated.");
  } catch (err) {
    message("vaMessage", err.message || "Status update failed.", true);
    await loadAdminData();
  } finally {
    s.disabled = false;
  }
}

// =====================================
// REVIEW ACTIONS
// =====================================

async function reviewAction(e) {
  const a = e.target.closest("[data-approve]");
  const d = e.target.closest("[data-rdelete]");

  if (!a && !d) return;
  if (d && !confirm("Delete this review?")) return;

  try {
    const result = a
      ? await db.from("reviews").update({ approved: true }).eq("id", Number(a.dataset.approve))
      : await db.from("reviews").delete().eq("id", Number(d.dataset.rdelete));

    if (result.error) throw result.error;
    await loadAdminData();

  } catch (err) {
    message("vaMessage", err.message || "Review action failed.", true);
  }
}

// =====================================
// ADMIN LOGIN
// =====================================

function loginDialog() {
  $("adminEmail").value = ADMIN_EMAIL;
  $("loginMessage").textContent = "";
  $("adminDialog").showModal();
}

$("adminEntry").addEventListener("click", loginDialog);

$("closeAdminDialog").addEventListener("click", () => {
  $("adminDialog").close();
});

$("adminDialog").addEventListener("click", e => {
  if (e.target === $("adminDialog")) $("adminDialog").close();
});

$("adminLoginForm").addEventListener("submit", async e => {
  e.preventDefault();

  const form = e.currentTarget;
  const email = $("adminEmail").value.trim().toLowerCase();
  const password = $("adminPassword").value;

  if (email !== ADMIN_EMAIL) {
    message("loginMessage", "This email is not authorized.", true);
    return;
  }

  const btn = form.querySelector('[type="submit"]');
  if (btn) btn.disabled = true;

  message("loginMessage", "Signing in…");

  try {
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    if (error) throw error;

    if (data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
      throw Error("Unauthorized account.");
    }

    $("adminDialog").close();
    $("adminPassword").value = "";

    buildAdmin();
    $("adminSection").hidden = false;
    $("adminSection").scrollIntoView({ behavior: "smooth" });

    await loadAdminData();

  } catch (err) {
    message("loginMessage", err.message || "Login failed.", true);
  } finally {
    if (btn) btn.disabled = false;
  }
});

// =====================================
// INITIALIZE
// =====================================

(async () => {
  trackEvent("page_view");
  await loadProducts();

  const { data, error } = await db.auth.getSession();

  if (error) {
    console.warn("Could not restore admin session:", error.message);
    return;
  }

  if (data.session?.user?.email?.toLowerCase() === ADMIN_EMAIL) {
    buildAdmin();
    $("adminSection").hidden = false;
    await loadAdminData();
  }
})();

})();
