import { NextResponse } from 'next/server';

const EMBED_VERSION = '1.0.0';

/**
 * Minified widget bootstrap loader script.
 * This script initializes the Widget Creator embed on the host page.
 */
const EMBED_SCRIPT = `(function(){
"use strict";
var W=window,D=document;
function esc(s){if(typeof s!=="string")return"";return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}
function init(cfg){
var id=cfg.widgetId||cfg.dataset&&cfg.dataset.widgetId;
if(!id){console.error("[WidgetCreator] Missing widgetId");return}
var base=cfg.apiBase||"${process.env.API_BASE_URL || 'https://api.hooniprinting.com/api/v1'}";
var container=cfg.container||D.getElementById("widget-creator");
if(!container){container=D.createElement("div");container.id="widget-creator";D.body.appendChild(container)}
fetch(base.replace("/api/v1","")+"/api/widget/config/"+id)
.then(function(r){return r.json()})
.then(function(d){
if(d.data){
container.innerHTML='<div style="font-family:'+esc(d.data.theme.font_family)+';padding:16px;border:1px solid '+esc(d.data.theme.secondary_color)+';border-radius:'+esc(d.data.theme.border_radius)+'"><p style="color:'+esc(d.data.theme.primary_color)+'">Widget Creator v${EMBED_VERSION} - '+esc(d.data.name)+'</p></div>';
}
}).catch(function(e){console.error("[WidgetCreator]",e)});
}
if(W.WidgetCreator){W.WidgetCreator.init=init}else{W.WidgetCreator={init:init}}
var scripts=D.querySelectorAll("script[data-widget-id]");
for(var i=0;i<scripts.length;i++){init(scripts[i])}
})();`;

/**
 * GET /api/widget/embed.js - Widget embed script (REQ-061).
 * CDN-cached JavaScript bootstrap loader.
 */
export async function GET() {
  const etag = `"v${EMBED_VERSION}-${Buffer.from(EMBED_SCRIPT).length}"`;

  return new NextResponse(EMBED_SCRIPT, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'public, max-age=86400, s-maxage=604800',
      ETag: etag,
      'X-Widget-Version': EMBED_VERSION,
    },
  });
}
