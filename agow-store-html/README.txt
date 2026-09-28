AGOW store — standalone HTML + Tailwind (no build, no React)

FILES
  index.html    homepage (with buy box)
  product.html  product page

Just double-click either file. Tailwind loads from a CDN, so stay online.
Everything is in the one file: styles, all sections, and the JavaScript.

There is NO React anywhere. The JS at the bottom is plain vanilla JS
(cart drawer, gallery, bundles, countdown, etc.).

CONVERTING TO SHOPIFY
  - The Tailwind classes on the markup are what you copy into your theme.
  - The <script src="cdn.tailwindcss.com"> line is fine for previewing.
    For a real theme, either keep it, or compile Tailwind once so the CSS
    is served from your theme assets (faster, recommended for production).
  - Each section still has an HTML comment naming its Shopify section
    (e.g. sections/header.liquid) so you know where each block goes.
  - Swap the local `cart` array in the JS for Shopify's /cart/*.js Ajax API.

Prices, reviews (marked "sample"), specs and policies are all placeholders
— confirm every one with Jim before launch.
