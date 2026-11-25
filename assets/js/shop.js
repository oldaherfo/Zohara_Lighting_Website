(() => {
  const target = document.getElementById('shopProducts');
  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
  fetch('data/products.json', {cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error('Unable to load catalog'); return r.json(); })
    .then(data => {
      const products = Array.isArray(data.products) ? data.products : [];
      target.innerHTML = products.length ? products.map(p => {
        const title = p.name || p.model_name || p.product_id;
        const image = p.image_url && /^https?:\/\//i.test(p.image_url) ? p.image_url : 'assets/images/product-placeholder.jpg';
        const url = p.amazon_url && /^https?:\/\//i.test(p.amazon_url) ? p.amazon_url : 'https://www.amazon.com';
        const price = p.price != null ? `<p class="product-price">USD ${safe(p.price)}</p>` : '';
        const discount = Number(p.discount_offer_percent);
        return `<article class="product-card"><a class="product-card-link" href="${safe(url)}" target="_blank" rel="noopener noreferrer">
          <img src="${safe(image)}" alt="${safe(title)}" loading="lazy">
          <div class="product-card-body"><p class="product-category">${safe(p.category || 'Zohara Lighting')}</p><h3>${safe(title)}</h3>${price}
          ${Number.isFinite(discount) && discount > 0 ? `<p class="product-category">${safe(discount)}% offer</p>` : ''}</div>
        </a></article>`;
      }).join('') : '<p>No products are available yet.</p>';
    })
    .catch(() => { target.innerHTML = '<p>We could not load the collection right now. Please try again later.</p>'; });
})();
