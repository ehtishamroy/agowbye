/**
 * AGOW Product JS
 * Handles the image gallery snapping, thumbnail sync, and quantity +/- stepper.
 */
(function() {
  const galleries = document.querySelectorAll('[data-buybox]');
  
  galleries.forEach(el => {
    // Gallery
    const main = el.querySelector('[data-gallery]');
    const thumbs = el.querySelector('[data-gallery-thumbs]');
    const prevBtn = el.querySelector('[data-gallery-prev]');
    const nextBtn = el.querySelector('[data-gallery-next]');
    const countEl = el.querySelector('[data-gallery-count]');
    
    if (main && thumbs) {
      const thumbBtns = thumbs.querySelectorAll('button');
      let isScrolling = false;
      
      // Update count badge & active thumb on scroll
      main.addEventListener('scroll', () => {
        if (isScrolling) return;
        const index = Math.round(main.scrollLeft / main.clientWidth);
        if (countEl) countEl.textContent = `${index + 1} / ${thumbBtns.length}`;
        
        thumbBtns.forEach((btn, i) => {
          btn.classList.toggle('is-active', i === index);
        });
      }, { passive: true });

      // Thumbnails click
      thumbBtns.forEach((btn, i) => {
        btn.addEventListener('click', () => {
          isScrolling = true;
          main.scrollTo({ left: main.clientWidth * i, behavior: 'smooth' });
          
          thumbBtns.forEach(b => b.classList.remove('is-active'));
          btn.classList.add('is-active');
          if (countEl) countEl.textContent = `${i + 1} / ${thumbBtns.length}`;
          
          // Reset scrolling flag after animation
          setTimeout(() => { isScrolling = false; }, 400);
        });
      });

      // Next / Prev click
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          main.scrollBy({ left: -main.clientWidth, behavior: 'smooth' });
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          main.scrollBy({ left: main.clientWidth, behavior: 'smooth' });
        });
      }
    }

    // Quantity Stepper
    const qtyWrap = el.querySelector('[data-qty]');
    if (qtyWrap) {
      const input = qtyWrap.querySelector('[data-qty-input]');
      const minus = qtyWrap.querySelector('[data-qty-minus]');
      const plus = qtyWrap.querySelector('[data-qty-plus]');
      
      if (minus && plus && input) {
        minus.addEventListener('click', () => {
          input.value = Math.max(1, parseInt(input.value || 1, 10) - 1);
        });
        plus.addEventListener('click', () => {
          input.value = parseInt(input.value || 1, 10) + 1;
        });
      }
    }

    // Add-on cards (accessories added to the cart on their own line)
    el.querySelectorAll('[data-addon]').forEach(card => {
      const btn = card.querySelector('[data-addon-add]');
      const select = card.querySelector('[data-addon-variant]');
      const priceEl = card.querySelector('[data-addon-price]');
      const compareEl = card.querySelector('[data-addon-compare]');
      const saveEl = card.querySelector('[data-addon-save]');
      const errorEl = card.querySelector('[data-addon-error]');
      const money = (cents) => '$' + (cents / 100).toFixed(2);
      if (!btn) return;

      if (select) {
        select.addEventListener('change', () => {
          const opt = select.selectedOptions[0];
          const price = parseInt(opt.dataset.price, 10);
          const compare = parseInt(opt.dataset.compare, 10) || 0;
          const onSale = compare > price;

          btn.dataset.variantId = opt.value;
          if (priceEl) priceEl.textContent = money(price);
          if (compareEl) compareEl.textContent = onSale ? money(compare) : '';
          if (saveEl) {
            saveEl.textContent = saveEl.dataset.template.replace('[amount]', money(compare - price));
            saveEl.classList.toggle('hidden', !onSale);
          }
        });
      }

      btn.addEventListener('click', async () => {
        if (btn.classList.contains('is-loading')) return;
        btn.classList.add('is-loading');
        if (errorEl) errorEl.classList.add('hidden');

        try {
          const res = await fetch((window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/') + 'cart/add.js', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              items: [{ id: parseInt(btn.dataset.variantId, 10), quantity: 1 }]
            })
          });
          btn.classList.remove('is-loading');

          if (res.ok) {
            btn.classList.add('is-added');
            setTimeout(() => btn.classList.remove('is-added'), 2000);
            document.dispatchEvent(new CustomEvent('cart:updated'));
          } else {
            const err = await res.json();
            if (errorEl) {
              if (err.description) errorEl.textContent = err.description;
              errorEl.classList.remove('hidden');
            }
          }
        } catch (e) {
          btn.classList.remove('is-loading');
          if (errorEl) errorEl.classList.remove('hidden');
        }
      });
    });

    // Sticky Add To Cart (SATC)
    const satc = document.querySelector('[data-satc]');
    const mainAtc = el.querySelector('[data-atc]');
    const satcBtn = document.querySelector('[data-satc-btn]');
    const satcLabel = satcBtn ? satcBtn.textContent.trim() : '';
    const resetSatc = () => {
      if (satcBtn && satcBtn.dataset.cartState === 'view') {
        satcBtn.textContent = satcLabel;
        satcBtn.dataset.cartState = '';
      }
    };
    
    if (satc && mainAtc) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting && entry.boundingClientRect.top < 0) {
            // Show only when scrolled *past* the ATC button (not when it hasn't loaded in yet)
            satc.classList.add('show');
          } else {
            satc.classList.remove('show');
          }
        });
      }, { threshold: 0 });
      
      observer.observe(mainAtc);

      // Proxy SATC click to main ATC button or open cart
      if (satcBtn) {
        satcBtn.addEventListener('click', () => {
          if (satcBtn.dataset.cartState === 'view') {
            document.dispatchEvent(new CustomEvent('cart:updated'));
          } else {
            mainAtc.click();
          }
        });
      }

      // Section links: hide links whose section isn't on this page, highlight the one in view
      const links = Array.from(satc.querySelectorAll('[data-satc-link]'));
      const targets = [];
      links.forEach(link => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) targets.push({ link, target });
        else link.hidden = true;
      });
      const nav = satc.querySelector('[data-satc-nav]');
      if (nav && !targets.length) nav.hidden = true;

      if (targets.length) {
        let spyTicking = false;
        const spy = () => {
          spyTicking = false;
          const line = window.innerHeight * 0.4;
          let current = null;
          targets.forEach(t => {
            const r = t.target.getBoundingClientRect();
            if (r.top <= line && r.bottom > line) current = t.link;
          });
          links.forEach(l => l.classList.toggle('is-active', l === current));
        };
        window.addEventListener('scroll', () => {
          if (!spyTicking) { spyTicking = true; requestAnimationFrame(spy); }
        }, { passive: true });
        spy();
      }
    }

    // Dynamic Variant & Bundle Pricing
    const form = el.querySelector('#product-form');
    if (form) {
      const variantJsonEl = form.querySelector('#product-variants-json');
      const idInput = form.querySelector('#product-variant-id');
      const optionInputs = form.querySelectorAll('input[name^="options["]');
      const bundleInputs = form.querySelectorAll('input[name="bundle"]');
      
      const priceDisplay = el.querySelector('[data-price]');
      const compareDisplay = el.querySelector('[data-compare]');
      const saveDisplay = el.querySelector('[data-save]');
      const installmentDisplay = el.querySelector('[data-installment]');
      
      const satcPrice = document.querySelector('[data-satc-price]');
      const satcCompare = document.querySelector('[data-satc-compare]');
      const atcPrice = el.querySelector('[data-atc-price]');
      
      const formatMoney = (cents) => '$' + (cents / 100).toFixed(2);
      const updatePrices = (priceCents, compareCents) => {
        const p = formatMoney(priceCents);
        if (priceDisplay) priceDisplay.textContent = p;
        if (atcPrice) atcPrice.textContent = p;
        if (satcPrice) satcPrice.textContent = p;
        if (installmentDisplay) installmentDisplay.textContent = formatMoney(priceCents / 4);

        if (compareCents > priceCents) {
          const c = formatMoney(compareCents);
          if (compareDisplay) { compareDisplay.textContent = c; compareDisplay.style.display = ''; }
          if (saveDisplay) { saveDisplay.textContent = 'Save ' + formatMoney(compareCents - priceCents); saveDisplay.style.display = ''; }
          if (satcCompare) { satcCompare.textContent = c; satcCompare.style.display = ''; }
        } else {
          if (compareDisplay) compareDisplay.style.display = 'none';
          if (saveDisplay) saveDisplay.style.display = 'none';
          if (satcCompare) satcCompare.style.display = 'none';
        }
      };

      // Handle Ajax Add to Cart
      if (mainAtc) {
        mainAtc.addEventListener('click', async () => {
          if (mainAtc.classList.contains('is-loading')) return;
          
          const variantId = idInput ? idInput.value : null;
          const qtyWrap = el.querySelector('[data-qty]');
          const qtyInput = qtyWrap ? qtyWrap.querySelector('[data-qty-input]') : null;
          const quantity = qtyInput ? parseInt(qtyInput.value || 1, 10) : 1;
          
          if (!variantId) return;

          mainAtc.classList.add('is-loading');
          
          try {
            const res = await fetch((window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/') + 'cart/add.js', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                items: [{ id: parseInt(variantId, 10), quantity }]
              })
            });
            
            if (res.ok) {
              mainAtc.classList.remove('is-loading');
              mainAtc.classList.add('is-added');
              
              if (satcBtn) {
                satcBtn.textContent = satcBtn.dataset.viewLabel || 'View cart';
                satcBtn.dataset.cartState = 'view';
              }
              
              setTimeout(() => mainAtc.classList.remove('is-added'), 2000);
              
              document.dispatchEvent(new CustomEvent('cart:updated'));
            } else {
              const err = await res.json();
              alert(err.description || 'Error adding to cart');
              mainAtc.classList.remove('is-loading');
            }
          } catch (e) {
            alert('Error adding to cart');
            mainAtc.classList.remove('is-loading');
          }
        });
      }

      // Handle bundle clicks (custom blocks overriding price)
      const updateBundlePrice = (input) => {
        const bundleCard = input.closest('label');
        if (!bundleCard) return;
        const priceText = bundleCard.querySelector('.text-right span').textContent.replace(/[^0-9.]/g, '');
        const compareText = bundleCard.querySelector('.text-right s') ? bundleCard.querySelector('.text-right s').textContent.replace(/[^0-9.]/g, '') : '';
        
        if (priceText) {
          const pCents = Math.round(parseFloat(priceText) * 100);
          const cCents = compareText ? Math.round(parseFloat(compareText) * 100) : 0;
          updatePrices(pCents, cCents);
          resetSatc();
        }
      };

      bundleInputs.forEach(input => {
        input.addEventListener('change', () => updateBundlePrice(input));
      });

      // Force pre-selected bundle price on page load
      const checkedBundle = Array.from(bundleInputs).find(i => i.checked);
      if (checkedBundle) {
        updateBundlePrice(checkedBundle);
      }

      // Handle standard variant changes
      if (variantJsonEl && optionInputs.length > 0) {
        let variants = [];
        try { variants = JSON.parse(variantJsonEl.textContent); } catch (e) {}
        
        const updateVariant = () => {
          const selectedOptions = Array.from(optionInputs).filter(i => i.checked).map(i => i.value);
          const matchedVariant = variants.find(v => {
            return selectedOptions.every((val, index) => v.options[index] === val);
          });
          
          if (matchedVariant) {
            if (idInput) idInput.value = matchedVariant.id;
            updatePrices(matchedVariant.price, matchedVariant.compare_at_price || 0);
            resetSatc();
            
            // Update URL
            const url = new URL(window.location);
            url.searchParams.set('variant', matchedVariant.id);
            window.history.replaceState({}, '', url);
          }
        };

        optionInputs.forEach(input => {
          input.addEventListener('change', updateVariant);
        });
      }
    }
  });
})();
