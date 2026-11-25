(() => {
  const select = document.getElementById('modelSelect');
  const results = document.getElementById('supportResults');

  const safe = value => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));

  function youtubeEmbed(url) {
    try {
      const u = new URL(url);
      let id = '';
      if (u.hostname.includes('youtu.be')) id = u.pathname.slice(1);
      else if (u.hostname.includes('youtube.com')) {
        if (u.pathname === '/watch') id = u.searchParams.get('v') || '';
        else if (u.pathname.startsWith('/embed/')) id = u.pathname.split('/')[2] || '';
        else if (u.pathname.startsWith('/shorts/')) id = u.pathname.split('/')[2] || '';
      }
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : '';
    } catch { return ''; }
  }

  function show(model) {
    if (!model) {
      results.innerHTML = '<div class="support-empty">Select a lamp model to view its assembly resources.</div>';
      return;
    }
    const video = youtubeEmbed(model.assembly_video_url);
    const pdf = model.instructions_pdf_url;
    let html = `<h3>${safe(model.name || model.model_name || model.product_id)}</h3>`;
    html += '<div class="resource-grid">';
    html += video
      ? `<article class="resource"><span class="resource-kicker">Video tutorial</span><h3>Watch the assembly video</h3><p>Follow the steps in the video for your lamp model.</p><a class="btn btn-dark" href="${safe(model.assembly_video_url)}" target="_blank" rel="noopener noreferrer">Open on YouTube</a></article>`
      : '<article class="resource"><span class="resource-kicker">Video tutorial</span><h3>Video not available yet</h3><p>There is no assembly video linked to this model at the moment.</p></article>';
    html += pdf && /^https?:\/\//i.test(pdf)
      ? `<article class="resource"><span class="resource-kicker">Downloadable guide</span><h3>Assembly instructions</h3><p>Download the PDF guide for this specific lamp model.</p><a class="btn" href="${safe(pdf)}" target="_blank" rel="noopener noreferrer">Download PDF</a></article>`
      : '<article class="resource"><span class="resource-kicker">Downloadable guide</span><h3>Instructions not available yet</h3><p>A PDF guide has not been added for this model.</p></article>';
    html += '</div>';
    if (video) html += `<div class="video-frame"><iframe src="${video}" title="Assembly video for ${safe(model.name || model.product_id)}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
    results.innerHTML = html;
  }

  fetch('data/products.json', {cache:'no-store'})
    .then(r => { if (!r.ok) throw new Error('Could not load catalog'); return r.json(); })
    .then(data => {
      const models = Array.isArray(data.support_models) ? data.support_models : [];
      select.innerHTML = '<option value="">Choose your lamp model</option>' +
        models.map(m => `<option value="${safe(m.product_id)}">${safe(m.model_name || m.name || m.product_id)}</option>`).join('');
      if (!models.length) results.innerHTML = '<div class="support-empty">Assembly guides are being prepared. Please check back soon.</div>';
      select.addEventListener('change', () => {
        show(models.find(m => m.product_id === select.value));
      });
    })
    .catch(() => {
      select.innerHTML = '<option value="">Support guides unavailable</option>';
      results.innerHTML = '<div class="support-empty">We could not load the assembly guides right now. Please try again later.</div>';
    });
})();
