/**
 * AGOW Cart Drawer
 * Handles open/close, quantity changes, line item removal,
 * and free-shipping progress via Shopify Ajax Cart API.
 */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];

  const FREE_SHIP = 9990; // $99.00 in cents (Shopify money format)
  const cart = $('[data-cart]');
  const overlay = $('[data-cart-overlay]');
  if (!cart) return;

  /* ── Open / Close ── */
  function openCart() {
    cart.classList.add('open');
    if (overlay) overlay.classList.add('open');
    cart.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => {
      const first = cart.querySelector('button, a');
      if (first) first.focus();
    }, 350);
  }
  function closeCart() {
    cart.classList.remove('open');
    if (overlay) overlay.classList.remove('open');
    cart.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }

  $$('[data-cart-open]').forEach(b => b.addEventListener('click', e => {
    e.preventDefault();
    openCart();
  }));
  $$('[data-cart-close]').forEach(b => b.addEventListener('click', closeCart));
  if (overlay) overlay.addEventListener('click', closeCart);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && cart.classList.contains('open')) closeCart();
  });

  /* ── Ajax Cart helpers ── */
  async function fetchCart() {
    const res = await fetch('/cart.js');
    return res.json();
  }

  async function changeItem(key, quantity) {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity })
    });
    return res.json();
  }

  function formatMoney(cents) {
    return '$' + (cents / 100).toFixed(2);
  }

  /* ── Render cart drawer from JS ── */
  function renderCart(data, bump) {
    const itemCount = data.item_count;
    const totalPrice = data.total_price;

    // Update count badges
    $$('[data-cart-count]').forEach(c => {
      c.textContent = itemCount;
      if (itemCount === 0) c.setAttribute('hidden', '');
      else c.removeAttribute('hidden');
      if (bump) {
        c.classList.remove('bump');
        void c.offsetWidth;
        c.classList.add('bump');
      }
    });

    // Count text in drawer header
    const countText = $('[data-cart-count-text]');
    if (countText) countText.textContent = itemCount ? `(${itemCount})` : '';

    // Subtotal
    const subtotalEl = $('[data-cart-subtotal]');
    if (subtotalEl) subtotalEl.textContent = formatMoney(totalPrice);

    // Empty / items visibility
    const emptyEl = $('[data-cart-empty]');
    const itemsEl = $('[data-cart-items]');
    const footerEl = $('[data-cart-footer]');
    if (emptyEl) emptyEl.classList.toggle('hidden', itemCount > 0);
    if (itemsEl) itemsEl.classList.toggle('hidden', itemCount === 0);
    if (footerEl) footerEl.classList.toggle('hidden', itemCount === 0);

    // Free shipping progress
    const remaining = Math.max(0, FREE_SHIP - totalPrice);
    const pct = remaining <= 0 ? 100 : Math.round((totalPrice / FREE_SHIP) * 100);
    const shipBar = $('[data-ship-bar]');
    const shipMsg = $('[data-ship-msg]');
    if (shipBar) shipBar.style.width = pct + '%';
    if (shipMsg) {
      shipMsg.innerHTML = remaining <= 0
        ? '<b>You\'ve unlocked free shipping.</b>'
        : `Add <b class="tnum">${formatMoney(remaining)}</b> more for free shipping`;
    }

    // Render line items
    if (itemsEl) {
      itemsEl.innerHTML = data.items.map(item => `
        <div class="drawer__line" data-line-key="${item.key}">
          <img src="${item.image ? item.image.replace(/(\.\w+)(\?|$)/, '_160x$1$2') : ''}"
               alt="${item.title}" width="80" height="80"
               class="drawer__line-img" loading="lazy">
          <div class="drawer__line-info">
            <div class="drawer__line-top">
              <p class="drawer__line-title">${item.product_title}</p>
              <p class="drawer__line-price tnum">${formatMoney(item.final_line_price)}</p>
            </div>
            ${item.variant_title && item.variant_title !== 'Default Title'
              ? `<p class="drawer__line-variant">${item.variant_title}</p>` : ''}
            <div class="drawer__line-actions">
              <div class="drawer__qty">
                <button aria-label="Decrease" data-line-dec="${item.key}">−</button>
                <span class="tnum">${item.quantity}</span>
                <button aria-label="Increase" data-line-inc="${item.key}">+</button>
              </div>
              <button class="drawer__remove" data-line-remove="${item.key}">Remove</button>
            </div>
          </div>
        </div>
      `).join('');
    }
  }

  /* ── Delegated click handlers for qty +/- and remove ── */
  document.addEventListener('click', async e => {
    const inc = e.target.closest('[data-line-inc]');
    const dec = e.target.closest('[data-line-dec]');
    const rm = e.target.closest('[data-line-remove]');

    if (!inc && !dec && !rm) return;

    const key = inc ? inc.dataset.lineInc : dec ? dec.dataset.lineDec : rm.dataset.lineRemove;

    // Find current quantity
    const lineEl = document.querySelector(`[data-line-key="${key}"]`);
    const qtyEl = lineEl ? lineEl.querySelector('.drawer__qty span') : null;
    const currentQty = qtyEl ? parseInt(qtyEl.textContent, 10) : 1;

    let newQty;
    if (rm) newQty = 0;
    else if (dec) newQty = Math.max(0, currentQty - 1);
    else newQty = currentQty + 1;

    const data = await changeItem(key, newQty);
    renderCart(data, false);
  });

  /* ── Initial load ── */
  // Already server-rendered, but fetch fresh data to stay in sync
  fetchCart().then(data => renderCart(data, false));
})();
