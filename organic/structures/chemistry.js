export const ELEMENTS=['C','H','O','N','S','Cl','Br','Na','K','Ba','Ag'];
export const METALS={Na:1,K:1,Ba:2,Ag:1};
export const PRESETS={
 OH:{label:'OH',atoms:[['O',1,0]],bonds:[],root:0},
 CO:{label:'C=O',atoms:[['C',0,0],['O',0,0]],bonds:[[0,1,2]],root:0},
 COOH:{label:'COOH',atoms:[['C',0,0],['O',0,0],['O',1,0]],bonds:[[0,1,2],[0,2,1]],root:0},
 NH2:{label:'NH₂',atoms:[['N',2,0]],bonds:[],root:0},
 benzene:{label:'Бензольное кольцо',atoms:Array.from({length:6},()=>['C',0,0]),bonds:Array.from({length:6},(_,i)=>[i,(i+1)%6,1.5]),root:0},
 NO2:{label:'NO₂',atoms:[['N',0,1],['O',0,0],['O',0,-1]],bonds:[[0,1,2],[0,2,1]],root:0,collapsed:true,charge:0},
 NO3:{label:'NO₃⁻',atoms:[['N',0,1],['O',0,0],['O',0,-1],['O',0,-1]],bonds:[[0,1,2],[0,2,1],[0,3,1]],root:0,collapsed:true,charge:-1},
 SO4:{label:'SO₄²⁻',atoms:[['S',0,0],['O',0,0],['O',0,0],['O',0,-1],['O',0,-1]],bonds:[[0,1,2],[0,2,2],[0,3,1],[0,4,1]],root:0,collapsed:true,charge:-2},
 HSO4:{label:'HSO₄⁻',atoms:[['S',0,0],['O',0,0],['O',0,0],['O',1,0],['O',0,-1]],bonds:[[0,1,2],[0,2,2],[0,3,1],[0,4,1]],root:0,collapsed:true,charge:-1}
};
export const clone=x=>JSON.parse(JSON.stringify(x));
export function blank(ratio){return {nodes:[],bonds:[],groups:[],budget:{...ratio},factor:1,nextId:1};}
export function composition(s){const c={};for(const a of s.nodes){c[a.e]=(c[a.e]||0)+1;if(a.h)c.H=(c.H||0)+a.h;}return c;}
export function remaining(s,e){return (s.budget[e]||0)-(composition(s)[e]||0);}
export function assertBudget(s){for(const [e,n] of Object.entries(composition(s)))if(n>(s.budget[e]||0))throw Error(e==='H'?'Не хватает водородов':`Не хватает атомов ${e}`);}
export function resetMultiplier(s,ratio){s.factor=1;s.budget={...ratio};}
export function atom(s,id){return s.nodes.find(a=>a.id===id);}
export function edges(s,id,ionic=false){return s.bonds.filter(b=>(ionic||!b.ionic)&&(b.a===id||b.b===id));}
export function neighbor(b,id){return b.a===id?b.b:b.a;}
export function valence(s,id){return edges(s,id).reduce((n,b)=>n+b.order,0)+(atom(s,id)?.h||0);}
export function maxValence(a){if(a.e in METALS)return 0;if(a.e==='C')return a.q===-1?3:4;if(a.e==='N')return a.q>0?4:3;if(a.e==='O')return a.q<0?1:a.q>0?3:2;if(a.e==='S')return 6;if(a.e==='Cl'||a.e==='Br')return a.q<0?0:1;return 1;}
export function freeValence(s,id){const a=atom(s,id);return Math.max(0,maxValence(a)-valence(s,id));}
export function addAtom(s,e,x,y){const id=s.nextId++;s.nodes.push({id,e,h:0,q:METALS[e]||0,x,y,aromatic:false});assertBudget(s);return id;}
export function addGroup(s,key,x,y){const p=PRESETS[key];if(!p)throw Error('Неизвестная группа');const ids=p.atoms.map(([e,h,q],i)=>{const id=addAtom(s,e,x+i*40,y);Object.assign(atom(s,id),{h,q});return id;});for(const [a,b,order] of p.bonds)s.bonds.push({a:ids[a],b:ids[b],order});if(p.collapsed)s.groups.push({id:`g${ids[0]}`,key,label:p.label,root:ids[p.root],atomIds:ids,charge:p.charge});assertBudget(s);aromatize(s);return ids[p.root];}
function samePair(b,a,c){return b.a===a&&b.b===c||b.a===c&&b.b===a;}
export function addBond(s,a,b,order=1,ionic=false){
 if(a===b)return;const A=atom(s,a),B=atom(s,b);if(!A||!B)throw Error('Выберите два атома');
 if(A.e==='H'||B.e==='H'){
  if(order!==1||ionic)throw Error('Водород присоединяется одинарной связью');
  if(A.e==='H'&&B.e==='H')throw Error('Присоедините водород к атому формулы');
  const hydrogen=A.e==='H'?A:B,heavy=A.e==='H'?B:A;
  addHydrogen(s,heavy.id,1,hydrogen.id);return;
 }
 const old=s.bonds.find(e=>samePair(e,a,b));
 if(ionic||A.e in METALS||B.e in METALS){
  if(old&&!old.ionic)throw Error('Сначала удалите ковалентную связь');
  let positive,negative;
  if(A.e in METALS){positive=A;negative=B;}else if(B.e in METALS){positive=B;negative=A;}
  else if(A.e==='N'&&A.q>=0&&!s.groups.some(g=>g.atomIds.includes(a))){positive=A;negative=B;}
  else if(B.e==='N'&&B.q>=0&&!s.groups.some(g=>g.atomIds.includes(b))){positive=B;negative=A;}
  else if(A.q>0){positive=A;negative=B;}else if(B.q>0){positive=B;negative=A;}else throw Error('Для ионного соседства нужен катион: металл или азот аммония');
  const ng=s.groups.find(g=>g.atomIds.includes(negative.id));
  if(!ng&&!['O','C','Cl','Br'].includes(negative.e))throw Error('Выберите отрицательный центр аниона');
  if(ng&&ng.charge>=0)throw Error('Эта группа не является анионом');
  positive.q=METALS[positive.e]||1;
  if(!ng){if(negative.h)throw Error('Сначала уберите водород у отрицательного центра');negative.q=-1;if(valence(s,negative.id)>maxValence(negative))throw Error('Слишком много ковалентных связей у отрицательного центра');}
  const positiveLinks=s.bonds.filter(e=>e.ionic&&(e.a===positive.id||e.b===positive.id)&&e!==old);
  if(positiveLinks.length>=positive.q)throw Error('Все ионные места катиона уже заняты');
  if(!old)s.bonds.push({a,b,order:0,ionic:true});return;
 }
 if(old?.ionic)throw Error('Сначала удалите ионное соседство');
 if(old?.order===1.5){for(const ring of cycles(s)){const bs=ring.map((id,i)=>s.bonds.find(e=>!e.ionic&&samePair(e,id,ring[(i+1)%ring.length])));if(!bs.includes(old)||!bs.every(e=>e.order===1.5))continue;const offset=bs.indexOf(old);bs.forEach((e,i)=>e.order=(i-offset+ring.length)%2===0?(order===1?2:1):(order===1?1:2));}}
 const prior=old?.order||0;
 for(const n of [A,B]){
  const next=valence(s,n.id)-prior+order;
  if(n.e==='N'&&n.q===0&&next===4)n.q=1;
  if(next>maxValence(n)+0.01)throw Error(n.h?'У атома уже есть водороды. Уберите лишние H перед добавлением связи':`Превышена валентность ${n.e}`);
 }
 if(old)old.order=order;else s.bonds.push({a,b,order});aromatize(s);
}
export function addHydrogen(s,id,delta=1,hydrogenId){const a=atom(s,id);if(!a)throw Error('Сначала выберите атом');if(a.e==='H')throw Error('Выберите атом, к которому нужно добавить водород');if(delta<0){if(!a.h)throw Error('У этого атома нет водородов');a.h--;return;}if(a.e in METALS||a.q<0)throw Error('К этому иону водороды не добавляются');if(freeValence(s,id)<1)throw Error('Нет свободной валентности');const free=s.nodes.find(n=>n.e==='H'&&(hydrogenId===undefined||n.id===hydrogenId));if(!free&&remaining(s,'H')<1)throw Error('Не хватает водородов');if(free)removeAtom(s,free.id);a.h++;assertBudget(s);}
export function fillHydrogens(s){const needs=s.nodes.filter(a=>a.e!=='H').map(a=>[a,a.e in METALS||a.q<0?0:Math.round(freeValence(s,a.id))]);const total=needs.reduce((sum,[,n])=>sum+n,0),free=s.nodes.filter(a=>a.e==='H');if(total>remaining(s,'H')+free.length)throw Error('Не хватает водородов');for(const h of free.slice(0,total))removeAtom(s,h.id);for(const [a,n] of needs)a.h+=n;assertBudget(s);return total;}
export function setCharge(s,id,q){const a=atom(s,id);if(!a)throw Error('Сначала выберите атом');if(a.e in METALS)throw Error('Заряд металла уже задан');if(s.groups.some(g=>g.atomIds.includes(id)))throw Error('Заряд готовой группы уже задан');a.q=q;if(valence(s,id)>maxValence(a))throw Error('Такой заряд не соответствует связям атома');}
export function removeAtom(s,id){const g=s.groups.find(g=>g.atomIds.includes(id));const ids=g?g.atomIds:[id];for(const ring of cycles(s)){if(!ring.some(id=>ids.includes(id)))continue;const bs=ring.map((id,i)=>s.bonds.find(e=>!e.ionic&&samePair(e,id,ring[(i+1)%ring.length])));if(bs.every(e=>e.order===1.5))bs.forEach((e,i)=>e.order=i%2?1:2);}s.nodes=s.nodes.filter(a=>!ids.includes(a.id));s.bonds=s.bonds.filter(b=>!ids.includes(b.a)&&!ids.includes(b.b));s.groups=s.groups.filter(g=>!g.atomIds.some(a=>ids.includes(a)));aromatize(s);}
export function removeBond(s,a,b){for(const ring of cycles(s)){const bs=ring.map((id,i)=>s.bonds.find(e=>!e.ionic&&samePair(e,id,ring[(i+1)%ring.length])));if(bs.some(e=>samePair(e,a,b))&&bs.every(e=>e.order===1.5))bs.forEach((e,i)=>e.order=i%2?1:2);}s.bonds=s.bonds.filter(e=>!samePair(e,a,b));aromatize(s);}
export function cycles(s){const result=[],keys=new Set();const ids=s.nodes.map(a=>a.id);for(const root of ids){function walk(path){const last=path.at(-1);for(const b of edges(s,last)){const n=neighbor(b,last);if(n===root&&path.length>=3){const key=[...path].sort((a,b)=>a-b).join(',');if(!keys.has(key)){keys.add(key);result.push([...path]);}}else if(n>root&&!path.includes(n)&&path.length<8)walk([...path,n]);}}walk([root]);}return result;}
export function aromatize(s){for(const a of s.nodes)a.aromatic=false;for(const ring of cycles(s)){if(ring.length!==6||!ring.every(id=>atom(s,id).e==='C'))continue;const bs=ring.map((id,i)=>s.bonds.find(b=>!b.ionic&&samePair(b,id,ring[(i+1)%6])));const aromatic=bs.every(b=>b.order===1.5)||bs.every((b,i)=>b.order===(i%2?1:2))||bs.every((b,i)=>b.order===(i%2?2:1));if(aromatic){for(const b of bs)b.order=1.5;for(const id of ring)atom(s,id).aromatic=true;}}}
export function validate(s){assertBudget(s);if(!s.nodes.length)throw Error('Добавьте атомы на поле');for(const a of s.nodes){const v=valence(s,a.id),m=maxValence(a);if(Math.abs(v-m)>0.01)throw Error(v>m?`Превышена валентность ${a.e}`:`У ${a.e} остались свободные валентности. Добавьте связи или водороды`);}const charge=s.nodes.reduce((n,a)=>n+a.q,0);if(charge!==0)throw Error('Суммарный заряд формулы должен быть равен нулю');const used=composition(s);if(Object.entries(s.budget).some(([e,n])=>(used[e]||0)!==n))throw Error('Использованы не все атомы из счётчика');return true;}
export function fromExpected(m){return {nodes:m.atoms.map(a=>({id:a.id,e:a.element,h:a.hydrogens,q:a.formal_charge,x:450+a.x_2d*62,y:300-a.y_2d*62,aromatic:a.aromatic})),bonds:m.bonds.map(b=>({a:b.a,b:b.b,order:b.order})),groups:[],budget:{...m.composition},factor:m.minimal_to_final_multiplier,nextId:m.atoms.length+1};}
function normalized(input){const s=clone(input);aromatize(s);s.bonds=s.bonds.filter(b=>!b.ionic);for(const a of s.nodes){
 const terminalO=edges(s,a.id).map(b=>({b,o:atom(s,neighbor(b,a.id))})).filter(x=>x.o.e==='O'&&edges(s,x.o.id).length===1&&x.o.h===0);
 const resonance=(a.e==='C'&&terminalO.length===2&&terminalO.some(x=>x.o.q<0))||(a.e==='N'&&a.q>0&&terminalO.length>=2)||(a.e==='S'&&terminalO.length>=3&&terminalO.some(x=>x.o.q<0));
 if(resonance){const q=terminalO.reduce((n,x)=>n+x.o.q,0)/terminalO.length;const order=terminalO.reduce((n,x)=>n+x.b.order,0)/terminalO.length;for(const x of terminalO){x.o.q=q;x.b.order=order;}}
 }return s;}
export function isomorphic(left,right){const A=normalized(left),B=normalized(right);if(A.nodes.length!==B.nodes.length||A.bonds.length!==B.bonds.length)return false;
 const label=(s,a)=>[a.e,a.h,a.q.toFixed(4),edges(s,a.id).length,edges(s,a.id).map(b=>b.order.toFixed(4)).sort().join(',')].join('|');
 const la=new Map(A.nodes.map(a=>[a.id,label(A,a)])),lb=new Map(B.nodes.map(a=>[a.id,label(B,a)]));const candidates=new Map(A.nodes.map(a=>[a.id,B.nodes.filter(b=>lb.get(b.id)===la.get(a.id)).map(b=>b.id)]));if([...candidates.values()].some(c=>!c.length))return false;
 const order=[...A.nodes].sort((a,b)=>candidates.get(a.id).length-candidates.get(b.id).length||edges(A,b.id).length-edges(A,a.id).length);const assigned=new Map(),used=new Set();const edge=(s,a,b)=>s.bonds.find(e=>samePair(e,a,b))?.order||0;
 function search(i){if(i===order.length)return true;const a=order[i];for(const b of candidates.get(a.id)){if(used.has(b))continue;let ok=true;for(const [aa,bb] of assigned)if(Math.abs(edge(A,a.id,aa)-edge(B,b,bb))>0.0001){ok=false;break;}if(!ok)continue;assigned.set(a.id,b);used.add(b);if(search(i+1))return true;assigned.delete(a.id);used.delete(b);}return false;}return search(0);
}
export function bondLength(s,b){if(b.ionic)return 82;const es=[atom(s,b.a).e,atom(s,b.b).e].sort().join('-');const lengths={'C-C':[1.536,1.339,1.203],'C-O':[1.427,1.23],'C-N':[1.471,1.29],'C-Cl':[1.785],'Br-C':[1.934],'N-O':[1.4,1.224],'O-S':[1.57,1.43]};return b.order===1.5?78:84*(lengths[es]?.[b.order-1]||lengths[es]?.[0]||1.5)/1.536;}
export function directions(a,s){if(a.e in METALS)return METALS[a.e];if(a.aromatic)return 3;const excess=edges(s,a.id).reduce((n,b)=>n+Math.max(0,b.order-1),0);if(a.e==='C')return Math.max(2,4-excess);if(a.e==='N')return Math.max(1,(a.q>0?4:3)-excess);if(a.e==='O')return 2;if(a.e==='S')return Math.max(1,6-excess);return Math.max(1,edges(s,a.id,true).length);}
export function ports(s,id){const a=atom(s,id);if(a.e in METALS)return Math.max(0,METALS[a.e]-edges(s,id,true).filter(b=>b.ionic).length);return Math.max(0,Math.floor(freeValence(s,id)));}
// School drawing convention requested by the teacher: ethers 180°, carboxylic esters 120°.
export function oxygenAngle(s,id){const o=atom(s,id);if(o?.e!=='O'||o.q!==0)return null;const bonds=edges(s,id);if(bonds.some(b=>b.order!==1))return null;const cs=bonds.map(b=>atom(s,neighbor(b,id))).filter(a=>a.e==='C');if(!cs.length)return null;return cs.some(c=>edges(s,c.id).some(b=>b.order===2&&atom(s,neighbor(b,c.id)).e==='O'))?120:180;}
function movingSide(s,pivot,moving){const ids=new Set([moving]),todo=[moving];while(todo.length){const id=todo.pop();for(const b of edges(s,id,true)){if(samePair(b,pivot,moving))continue;const n=neighbor(b,id);if(!ids.has(n)){ids.add(n);todo.push(n);}}}return ids;}
export function rotationEnds(s,a,b){const bond=s.bonds.find(e=>samePair(e,a,b));if(!bond||bond.ionic)throw Error('Выберите ковалентную связь');let side=movingSide(s,a,b);if(side.has(a))throw Error('Отдельную связь внутри цикла повернуть нельзя');const other=movingSide(s,b,a),anchor=s.nodes.find(n=>side.has(n.id)||other.has(n.id)).id;if(side.has(anchor))return {pivot:b,moving:a};return {pivot:a,moving:b};}
function transformBranch(s,op){const A=atom(s,op.pivot),B=atom(s,op.moving);if(!A||!B||!s.bonds.some(b=>samePair(b,A.id,B.id)))return false;const side=movingSide(s,A.id,B.id);if(side.has(A.id))return false;const current=Math.atan2(B.y-A.y,B.x-A.x);let angle;
 if(op.mirror){angle=current;}else{const stationary=edges(s,A.id,true).map(b=>atom(s,neighbor(b,A.id))).filter(n=>!side.has(n.id));const origin=stationary.length?Math.atan2(stationary[0].y-A.y,stationary[0].x-A.x):0,oa=oxygenAngle(s,A.id);let candidates=oa&&stationary.length?[origin-oa*Math.PI/180,origin+oa*Math.PI/180]:Array.from({length:Math.max(2,directions(A,s))},(_,i)=>origin+i*2*Math.PI/Math.max(2,directions(A,s)));
  const distance=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));candidates=candidates.filter(a=>stationary.every(n=>distance(a,Math.atan2(n.y-A.y,n.x-A.x))>.05)).map(a=>(a+2*Math.PI)%(2*Math.PI)).filter((a,i,all)=>all.findIndex(b=>distance(a,b)<.001)===i).sort((a,b)=>a-b);if(candidates.length<2)return false;const index=candidates.reduce((best,a,i)=>distance(a,current)<distance(candidates[best],current)?i:best,0),target=candidates[(index+(op.step%candidates.length)+candidates.length)%candidates.length];angle=target-current;}
 for(const n of s.nodes)if(side.has(n.id)){const dx=n.x-A.x,dy=n.y-A.y;if(op.mirror){const u=dx*Math.cos(angle)+dy*Math.sin(angle),v=-dx*Math.sin(angle)+dy*Math.cos(angle);n.x=A.x+u*Math.cos(angle)+v*Math.sin(angle);n.y=A.y+u*Math.sin(angle)-v*Math.cos(angle);}else{n.x=A.x+dx*Math.cos(angle)-dy*Math.sin(angle);n.y=A.y+dx*Math.sin(angle)+dy*Math.cos(angle);}}return true;
}
export function turnFragment(s,a,b,step=1,mirror=false){const op={...rotationEnds(s,a,b),step,mirror},frames=rotationFrames(s);for(const f of frames)rotateNodes(s,f.ids,-f.angle,f.root);try{if(!transformBranch(s,op))throw Error('У этого центра нет другого свободного направления. Можно отразить фрагмент');s.geometry||=[];s.geometry.push(op);}finally{for(const f of frames)rotateNodes(s,f.ids,f.angle,f.root);}}
export function connectedIds(s,id){const ids=new Set([id]),todo=[id];while(todo.length){const current=todo.pop();for(const b of edges(s,current,true)){const next=neighbor(b,current);if(!ids.has(next)){ids.add(next);todo.push(next);}}}return ids;}
// Each component keeps its orientation on all atoms so deleting its first atom
// or splitting a bond does not discard the chosen drawing orientation.
function rotationFrames(s){const seen=new Set(),frames=[];for(const root of s.nodes){if(seen.has(root.id))continue;const ids=connectedIds(s,root.id);for(const id of ids)seen.add(id);frames.push({root,ids,angle:root.orientation||0});}return frames;}
function rotateNodes(s,ids,angle,center){const cos=Math.cos(angle),sin=Math.sin(angle),cx=center.x,cy=center.y;for(const n of s.nodes)if(ids.has(n.id)){const dx=n.x-cx,dy=n.y-cy;n.x=cx+dx*cos-dy*sin;n.y=cy+dx*sin+dy*cos;}}
export function rotateMolecule(s,id,angle,center){if(!Number.isFinite(angle))throw Error('Задайте угол поворота');const ids=connectedIds(s,id),nodes=s.nodes.filter(n=>ids.has(n.id)),root=nodes[0];if(!root)throw Error('Сначала добавьте молекулу');center||={x:nodes.reduce((v,n)=>v+n.x,0)/nodes.length,y:nodes.reduce((v,n)=>v+n.y,0)/nodes.length};rotateNodes(s,ids,angle,center);const orientation=Math.atan2(Math.sin((root.orientation||0)+angle),Math.cos((root.orientation||0)+angle));for(const n of nodes)n.orientation=orientation;}
export function alignMolecule(s,a,b){const A=atom(s,a),B=atom(s,b);if(!A||!B||!s.bonds.some(e=>samePair(e,a,b)&&!e.ionic))throw Error('Выберите ковалентную связь');let angle=-Math.atan2(B.y-A.y,B.x-A.x);if(angle>Math.PI/2)angle-=Math.PI;if(angle<-Math.PI/2)angle+=Math.PI;rotateMolecule(s,a,angle);}
function applyGeometry(s){for(const op of s.geometry||[])transformBranch(s,op);}
export function autoAssociate(s){
 const membership=new Map(),components=[];for(const a of s.nodes){if(membership.has(a.id))continue;const ids=new Set([a.id]),todo=[a.id];while(todo.length){const id=todo.pop();for(const b of edges(s,id)){const n=neighbor(b,id);if(!ids.has(n)){ids.add(n);todo.push(n);}}}const index=components.length,charge=[...ids].reduce((n,id)=>n+atom(s,id).q,0);components.push({ids,remaining:Math.abs(charge),charge});for(const id of ids)membership.set(id,index);}
 const ps=s.nodes.filter(a=>a.q>0&&components[membership.get(a.id)].charge>0&&(a.e in METALS||a.e==='N'&&edges(s,a.id).filter(b=>atom(s,neighbor(b,a.id)).e==='O').length<2));
 const ns=s.nodes.filter(a=>a.q<0&&components[membership.get(a.id)].charge<0);const nCapacity=new Map(ns.map(n=>[n.id,Math.abs(n.q)])),pCapacity=new Map(ps.map(n=>[n.id,n.q]));
 function take(p,n){const P=components[membership.get(p.id)],N=components[membership.get(n.id)];if(!P.remaining||!N.remaining||!pCapacity.get(p.id)||!nCapacity.get(n.id))return false;const amount=Math.min(P.remaining,N.remaining,pCapacity.get(p.id),nCapacity.get(n.id));P.remaining-=amount;N.remaining-=amount;pCapacity.set(p.id,pCapacity.get(p.id)-amount);nCapacity.set(n.id,nCapacity.get(n.id)-amount);return true;}
 for(const b of s.bonds.filter(b=>b.ionic)){const p=ps.find(a=>a.id===b.a||a.id===b.b);if(!p)continue;const end=neighbor(b,p.id),n=ns.find(a=>a.id===end)||ns.find(a=>membership.get(a.id)===membership.get(end)&&nCapacity.get(a.id)>0);if(n)take(p,n);}
 for(const p of ps){const choices=[...ns].sort((a,b)=>Math.hypot(p.x-a.x,p.y-a.y)-Math.hypot(p.x-b.x,p.y-b.y));for(const n of choices)if(!s.bonds.some(b=>samePair(b,p.id,n.id))&&take(p,n))s.bonds.push({a:n.id,b:p.id,order:0,ionic:true});}
}
export function layout(s,displayOnly=false){
 // Rebuild in the layout engine's original coordinate frame, then restore the
 // user's rotation. Branch transformations are also recorded in this frame.
 const frames=rotationFrames(s);for(const f of frames)rotateNodes(s,f.ids,-f.angle,f.root);
 layoutBase(s,displayOnly);
 for(const f of rotationFrames(s)){for(const n of s.nodes)if(f.ids.has(n.id))n.orientation=f.angle;rotateNodes(s,f.ids,f.angle,f.root);}
}
function layoutBase(s,displayOnly=false){
 if(!s.nodes.length)return;const anchor={x:s.nodes[0].x,y:s.nodes[0].y};aromatize(s);if(!displayOnly)autoAssociate(s);
 if(s.groups.length){const member=new Map(s.groups.flatMap(g=>g.atomIds.map(id=>[id,g.root])));const d=clone(s);d.groups=[];d.nodes=d.nodes.filter(a=>!member.has(a.id)||member.get(a.id)===a.id);d.bonds=d.bonds.map(b=>({...b,a:member.get(b.a)||b.a,b:member.get(b.b)||b.b})).filter(b=>b.a!==b.b);layoutBase(d,true);for(const n of s.nodes){const mapped=d.nodes.find(a=>a.id===(member.get(n.id)||n.id));if(mapped){n.x=mapped.x;n.y=mapped.y;}}return;}
 const ringList=cycles(s);const visited=new Set();const assignedRings=new Set();
 function grow(id,parent=null){const A=atom(s,id);visited.add(id);
  const ringIndex=ringList.findIndex((r,i)=>!assignedRings.has(i)&&r.includes(id));
  if(ringIndex>=0){const rr=ringList[ringIndex];assignedRings.add(ringIndex);const start=rr.indexOf(id),ring=[...rr.slice(start),...rr.slice(0,start)],n=ring.length;const length=80,radius=length/(2*Math.sin(Math.PI/n));const incoming=parent?Math.atan2(A.y-atom(s,parent).y,A.x-atom(s,parent).x):0;const cx=A.x+radius*Math.cos(incoming),cy=A.y+radius*Math.sin(incoming),theta=incoming+Math.PI;
   for(let i=0;i<n;i++){const a=atom(s,ring[i]);a.x=cx+radius*Math.cos(theta+i*2*Math.PI/n);a.y=cy+radius*Math.sin(theta+i*2*Math.PI/n);visited.add(a.id);}
   for(const rid of ring)branch(rid,parent,ring);return;
  }branch(id,parent,[]);
 }
 function branch(id,parent,ring){const A=atom(s,id);const all=edges(s,id,true);const children=all.filter(b=>neighbor(b,id)!==parent&&!visited.has(neighbor(b,id)));const fixed=all.filter(b=>visited.has(neighbor(b,id))).map(b=>atom(s,neighbor(b,id)));const count=directions(A,s);let origin=0;
  if(parent){const P=atom(s,parent);origin=Math.atan2(P.y-A.y,P.x-A.x);if(A.e==='N'&&edges(s,id).length===4&&s.bonds.some(b=>b.ionic&&samePair(b,id,parent)))origin+=Math.PI/4;}else if(fixed.length)origin=Math.atan2(fixed[0].y-A.y,fixed[0].x-A.x);
  const occupied=fixed.map(p=>Math.atan2(p.y-A.y,p.x-A.x));
  for(const b of children){if(visited.has(neighbor(b,id)))continue;const child=atom(s,neighbor(b,id));let angles=Array.from({length:Math.max(count,2)},(_,i)=>origin+i*2*Math.PI/Math.max(count,2));
   const oa=oxygenAngle(s,id);if(oa){if(fixed.length)angles=[origin-oa*Math.PI/180,origin+oa*Math.PI/180];else if(occupied.length)angles=[occupied[0]-oa*Math.PI/180,occupied[0]+oa*Math.PI/180];}
   if(b.ionic){const cov=edges(s,id).map(e=>atom(s,neighbor(e,id)));angles=cov.length?[Math.atan2(A.y-cov.reduce((v,n)=>v+n.y,0)/cov.length,A.x-cov.reduce((v,n)=>v+n.x,0)/cov.length)]:[0,Math.PI];if(A.e==='N'&&cov.length>=3){const first=Math.atan2(cov[0].y-A.y,cov[0].x-A.x);angles=Array.from({length:4},(_,i)=>first+Math.PI/4+i*Math.PI/2);}}
   if(ring.includes(id)){const rr=ring.map(i=>atom(s,i));const outward=Math.atan2(A.y-rr.reduce((n,a)=>n+a.y,0)/rr.length,A.x-rr.reduce((n,a)=>n+a.x,0)/rr.length);angles=children.length>1?[outward-Math.PI/4,outward+Math.PI/4]:[outward];}
   const score=ang=>occupied.reduce((sum,o)=>sum+1/(0.03+1-Math.cos(ang-o)),0)+s.nodes.filter(n=>visited.has(n.id)&&n.id!==id).reduce((sum,n)=>{const d=Math.hypot(A.x+bondLength(s,b)*Math.cos(ang)-n.x,A.y+bondLength(s,b)*Math.sin(ang)-n.y);return sum+(d<55?(55-d)*.2:0);},0);
   // Rigid rotation round-off must not flip equally good branch directions.
   angles.sort((a,b)=>{const delta=score(a)-score(b);return Math.abs(delta)<1e-8?0:delta;});const ang=angles[0];occupied.push(ang);child.x=A.x+bondLength(s,b)*Math.cos(ang);child.y=A.y+bondLength(s,b)*Math.sin(ang);grow(child.id,id);
  }
 }
 for(const a of s.nodes)if(!visited.has(a.id))grow(a.id);
 // Two anionic oxygens face the barium above and below it; no ionic lines are drawn.
 for(const ba of s.nodes.filter(a=>a.e==='Ba')){const links=edges(s,ba.id,true).filter(b=>b.ionic);if(links.length!==2)continue;const donors=links.map(b=>atom(s,neighbor(b,ba.id)));if(!donors.every(o=>o.e==='O'))continue;
  donors.sort((a,b)=>a.y-b.y);const bx=ba.x,by=ba.y;
  const carbons=donors.map(o=>{const e=edges(s,o.id).find(b=>atom(s,neighbor(b,o.id)).e==='C');return e?atom(s,neighbor(e,o.id)):null;});if(carbons.some(c=>!c))continue;
  const queue=[[carbons[0].id]],pathVisited=new Set();let path=null;
  while(queue.length){const p=queue.shift(),id=p.at(-1);if(id===carbons[1].id){path=p;break;}if(pathVisited.has(id))continue;pathVisited.add(id);for(const b of edges(s,id)){const n=neighbor(b,id);if(atom(s,n).e==='C'&&!p.includes(n))queue.push([...p,n]);}}
  let height=120;
  if(path&&path.length>=4){height=(path.length-3)*42;for(let i=0;i<path.length;i++){const a=atom(s,path[i]);if(i===0){a.x=bx-95;a.y=by-height;}else if(i===path.length-1){a.x=bx-95;a.y=by+height;}else {a.x=bx-179;a.y=by-height+(i-1)*84;}}}
  donors.forEach((o,i)=>{const sign=i===0?-1:1,carbon=carbons[i];if(!path){const old={x:carbon.x,y:carbon.y};const tail=edges(s,carbon.id).map(b=>atom(s,neighbor(b,carbon.id))).find(a=>a.e==='C');const rotation=tail?Math.PI-Math.atan2(tail.y-old.y,tail.x-old.x):0;const ids=new Set([carbon.id]),todo=[carbon.id];while(todo.length){const id=todo.pop();for(const b of edges(s,id)){const n=neighbor(b,id);if(!ids.has(n)){ids.add(n);todo.push(n);}}}for(const id of ids){const a=atom(s,id),dx=a.x-old.x,dy=a.y-old.y;a.x=bx-100+dx*Math.cos(rotation)-dy*Math.sin(rotation);a.y=by+sign*height+dx*Math.sin(rotation)+dy*Math.cos(rotation);}}
   o.x=carbon.x+43;o.y=carbon.y-sign*65;const ox=edges(s,carbon.id).find(b=>b.order===2&&atom(s,neighbor(b,carbon.id)).e==='O');if(ox){const a=atom(s,neighbor(ox,carbon.id));a.x=carbon.x+37;a.y=carbon.y+sign*56;}
  });
 }
 // Hidden atoms of collapsed anions follow their displayed group anchor.
 for(const g of s.groups){const root=atom(s,g.root);for(const id of g.atomIds)if(id!==g.root){atom(s,id).x=root.x;atom(s,id).y=root.y;}}
 applyGeometry(s);const dx=anchor.x-s.nodes[0].x,dy=anchor.y-s.nodes[0].y;for(const a of s.nodes){a.x+=dx;a.y+=dy;}
}
