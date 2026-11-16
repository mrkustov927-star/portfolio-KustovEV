import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const projects=JSON.parse(fs.readFileSync('data/projects.json','utf8'));
const categories=JSON.parse(fs.readFileSync('data/categories.json','utf8'));
const e=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cover=(p,i)=>`<span class="cover ${p.preview?'cover-image'+(p.format==='site'?' preview-site':''):p.previewFrame?'cover-frame':'cover-'+e(p.cover)}">${p.preview?`<span class="cover-stage"><img src="${e(p.preview)}" alt="Превью разработки: ${e(p.title)}" loading="lazy"></span><span class="preview-label">${p.format==='site'?'САЙТ':'МАТЕРИАЛЫ'}</span>`:p.previewFrame?`<iframe src="${e(p.previewFrame)}" loading="lazy" tabindex="-1" title="Живое превью: ${e(p.title)}" sandbox="${p.previewScripts===false?'':'allow-scripts'}"></iframe><span class="preview-label">${e(p.previewLabel||'ЖИВОЙ ПРОСМОТР')}</span>`:`<span class="cover-overline">${e(p.overline)}</span><span class="cover-main">${p.coverTitle}</span><span class="cover-icon" aria-hidden="true">${e(p.icon)}</span>`}<span class="cover-index">${String(i+1).padStart(2,'0')}</span></span>`;
const card=(p,i)=>`<article class="project-card"><button class="card-open" type="button" data-project="${p.id}" aria-label="Подробнее: ${e(p.title)}">${cover(p,i)}<span class="card-body"><span class="card-category">${e(categories.find(x=>x.id===p.category)?.label||p.category)}</span><h3>${e(p.title)}</h3><p>${e(p.summary)}</p><span class="card-tags">${p.tags.map(t=>`<span>${e(t)}</span>`).join('')}</span></span></button><div class="card-footer"><span class="status-dot ${p.ready?'':'pending'}"></span><span>${e(p.status)}</span><button class="card-arrow" type="button" data-project="${p.id}" aria-label="Открыть карточку ${e(p.title)}">↗</button><button class="bookmark" type="button" data-save="${p.id}" aria-pressed="false" aria-label="В избранное: ${e(p.title)}">☆</button></div></article>`;
const categoryNotes={
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
const categoryIcons={creative:"✳",events:"▣",routes:"⌖",aid:"✚",team:"◎",volunteer:"♡",media:"▤",planning:"◫",informatics:"⌘"};
let firstOpen=true;
const sections=categories.filter(c=>c.id!=="all").map(c=>{
  const items=projects.filter(p=>p.category===c.id);
  if(!items.length)return "";
  const open=firstOpen?" open":"";firstOpen=false;
  return `<section class="catalog-section" id="group-${e(c.id)}"><details class="catalog-group" data-group="${e(c.id)}"${open}>
    <summary class="group-summary"><span class="group-icon" aria-hidden="true">${categoryIcons[c.id]||"◇"}</span>
    <span class="group-heading"><strong>${e(c.label)}</strong><small>${e(categoryNotes[c.id]||"Проекты и материалы")}</small></span>
    <span class="group-meta"><span class="group-count">${items.length} работ</span><span class="group-chevron" aria-hidden="true">⌄</span></span></summary>
    <div class="group-body"><div class="project-grid">${items.map(p=>card(p,projects.indexOf(p))).join("")}</div></div>
  </details></section>`;
}).filter(Boolean).join("\n");
let html=fs.readFileSync('src/template.html','utf8').replace('<div class="catalog-groups" id="project-grid"></div>',`<div class="catalog-groups" id="project-grid">${sections}</div>`);
html=html.replace('<p id="results-count" role="status" aria-live="polite"></p>',`<p id="results-count" role="status" aria-live="polite">${projects.length} работ</p>`);
const statsContext={window:{}};vm.createContext(statsContext);
vm.runInContext(fs.readFileSync('public/materials.js','utf8'),statsContext);
const pageCount=Object.values(statsContext.window.PORTFOLIO_MATERIALS.galleries).reduce((n,a)=>n+a.length,0);
html=html.replace(/(<b id="total-stat">)[^<]*(<\/b>)/,(_,a,b)=>a+projects.length+b)
.replace(/(<b id="materials-stat">)[^<]*(<\/b>)/,(_,a,b)=>a+pageCount+b)
.replace(/(<b id="sites-stat">)[^<]*(<\/b>)/,(_,a,b)=>a+projects.filter(p=>p.format==='site').length+b);
fs.writeFileSync('public/index.html',html);
fs.writeFileSync('public/projects.js','window.PORTFOLIO_CATEGORIES = '+JSON.stringify(categories)+';\nwindow.PORTFOLIO_PROJECTS = '+JSON.stringify(projects)+';\n');
fs.writeFileSync('public/styles.css',fs.readFileSync('src/base.css','utf8')+'\n'+fs.readFileSync('src/enhancements.css','utf8'));
console.log(`Built ${projects.length} projects`);
