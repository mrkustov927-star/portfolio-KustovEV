import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const projects=JSON.parse(fs.readFileSync('data/projects.json','utf8'));
const categories=JSON.parse(fs.readFileSync('data/categories.json','utf8'));
const problems=[];
const ids=new Set();
const exists=p=>fs.existsSync(path.join('public',p));
const checkPath=p=>{if(p&&!p.startsWith('https://')&&!p.startsWith('#')&&!exists(p))problems.push('Missing file: '+p);};
for(const p of projects){if(ids.has(p.id))problems.push('Duplicate project: '+p.id);ids.add(p.id);if(!categories.some(c=>c.id===p.category))problems.push('Unknown category: '+p.category);if(p.ready&&!p.resources.length&&!p.galleryGroup)problems.push('Ready without material: '+p.id);checkPath(p.preview);checkPath(p.previewFrame);for(const r of p.resources){checkPath(r.url);if(/sig=|completion_token|download_url/.test(r.url))problems.push('Temporary URL: '+p.id);}}
const context={window:{}};vm.createContext(context);
if(exists('materials.js'))vm.runInContext(fs.readFileSync('public/materials.js','utf8'),context);else problems.push('Material index not imported');
const galleries=context.window.PORTFOLIO_MATERIALS?.galleries||{};
for(const [key,items]of Object.entries(galleries))for(const item of items)checkPath(item.src);
for(const p of projects)if(p.galleryGroup&&!galleries[p.galleryGroup]?.length)problems.push('Empty gallery: '+p.galleryGroup);
const html=fs.readFileSync('public/index.html','utf8');
if((html.match(/<article class="project-card">/g)||[]).length!==projects.length)problems.push('Static card count differs');
if(/kustov-pervye-portfolio\.mrkustov\.chatgpt\.site/.test(html))problems.push('Outdated portfolio origin');
if(problems.length){console.error(problems.join('\n'));process.exit(1)}
console.log(JSON.stringify({projects:projects.length,galleries:Object.keys(galleries).length,pages:Object.values(galleries).reduce((n,a)=>n+a.length,0),status:'ok'}));
