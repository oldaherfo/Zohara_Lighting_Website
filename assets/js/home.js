(() => {
  const bestTarget = document.getElementById('bestSellerProducts');
  const latestTarget = document.getElementById('latestProducts');
  const storeButton = document.getElementById('amazonStoreButton');

  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function card(p) {
    const title = p.name || p.model_name || p.product_id || 'Zohara lamp';
    const price = p.price != null ? `USD ${safe(p.price)}` : '';
    const discount = Number(p.discount_offer_percent);
    const category = p.category || 'Zohara Lighting';
    const image = p.image_url && /^https?:\/\//i.test(p.image_url)
      ? p.image_url : 'assets/images/product-placeholder.jpg';
    const link = p.amazon_url && /^https?:\/\//i.test(p.amazon_url) ? p.amazon_url : 'https://www.amazon.com';
    const inner = `
      <img src="${safe(image)}" alt="${safe(title)}" loading="lazy">
      <div class="product-card-body">
        <p class="product-category">${safe(category)}</p>
        <h3>${safe(title)}</h3>
        ${price ? `<p class="product-price">${price}</p>` : ''}
        ${Number.isFinite(discount) && discount > 0 ? `<p class="product-category">${safe(discount)}% offer</p>` : ''}
      </div>`;
    return `<article class="product-card"><a class="product-card-link" href="${safe(link)}" target="_blank" rel="noopener noreferrer" aria-label="View ${safe(title)} on Amazon">${inner}</a></article>`;
  }

  fetch('data/products.json', {cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error('Unable to load catalog'); return r.json(); })
    .then(data => {
      const topFive = Array.isArray(data.top_5_products) ? data.top_5_products : [];
      const latestFive = Array.isArray(data.latest_products) ? data.latest_products : [];

      if (bestTarget) {
        bestTarget.innerHTML = topFive.length
          ? topFive.slice(0, 5).map(card).join('')
          : '<div class="product-loading">Our featured collection is being updated. Please check back soon.</div>';
      }
      if (latestTarget) {
        latestTarget.innerHTML = latestFive.length
          ? latestFive.slice(0, 5).map(card).join('')
          : '<div class="product-loading">New arrivals will appear here soon.</div>';
      }
      if (storeButton) {
        storeButton.href = 'https://www.amazon.com';
        storeButton.hidden = false;
      }
    })
    .catch(() => {
      if (bestTarget) bestTarget.innerHTML = '<div class="product-loading">We could not load the collection right now. Please try again later.</div>';
      if (latestTarget) latestTarget.innerHTML = '<div class="product-loading">We could not load the latest arrivals right now. Please try again later.</div>';
      if (storeButton) storeButton.href = 'https://www.amazon.com';
    });
})();
