
const DATA_URL = "../data/equipment.json";
const QUOTE_KEY = "thistleQuoteV2";

const money = value => `£${Number(value).toFixed(2).replace(".00","")}`;

function getQuote() {
  try { return JSON.parse(localStorage.getItem(QUOTE_KEY) || "[]"); }
  catch { return []; }
}
function saveQuote(items) {
  localStorage.setItem(QUOTE_KEY, JSON.stringify(items));
  updateQuoteCount();
}
function showToast(message) {
  const toast = document.querySelector(".toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toast);
  window.__toast = setTimeout(() => toast.classList.remove("show"), 2300);
}
function updateQuoteCount() {
  const count = getQuote().reduce((sum, item) => sum + (item.quantity || 0), 0);
  document.querySelectorAll("[data-quote-count]").forEach(el => {
    el.textContent = count;
    el.classList.toggle("has-items", count > 0);
  });
}
function getUsedStock(productId) {
  return getQuote()
    .filter(item => item.id === productId)
    .reduce((sum, item) => sum + item.quantity, 0);
}
function getAvailable(product) {
  if (product.stock === null) return Infinity;
  return Math.max(0, product.stock - getUsedStock(product.id));
}
function addToQuote(product, quantity, extra = {}) {
  const quote = getQuote();
  const requested = Number(quantity);
  const available = getAvailable(product);
  if (product.stock !== null && requested > available) {
    showToast(`Only ${available} more available.`);
    return false;
  }
  if (requested < 1) return false;

  const key = product.id + "|" + (extra.length || "");
  const existing = quote.find(item => item.key === key);
  if (existing) existing.quantity += requested;
  else quote.push({
    key, id: product.id, name: product.name, price: product.price,
    quantity: requested, configurable: product.configurable || false,
    length: extra.length || null, category: product.categoryLabel
  });
  saveQuote(quote);
  showToast(`${product.name} added to your quote`);
  return true;
}

function changeQuoteItem(key, delta) {
  const quote = getQuote();
  const item = quote.find(x => x.key === key);
  if (!item) return;
  item.quantity = Math.max(1, item.quantity + delta);
  saveQuote(quote);
  renderQuote();
}
function removeQuoteItem(key) {
  saveQuote(getQuote().filter(x => x.key !== key));
  renderQuote();
  showToast("Item removed");
}

function renderProductCard(product) {
  const safeId = product.id.replace(/[^a-zA-Z0-9_-]/g, "");
  const media = `<div class="product-media">
    <img src="../${product.image}" alt="${product.name}" loading="lazy"
      onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
    <div class="product-placeholder" style="display:none">PHOTO</div>
  </div>`;

  if (product.configurable) {
    return `<article class="card product-card reveal" data-category="${product.category}" data-product="${product.id}">
      ${media}
      <div class="product-body">
        <div class="product-tag">${product.categoryLabel}</div>
        <h3>${product.name}</h3>
        <p class="product-description">${product.description}</p>
        <p class="product-note">${product.notes}</p>
        <div class="price-row">
          <div class="price"><strong>${money(product.price)}</strong> <span>/ day</span></div>
          <div class="stock-label"><strong>Unlimited</strong><br>stock</div>
        </div>
        <div class="config-row">
          <select class="select cable-length" aria-label="Cable length">
            <option value="1m">1m</option><option value="2m">2m</option><option value="3m" selected>3m</option>
            <option value="5m">5m</option><option value="10m">10m</option><option value="15m">15m</option><option value="custom">Other</option>
          </select>
          <input class="input cable-qty" type="number" min="1" value="1" aria-label="Cable quantity">
        </div>
        <div class="custom-length"><input class="input custom-length-input" placeholder="Length e.g. 7m"></div>
        <button class="add-btn cable-add">Add to quote <span>→</span></button>
      </div>
    </article>`;
  }

  return `<article class="card product-card reveal" data-category="${product.category}" data-product="${product.id}">
    ${media}
    <div class="product-body">
      <div class="product-tag">${product.categoryLabel}</div>
      <h3>${product.name}</h3>
      <p class="product-description">${product.description}</p>
      ${product.notes ? `<p class="product-note">${product.notes}</p>` : ""}
      <div class="price-row">
        <div class="price"><strong>${money(product.price)}</strong> <span>/ day</span></div>
        <div class="stock-label"><strong>${product.stock}</strong><br>available</div>
      </div>
      <div class="quantity-row">
        <div class="qty-control">
          <button class="qty-minus" aria-label="Decrease quantity">−</button>
          <span class="qty-value">1</span>
          <button class="qty-plus" aria-label="Increase quantity">+</button>
        </div>
        <span class="stock-label">max ${product.stock}</span>
      </div>
      <button class="add-btn standard-add">Add to quote <span>→</span></button>
    </div>
  </article>`;
}

async function initEquipment() {
  const grid = document.querySelector("#equipment-grid");
  if (!grid) return;
  const response = await fetch(DATA_URL);
  const products = await response.json();
  grid.innerHTML = products.map(renderProductCard).join("");

  document.querySelectorAll(".product-card").forEach(card => {
    const product = products.find(p => p.id === card.dataset.product);
    if (!product) return;

    if (product.configurable) {
      const length = card.querySelector(".cable-length");
      const custom = card.querySelector(".custom-length");
      const customInput = card.querySelector(".custom-length-input");
      length.addEventListener("change", () => custom.classList.toggle("show", length.value === "custom"));
      card.querySelector(".cable-add").addEventListener("click", () => {
        const selectedLength = length.value === "custom" ? customInput.value.trim() : length.value;
        if (!selectedLength) { showToast("Please enter a cable length."); return; }
        const qty = Math.max(1, Number(card.querySelector(".cable-qty").value || 1));
        addToQuote(product, qty, {length:selectedLength});
      });
      return;
    }

    let qty = 1;
    const value = card.querySelector(".qty-value");
    const minus = card.querySelector(".qty-minus");
    const plus = card.querySelector(".qty-plus");
    const refresh = () => {
      const available = getAvailable(product);
      const maxForThisCard = Math.min(product.stock, Math.max(1, available));
      if (qty > maxForThisCard) qty = maxForThisCard;
      value.textContent = qty;
      minus.disabled = qty <= 1;
      plus.disabled = qty >= maxForThisCard;
      card.querySelector(".stock-label strong").textContent = product.stock;
    };
    minus.addEventListener("click", () => { qty--; refresh(); });
    plus.addEventListener("click", () => { if (qty < getAvailable(product)) qty++; refresh(); });
    card.querySelector(".standard-add").addEventListener("click", () => {
      if (addToQuote(product, qty)) refresh();
    });
    refresh();
  });
  setupFilters();
  setupReveal();
}

function setupFilters() {
  document.querySelectorAll("[data-filter]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-filter]").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
      const category = btn.dataset.filter;
      document.querySelectorAll("#equipment-grid .product-card").forEach(card => {
        const visible = category === "all" || card.dataset.category === category;
        card.style.display = visible ? "" : "none";
      });
    });
  });
}

function renderQuote() {
  const list = document.querySelector("#quote-list");
  if (!list) return;
  const quote = getQuote();
  if (!quote.length) {
    list.innerHTML = `<div class="quote-empty">Your quote is currently empty. <a class="text-link" href="../equipment/">Browse equipment →</a></div>`;
  } else {
    list.innerHTML = quote.map(item => `
      <div class="quote-item">
        <div>
          <strong>${item.name}</strong>
          <small>${item.length ? item.quantity + " × " + item.length : item.category}</small>
        </div>
        <div class="quote-qty">
          <div class="qty-control">
            <button onclick="changeQuoteItem('${item.key}',-1)">−</button>
            <span class="qty-value">${item.quantity}</span>
            <button onclick="changeQuoteItem('${item.key}',1)">+</button>
          </div>
        </div>
        <button class="quote-remove" onclick="removeQuoteItem('${item.key}')">Remove</button>
      </div>`).join("");
  }
  const total = quote.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalEl = document.querySelector("#quote-total");
  if (totalEl) totalEl.textContent = money(total);
  updateQuoteCount();
}

function setupReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window)) {
    els.forEach(el => el.classList.add("visible"));
    return;
  }
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        observer.unobserve(entry.target);
      }
    });
  }, {threshold:.12});
  els.forEach(el => observer.observe(el));
}

function setupNav() {
  const menu = document.querySelector(".menu-btn");
  const nav = document.querySelector(".nav-links");
  if (menu && nav) menu.addEventListener("click", () => nav.classList.toggle("open"));

  const normalizePath = value => value.replace(/\/+$/, "") || "/";
  const path = normalizePath(window.location.pathname);

  document.querySelectorAll("[data-nav]").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;
    const target = normalizePath(new URL(href, window.location.href).pathname);
    if (target === path || (target !== "/" && path.startsWith(target + "/"))) {
      link.classList.add("active");
    }
  });
}

function setupForms() {
  document.querySelectorAll("[data-quote-form]").forEach(form => {
    form.addEventListener("submit", e => {
      e.preventDefault();
      const quote = getQuote();
      const data = new FormData(form);
      const lines = quote.length ? quote.map(x => `- ${x.quantity} × ${x.name}${x.length ? " ("+x.length+")" : ""}`).join("\n") : "- No equipment selected";
      const body = [
        "THISTLE AV QUOTE REQUEST",
        "",
        "Selected equipment:",
        lines,
        "",
        `Name: ${data.get("name") || ""}`,
        `Email: ${data.get("email") || ""}`,
        `Phone: ${data.get("phone") || ""}`,
        `Event: ${data.get("event") || ""}`,
        `Hire dates: ${data.get("dates") || ""}`,
        `Venue: ${data.get("venue") || ""}`,
        "",
        `Details: ${data.get("details") || ""}`
      ].join("\n");
      window.location.href = "mailto:thistle.audiovisual@gmail.com?subject=" +
        encodeURIComponent("THISTLE AV Quote Request") + "&body=" + encodeURIComponent(body);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupNav();
  setupForms();
  renderQuote();
  initEquipment();
  setupReveal();
  updateQuoteCount();
  const loader = document.querySelector(".site-loader");
  window.setTimeout(() => {
    document.body.classList.remove("is-loading");
    if (loader) loader.classList.add("done");
  }, 450);
});

window.changeQuoteItem = changeQuoteItem;
window.removeQuoteItem = removeQuoteItem;
