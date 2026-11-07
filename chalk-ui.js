(() => {
'use strict';
const themeKey='chem-board-theme';
const root=document.documentElement;
function applyTheme(value){
 const light=value==='light';
 root.dataset.boardTheme=light?'light':'dark';
 const toggle=document.getElementById('board-theme-toggle');
 if(toggle){
  toggle.textContent=light?'Тёмные доски':'Светлые доски';
  toggle.setAttribute('aria-pressed',String(light));
 }
}
try{applyTheme(localStorage.getItem(themeKey));}catch{applyTheme('dark');}
document.addEventListener('DOMContentLoaded',()=>{
 const header=document.querySelector('.site-header .header-inner,.topbar');
 if(!header)return;
 const toggle=document.createElement('button');
 toggle.id='board-theme-toggle';
 toggle.className='board-theme-toggle';
 toggle.type='button';
 header.append(toggle);
 applyTheme(root.dataset.boardTheme);
 toggle.addEventListener('click',()=>{
  const next=root.dataset.boardTheme==='light'?'dark':'light';
  applyTheme(next);
  try{localStorage.setItem(themeKey,next);}catch{}
 });
});
window.addEventListener('storage',event=>{if(event.key===themeKey)applyTheme(event.newValue);});
})();
