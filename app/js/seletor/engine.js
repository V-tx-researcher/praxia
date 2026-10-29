(function(root){'use strict';
const STOP=new Set('a o as os um uma uns umas de da do das dos em no na nos nas e é ser sou eu para por que qual quais como pode posso meu minha minhas meus seu sua seus suas ao aos à às um uma sobre existe ter tem há me se com sem isso essa esse isto esta este profissional assistente social trabalho'.split(' '));
function clean(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()}
function tok(s){return [...new Set(clean(s).split(' ').filter(t=>t.length>2&&!STOP.has(t)))]}
const score=(input,base)=>{const a=tok(input),b=tok(base);if(!a.length||!b.length)return 0;let common=0;for(const x of a)if(b.includes(x))common++;const rec=common/a.length,prec=common/b.length;const phrase=clean(base)===clean(input)?0.7:0;return (2*rec*prec/(rec+prec||1))+.12*rec+phrase};
function suggest(query,intents,variants=[],opt={}){
const q=clean(query);if(q.length<8||tok(q).length<2)return [];
const byId=new Map();for(const a of intents){byId.set(a.id,{...a,score:score(query,a.q),matchedBy:'canonical'})}
if(opt.useUnreviewedVariants===true){for(const v of variants){const row=byId.get(v.id);if(!row)continue;const sc=score(query,v.q)*.96;if(sc>row.score){row.score=sc;row.matchedBy='variant_unreviewed'}}}
const ordered=[...byId.values()].sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
const min=Number.isFinite(opt.threshold)?opt.threshold:.25;
return ordered.filter(a=>a.score>=min).slice(0,Math.max(1,Math.min(3,opt.limit||3)));
}
const api={clean,tok,score,suggest};root.PraxiaSelector=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
