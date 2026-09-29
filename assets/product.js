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

    // Sticky Add To Cart (SATC)
    const satc = document.querySelector('[data-satc]');
    const mainAtc = el.querySelector('[data-atc]');
    const satcBtn = document.querySelector('[data-satc-btn]');
    
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

      // Proxy SATC click to main ATC button
      if (satcBtn) {
        satcBtn.addEventListener('click', () => {
          mainAtc.click();
        });
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
