const assert=require('node:assert/strict'); const fs=require('node:fs'),vm=require('node:vm');const engine=require('../../app/js/seletor/engine.js');
const raw=fs.readFileSync(require('node:path').join(__dirname,'../../app/js/seletor/data.js'),'utf8');const ctx={window:{}};vm.runInNewContext(raw,ctx);const items=ctx.window.PRAXIA_INTENTS,variants=ctx.window.PRAXIA_VARIANTS;
assert.equal(items.length,250);assert.equal(new Set(items.map(x=>x.id)).size,250);
assert.equal(engine.suggest('oi',items,variants).length,0);
for(const item of items){const r=engine.suggest(item.q,items,variants,{threshold:.25});assert.ok(r.length);assert.equal(r[0].id,item.id);assert.equal(new Set(r.map(x=>x.id)).size,r.length)}
const sample=items[0];let duplicated=[{...sample,q:'Outra formulação 1'},{...sample,q:'Outra formulação 2'},...items.slice(1)];assert.equal(new Set(engine.suggest(sample.q,duplicated).map(x=>x.id)).size,engine.suggest(sample.q,duplicated).length);
console.log('OK: 250 intenções, busca exata 250/250, sugestão única por intenção, entrada vazia bloqueada.');
