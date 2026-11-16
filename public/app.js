"use strict";
(() => {
  const projects = window.PORTFOLIO_PROJECTS;
  const categories = window.PORTFOLIO_CATEGORIES;
  const materials = window.PORTFOLIO_MATERIALS || {galleries:{}};
  for (const p of projects) p.gallery = [p.galleryGroup, ...(p.extraGalleryGroups || [])].filter(Boolean).flatMap(key => materials.galleries[key] || []);
  const byId = new Map(projects.map(p => [p.id, p]));
  const state = {category:"all", query:"", format:"all", savedOnly:false, collection:null};
  let saved;
  try { saved = new Set(JSON.parse(localStorage.getItem("kustov-portfolio-saved-v1") || "[]").filter(id => byId.has(id))); } catch { saved = new Set(); }
  const $ = id => document.getElementById(id);
  const dialog = $("detail");
  const viewer = $("viewer");
  let viewingProject = null;
  let viewingIndex = 0;
  let lastFocus = null;
  let toastTimer;
  const escape = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const normalize = value => value.toLocaleLowerCase("ru").replaceAll("ё", "е");
  const categoryName = id => categories.find(c => c.id === id)?.label || id;
  const plural = n => n % 10 === 1 && n % 100 !== 11 ? "разработка" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "разработки" : "разработок";
  const cardLimit = 6;
  const categoryNotes = {
    creative:"Мастер-классы, игровые форматы и творческие материалы",
    events:"Идеи и готовые решения для событий",
    routes:"Путешествия, краеведение и семейные маршруты",
    aid:"Занятия, тренировки и материалы по первой помощи",
    team:"Для наставников и совместной работы",
    volunteer:"Волонтёрские практики и проекты",
    media:"Публикации, изображения и медиаматериалы",
    planning:"Планы, календари и инструменты организации",
    informatics:"Уроки, тренажёры и цифровые инструменты"
  };
  const categoryIcons = {creative:"✳",events:"▣",routes:"⌖",aid:"✚",team:"◎",volunteer:"♡",media:"▤",planning:"◫",informatics:"⌘"};
  const indexMap = new Map(projects.map((p,i) => [p.id,i]));
  let openedGroups = new Set();
  let shownByGroup = new Map();
  let lastFilterKey = null;
  function cover(p, index) {
    if (p.preview) return `<span class="cover cover-image${p.format==='site'?' preview-site':''}"><span class="cover-stage"><img src="${escape(p.preview)}" alt="Превью разработки: ${escape(p.title)}" loading="lazy"></span><span class="preview-label">${p.format==='site'?'САЙТ':'МАТЕРИАЛЫ'}</span></span>`;
    if (p.previewFrame) return `<span class="cover cover-frame"><iframe src="${escape(p.previewFrame)}" title="Живое превью: ${escape(p.title)}" tabindex="-1" loading="lazy" sandbox="${p.previewScripts===false?'':'allow-scripts'}"></iframe><span class="preview-label">${escape(p.previewLabel||'ЖИВОЙ ПРОСМОТР')}</span></span>`;
    const photo = p.cover === "route" ? '<img src="assets/kem-history.jpg" alt="" loading="lazy" width="750" height="587">' : "";
    return `<span class="cover cover-${escape(p.cover)}">${photo}<span class="cover-overline">${escape(p.overline)}</span><span class="cover-index">${String(index+1).padStart(2,"0")}</span><span class="cover-main">${p.coverTitle}</span>${p.cover !== "route" ? `<span class="cover-icon" aria-hidden="true">${escape(p.icon)}</span>` : ""}</span>`;
  }
  function classifyPreview(img) {
    const coverElement = img.closest(".cover-image");
    if (!coverElement || coverElement.classList.contains("preview-site") || !img.naturalWidth || !img.naturalHeight) return;
    const ratio = img.naturalHeight / img.naturalWidth;
    coverElement.classList.toggle("cover-portrait", ratio >= 1.16);
    coverElement.classList.toggle("cover-landscape", ratio < 1.16);
  }
  function classifyPreviews() {
    document.querySelectorAll("#project-grid .cover-image img").forEach(img => {
      if (img.complete) classifyPreview(img);
      else img.addEventListener("load", () => classifyPreview(img), {once:true});
    });
  }
  const renderCard = p => `<article class="project-card"><button type="button" class="card-open" data-project="${p.id}" aria-label="Подробнее: ${escape(p.title)}">${cover(p,projects.indexOf(p))}<span class="card-body"><span class="card-category">${escape(categoryName(p.category))}</span><h3>${escape(p.title)}</h3><p>${escape(p.summary)}</p><span class="card-tags">${p.tags.map(t => `<span>${escape(t)}</span>`).join("")}</span></span></button><div class="card-footer"><span class="status-dot${p.ready ? "" : " pending"}" aria-hidden="true"></span><span>${escape(p.status)}</span><button class="card-arrow" type="button" data-project="${p.id}" aria-label="Открыть карточку ${escape(p.title)}">↗</button><button type="button" class="bookmark${saved.has(p.id)?" is-saved":""}" data-save="${p.id}" aria-pressed="${saved.has(p.id)}" aria-label="${saved.has(p.id)?"Убрать из избранного":"В избранное"}: ${escape(p.title)}">${saved.has(p.id)?"★":"☆"}</button></div></article>`);
  function renderFilters() {
    $("filters").innerHTML = categories.map(c => `<button class="filter${state.category === c.id ? " active" : ""}" type="button" data-category="${c.id}" aria-pressed="${state.category === c.id}">${escape(c.label)} <span>${c.id === "all" ? projects.length : projects.filter(p => p.category === c.id).length}</span></button>`).join("");
  }
  function render() {
    renderFilters();
    const q = normalize(state.query.trim());
    const filtered = projects.filter(p => (state.category === "all" || p.category === state.category) && (state.format === "all" || p.format === state.format) && (!state.savedOnly || saved.has(p.id)) && (!state.collection || p.collections.includes(state.collection)) && (!q || normalize([p.title,p.summary,p.description,p.audience,p.formatLabel,...p.tags].join(" ")).includes(q)));
    const grouped = categories.filter(c => c.id !== "all").map(c => ({category:c,items:filtered.filter(p => p.category === c.id)})).filter(g => g.items.length);
    const key = [state.category,state.format,state.savedOnly,state.collection||"",q].join("|");
    if (key !== lastFilterKey) {
      lastFilterKey = key;
      shownByGroup = new Map();
      const hasSearchOrFilter = state.category !== "all" || state.format !== "all" || state.savedOnly || !!state.collection || !!q;
      openedGroups = new Set(hasSearchOrFilter ? grouped.map(g => g.category.id) : grouped.slice(0,1).map(g => g.category.id));
    }
    $("project-grid").innerHTML = grouped.map(({category,items}) => {
      const count = shownByGroup.get(category.id) || cardLimit;
      const visible = items.slice(0,count);
      return `<section class="catalog-section" id="group-${escape(category.id)}">
        <details class="catalog-group" data-group="${escape(category.id)}" ${openedGroups.has(category.id)?"open":""}>
          <summary class="group-summary">
            <span class="group-icon" aria-hidden="true">${categoryIcons[category.id]||"◇"}</span>
            <span class="group-heading"><strong>${escape(category.label)}</strong><small>${escape(categoryNotes[category.id] || "Проекты и материалы")}</small></span>
            <span class="group-meta"><span class="group-count">${items.length} ${plural(items.length)}</span><span class="group-chevron" aria-hidden="true">⌄</span></span>
          </summary>
          <div class="group-body">
            <div class="project-grid">${visible.map(renderCard).join("")}</div>
            ${items.length > visible.length ? `<button type="button" class="show-more" data-more="${escape(category.id)}">Показать ещё <span aria-hidden="true">↓</span><span class="show-more-count">Осталось ${items.length-visible.length}</span></button>` : ""}
          </div>
        </details>
      </section>`;
    }).join("");
    classifyPreviews();filtered.map(p => `<article class="project-card"><button type="button" class="card-open" data-project="${p.id}" aria-label="Подробнее: ${escape(p.title)}">${cover(p,projects.indexOf(p))}<span class="card-body"><span class="card-category">${escape(categoryName(p.category))}</span><h3>${escape(p.title)}</h3><p>${escape(p.summary)}</p><span class="card-tags">${p.tags.map(t => `<span>${escape(t)}</span>`).join("")}</span></span></button><div class="card-footer"><span class="status-dot${p.ready ? "" : " pending"}" aria-hidden="true"></span><span>${escape(p.status)}</span><button class="card-arrow" type="button" data-project="${p.id}" aria-label="Открыть карточку ${escape(p.title)}">↗</button><button type="button" class="bookmark${saved.has(p.id)?" is-saved":""}" data-save="${p.id}" aria-pressed="${saved.has(p.id)}" aria-label="${saved.has(p.id)?"Убрать из избранного":"В избранное"}: ${escape(p.title)}">${saved.has(p.id)?"★":"☆"}</button></div></article>`).join("");
    const prefix = state.savedOnly ? "Избранное · " : state.collection ? ({mentor:"Для наставника · ",event:"Для события · ",digital:"Интерактивные сайты · "}[state.collection]) : "";
    $("results-count").textContent = `${prefix}${filtered.length} ${plural(filtered.length)}`;
    $("empty").hidden = filtered.length > 0;
    $("reset").hidden = !(state.category !== "all" || q || state.format !== "all" || state.savedOnly || state.collection);
    $("saved-count").textContent = saved.size;
    $("saved-button").classList.toggle("active", state.savedOnly);
    $("saved-button").setAttribute("aria-pressed", String(state.savedOnly));
    document.querySelectorAll("[data-saved-toggle]").forEach(el => { el.classList.toggle("active",state.savedOnly); el.setAttribute("aria-pressed",String(state.savedOnly)); });
    $("total-stat").textContent = projects.length;
    if ($("materials-stat")) $("materials-stat").textContent = Object.values(materials.galleries).reduce((n,a)=>n+a.length,0);
    if ($("sites-stat")) $("sites-stat").textContent = projects.filter(p=>p.format==='site').length;
  }
  function toast(message) { $("toast").textContent = message; $("toast").classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => $("toast").classList.remove("show"), 2200); }
  function toggleSaved(id) {
    if (!byId.has(id)) return;
    const adding = !saved.has(id);
    adding ? saved.add(id) : saved.delete(id);
    let persisted = true;
    try { localStorage.setItem("kustov-portfolio-saved-v1",JSON.stringify([...saved])); } catch { persisted = false; }
    render();
    const modalButton = document.querySelector("[data-modal-save]");
    if (modalButton?.dataset.modalSave === id) {
      modalButton.textContent = adding ? "★ В избранном" : "☆ В избранное";
      modalButton.setAttribute("aria-pressed", String(adding));
    }
    toast(persisted ? (adding ? "Добавлено в избранное" : "Убрано из избранного") : "Избранное сохранится до закрытия страницы");
    document.querySelector(`[data-save="${id}"]`)?.focus({preventScroll:true});
  }
  function openProject(id, updateHash = true) {
    const p = byId.get(id);
    if (!p) return;
    if (!dialog.open) lastFocus = document.activeElement;
    const resources = p.resources.length ? `<div class="dialog-section"><h3>Открыть материалы</h3>${p.resources.map(r => `<a class="resource" href="${escape(r.url)}" target="_blank" rel="noopener noreferrer"><span><strong>${escape(r.title)}</strong><small>${escape(r.type)}</small></span><span aria-hidden="true">↗</span><span class="sr-only"> — откроется в новой вкладке</span></a>`).join("")}${p.resources.some(r=>r.library)?'<p class="resource-note">Исходные файлы скачиваются без входа в ChatGPT.</p>':""}</div>` : '<p class="description-only">В портфолио пока представлено описание этой разработки. Файл ещё не подключён.</p>';
    let galleryOffset = 0;
    const gallerySections = [p.galleryGroup, ...(p.extraGalleryGroups || [])].filter(Boolean).map(key => {
      const list = materials.galleries[key] || [];
      const meta = materials.series?.[key];
      const heading = meta ? `<h4 class="gallery-series-title">${escape(meta.title)}</h4><p class="gallery-hint">${escape(meta.status || '')}</p>` : '';
      const result = heading + `<div class="material-gallery">${list.map((g,i)=>`<button class="material-thumb" type="button" data-gallery-project="${p.id}" data-gallery-index="${galleryOffset+i}" aria-label="Открыть: ${escape(g.title)}"><img src="${escape(g.src)}" alt="${escape(g.title)}" loading="lazy" width="${g.width}" height="${g.height}"><span>${escape(g.title)}</span></button>`).join('')}</div>`;
      galleryOffset += list.length;
      return result;
    }).join('');
    const gallery = p.gallery.length ? `<div class="dialog-section"><h3>Изображения, страницы и варианты · ${p.gallery.length}</h3><p class="gallery-hint">Варианты сгруппированы по сериям и времени создания. Нажмите на изображение, чтобы рассмотреть и скачать исходник. Оригиналы доступны без входа в ChatGPT.</p>${gallerySections}</div>` : '';
    $("detail-content").innerHTML = `<div class="dialog-header"><p class="eyebrow">${escape(categoryName(p.category))} / ${escape(p.year)}</p><h2 id="detail-title">${escape(p.title)}</h2><p>${escape(p.description)}</p></div><dl class="dialog-meta"><div><dt>Для кого</dt><dd>${escape(p.audience)}</dd></div><div><dt>Формат</dt><dd>${escape(p.formatLabel)}</dd></div><div style="grid-column:1/-1"><dt>Авторство и участие</dt><dd>${escape(p.role)}</dd></div></dl><div class="dialog-section"><h3>Что входит в разработку</h3><ul>${p.includes.map(s=>`<li>${escape(s)}</li>`).join("")}</ul></div>${resources}${p.note?`<p class="resource-note">${escape(p.note)}</p>`:""}<div class="dialog-bottom"><button type="button" data-modal-save="${p.id}" aria-pressed="${saved.has(id)}">${saved.has(id)?"★ В избранном":"☆ В избранное"}</button><button type="button" data-copy="${p.id}">Скопировать ссылку ↗</button></div>`;
    if (gallery) $("detail-content").querySelector('.dialog-bottom').insertAdjacentHTML('beforebegin',gallery);
    if (p.format==='site' && p.preview) $("detail-content").querySelector('.dialog-meta').insertAdjacentHTML('beforebegin',`<img class="detail-site-preview" src="${escape(p.preview)}" alt="Снимок экрана: ${escape(p.title)}">`);
    if (!dialog.open) { dialog.showModal(); document.body.style.overflow = "hidden"; }
    dialog.scrollTop = 0;
    $("dialog-close").focus({preventScroll:true});
    if (updateHash && location.hash !== `#work/${id}`) history.pushState(null,"",`#work/${id}`);
  }
  function closeProject(updateHash = true) {
    if (!dialog.open) return;
    dialog.close();
    document.body.style.overflow = "";
    if (updateHash && location.hash.startsWith("#work/")) history.replaceState(null,"","#catalog");
    if (lastFocus?.isConnected) lastFocus.focus({preventScroll:true});
  }
  function reset() {
    Object.assign(state,{category:"all",query:"",format:"all",savedOnly:false,collection:null});
    $("search").value = ""; $("format").value = "all"; render();
  }
  function showViewer(id,index) {
    const p=byId.get(id); if(!p?.gallery.length)return;
    viewingProject=p; viewingIndex=(index+p.gallery.length)%p.gallery.length;
    const g=p.gallery[viewingIndex];
    $("viewer-title").textContent=g.title;
    $("viewer-image").src=g.src;$("viewer-image").alt=g.title;
    $("viewer-counter").textContent=(viewingIndex+1)+' / '+p.gallery.length;
    $("viewer-download").href=g.original || g.src;$("viewer-download").download=g.originalName || g.title+'.webp';
    $("viewer-download").textContent=g.originalLabel || "Скачать веб-копию";
    $("viewer-original").href=g.src;$("viewer-original").download=g.title+'.webp';
    $("viewer-original").textContent="Скачать веб-копию · WebP";
    if(!viewer.open)viewer.showModal();
  }
  document.addEventListener("click", async event => {
    const more = event.target.closest("[data-more]");
    if (more) {
      const group = more.dataset.more;
      shownByGroup.set(group,(shownByGroup.get(group)||cardLimit)+cardLimit);
      render();
      const next = document.querySelector(`[data-more="${group}"]`);
      if(next) next.focus({preventScroll:true});
      else document.querySelector(`[data-group="${group}"] summary`)?.focus({preventScroll:true});
      return;
    }
    const sidebarSaved=event.target.closest("[data-saved-toggle]");
    if(sidebarSaved){$("saved-button").click();return;}
    const image=event.target.closest('[data-gallery-project]');
    if(image){showViewer(image.dataset.galleryProject,Number(image.dataset.galleryIndex));return;}
    const project = event.target.closest("[data-project]");
    if (project) { openProject(project.dataset.project); return; }
    const save = event.target.closest("[data-save], [data-modal-save]");
    if (save) { toggleSaved(save.dataset.save || save.dataset.modalSave); return; }
    const filter = event.target.closest("[data-category]");
    if (filter) { state.category=filter.dataset.category; state.collection=null; render(); document.querySelector(`[data-category="${state.category}"]`)?.focus({preventScroll:true}); return; }
    const collection = event.target.closest("[data-collection]");
    if (collection) { reset(); state.collection=collection.dataset.collection; render(); $("catalog").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}); return; }
    const copy = event.target.closest("[data-copy]");
    if (copy) {
      const url = new URL(location.href); url.hash = `work/${copy.dataset.copy}`;
      url.searchParams.delete("_vercel_share"); url.searchParams.delete("x-vercel-protection-bypass"); url.searchParams.delete("x-vercel-set-bypass-cookie");
      try { await navigator.clipboard.writeText(url.href); toast("Ссылка на разработку скопирована"); }
      catch { toast("Ссылку можно скопировать из адресной строки"); }
    }
  });
  $("project-grid").addEventListener("toggle",event => {
    const details = event.target;
    if (!details.matches?.("details[data-group]") || !details.isConnected) return;
    if (details.open) openedGroups.add(details.dataset.group);
    else openedGroups.delete(details.dataset.group);
  },true);
  $("search").addEventListener("input",event=>{state.query=event.target.value;render();});
  $("format").addEventListener("change",event=>{state.format=event.target.value;render();});
  $("saved-button").addEventListener("click",()=>{state.savedOnly=!state.savedOnly;state.collection=null;render();$("catalog").scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});});
  $("reset").addEventListener("click",reset);
  $("empty-reset").addEventListener("click",reset);
  $("dialog-close").addEventListener("click",()=>closeProject());
  dialog.addEventListener("cancel",event=>{event.preventDefault();closeProject();});
  dialog.addEventListener("click",event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)closeProject();}});
  $("viewer-close").addEventListener('click',()=>viewer.close());
  $("viewer-prev").addEventListener('click',()=>showViewer(viewingProject.id,viewingIndex-1));
  $("viewer-next").addEventListener('click',()=>showViewer(viewingProject.id,viewingIndex+1));
  viewer.addEventListener('cancel',e=>{e.preventDefault();e.stopPropagation();viewer.close();});
  document.addEventListener('keydown',e=>{if(!viewer.open)return;if(e.key==='ArrowLeft'){e.preventDefault();showViewer(viewingProject.id,viewingIndex-1);}if(e.key==='ArrowRight'){e.preventDefault();showViewer(viewingProject.id,viewingIndex+1);}});
  window.addEventListener("hashchange",()=>{if(location.hash.startsWith("#work/"))openProject(decodeURIComponent(location.hash.slice(6)),false);else closeProject(false);});
  render();
  if (location.hash.startsWith("#work/")) openProject(decodeURIComponent(location.hash.slice(6)),false);
})();
