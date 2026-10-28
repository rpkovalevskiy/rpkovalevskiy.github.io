(function(root){
'use strict';
async function share(nav,payload,onFallback){
 // Keep the native call in the original click's activation; never copy implicitly.
 try{
  if(typeof nav.share!=='function'||typeof nav.canShare==='function'&&!nav.canShare(payload)){onFallback();return 'fallback';}
  await nav.share(payload);return 'shared';
 }catch(error){
  if(error?.name==='AbortError')return 'cancelled';
  onFallback();return 'fallback';
 }
}
function links(payload){
 const telegram=new URL('https://t.me/share/url');telegram.searchParams.set('url',payload.url);telegram.searchParams.set('text',payload.text);
 const x=new URL('https://x.com/intent/tweet');x.searchParams.set('text',payload.text);x.searchParams.set('url',payload.url);
 return {telegram:telegram.href,x:x.href};
}
const api={share,links};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WordleSharing=api;
})(typeof window==='undefined'?globalThis:window);
