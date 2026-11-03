(() => {
  if (window.__verroStorefrontInitialized) return;
  window.__verroStorefrontInitialized = true;

// =====================================
// VÉRRO — STORE FRONTEND
// =====================================

const SUPABASE_URL = "https://slkuvuygbmltldgnacnj.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_Nh6muXD3DzdyZhz4Or31VQ_uWRPrHc2";
const ADMIN_EMAIL = "abdullahbinkhalil79@gmail.com";
const ADMIN_WHATSAPP = "01790682661";

const products = [
  { id: 1, name: "Classic Everyday Bag", category: "Fashion", price: 1850, image: "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=700" },
  { id: 2, name: "Minimalist Watch", category: "Lifestyle", price: 2450, image: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=700" },
  { id: 3, name: "Wireless Headphones", category: "Technology", price: 3200, image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=700" },
  { id: 4, name: "Premium Sneakers", category: "Fashion", price: 2800, image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=700" },
  { id: 5, name: "Modern Desk Lamp", category: "Lifestyle", price: 1650, image: "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=700" },
  { id: 6, name: "Smart Speaker", category: "Technology", price: 3900, image: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=700" }
];

const supabase = window.supabase?.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) || null;
let cart = loadCart();
let selectedCategory = "All";
let searchTerm = "";

const productGrid = document.getElementById("productGrid");
const cartCount = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItems = document.getElementById("cartItems");
const cartTotal = document.getElementById("cartTotal");
const checkoutForm = document.getElementById("checkoutForm");
const checkoutButton = document.getElementById("checkoutButton");
const checkoutMessage = document.getElementById("checkoutMessage");
const whatsappNotice = document.getElementById("whatsappNotice");
const adminDialog = document.getElementById("adminDialog");
const adminSection = document.getElementById("adminSection");
const adminOrders = document.getElementById("adminOrders");
const adminMessage = document.getElementById("adminMessage");

function formatPrice(price) {
  return "৳" + Number(price).toLocaleString("en-BD");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

function loadCart() {
  try {
    const saved = JSON.parse(localStorage.getItem("verroCart") || "[]");
    return Array.isArray(saved) ? saved.filter(item =>
      products.some(product => product.id === item.id) && Number.isInteger(item.quantity) && item.quantity > 0
    ) : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem("verroCart", JSON.stringify(cart));
}

function renderProducts() {
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (!filteredProducts.length) {
    productGrid.innerHTML = '<p class="loading-message">No products found.</p>';
    return;
  }

  productGrid.innerHTML = filteredProducts.map(product => `
    <article class="product-card">
      <img class="product-image" src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy">
      <div class="product-info">
        <p class="product-category">${escapeHtml(product.category)}</p>
        <h3>${escapeHtml(product.name)}</h3>
        <p class="product-price">${formatPrice(product.price)}</p>
        <button class="add-to-cart" data-add-product="${product.id}" type="button">ADD TO BAG +</button>
      </div>
    </article>
  `).join("");
}

function addToCart(productId) {
  const product = products.find(item => item.id === productId);
  if (!product) return;

  const existingItem = cart.find(item => item.id === productId);
  if (existingItem) {
    if (existingItem.quantity >= 10) return;
    existingItem.quantity++;
  } else cart.push({ ...product, quantity: 1 });

  saveCart();
  updateCart();
  openCart();
}

function updateCart() {
  const totalQuantity = cart.reduce((total, item) => total + item.quantity, 0);
  const totalPrice = cart.reduce((total, item) => total + item.price * item.quantity, 0);
  cartCount.textContent = totalQuantity;
  cartTotal.textContent = formatPrice(totalPrice);

  if (!cart.length) {
    cartItems.innerHTML = "<p>Your shopping bag is empty.</p>";
    return;
  }

  cartItems.innerHTML = cart.map(item => `
    <div class="cart-product">
      <div><strong>${escapeHtml(item.name)}</strong><p>${formatPrice(item.price)} × ${item.quantity}</p></div>
      <div class="cart-controls">
        <button type="button" data-quantity-id="${item.id}" data-quantity-change="-1" aria-label="Decrease quantity">−</button>
        <span>${item.quantity}</span>
        <button type="button" data-quantity-id="${item.id}" data-quantity-change="1" aria-label="Increase quantity" ${item.quantity >= 10 ? "disabled" : ""}>+</button>
        <button type="button" data-remove-id="${item.id}">Remove</button>
      </div>
    </div>
  `).join("");
}

function changeQuantity(productId, amount) {
  const item = cart.find(product => product.id === productId);
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(product => product.id !== productId);
  saveCart();
  updateCart();
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCart();
}

function openCart() {
  cartDrawer.classList.add("show");
  cartOverlay.classList.add("show");
}

function closeCart() {
  cartDrawer.classList.remove("show");
  cartOverlay.classList.remove("show");
}

productGrid.addEventListener("click", event => {
  const button = event.target.closest("[data-add-product]");
  if (button) addToCart(Number(button.dataset.addProduct));
});

cartItems.addEventListener("click", event => {
  const quantityButton = event.target.closest("[data-quantity-id]");
  const removeButton = event.target.closest("[data-remove-id]");
  if (quantityButton) changeQuantity(Number(quantityButton.dataset.quantityId), Number(quantityButton.dataset.quantityChange));
  if (removeButton) removeFromCart(Number(removeButton.dataset.removeId));
});

document.getElementById("cartButton").addEventListener("click", openCart);
document.getElementById("closeCart").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeCart();
});

document.querySelectorAll(".category").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".category").forEach(item => item.classList.remove("active"));
    button.classList.add("active");
    selectedCategory = button.dataset.category;
    renderProducts();
  });
});

document.getElementById("searchButton").addEventListener("click", () => {
  document.getElementById("searchArea").classList.toggle("show");
  document.getElementById("searchInput").focus();
});
document.getElementById("searchInput").addEventListener("input", event => {
  searchTerm = event.target.value;
  renderProducts();
});

checkoutForm.addEventListener("submit", async event => {
  event.preventDefault();
  checkoutMessage.textContent = "";
  whatsappNotice.hidden = true;

  if (!cart.length) {
    checkoutMessage.textContent = "Your shopping bag is empty.";
    return;
  }
  if (!supabase) {
    checkoutMessage.textContent = "Order service did not load. Please refresh and try again.";
    return;
  }

  const formData = new FormData(checkoutForm);
  const orderId = crypto.randomUUID();
  const order = {
    id: orderId,
    customer_name: formData.get("customerName").trim(),
    phone: formData.get("phone").trim(),
    address: formData.get("address").trim(),
    payment_method: "Cash on Delivery",
    items: cart.map(item => ({ id: item.id, name: item.name, price: item.price, quantity: item.quantity })),
    total: cart.reduce((total, item) => total + item.price * item.quantity, 0),
    status: "pending"
  };

  checkoutButton.disabled = true;
  checkoutButton.textContent = "Placing order…";
  try {
    const { error } = await supabase.from("orders").insert(order);
    if (error) throw error;
    cart = [];
    saveCart();
    updateCart();
    checkoutForm.reset();
    const reference = orderId.slice(0, 8).toUpperCase();
    checkoutMessage.textContent = `Order received! Reference: ${reference}. We will contact you to confirm.`;
    const whatsappText = [
      `New VÉRRO COD order ${reference}`,
      `Customer: ${order.customer_name}`,
      `Phone: ${order.phone}`,
      `Address: ${order.address}`,
      ...order.items.map(item => `${item.name} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`),
      `Total: ${formatPrice(order.total)}`
    ].join("\n");
    const adminNumber = ADMIN_WHATSAPP.replace(/\D/g, "").replace(/^0/, "88");
    whatsappNotice.href = `https://wa.me/${adminNumber}?text=${encodeURIComponent(whatsappText)}`;
    whatsappNotice.hidden = false;
  } catch (error) {
    console.error("Order submission failed:", error);
    checkoutMessage.textContent = "We couldn't submit your order. Please try again or contact us.";
  } finally {
    checkoutButton.disabled = false;
    checkoutButton.textContent = "Place COD Order";
  }
});

function showAdminLogin() {
  document.getElementById("adminEmail").value = ADMIN_EMAIL;
  document.getElementById("loginMessage").textContent = "";
  adminDialog.showModal();
}

document.getElementById("adminEntry").addEventListener("click", showAdminLogin);
document.getElementById("closeAdminDialog").addEventListener("click", () => adminDialog.close());
adminDialog.addEventListener("click", event => {
  if (event.target === adminDialog) adminDialog.close();
});

document.getElementById("adminLoginForm").addEventListener("submit", async event => {
  event.preventDefault();
  const loginMessage = document.getElementById("loginMessage");
  if (!supabase) {
    loginMessage.textContent = "Admin sign-in service is unavailable.";
    return;
  }

  const email = document.getElementById("adminEmail").value.trim().toLowerCase();
  const password = document.getElementById("adminPassword").value;
  if (email !== ADMIN_EMAIL) {
    loginMessage.textContent = "This email is not authorized for admin access.";
    return;
  }

  loginMessage.textContent = "Signing in…";
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || data.user?.email?.toLowerCase() !== ADMIN_EMAIL) {
    loginMessage.textContent = error?.message || "This account is not authorized.";
    return;
  }

  adminDialog.close();
  document.getElementById("adminPassword").value = "";
  adminSection.hidden = false;
  adminSection.scrollIntoView({ behavior: "smooth" });
  await loadOrders();
});

async function loadOrders() {
  adminMessage.textContent = "Loading orders…";
  adminOrders.innerHTML = "";
  const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
  if (error) {
    adminMessage.textContent = "Could not load orders. Check the database setup and admin account.";
    console.error("Loading orders failed:", error);
    return;
  }
  adminMessage.textContent = data.length ? `${data.length} order${data.length === 1 ? "" : "s"}` : "No orders yet.";
  adminOrders.innerHTML = data.map(renderAdminOrder).join("");
}

function renderAdminOrder(order) {
  const validStatuses = ["pending", "confirmed", "shipped", "delivered", "cancelled"];
  const status = validStatuses.includes(order.status) ? order.status : "pending";
  const items = Array.isArray(order.items) ? order.items : [];
  const orderDate = new Date(order.created_at).toLocaleString("en-BD");
  const phoneDigits = String(order.phone).replace(/\D/g, "");
  const waNumber = phoneDigits.startsWith("0") ? `88${phoneDigits}` : phoneDigits;
  const waMessage = encodeURIComponent(`Hello ${order.customer_name}, this is VÉRRO regarding your order ${order.id.slice(0, 8).toUpperCase()}.`);

  return `
    <article class="admin-order">
      <div class="order-topline"><strong>Order ${escapeHtml(order.id.slice(0, 8).toUpperCase())}</strong><time>${escapeHtml(orderDate)}</time></div>
      <div class="order-details">
        <p><strong>${escapeHtml(order.customer_name)}</strong></p>
        <p><a href="tel:${escapeHtml(order.phone)}">${escapeHtml(order.phone)}</a></p>
        <p>${escapeHtml(order.address)}</p>
        <p><strong>Payment:</strong> ${escapeHtml(order.payment_method)} · <strong>Total:</strong> ${formatPrice(order.total)}</p>
        <ul>${items.map(item => `<li>${escapeHtml(item.name)} × ${Number(item.quantity)} — ${formatPrice(Number(item.price) * Number(item.quantity))}</li>`).join("")}</ul>
      </div>
      <div class="order-bottomline">
        <label>Status
          <select data-order-status="${escapeHtml(order.id)}">
            ${validStatuses.map(value => `<option value="${value}" ${status === value ? "selected" : ""}>${value[0].toUpperCase()}${value.slice(1)}</option>`).join("")}
          </select>
        </label>
        <a class="secondary-button" href="https://wa.me/${escapeHtml(waNumber)}?text=${waMessage}" target="_blank" rel="noopener">Message customer</a>
      </div>
    </article>
  `;
}

adminOrders.addEventListener("change", async event => {
  const select = event.target.closest("[data-order-status]");
  if (!select) return;
  select.disabled = true;
  const { error } = await supabase.from("orders").update({ status: select.value }).eq("id", select.dataset.orderStatus);
  select.disabled = false;
  if (error) {
    adminMessage.textContent = "Status update failed. Please try again.";
    console.error("Updating order failed:", error);
  } else {
    adminMessage.textContent = "Order status updated.";
  }
});

document.getElementById("refreshOrders").addEventListener("click", loadOrders);
document.getElementById("adminLogout").addEventListener("click", async () => {
  await supabase.auth.signOut();
  adminSection.hidden = true;
  adminOrders.innerHTML = "";
  adminMessage.textContent = "";
});

renderProducts();
updateCart();
})();
