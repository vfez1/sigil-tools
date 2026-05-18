(function(){if(typeof window.__sigil_gaa_enabled==="function"&&!window.__sigil_gaa_enabled())return;var e=Object.defineProperty,t=(t,n)=>{let r={};for(var i in t)e(r,i,{get:t[i],enumerable:!0});return n||e(r,Symbol.toStringTag,{value:`Module`}),r};let n=`grid-aware-auras`,r=`module.${n}`,i=`auras`,a=`enableEffectAutomation`,o=`enableMacroAutomation`,s=`squareGridMode`,c=`customAuraTargetFilters`,l=`presets`,u=`gridAwareAuras`,d=`${u}.createAura`,f=`${u}.deleteAura`,p=`${u}.endMoveInsideAura`,m=`${u}.enterLeaveAura`,h=`${u}.startMoveInsideAura`,g=`${u}.updateAura`,_=`toggleEffect`,v={NONE:0,SOLID:1,DASHED:2},y={EQUIDISTANT:0,ALTERNATING:1,MANHATTAN:2,EXACT:3},ee={ALWAYS:`TOKEN.DISPLAY_ALWAYS`,OWNER:`TOKEN.DISPLAY_OWNER`,HOVER:`TOKEN.DISPLAY_HOVER`,OWNER_HOVER:`TOKEN.DISPLAY_OWNER_HOVER`,CONTROL:`TOKEN.DISPLAY_CONTROL`,DRAG:`GRIDAWAREAURAS.AuraDisplayDrag`,TURN:`GRIDAWAREAURAS.AuraDisplayOwnerTurn`,OWNER_TURN:`GRIDAWAREAURAS.AuraDisplayTurn`,NONE:`TOKEN.DISPLAY_NONE`,CUSTOM:`GRIDAWAREAURAS.AuraDisplayCustom`},te={APPLY_WHILE_INSIDE:`GRIDAWAREAURAS.EffectModeApplyWhileInside`,APPLY_ON_ENTER:`GRIDAWAREAURAS.EffectModeApplyOnEnter`,APPLY_ON_LEAVE:`GRIDAWAREAURAS.EffectModeApplyOnLeave`,APPLY_ON_OWNER_TURN_START:`GRIDAWAREAURAS.EffectModeApplyOnOwnerTurnStart`,APPLY_ON_OWNER_TURN_END:`GRIDAWAREAURAS.EffectModeApplyOnOwnerTurnEnd`,APPLY_ON_TARGET_TURN_START:`GRIDAWAREAURAS.EffectModeApplyOnTargetTurnStart`,APPLY_ON_TARGET_TURN_END:`GRIDAWAREAURAS.EffectModeApplyOnTargetTurnEnd`,APPLY_ON_ROUND_START:`GRIDAWAREAURAS.EffectModeApplyOnRoundStart`,APPLY_ON_ROUND_END:`GRIDAWAREAURAS.EffectModeApplyOnRoundEnd`,REMOVE_WHILE_INSIDE:`GRIDAWAREAURAS.EffectModeRemoveWhileInside`,REMOVE_ON_ENTER:`GRIDAWAREAURAS.EffectModeRemoveOnEnter`,REMOVE_ON_LEAVE:`GRIDAWAREAURAS.EffectModeRemoveOnLeave`,REMOVE_ON_OWNER_TURN_START:`GRIDAWAREAURAS.EffectModeRemoveOnOwnerTurnStart`,REMOVE_ON_OWNER_TURN_END:`GRIDAWAREAURAS.EffectModeRemoveOnOwnerTurnEnd`,REMOVE_ON_TARGET_TURN_START:`GRIDAWAREAURAS.EffectModeRemoveOnTargetTurnStart`,REMOVE_ON_TARGET_TURN_END:`GRIDAWAREAURAS.EffectModeRemoveOnTargetTurnEnd`,REMOVE_ON_ROUND_START:`GRIDAWAREAURAS.EffectModeRemoveOnRoundStart`,REMOVE_ON_ROUND_END:`GRIDAWAREAURAS.EffectModeRemoveOnRoundEnd`},ne=[`APPLY_WHILE_INSIDE`,`REMOVE_WHILE_INSIDE`],re={ENTER_LEAVE:`GRIDAWAREAURAS.MacroModeEnterLeave`,ENTER:`GRIDAWAREAURAS.MacroModeEnter`,LEAVE:`GRIDAWAREAURAS.MacroModeLeave`,PREVIEW_ENTER_LEAVE:`GRIDAWAREAURAS.MacroModePreviewEnterLeave`,PREVIEW_ENTER:`GRIDAWAREAURAS.MacroModePreviewEnter`,PREVIEW_LEAVE:`GRIDAWAREAURAS.MacroModePreviewLeave`,OWNER_TURN_START_END:`GRIDAWAREAURAS.MacroModeOwnerTurnStartEnd`,OWNER_TURN_START:`GRIDAWAREAURAS.MacroModeOwnerTurnStart`,OWNER_TURN_END:`GRIDAWAREAURAS.MacroModeOwnerTurnEnd`,TARGET_TURN_START_END:`GRIDAWAREAURAS.MacroModeTargetTurnStartEnd`,TARGET_TURN_START:`GRIDAWAREAURAS.MacroModeTargetTurnStart`,TARGET_TURN_END:`GRIDAWAREAURAS.MacroModeTargetTurnEnd`,ROUND_START_END:`GRIDAWAREAURAS.MacroModeRoundStartEnd`,ROUND_START:`GRIDAWAREAURAS.MacroModeRoundStart`,ROUND_END:`GRIDAWAREAURAS.MacroModeRoundEnd`,TARGET_START_MOVE:`GRIDAWAREAURAS.MacroModeTargetStartMove`,TARGET_END_MOVE:`GRIDAWAREAURAS.MacroModeTargetEndMove`},ie={ON_ENTER:`GRIDAWAREAURAS.SequenceTriggerOnEnter`,ON_LEAVE:`GRIDAWAREAURAS.SequenceTriggerOnLeave`,WHILE_INSIDE:`GRIDAWAREAURAS.SequenceTriggerWhileInside`},ae={ON_TARGET:`GRIDAWAREAURAS.SequencePositionOnTarget`,ON_OWNER:`GRIDAWAREAURAS.SequencePositionOnOwner`,OWNER_TO_TARGET:`GRIDAWAREAURAS.SequencePositionFromOwnerToTarget`,TARGET_TO_OWNER:`GRIDAWAREAURAS.SequencePositionFromTargetToOwner`},oe={NONE:`GRIDAWAREAURAS.ThtRulerOnDragModeNone`,C2C:`GRIDAWAREAURAS.ThtRulerOnDragModeC2C`,E2E:`GRIDAWAREAURAS.ThtRulerOnDragModeE2E`},se={CENTER:`GRIDAWAREAURAS.AuraPositionCenter`,TOP_LEFT:`GRIDAWAREAURAS.AuraPositionTopLeft`,TOP_RIGHT:`GRIDAWAREAURAS.AuraPositionTopRight`,BOTTOM_RIGHT:`GRIDAWAREAURAS.AuraPositionBottomRight`,BOTTOM_LEFT:`GRIDAWAREAURAS.AuraPositionBottomLeft`};function ce(e,...t){console.log(`Grid Aware Auras | ${e}`,...t)}function b(e,...t){console.warn(`Grid Aware Auras | ${e}`,...t)}function le(e,t){return e.length===t.length&&e.every((n,r)=>e[r]===t[r])}function ue(e,t){let n=new Map;for(let r of e)de(n,t(r),()=>[]).push(r);return n}function de(e,t,n){if(e.has(t))return e.get(t);let r=n();return e.set(t,r),r}async function x(e,t,n,i={},a=!1){if(!game.settings.get(`grid-aware-auras`,`enableEffectAutomation`))return;let{overlay:o}=i,s=typeof e==`string`?await fromUuid(e):e;if(s){if(s.canUserModify(game.user,`update`))await s.toggleStatusEffect(t,{active:n,overlay:o});else if(a){let a=typeof e==`string`?e:e.uuid,o=game.users.find(e=>e.isGM&&e.active)?.id;o?(ce(`Delegating effect toggling to GM user '${o}'.`),game.socket.emit(r,{func:_,runOn:o,actorUuid:a,effectId:t,state:n,effectOptions:i})):b(`No GM users available. Unable to toggle effect to actor '${s.name}'.`)}}}function fe(e,t){for(let[n,r]of Object.entries(t))if(e[n]!==r)return!1;return!0}function pe(){return game.modules.get(`sequencer`)?.active===!0}function me(){let e=game.modules.get(`terrain-height-tools`);return e?.active===!0&&!foundry.utils.isNewerVersion(`0.4.7`,e.version)}function S(e,t=void 0){let n=new Map;return t??=e=>e.join(`|`),function(...r){let i=t(r);if(n.has(i))return n.get(i);let a=e(...r);return n.set(i,a),a}}function he(e,...t){return Object.fromEntries(e.map(e=>[e,t.find(t=>t&&e in t)?.[e]]))}let ge={},_e=/^(?:[a-z0-9\-_]+\.)*[a-z0-9\-_]+$/i;function ve(e,t,{description:n=``}={}){if(typeof t!=`function`)throw Error(`Resolver must be a function`);if(!_e.test(e))throw Error(`Invalid name '${e}': Must only use alphanumeric, '.', '-' or '_' characters, must not start or end with '.', or contain consequtive '.'s.`);let r=e.split(`.`),i=ge;for(let t of r){if(i=i[t],i===void 0)break;if(i instanceof C)throw Error(`Invalid name '${e}': Either an extension with this name already exits, or adding this would cause an invalid object.`)}if(i!==void 0)throw Error(`Invalid name '${e}': Registering this would cause an invalid object.`);i=ge;for(let e of r.slice(0,-1))i[e]??={},i=i[e];i[r[r.length-1]]=new C(t,n)}function ye(){return Object.keys(ge).length>0}function be(e,t){let n=r=>new Proxy({},{get(i,a){let o=xe([...r,a]);if(o!==void 0){if(o instanceof C)try{let n=o.resolve(e,t);return typeof n==`number`?n:0}catch(e){return b(`Error in radius expression extension '${path}'`,e),0}return n([...r,a])}},has(e,t){let n=xe(r);return n!==void 0&&!(n instanceof C)&&t in n},ownKeys(){let e=xe(r);return e===void 0||e instanceof C?[]:Object.keys(e)},getOwnPropertyDescriptor(i,a){let o=xe([...r,a]);return o===void 0?void 0:{configurable:!0,enumerable:!0,get:()=>o instanceof C?o(e,t):n([...r,a])}}});return n([])}var C=class{constructor(e,t){this.resolve=e,this.description=t}};function xe(e){let t=ge;for(let n of e)if(n in t)t=t[n];else return;return t}function Se(e){let t=e instanceof foundry.canvas.placeables.Token?e.document:e,n=w(t,{calculateRadius:!0}),r=new Set(n.map(e=>e.id));for(let e of t.actor?.items??[])for(let t of w(e,{calculateRadius:!0}))r.has(t.id)||(n.push(t),r.add(t.id));return n}function w(e,{calculateRadius:t=!1}={}){if(!(e instanceof TokenDocument||e instanceof Item||e instanceof foundry.data.PrototypeToken))throw Error(`Must provide an Item or Token document to getDocumentOwnAuras.`);let n=(e.getFlag(`grid-aware-auras`,`auras`)??[]).map(T);if(t){let t=Ce(e instanceof TokenDocument?e.actor:e instanceof Item?e.parent:void 0,e instanceof Item?e:void 0);n=n.map(e=>({...e,radiusCalculated:we(e.radius,t)??-1,innerRadiusCalculated:we(e.innerRadius,t)??-1}))}return n}function Ce(e=void 0,t=void 0){let n={actor:e,item:t};return ye()&&(n.ext=be(e,t)),n}function we(e,t){if(e===``)return;let n=e=>Math.round(e*100)/100,r=+e;if(typeof r==`number`&&!isNaN(r))return n(r);let i=foundry.utils.getProperty(t,e);if(i!==void 0)return r=parseInt(i),typeof r==`number`&&!isNaN(r)?n(r):void 0;try{let r=new Roll(e,t);if(r.isDeterministic)return r.evaluateSync(),n(r.total)}catch{return}}let Te={default:!0,hovered:!0,controlled:!0,dragging:!0,targeted:!0,turn:!0},Ee=()=>({_v:1,name:`New Aura`,enabled:!0,radius:1,innerRadius:``,position:`CENTER`,lineType:v.SOLID,lineWidth:4,lineColor:`#FF0000`,lineColorAnimation:null,lineOpacity:.8,lineDashSize:15,lineGapSize:10,lineDashOffsetAnimation:0,fillType:CONST.DRAWING_FILL_TYPES.SOLID,fillColor:`#FF0000`,fillColorAnimation:null,fillOpacity:.1,fillTexture:``,fillTextureOffset:{x:0,y:0},fillTextureOffsetAnimation:null,fillTextureScale:{x:100,y:100},ownerVisibility:Te,nonOwnerVisibility:Te,effects:[],macros:[],sequencerEffects:[],terrainHeightTools:{rulerOnDrag:`NONE`,targetTokens:``}}),De=()=>({duration:2500,easingFunc:`linear`,keyframes:[{color:16711680,alpha:.8,position:0},{color:255,alpha:.8,position:.5},{color:16711680,alpha:.8,position:1}]}),Oe=()=>({duration:2500,easingFunc:`linear`,keyframes:[{color:16711680,alpha:.1,position:0},{color:255,alpha:.1,position:.5},{color:16711680,alpha:.1,position:1}]}),ke=()=>({effectId:null,isOverlay:!1,targetTokens:`ALL`,mode:`APPLY_WHILE_INSIDE`,priority:0}),Ae=()=>({macroId:null,targetTokens:`ALL`,mode:`ENTER_LEAVE`}),je=()=>({uId:foundry.utils.randomID(),effectPath:``,targetTokens:`ALL`,trigger:`ON_ENTER`,position:`ON_TARGET`,repeatCount:1,repeatDelay:0,delay:0,opacity:1,fadeInDuration:0,fadeInEasing:`linear`,fadeOutDuration:0,fadeOutEasing:`linear`,scale:1,scaleToObject:!1,scaleInScale:1,scaleInDuration:0,scaleInEasing:`linear`,scaleOutScale:1,scaleOutDuration:0,scaleOutEasing:`linear`,playbackRate:1,belowTokens:!1}),Me=[e=>{let{effect:t,macro:n}=e;return t?.effectId?.length&&(e.effects=[t,...e.effects??[]]),delete e.effect,n?.macroId?.length&&(e.macros=[n,...e.macros??[]]),delete e.macro,e}];function Ne(){return foundry.utils.mergeObject(Ee(),{id:foundry.utils.randomID()},{inplace:!1})}function T(e,{newId:t=!1}={}){for(let t=+(e._v??0);t<1;t++)e=Me[t](e);return e._v=1,e=foundry.utils.mergeObject(Ee(),e,{inplace:!1}),e.effects=e.effects?.map(e=>foundry.utils.mergeObject(ke(),e,{inplace:!1}))??[],e.macros=e.macros?.map(e=>foundry.utils.mergeObject(Ae(),e,{inplace:!1}))??[],e.sequencerEffects=e.sequencerEffects?.map(e=>foundry.utils.mergeObject(je(),e,{inplace:!1}))??[],t&&(e.id=foundry.utils.randomID()),e}let Pe={ALWAYS:{owner:{default:!0,hovered:!0,controlled:!0,dragging:!0,targeted:!0,turn:!0},nonOwner:{default:!0,hovered:!0,targeted:!0,turn:!0}},OWNER:{owner:{default:!0,hovered:!0,controlled:!0,dragging:!0,targeted:!0,turn:!0},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}},HOVER:{owner:{default:!1,hovered:!0,controlled:!1,dragging:!1,targeted:!1,turn:!1},nonOwner:{default:!1,hovered:!0,targeted:!1,turn:!1}},OWNER_HOVER:{owner:{default:!1,hovered:!0,controlled:!1,dragging:!1,targeted:!1,turn:!1},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}},CONTROL:{owner:{default:!1,hovered:!1,controlled:!0,dragging:!1,targeted:!1,turn:!1},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}},DRAG:{owner:{default:!1,hovered:!1,controlled:!1,dragging:!0,targeted:!1,turn:!1},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}},TURN:{owner:{default:!1,hovered:!1,controlled:!1,dragging:!1,targeted:!1,turn:!0},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!0}},OWNER_TURN:{owner:{default:!1,hovered:!1,controlled:!1,dragging:!1,targeted:!1,turn:!0},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}},NONE:{owner:{default:!1,hovered:!1,controlled:!1,dragging:!1,targeted:!1,turn:!1},nonOwner:{default:!1,hovered:!1,targeted:!1,turn:!1}}};function Fe(e){let{id:t,...n}=e;new foundry.applications.api.DialogV2({window:{title:`Export`,icon:`fas fa-download`,resizable:!0},classes:[`grid-aware-auras-import-export-dialog`],content:`<textarea>${JSON.stringify(n)}</textarea>`,buttons:[{icon:`<i class='fas fa-times'></i>`,label:game.i18n.localize(`Close`),action:`close`}],position:{width:530,height:320}}).render(!0)}function Ie({newId:e=!0}={}){return new Promise(t=>{new foundry.applications.api.DialogV2({window:{title:`Import`,icon:`fas fa-upload`,resizable:!0},classes:[`grid-aware-auras-import-export-dialog`],content:`<textarea></textarea>`,buttons:[{icon:`<i class=''></i>`,label:`Import`,callback:(n,r,i)=>{let a=(i instanceof foundry.applications.api.DialogV2?i.element:i).querySelector(`textarea`).value;try{let n;try{n=JSON.parse(a)}catch(e){throw Error(`Failed to import aura: Invalid JSON provided (${e.message}).`)}if(Array.isArray(n)||typeof n!=`object`)throw Error(`Failed to import aura: Expected JSON to be an object.`);t(T(n,{newId:e}))}catch(e){throw ui.notifications.error(e.message),e}}},{icon:`<i class='fas fa-times'></i>`,label:game.i18n.localize(`Close`),action:`close`}],position:{width:530,height:320}}).render(!0)})}var Le=class{#e=new Map;#t=new Map;#n=new Map;*getAllAuras({preview:e}={}){for(let[t,n]of this.#e){if(e!==void 0&&this.#a(t).isPreview!==e)continue;let r=this.#o(t);if(r)for(let e of n.values())yield{parent:r,aura:e}}}getTokenAuras(e){let t=this.#i(e),n=this.#e.get(t);return n?[...n.values()]:[]}getTokensInsideAura(e,t){let n=this.#s(e,t);return[...this.#n.get(n)??[]].map(e=>this.#o(e)).filter(e=>!!e)}getAurasContainingToken(e,{preview:t}={}){let n=this.#i(e);return[...this.#t.get(n)??[]].filter(e=>t===void 0||this.#c(e).tokenIsPreview===t).map(e=>this.#l(e)).filter(e=>!!e)}registerAura(e,t){let n=this.#i(e);de(this.#e,n,()=>new Map).set(t.config.id,t)}hasAura(e,t){let n=this.#i(e);return this.#e.get(n)?.has(t)??!1}isInside(e,t,n){let r=this.#i(e),i=this.#s(t,n);return this.#t.get(r)?.has(i)??!1}setIsInside(e,t,n,r){let i=this.#i(e),a=this.#s(t,n);return r===(this.#t.get(i)?.has(a)??!1)?!1:(de(this.#t,i,()=>new Set)[r?`add`:`delete`](a),de(this.#n,a,()=>new Set)[r?`add`:`delete`](i),!0)}deregisterToken(e){let t=this.#i(e),n=this.#e.get(t);if(n)for(let t of n.keys()){let n=this.#s(e,t);this.#r(n)}let r=this.#t.get(t);if(r)for(let e of r)this.#n.get(e)?.delete(t);this.#t.delete(t),this.#e.delete(t)}deregisterAura(e,t){let n=this.#i(e),r=this.#e.get(n);if(!r||!r.delete(t))return!1;let i=this.#s(e,t);return this.#r(i),!0}#r(e){let t=this.#n.get(e);if(t){for(let n of t)this.#t.get(n)?.delete(e);this.#n.delete(e)}}clear(){this.#e.clear(),this.#t.clear(),this.#n.clear()}#i(e){return[e.id,e.isPreview].join(`|`)}#a(e){let[t,n]=e.split(`|`);return{tokenId:t,isPreview:n===`true`}}#o(e){let{tokenId:t,isPreview:n}=this.#a(e),r=canvas.tokens.placeables.find(e=>e.id===t&&e.isPreview===n);return r||b(`getTokenFromCompositeId: A token matching composite ID '${e}' was not found.`),r}#s(e,t){return[e.id,e.isPreview,t].join(`|`)}#c(e){let[t,n,r]=e.split(`|`);return{tokenId:t,tokenIsPreview:n===`true`,auraId:r}}#l(e){let{tokenId:t,tokenIsPreview:n,auraId:r}=this.#c(e),i=this.#i({id:t,isPreview:n}),a=this.#o(i),o=this.#e.get(i)?.get(r);return o||b(`getAuraFromCompositeId: An aura matching composite ID '${e}' was not found.`),o&&a?{parent:a,aura:o}:null}};let Re={linear:`EasingLinear`,easeInCubic:`EasingEaseIn`,easeOutCubic:`EasingEaseOut`,easeInOutCubic:`EasingEaseInOut`},ze={linear:e=>e,easeInCubic:e=>e**3,easeOutCubic:e=>1-(1-e)**3,easeInOutCubic:e=>e<.5?4*e**3:1-(-2*e+2)**3/2};function Be({r:e,g:t,b:n,a:r}){e/=255,t/=255,n/=255;let i=Math.max(e,t,n),a=i-Math.min(e,t,n),o=i*100,s=i===0?0:a/i*100,c=0;return a!==0&&(i===e?c=60*((t-n)/a%6):i===t?c=60*((n-e)/a+2):i===n&&(c=60*((e-t)/a+4)),c<0&&(c+=360)),{h:c,s,v:o,a:Math.round(r/255*100)}}function Ve({h:e,s:t,v:n,a:r}){e=e%360/360,t/=100,n/=100;let i=n*t,a=i*(1-Math.abs(e*6%2-1)),o=n-i,s=0,c=0,l=0;return 0<=e&&e<1/6?(s=i,c=a,l=0):1/6<=e&&e<2/6?(s=a,c=i,l=0):2/6<=e&&e<3/6?(s=0,c=i,l=a):3/6<=e&&e<4/6?(s=0,c=a,l=i):4/6<=e&&e<5/6?(s=a,c=0,l=i):5/6<=e&&e<1&&(s=i,c=0,l=a),s=Math.round((s+o)*255),c=Math.round((c+o)*255),l=Math.round((l+o)*255),r=Math.round(r/100*255),{r:s,g:c,b:l,a:r}}function He(e){if(typeof e!=`string`)return;let t=/^#?(?<r>[a-f0-9]{2})(?<g>[a-f0-9]{2})(?<b>[a-f0-9]{2})(?<a>[a-f0-9]{2})?$/i.exec(e);if(t){let{r:e,g:n,b:r,a:i}=t.groups;return{r:parseInt(e,16),g:parseInt(n,16),b:parseInt(r,16),a:parseInt(i??`ff`,16)}}let n=/^#?(?<r>[a-f0-9])(?<g>[a-f0-9])(?<b>[a-f0-9])(?<a>[a-f0-9])?$/i.exec(e);if(n){let{r:e,g:t,b:r,a:i}=n.groups;return{r:parseInt(e,16)*17,g:parseInt(t,16)*17,b:parseInt(r,16)*17,a:parseInt(i??`f`,16)*17}}}function Ue({r:e,g:t,b:n,a:r}){return`#`+[e,t,n,r].map(e=>Math.max(Math.min(Math.round(e),255),0).toString(16).padStart(2,`0`)).join(``)}function We(e){return{r:e>>16&255,g:e>>8&255,b:e&255}}function Ge(e,t){if(t===0)return 0;let n=e>>16&255,r=e>>8&255,i=e&255,a=Math.max(0,Math.min(Math.round(n*t),255)),o=Math.max(0,Math.min(Math.round(r*t),255)),s=Math.max(0,Math.min(Math.round(i*t),255));return a<<16|o<<8|s}function Ke(e,t){return Ge(e,1/t)}function qe(e,t){let{r:n=0,g:r=0,b:i=0,a=255}=(typeof e==`string`?He(e):typeof e==`number`?We(e):e)??{};return`rgb(${n} ${r} ${i} / ${Math.round(100*(t??a/255))}%)`}function Je(e,t,n){let r=e>>16&255,i=e>>8&255,a=e&255,o=t>>16&255,s=t>>8&255,c=t&255,l=Math.round(Ye(r,o,n)),u=Math.round(Ye(i,s,n)),d=Math.round(Ye(a,c,n));return l<<16|u<<8|d}function Ye(e,t,n){return e+(t-e)*n}function Xe(e){return e.map(({color:e,alpha:t,position:n})=>({color:Ge(e,t),alpha:t,position:n}))}function Ze(e,t,n,r){let i=(ze[n]??ze.linear)(r%t/t);if(i<=e[0].position)return{color:e[0].color,alpha:e[0].alpha,insertIndex:0};if(i>=e.at(-1).position)return{color:e.at(-1).color,alpha:e.at(-1).alpha,insertIndex:e.length};for(let t=0;t<e.length-1;t++){let n=e[t],r=e[t+1];if(n.position>i||r.position<i)continue;let a=(i-n.position)/(r.position-n.position);return{color:Je(n.color,r.color,a),alpha:Ye(n.alpha,r.alpha,a),insertIndex:t+1}}return{color:0,alpha:0,insertIndex:0}}let Qe={NONE:0,SOLID:1,DASHED:2};function E(e,t){e.moveTo(0,0);for(let n of t)switch(n.type){case`m`:e.moveTo(n.x,n.y);break;case`l`:e.lineTo(n.x,n.y);break;case`a`:e.arcTo(n.tx,n.ty,n.x,n.y,n.r);break;default:throw Error(`Unknown command`)}}function $e(e,t,{dashSize:n=20,gapSize:r=void 0,offset:i=0}={}){r??=n;let a=0,o=0;e.moveTo(0,0);let s=!1,c=i%(n+r);for(let i of t)switch(i.type){case`m`:({x:a,y:o}=i),e.moveTo(a,o);break;case`l`:{let t=a,l=o,{x:u,y:d}=i,f=Math.atan2(d-l,u-t),p=Math.cos(f),m=Math.sin(f),h=Math.sqrt((d-l)**2+(u-t)**2),g=h;for(;g>2**-52;){c<=0&&(s=!s,c=s?n:r);let i=h-g,a=Math.min(g,c);g-=a,c-=a,s&&(e.moveTo(t+p*i,l+m*i),e.lineTo(t+p*(i+a),l+m*(i+a)))}e.moveTo(u,d),a=u,o=d;break}case`a`:{let t=a,l=o,{x:u,y:d,r:f}=i,{x:p,y:m}=et(t,l,u,d,f),h=Math.atan2(l-m,t-p),g=Math.atan2(d-m,u-p),_=h,v=(g-h+Math.PI*2)%(Math.PI*2);for(;v>2**-52;){c<=0&&(s=!s,c=s?n:r);let t=c/f,i=Math.min(v,t);v-=i,c-=i*f,s&&(e.moveTo(Math.cos(_)*f+p,Math.sin(_)*f+m),e.arc(p,m,f,_,_+i)),_+=i}e.moveTo(u,d),a=u,o=d;break}default:throw Error(`Unknown command`)}}function et(e,t,n,r,i){let a=n-e,o=r-t,s=(e+n)/2,c=(t+r)/2,l=Math.sqrt(a**2+o**2),u=a/l,d=o/l,f=Math.sqrt(i**2-(l/2)**2),p=-d,m=u;return{x:s+f*p,y:c+f*m}}var tt=class extends PIXI.Container{#e;#t;#n;#r;#i;#a;#o;#s;constructor(e,t,n,r){super(),this.update(e,t,n,r)}update(e,t,n,r){if(this.#e=e,this.#t=t,this.#n=n,this.#c(e))switch(this.#r?this.#r.clear():(this.#r=this.addChild(new PIXI.Graphics),this.#r.zIndex=1),this.#r.lineStyle({color:16777215,alpha:1,width:e.lineWidth,alignment:.5}),this.#r.tint=e.lineColor,this.#r.alpha=e.lineOpacity,e.lineType){case Qe.SOLID:E(this.#r,t);for(let e of n)E(this.#r,e);break;case Qe.DASHED:{let r={dashSize:e.lineDashSize,gapSize:e.lineGapSize};$e(this.#r,t,r);for(let e of n)$e(this.#r,e,r);break}}else this.#r&&=(this.removeChild(this.#r),this.#r.destroy(),void 0);let i=this.#l(e),a=this.#u(e);if(a){let i=this.#o??=this.addChild(new PIXI.TilingSprite),a=this.#a??=this.addChild(new PIXI.Graphics);i.mask=a,i.texture=e.fillTexture,i.x=r.x,i.y=r.y,i.width=r.width,i.height=r.height,i.tint=e.fillColor,i.alpha=e.fillOpacity;let{x:o,y:s}=e.fillTextureScale??{x:100,y:100};i.tileScale.set(o/100,s/100),a.beginFill(0,1),E(a,t);for(let e of n)a.beginHole(),E(a,e),a.endHole()}else if(i){let r=this.#a??=this.addChild(new PIXI.Graphics);if(e.fillType===CONST.DRAWING_FILL_TYPES.PATTERN&&e.fillTexture){let{x:t,y:n}=e.fillTextureOffset??{x:0,y:0},{x:i,y:a}=e.fillTextureScale??{x:100,y:100};r.beginTextureFill({texture:e.fillTexture,color:16777215,alpha:1,matrix:new PIXI.Matrix(i/100,0,0,a/100,t,n)})}else r.beginFill(16777215,1);r.tint=e.fillColor,r.alpha=e.fillOpacity,E(r,t);for(let e of n)r.beginHole(),E(r,e),r.endHole()}!i&&this.#a&&(this.removeChild(this.#a),this.#a.destroy(),this.#a=void 0),!a&&this.#o&&(this.removeChild(this.#o),this.#o.destroy(),this.#o=void 0),this.#i=e?.lineColorAnimation?Xe(e.lineColorAnimation.keyframes):void 0,this.#s=e?.fillColorAnimation?Xe(e.fillColorAnimation.keyframes):void 0}clear(){this.update(null,null,[],null)}tick(){let e=Date.now();if(this.#r&&this.#e.lineColorAnimation&&this.#i){let{duration:t,easingFunc:n}=this.#e.lineColorAnimation,{color:r,alpha:i}=Ze(this.#i,t,n,e);this.#r.tint=Ke(r,i),this.#r.alpha=i}if(this.#r&&this.#e.lineType===Qe.DASHED&&(this.#e.lineDashOffsetAnimation??0)!==0){this.#r.clear(),this.#r.lineStyle({color:16777215,alpha:1,width:this.#e.lineWidth,alignment:.5});let t={dashSize:this.#e.lineDashSize,gapSize:this.#e.lineGapSize,offset:e/1e3*this.#e.lineDashOffsetAnimation};$e(this.#r,this.#t,t);for(let e of this.#n)$e(this.#r,e,t)}if(this.#a&&this.#e.fillColorAnimation&&this.#s){let{duration:t,easingFunc:n}=this.#e.fillColorAnimation,{color:r,alpha:i}=Ze(this.#s,t,n,e),a=this.#o??this.#a;a.tint=Ke(r,i),a.alpha=i}if(this.#o&&this.#e.fillTextureOffsetAnimation){let{x:t,y:n}=this.#e.fillTextureOffsetAnimation,r=e/1e3*t%(this.#e.fillTexture?.width??1),i=e/1e3*n%(this.#e.fillTexture?.height??1);this.#o.tilePosition.set(r,i)}}#c(e){return e&&e.lineType!==Qe.NONE&&e.lineWidth>0&&(e.lineOpacity>0||!!e.lineColorAnimation)}#l(e){return e&&e.fillType!==CONST.DRAWING_FILL_TYPES.NONE&&(e.fillOpacity>0||!!e.fillColorAnimation)}#u(e){return this.#l(e)&&e.fillType===CONST.DRAWING_FILL_TYPES.PATTERN&&!!e.fillTexture&&!!e.fillTextureOffsetAnimation&&e.fillTextureOffsetAnimation.x!==0&&e.fillTextureOffsetAnimation.y!==0}},nt=class{#e;constructor(e,t,n,r){this.#e={width:e,height:t,radius:n,gridSize:r}}get bounds(){let{width:e,height:t,radius:n,gridSize:r}=this.#e;return new PIXI.Rectangle(-n*r,-n*r,(e+n*2)*r,(t+n*2)*r)}isInside(e,{auraOffset:t={x:0,y:0},tokenAltPosition:n,mode:r=`partial`}={}){let{width:i,height:a,gridSize:o}=this.#e,{radius:s}=this.#e,{x:c,y:l}=t;c=c/o+i/2,l=l/o+a/2;let{width:u,height:d}=e.document,{x:f,y:p}=n??e;return f=f/o+u/2,p=p/o+d/2,u===d&&r===`partial`?s+=u/2:u===d&&r===`total`?s-=u/2:r===`partial`?(f=Math.max(f-u/2,Math.min(c,f+u/2)),p=Math.max(p-d/2,Math.min(l,p+d/2))):r===`total`&&(f=c<f?f+u/2:f-u/2,p=l<p?p+d/2:p-d/2),i===a?s+=i/2:(c=Math.max(c-i/2,Math.min(f,c+i/2)),l=Math.max(l-a/2,Math.min(p,l+a/2))),(f-c)**2+(p-l)**2<s**2}*getPath(){let{width:e,height:t,radius:n,gridSize:r}=this.#e;if(e===t){let i=(e/2+n)*r;yield{type:`m`,x:-n*r,y:t/2*r},yield{type:`a`,x:e/2*r,y:-n*r,tx:-n*r,ty:-n*r,r:i},yield{type:`a`,x:(e+n)*r,y:t/2*r,tx:(e+n)*r,ty:-n*r,r:i},yield{type:`a`,x:e/2*r,y:(t+n)*r,tx:(e+n)*r,ty:(t+n)*r,r:i},yield{type:`a`,x:-n*r,y:t/2*r,tx:-n*r,ty:(t+n)*r,r:i}}else yield{type:`m`,x:-n*r,y:0},yield{type:`a`,x:0,y:-n*r,tx:-n*r,ty:-n*r,r:n*r},yield{type:`l`,x:e*r,y:-n*r},yield{type:`a`,x:(e+n)*r,y:0,tx:(e+n)*r,ty:-n*r,r:n*r},yield{type:`l`,x:(e+n)*r,y:t*r},yield{type:`a`,x:e*r,y:(t+n)*r,tx:(e+n)*r,ty:(t+n)*r,r:n*r},yield{type:`l`,x:0,y:(t+n)*r},yield{type:`a`,x:-n*r,y:t*r,tx:-n*r,ty:(t+n)*r,r:n*r},yield{type:`l`,x:-n*r,y:0}}};let D=1/Math.sqrt(3),O=30*Math.PI/180,rt=60*Math.PI/180,{ELLIPSE_1:it,ELLIPSE_2:at,TRAPEZOID_1:ot,TRAPEZOID_2:st,RECTANGLE_1:ct,RECTANGLE_2:lt}=CONST.TOKEN_SHAPES;var ut=class e{#e;#t;#n;#r;#i;constructor(t,n,r,i,a,o){r=Math.round(r),this.#e=e.#a(t,n,r,i,a).map(({x:e,y:t})=>({x:e*o,y:t*o})),{collidableEdges:this.#t,boundingBox:this.#n}=e.#o(this.#e),this.#r=a,this.#i=o}get bounds(){let{top:e,right:t,bottom:n,left:r}=this.#n;return new PIXI.Rectangle(r,e,t-r,n-e)}isInside(e,{auraOffset:t={x:0,y:0},tokenAltPosition:n,mode:r=`partial`}={}){let{width:i,height:a,shape:o}=e.document,{x:s,y:c}=n??e;return vt(s,c,i,a,o,this.#r,this.#i)[r===`total`?`every`:`some`](e=>this._isPointInside(e.x-t.x,e.y-t.y))}_isPointInside(e,t){if(t<this.#n.top||t>this.#n.bottom||e<this.#n.left||e>this.#n.right)return!1;let n=0;for(let{p1:r,p2:i,slope:a}of this.#t){if(t<=r.y)break;t>i.y||(t-r.y)/a+r.x<e&&n++}return n%2==1}*getPath(){if(this.#e.length){for(let e=0;e<this.#e.length;e++)yield{type:e===0?`m`:`l`,x:this.#e[e].x,y:this.#e[e].y};yield{type:`l`,x:this.#e[0].x,y:this.#e[0].y}}}static#a(e,t,n,r,i){if(e<1&&e===t)e=t=1;else if(e<1||t<1)return[];let a=i?t:e,o=i?e:t;switch(r){case it:case at:return dt(a,o,n,i,r===at);case ot:case st:return ft(a,o,n,i,r===st);case ct:case lt:return mt(a,o,n,i,r===lt);default:throw Error(`Unknown hex grid type.`)}}static#o(e){let t=[],n={top:1/0,right:-1/0,bottom:-1/0,left:1/0};for(let r=0;r<e.length;r++){let i=e[r],a=e[(r+1)%e.length];if((a.y<i.y||a.y===i.y&&a.x<i.x)&&([i,a]=[a,i]),i.y!==a.y){let e=i.x===a.x?1/0:(a.y-i.y)/(a.x-i.x);t.push({p1:i,p2:a,slope:e})}n.top=Math.min(n.top,i.y,a.y),n.right=Math.max(n.right,i.x,a.x),n.bottom=Math.max(n.bottom,i.y,a.y),n.left=Math.min(n.left,i.x,a.x)}return t.sort((e,t)=>e.p1.y===t.p1.y?e.p1.x-t.p1.x:e.p1.y-t.p1.y),{collidableEdges:t,boundingBox:n}}};let dt=S(function(e,t,n,r,i){if(e<Math.floor(t/2)+1)return[];let a=Math.floor((t-1)/2)+1,o=Math.ceil((t-1)/2)+1;return pt([e-(a-1)+n,a+n,o+n,e-(o-1)+n,o+n,a+n],i,!r,n,n*D*1.5)}),ft=S(function(e,t,n,r,i){return e<t?[]:pt([e+n+1,n+1,t+n,e-t+n+1,t+n,n],i,!r,n,n*D*1.5)}),pt=S(function(e,t,n,r=0,i=0){let a=0,o=0,s=1/0,c=1/0,l=[...f(e[0],270),...f(e[1],330),...f(e[2],30),...f(e[3],90),...f(e[4],150),...f(e[5],210)],[u,d]=n?[r,i]:[i,r];return l.map(({x:e,y:t})=>({x:e-s-u,y:t-c-d}));function*f(e,n){n=n/180*Math.PI;let r=Math.cos(n+O)*D*(t?-1:1),i=Math.sin(n+O)*D,s=Math.cos(n-O)*D*(t?-1:1),c=Math.sin(n-O)*D;yield p(a+=r,o+=i);for(let t=0;t<e-1;t++)yield p(a+=s,o+=c),yield p(a+=r,o+=i)}function p(e,t){return n&&([e,t]=[t,e]),s=Math.min(s,e),c=Math.min(c,t),{x:e,y:t}}},e=>[e[0].join(`|`),...e.slice(1)].join(`|`)),mt=S(function(e,t,n,r,i){if(e===1&&t>1)return[];let a=0,o=0,s=1/0,c=1/0,l=n,u=n*D*1.5,[d,f]=r?[u,l]:[l,u],p=t>1&&i,m=n===0||t>1&&t%2==+i;return[...h(e+n-+p,270),...h(n+1,330),...g(t-1,0,p),...h(n+1,30),...h(e+n-+m,90),...h(n+ +m,150),...g(t-+m,180,!0),...h(n+1,210)].map(({x:e,y:t})=>({x:e-s-d,y:t-c-f}));function*h(e,t){t=t/180*Math.PI;let n=Math.cos(t+O)*D,r=Math.sin(t+O)*D,i=Math.cos(t-O)*D,s=Math.sin(t-O)*D;yield _(a+=n,o+=r);for(let t=0;t<e-1;t++)yield _(a+=i,o+=s),yield _(a+=n,o+=r)}function*g(e,t,n){t=t/180*Math.PI;let r=Math.cos(t)*D,i=Math.sin(t)*D,s=Math.cos(t+rt*(n?-1:1))*D,c=Math.sin(t+rt*(n?-1:1))*D,l=Math.cos(t+rt*(n?1:-1))*D,u=Math.sin(t+rt*(n?1:-1))*D;for(let t=0;t<e;t++)yield _(a+=t%2==0?s:l,o+=t%2==0?c:u),yield _(a+=r,o+=i)}function _(e,t){return r||([e,t]=[t,e]),s=Math.min(s,e),c=Math.min(c,t),{x:e,y:t}}}),ht=S(function(e,t,n,r){if(e<Math.floor(t/2)+1)return[];let i=Math[r?`ceil`:`floor`]((t-1)/2)*D*1.5+D,a=[],o=0,s=r?1:-1;for(let n=0;n<t;n++){let t=(o+1)/2,r=o*s*D*1.5+i;for(let n=0;n<e-o;n++)a.push(c(n+t,r));s*=-1,n%2==0&&o++}return a;function c(e,t){return n?{x:t,y:e}:{x:e,y:t}}}),gt=S(function(e,t,n,r){if(e<t)return[];let i=r?D+(t-1)*D*1.5:D,a=[];for(let n=0;n<t;n++){let t=(n+1)/2,s=n*(r?-1:1)*D*1.5+i;for(let r=0;r<e-n;r++)a.push(o(r+t,s))}return a;function o(e,t){return n?{x:t,y:e}:{x:e,y:t}}}),_t=S(function(e,t,n,r){if(e===1&&t>1)return[];let i=[],a=+!!r;for(let n=0;n<t;n++){let t=n%2===a;for(let r=0;r<e-+!t;r++)i.push(o(r+(t?.5:1),n*D*1.5+D))}return i;function o(e,t){return n?{x:t,y:e}:{x:e,y:t}}});function vt(e,t,n,r,i,a,o){if(n%1!=0||r%1!=0||n<1||r<1)return[{x:e+n/2*o,y:t+r/2*o}];let s=a?r:n,c=a?n:r;switch(i){case CONST.TOKEN_SHAPES.ELLIPSE_1:case CONST.TOKEN_SHAPES.ELLIPSE_2:return ht(s,c,a,i===CONST.TOKEN_SHAPES.ELLIPSE_2).map(n=>({x:e+n.x*o,y:t+n.y*o}));case CONST.TOKEN_SHAPES.TRAPEZOID_1:case CONST.TOKEN_SHAPES.TRAPEZOID_2:return gt(s,c,a,i===CONST.TOKEN_SHAPES.TRAPEZOID_2).map(n=>({x:e+n.x*o,y:t+n.y*o}));case CONST.TOKEN_SHAPES.RECTANGLE_1:case CONST.TOKEN_SHAPES.RECTANGLE_2:return _t(s,c,a,i===CONST.TOKEN_SHAPES.RECTANGLE_2).map(n=>({x:e+n.x*o,y:t+n.y*o}));default:throw Error(`Unknown hex grid type.`)}}let yt=new Map([[y.EQUIDISTANT,(e,t,n)=>Math.max(e,t)<=n],[y.ALTERNATING,(e,t,n)=>Math.max(e,t)+Math.floor(Math.min(e,t)/2)<=n],[y.MANHATTAN,(e,t,n)=>e+t<=n],[y.EXACT,(e,t,n)=>e*e+t*t<=n*n]]);var bt=class{#e;#t;constructor(e,t,n,r,i){n=Math.round(n),e=Math.round(e),t=Math.round(t),this.#e={width:e,height:t,radius:n,mode:r,gridSize:i},this.#t=xt(e,t,n,r).map(({x:e,y:t})=>({x:e*i,y:t*i}))}get bounds(){let{width:e,height:t,radius:n,gridSize:r}=this.#e;return new PIXI.Rectangle(-n*r,-n*r,(e+n*2)*r,(t+n*2)*r)}isInside(e,{auraOffset:t={x:0,y:0},tokenAltPosition:n,mode:r=`partial`}={}){let{width:i,height:a}=e.document,{x:o,y:s}=n??e;return St(i,a).map(e=>({x:o+e.x*this.#e.gridSize,y:s+e.y*this.#e.gridSize}))[r===`total`?`every`:`some`](e=>this._isPointInside(e.x-t.x,e.y-t.y))}_isPointInside(e,t){let{width:n,height:r,radius:i,mode:a,gridSize:o}=this.#e,s=e<0?Math.floor(e/o):Math.ceil(e/o),c=t<0?Math.floor(t/o):Math.ceil(t/o),l=Math.max(0,Math.min(n,s)),u=Math.max(0,Math.min(r,c));return yt.get(a)(Math.abs(s-l),Math.abs(c-u),i)}*getPath(){for(let e=0;e<this.#t.length;e++)yield{type:e===0?`m`:`l`,x:this.#t[e].x,y:this.#t[e].y};yield{type:`l`,x:this.#t[0].x,y:this.#t[0].y}}};let xt=S(function(e,t,n,r){let i=yt.get(r);if(!i)throw Error("Unknown `mode` for generateSquareAuraBorder.");let a=[],o=n;for(let e=0;e<n;e++){let t=0;for(;t<n&&i(t+1,e+1,n);t++);o!==t&&(a.push({x:o,y:e}),a.push({x:t,y:e}),o=t)}return o>0&&a.push({x:o,y:n}),[...a.map(({x:e,y:t})=>({x:-e,y:-t})),{x:0,y:-n},{x:e,y:-n},...a.map(({x:t,y:n})=>({x:n+e,y:-t})),{x:e+n,y:0},{x:e+n,y:t},...a.map(({x:n,y:r})=>({x:n+e,y:r+t})),{x:e,y:t+n},{x:0,y:t+n},...a.map(({x:e,y:n})=>({x:-n,y:e+t})),{x:-n,y:t},{x:-n,y:0}]}),St=S(function(e,t){let n=[];for(let r=0;r<t;r++)for(let t=0;t<e;t++)n.push({x:t+.5,y:r+.5});return n});var Ct=class{#e;#t;#n;#r;#i=!1;#a;#o=null;#s=null;#c;constructor(e){this.#e=e,this.#a=new tt,this.#a.sortLayer=690,this.#c=this.#a.tick.bind(this.#a)}get graphics(){return this.#a}get config(){return this.#t}get geometry(){return this.#o}get innerGeometry(){return this.#s}update(e,{tokenDelta:t,force:n=!1}={}){let r=n||!foundry.utils.equals(this.#t,e)||this.#n!==e.radiusCalculated||this.#r!==e.innerRadiusCalculated||!!t&&(`width`in t||`height`in t||`shape`in t);this.#t=e,this.#n=e.radiusCalculated,this.#r=e.innerRadiusCalculated;let i=this.updatePosition({tokenDelta:t});if(r||n){let{width:n,height:r,shape:i}=he([`width`,`height`,`shape`],t,this.#e.document);this.#l(n,r,e.radiusCalculated,e.innerRadiusCalculated,i)}let a=this.updateVisibility();return r||i||a}updatePosition({tokenDelta:e}={}){let{x:t,y:n}=this.graphics,r=this.#a.elevation;return Object.assign(this.#a,this.#u(e,this.#e)),this.#a.elevation=e?.elevation??this.#e.document.elevation,this.#a.x!==t||this.#a.y!==n||this.graphics.elevation!==r}updateVisibility(){let e=this.#i;return this.#i=this.#f(),this.#a.alpha=+!!this.#i,this.#i!==e}isInside(e,{sourceTokenPosition:t,useActualSourcePosition:n=!1,targetTokenPosition:r}={}){if(!this.#o)return!1;let i=this.#u(t,n?this.#e:this.#e.document);return this.#o.isInside(e,{auraOffset:i,tokenAltPosition:r,mode:`partial`})&&!this.#s?.isInside(e,{auraOffset:i,tokenAltPosition:r,mode:`total`})}destroy(...e){canvas.app.ticker.remove(this.#c),this.#a.destroy(...e)}async#l(e,t,r,i,a){let o={...Ee(),...this.#t};if(this.#d()?(e=0,t=0):(e??=this.#e.document.width,t??=this.#e.document.height),a??=this.#e.document.shape,typeof r!=`number`||r<0||typeof i==`number`&&i>=r){this.#a.clear(),this.#o=null,this.#s=null;return}if(r=Math.min(r,1e3),this.#o=l(r),this.#s=typeof i==`number`&&i>=0?l(i):null,!this.#o){this.#a.clear();return}let c=o.fillType===CONST.DRAWING_FILL_TYPES.PATTERN?await loadTexture(o.fillTexture):null;this.#a.update({lineType:o.lineType,lineWidth:o.lineWidth,lineColor:Color.from(o.lineColor),lineColorAnimation:o.lineColorAnimation,lineOpacity:o.lineOpacity,lineDashSize:o.lineDashSize,lineGapSize:o.lineGapSize,lineDashOffsetAnimation:o.lineDashOffsetAnimation,fillType:o.fillType,fillColor:Color.from(o.fillColor),fillColorAnimation:o.fillColorAnimation,fillOpacity:o.fillOpacity,fillTexture:c,fillTextureOffset:o.fillTextureOffset,fillTextureOffsetAnimation:o.fillTextureOffsetAnimation,fillTextureScale:o.fillTextureScale},[...this.#o.getPath()],this.#s?[[...this.#s.getPath()]]:[],this.#o.bounds),canvas.app.ticker.add(this.#c);function l(r){switch(canvas.grid.type){case CONST.GRID_TYPES.GRIDLESS:return new nt(e,t,r,canvas.grid.size);case CONST.GRID_TYPES.SQUARE:return new bt(e,t,r,game.settings.get(n,s),canvas.grid.size);default:return new ut(e,t,r,a,[CONST.GRID_TYPES.HEXEVENQ,CONST.GRID_TYPES.HEXODDQ].includes(canvas.grid.type),canvas.grid.size)}}}#u(...e){let{x:t,y:n}=he([`x`,`y`],...e),{width:r,height:i}=this.#e.document;if((r<1||i<1)&&canvas.grid.type!==CONST.GRID_TYPES.GRIDLESS){let e=canvas.grid.getOffset({x:t+this.#e.w/2,y:n+this.#e.h/2});({x:t,y:n}=canvas.grid.getTopLeftPoint(e))}let a=this.#d();return a!==void 0&&(t+=Math.max(r,1)*a.x*canvas.grid.sizeX,n+=Math.max(i,1)*a.y*canvas.grid.sizeY),{x:t,y:n}}#d(){if(canvas.grid.type===CONST.GRID_TYPES.SQUARE)switch(this.#t.position){case`TOP_LEFT`:return{x:0,y:0};case`TOP_RIGHT`:return{x:1,y:0};case`BOTTOM_RIGHT`:return{x:1,y:1};case`BOTTOM_LEFT`:return{x:0,y:1}}}#f(){if(!this.#e.visible||this.#e.hasPreview||!this.#t.enabled)return!1;let e=foundry.utils.mergeObject(Te,this.#e.isOwner?this.#t.ownerVisibility:this.#t.nonOwnerVisibility,{inplace:!1}),t=!1;if(this.#e.hover){if(e.hovered)return!0;t=!0}if(this.#e.controlled){if(e.controlled)return!0;t=!0}if(this.#e.isPreview){if(e.dragging)return!0;t=!0}if(this.#e.isTargeted){if(e.targeted)return!0;t=!0}if(this.#e.inCombat&&this.#e.combatant?.combat?.current?.tokenId===this.#e.id){if(e.turn)return!0;t=!0}return!t&&e.default}},k=class extends foundry.canvas.layers.CanvasLayer{#e=!1;_auraManager=new Le;_isTearingDown=!1;static get current(){return game.ready?game.canvas?.gaaAuraLayer:void 0}async _draw(){this._auraManager.clear(),this._isTearingDown=!1,canvas.app.ticker.addOnce(()=>{this.#e=!0,this._updateAuras({isInit:!0})},void 0,PIXI.UPDATE_PRIORITY.UTILITY)}_onDestroyToken(e){let t=this._auraManager.getTokenAuras(e);for(let n of t){if(!this._isTearingDown)for(let t of this._auraManager.getTokensInsideAura(e,n.config.id))this.#n(t,e,n.config,!1,game.userId,!1);canvas.primary.removeChild(n.graphics),n.destroy()}this._auraManager.deregisterToken(e)}_updateAuraGraphics({token:e,updatePosition:t=!0,updateVisibility:n=!0}={}){if(!this.#e)return;let r=e?[e]:canvas.tokens.placeables;for(let e of r)for(let r of this._auraManager.getTokenAuras(e))t&&r.updatePosition(),n&&r.updateVisibility()}_updateAuras({token:e,tokenDelta:t,force:n=!1,userId:r,isInit:i=!1}={}){if(!this.#e)return;r??=game.userId,n||=i;let a=e?[e]:canvas.tokens.placeables;for(let e of a){let a=Se(e),o=this._auraManager.getTokenAuras(e);for(let t of o)if(!a.some(e=>e.id===t.config.id)){for(let n of this._auraManager.getTokensInsideAura(e,t.config.id))this.#n(n,e,t.config,!1,r,!1);canvas.primary.removeChild(t.graphics),t.destroy(),this._auraManager.deregisterAura(e,t.config.id),Hooks.callAll(f,e,t.config)}for(let r of a){let a=o.find(e=>e.config.id===r.id);if(a)a.update(r,{tokenDelta:t,force:n})&&Hooks.callAll(g,e,r,{x:a.graphics.x,y:a.graphics.y},{outer:a.geometry,inner:a.innerGeometry});else{let a=new Ct(e);a.update(r,{tokenDelta:t,force:n}),canvas.primary.addChild(a.graphics),this._auraManager.registerAura(e,a),Hooks.callAll(d,e,r,{x:a.graphics.x,y:a.graphics.y},{outer:a.geometry,inner:a.innerGeometry},{isInit:i})}}}e?this._testCollisionsForToken(e,{tokenDelta:t,userId:r}):this.#t({userId:r,isInit:i})}_updateActorAuras(e,{userId:t}={}){for(let n of e.getActiveTokens({linked:!0,document:!0}))this._updateAuras({token:n,userId:t})}#t({userId:e,sourceToken:t,sourceTokenDelta:n,targetToken:r,targetTokenDelta:i,destroyToken:a,useActualPosition:o=!1,isInit:s=!1}={}){if(!this.#e)return;let c=(t?[t]:[...game.canvas.tokens.placeables]).flatMap(e=>this._auraManager.getTokenAuras(e).map(t=>({parent:e,aura:t}))),l=r?[r]:[...game.canvas.tokens.placeables];for(let t of l){let r=he([`x`,`y`],i,o?t:t.document);for(let{parent:i,aura:l}of c){if(i.id===t.id)continue;let c=l.config.enabled&&i!==a&&t!==a&&l.isInside(t,{sourceTokenPosition:n,useActualSourcePosition:o,targetTokenPosition:r});this._auraManager.setIsInside(t,i,l.config.id,c)&&this.#n(t,i,l.config,c,e??game.userId,s)}}}_testCollisionsForToken(e,{tokenDelta:t,userId:n,useActualPosition:r=!1,destroyToken:i=!1}={}){this.#t({userId:n,sourceToken:e,sourceTokenDelta:t,destroyToken:i?e:void 0,useActualPosition:r}),this.#t({userId:n,targetToken:e,targetTokenDelta:t,destroyToken:i?e:void 0,useActualPosition:r})}#n(e,t,n,r,i,a){let o=t.isPreview||e.isPreview;Hooks.callAll(m,e,t,n,{hasEntered:r,isPreview:o,isInit:a,userId:i})}},wt=t({createAura:()=>Tt,deleteAuras:()=>Et,getAurasContainingToken:()=>kt,getDocumentOwnAuras:()=>Dt,getTokenAuras:()=>Ot,getTokensInsideAura:()=>At,isTokenInside:()=>jt,registerRadiusExpressionExtension:()=>Mt,toggleEffect:()=>Nt,updateAuras:()=>Pt});async function Tt(e,t={}){e=e instanceof foundry.canvas.placeables.Token?e.document:e;let r=w(e),a=foundry.utils.mergeObject(Ee(),t,{inplace:!1});return a.id=foundry.utils.randomID(),await e.update({[`flags.${n}.${i}`]:[...r,a]}),a}async function Et(e,t,{includeItems:r=!1}={}){return e=e instanceof foundry.canvas.placeables.Token?e.document:e,(await Promise.all([a(e),...e instanceof TokenDocument&&r?e.actor?.items?.map(a)??[]:[]])).flat();async function a(e){let r=w(e),a=Object.groupBy(r,e=>Ft(e,t));return a[!0]?.length>0&&await e.update({[`flags.${n}.${i}`]:a[!1]??[]}),a[!0]??[]}}function Dt(e){return e=e instanceof foundry.canvas.placeables.Token?e.document:e,w(e,{calculateRadius:!0})}function Ot(e){let t=e instanceof foundry.canvas.placeables.Token?e.document:e;return[...Dt(t).map(e=>({aura:e,owner:t})),...t.actor?.items?.map(e=>Dt(e).map(t=>({aura:t,owner:e})))?.flat()??[]]}function kt(e){return(k.current?._auraManager.getAurasContainingToken(e)??[]).map(({parent:e,aura:t})=>({parent:e,aura:t.config}))}function At(e,t){return k.current?._auraManager.getTokensInsideAura(e,t)??[]}function jt(e,t,n){return k.current?._auraManager.isInside(e,t,n)??!1}function Mt(e,t,n){return ve(e,t,n)}async function Nt(e,t,n,{overlay:r=!1}={}){let i;if(e instanceof foundry.canvas.placeables.Token||e instanceof TokenDocument)i=e.actor;else if(e instanceof Actor)i=e;else if(typeof e==`string`)return await Nt(await fromUuid(e),t,n,{overlay:r});if(!i)throw Error(`Could not resolve actor.`);await x(i,t,!!n,{overlay:r},!0)}async function Pt(e,t,r,{includeItems:a=!1}={}){if(e=e instanceof foundry.canvas.placeables.Token?e.document:e,!r||![`object`,`function`].includes(typeof r))throw Error("Must provide an object or a function as the `update` parameter.");return(await Promise.all([o(e),...e instanceof TokenDocument&&a?e.actor?.items?.map(o)??[]:[]])).flat();async function o(e){let a=w(e),o=[],s=!1;for(let e of a)Ft(e,t)&&(Object.assign(e,typeof r==`function`?r(e):r),o.push(e),s=!0);return s&&await e.update({[`flags.${n}.${i}`]:a}),o}}function Ft(e,t){return(t?.id===void 0||typeof t.id==`string`&&e.id===t.id||t.id instanceof RegExp&&t.id.test(e.id))&&(t?.name===void 0||typeof t.name==`string`&&e.name.localeCompare(t.name,void 0,{sensitivity:`accent`})===0||t.name instanceof RegExp&&t.name.test(e.name))}
/**
* @license
* Copyright 2019 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
let It=globalThis,Lt=It.ShadowRoot&&(It.ShadyCSS===void 0||It.ShadyCSS.nativeShadow)&&`adoptedStyleSheets`in Document.prototype&&`replace`in CSSStyleSheet.prototype,Rt=Symbol(),zt=new WeakMap;var Bt=class{constructor(e,t,n){if(this._$cssResult$=!0,n!==Rt)throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");this.cssText=e,this.t=t}get styleSheet(){let e=this.o,t=this.t;if(Lt&&e===void 0){let n=t!==void 0&&t.length===1;n&&(e=zt.get(t)),e===void 0&&((this.o=e=new CSSStyleSheet).replaceSync(this.cssText),n&&zt.set(t,e))}return e}toString(){return this.cssText}};let Vt=e=>new Bt(typeof e==`string`?e:e+``,void 0,Rt),Ht=(e,t)=>{if(Lt)e.adoptedStyleSheets=t.map(e=>e instanceof CSSStyleSheet?e:e.styleSheet);else for(let n of t){let t=document.createElement(`style`),r=It.litNonce;r!==void 0&&t.setAttribute(`nonce`,r),t.textContent=n.cssText,e.appendChild(t)}},Ut=Lt?e=>e:e=>e instanceof CSSStyleSheet?(e=>{let t=``;for(let n of e.cssRules)t+=n.cssText;return Vt(t)})(e):e,{is:Wt,defineProperty:Gt,getOwnPropertyDescriptor:Kt,getOwnPropertyNames:qt,getOwnPropertySymbols:Jt,getPrototypeOf:Yt}=Object,Xt=globalThis,Zt=Xt.trustedTypes,Qt=Zt?Zt.emptyScript:``,$t=Xt.reactiveElementPolyfillSupport,en=(e,t)=>e,tn={toAttribute(e,t){switch(t){case Boolean:e=e?Qt:null;break;case Object:case Array:e=e==null?e:JSON.stringify(e)}return e},fromAttribute(e,t){let n=e;switch(t){case Boolean:n=e!==null;break;case Number:n=e===null?null:Number(e);break;case Object:case Array:try{n=JSON.parse(e)}catch{n=null}}return n}},nn=(e,t)=>!Wt(e,t),rn={attribute:!0,type:String,converter:tn,reflect:!1,useDefault:!1,hasChanged:nn};Symbol.metadata??=Symbol(`metadata`),Xt.litPropertyMetadata??=new WeakMap;var A=class extends HTMLElement{static addInitializer(e){this._$Ei(),(this.l??=[]).push(e)}static get observedAttributes(){return this.finalize(),this._$Eh&&[...this._$Eh.keys()]}static createProperty(e,t=rn){if(t.state&&(t.attribute=!1),this._$Ei(),this.prototype.hasOwnProperty(e)&&((t=Object.create(t)).wrapped=!0),this.elementProperties.set(e,t),!t.noAccessor){let n=Symbol(),r=this.getPropertyDescriptor(e,n,t);r!==void 0&&Gt(this.prototype,e,r)}}static getPropertyDescriptor(e,t,n){let{get:r,set:i}=Kt(this.prototype,e)??{get(){return this[t]},set(e){this[t]=e}};return{get:r,set(t){let a=r?.call(this);i?.call(this,t),this.requestUpdate(e,a,n)},configurable:!0,enumerable:!0}}static getPropertyOptions(e){return this.elementProperties.get(e)??rn}static _$Ei(){if(this.hasOwnProperty(en(`elementProperties`)))return;let e=Yt(this);e.finalize(),e.l!==void 0&&(this.l=[...e.l]),this.elementProperties=new Map(e.elementProperties)}static finalize(){if(this.hasOwnProperty(en(`finalized`)))return;if(this.finalized=!0,this._$Ei(),this.hasOwnProperty(en(`properties`))){let e=this.properties,t=[...qt(e),...Jt(e)];for(let n of t)this.createProperty(n,e[n])}let e=this[Symbol.metadata];if(e!==null){let t=litPropertyMetadata.get(e);if(t!==void 0)for(let[e,n]of t)this.elementProperties.set(e,n)}this._$Eh=new Map;for(let[e,t]of this.elementProperties){let n=this._$Eu(e,t);n!==void 0&&this._$Eh.set(n,e)}this.elementStyles=this.finalizeStyles(this.styles)}static finalizeStyles(e){let t=[];if(Array.isArray(e)){let n=new Set(e.flat(1/0).reverse());for(let e of n)t.unshift(Ut(e))}else e!==void 0&&t.push(Ut(e));return t}static _$Eu(e,t){let n=t.attribute;return!1===n?void 0:typeof n==`string`?n:typeof e==`string`?e.toLowerCase():void 0}constructor(){super(),this._$Ep=void 0,this.isUpdatePending=!1,this.hasUpdated=!1,this._$Em=null,this._$Ev()}_$Ev(){this._$ES=new Promise(e=>this.enableUpdating=e),this._$AL=new Map,this._$E_(),this.requestUpdate(),this.constructor.l?.forEach(e=>e(this))}addController(e){(this._$EO??=new Set).add(e),this.renderRoot!==void 0&&this.isConnected&&e.hostConnected?.()}removeController(e){this._$EO?.delete(e)}_$E_(){let e=new Map,t=this.constructor.elementProperties;for(let n of t.keys())this.hasOwnProperty(n)&&(e.set(n,this[n]),delete this[n]);e.size>0&&(this._$Ep=e)}createRenderRoot(){let e=this.shadowRoot??this.attachShadow(this.constructor.shadowRootOptions);return Ht(e,this.constructor.elementStyles),e}connectedCallback(){this.renderRoot??=this.createRenderRoot(),this.enableUpdating(!0),this._$EO?.forEach(e=>e.hostConnected?.())}enableUpdating(e){}disconnectedCallback(){this._$EO?.forEach(e=>e.hostDisconnected?.())}attributeChangedCallback(e,t,n){this._$AK(e,n)}_$ET(e,t){let n=this.constructor.elementProperties.get(e),r=this.constructor._$Eu(e,n);if(r!==void 0&&!0===n.reflect){let i=(n.converter?.toAttribute===void 0?tn:n.converter).toAttribute(t,n.type);this._$Em=e,i==null?this.removeAttribute(r):this.setAttribute(r,i),this._$Em=null}}_$AK(e,t){let n=this.constructor,r=n._$Eh.get(e);if(r!==void 0&&this._$Em!==r){let e=n.getPropertyOptions(r),i=typeof e.converter==`function`?{fromAttribute:e.converter}:e.converter?.fromAttribute===void 0?tn:e.converter;this._$Em=r;let a=i.fromAttribute(t,e.type);this[r]=a??this._$Ej?.get(r)??a,this._$Em=null}}requestUpdate(e,t,n,r=!1,i){if(e!==void 0){let a=this.constructor;if(!1===r&&(i=this[e]),n??=a.getPropertyOptions(e),!((n.hasChanged??nn)(i,t)||n.useDefault&&n.reflect&&i===this._$Ej?.get(e)&&!this.hasAttribute(a._$Eu(e,n))))return;this.C(e,t,n)}!1===this.isUpdatePending&&(this._$ES=this._$EP())}C(e,t,{useDefault:n,reflect:r,wrapped:i},a){n&&!(this._$Ej??=new Map).has(e)&&(this._$Ej.set(e,a??t??this[e]),!0!==i||a!==void 0)||(this._$AL.has(e)||(this.hasUpdated||n||(t=void 0),this._$AL.set(e,t)),!0===r&&this._$Em!==e&&(this._$Eq??=new Set).add(e))}async _$EP(){this.isUpdatePending=!0;try{await this._$ES}catch(e){Promise.reject(e)}let e=this.scheduleUpdate();return e!=null&&await e,!this.isUpdatePending}scheduleUpdate(){return this.performUpdate()}performUpdate(){if(!this.isUpdatePending)return;if(!this.hasUpdated){if(this.renderRoot??=this.createRenderRoot(),this._$Ep){for(let[e,t]of this._$Ep)this[e]=t;this._$Ep=void 0}let e=this.constructor.elementProperties;if(e.size>0)for(let[t,n]of e){let{wrapped:e}=n,r=this[t];!0!==e||this._$AL.has(t)||r===void 0||this.C(t,void 0,n,r)}}let e=!1,t=this._$AL;try{e=this.shouldUpdate(t),e?(this.willUpdate(t),this._$EO?.forEach(e=>e.hostUpdate?.()),this.update(t)):this._$EM()}catch(t){throw e=!1,this._$EM(),t}e&&this._$AE(t)}willUpdate(e){}_$AE(e){this._$EO?.forEach(e=>e.hostUpdated?.()),this.hasUpdated||(this.hasUpdated=!0,this.firstUpdated(e)),this.updated(e)}_$EM(){this._$AL=new Map,this.isUpdatePending=!1}get updateComplete(){return this.getUpdateComplete()}getUpdateComplete(){return this._$ES}shouldUpdate(e){return!0}update(e){this._$Eq&&=this._$Eq.forEach(e=>this._$ET(e,this[e])),this._$EM()}updated(e){}firstUpdated(e){}};A.elementStyles=[],A.shadowRootOptions={mode:`open`},A[en(`elementProperties`)]=new Map,A[en(`finalized`)]=new Map,$t?.({ReactiveElement:A}),(Xt.reactiveElementVersions??=[]).push(`2.1.2`);
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
let an=globalThis,on=e=>e,sn=an.trustedTypes,cn=sn?sn.createPolicy(`lit-html`,{createHTML:e=>e}):void 0,ln=`$lit$`,j=`lit$${Math.random().toFixed(9).slice(2)}$`,un=`?`+j,dn=`<${un}>`,M=document,fn=()=>M.createComment(``),pn=e=>e===null||typeof e!=`object`&&typeof e!=`function`,mn=Array.isArray,hn=e=>mn(e)||typeof e?.[Symbol.iterator]==`function`,gn=`[ 	
\f\r]`,_n=/<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,vn=/-->/g,yn=/>/g,N=RegExp(`>|${gn}(?:([^\\s"'>=/]+)(${gn}*=${gn}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,`g`),bn=/'/g,xn=/"/g,Sn=/^(?:script|style|textarea|title)$/i,P=(e=>(t,...n)=>({_$litType$:e,strings:t,values:n}))(1),F=Symbol.for(`lit-noChange`),I=Symbol.for(`lit-nothing`),Cn=new WeakMap,L=M.createTreeWalker(M,129);function wn(e,t){if(!mn(e)||!e.hasOwnProperty(`raw`))throw Error(`invalid template strings array`);return cn===void 0?t:cn.createHTML(t)}let Tn=(e,t)=>{let n=e.length-1,r=[],i,a=t===2?`<svg>`:t===3?`<math>`:``,o=_n;for(let t=0;t<n;t++){let n=e[t],s,c,l=-1,u=0;for(;u<n.length&&(o.lastIndex=u,c=o.exec(n),c!==null);)u=o.lastIndex,o===_n?c[1]===`!--`?o=vn:c[1]===void 0?c[2]===void 0?c[3]!==void 0&&(o=N):(Sn.test(c[2])&&(i=RegExp(`</`+c[2],`g`)),o=N):o=yn:o===N?c[0]===`>`?(o=i??_n,l=-1):c[1]===void 0?l=-2:(l=o.lastIndex-c[2].length,s=c[1],o=c[3]===void 0?N:c[3]===`"`?xn:bn):o===xn||o===bn?o=N:o===vn||o===yn?o=_n:(o=N,i=void 0);let d=o===N&&e[t+1].startsWith(`/>`)?` `:``;a+=o===_n?n+dn:l>=0?(r.push(s),n.slice(0,l)+ln+n.slice(l)+j+d):n+j+(l===-2?t:d)}return[wn(e,a+(e[n]||`<?>`)+(t===2?`</svg>`:t===3?`</math>`:``)),r]};var En=class e{constructor({strings:t,_$litType$:n},r){let i;this.parts=[];let a=0,o=0,s=t.length-1,c=this.parts,[l,u]=Tn(t,n);if(this.el=e.createElement(l,r),L.currentNode=this.el.content,n===2||n===3){let e=this.el.content.firstChild;e.replaceWith(...e.childNodes)}for(;(i=L.nextNode())!==null&&c.length<s;){if(i.nodeType===1){if(i.hasAttributes())for(let e of i.getAttributeNames())if(e.endsWith(ln)){let t=u[o++],n=i.getAttribute(e).split(j),r=/([.?@])?(.*)/.exec(t);c.push({type:1,index:a,name:r[2],strings:n,ctor:r[1]===`.`?An:r[1]===`?`?jn:r[1]===`@`?Mn:kn}),i.removeAttribute(e)}else e.startsWith(j)&&(c.push({type:6,index:a}),i.removeAttribute(e));if(Sn.test(i.tagName)){let e=i.textContent.split(j),t=e.length-1;if(t>0){i.textContent=sn?sn.emptyScript:``;for(let n=0;n<t;n++)i.append(e[n],fn()),L.nextNode(),c.push({type:2,index:++a});i.append(e[t],fn())}}}else if(i.nodeType===8)if(i.data===un)c.push({type:2,index:a});else{let e=-1;for(;(e=i.data.indexOf(j,e+1))!==-1;)c.push({type:7,index:a}),e+=j.length-1}a++}}static createElement(e,t){let n=M.createElement(`template`);return n.innerHTML=e,n}};function R(e,t,n=e,r){if(t===F)return t;let i=r===void 0?n._$Cl:n._$Co?.[r],a=pn(t)?void 0:t._$litDirective$;return i?.constructor!==a&&(i?._$AO?.(!1),a===void 0?i=void 0:(i=new a(e),i._$AT(e,n,r)),r===void 0?n._$Cl=i:(n._$Co??=[])[r]=i),i!==void 0&&(t=R(e,i._$AS(e,t.values),i,r)),t}var Dn=class{constructor(e,t){this._$AV=[],this._$AN=void 0,this._$AD=e,this._$AM=t}get parentNode(){return this._$AM.parentNode}get _$AU(){return this._$AM._$AU}u(e){let{el:{content:t},parts:n}=this._$AD,r=(e?.creationScope??M).importNode(t,!0);L.currentNode=r;let i=L.nextNode(),a=0,o=0,s=n[0];for(;s!==void 0;){if(a===s.index){let t;s.type===2?t=new On(i,i.nextSibling,this,e):s.type===1?t=new s.ctor(i,s.name,s.strings,this,e):s.type===6&&(t=new Nn(i,this,e)),this._$AV.push(t),s=n[++o]}a!==s?.index&&(i=L.nextNode(),a++)}return L.currentNode=M,r}p(e){let t=0;for(let n of this._$AV)n!==void 0&&(n.strings===void 0?n._$AI(e[t]):(n._$AI(e,n,t),t+=n.strings.length-2)),t++}},On=class e{get _$AU(){return this._$AM?._$AU??this._$Cv}constructor(e,t,n,r){this.type=2,this._$AH=I,this._$AN=void 0,this._$AA=e,this._$AB=t,this._$AM=n,this.options=r,this._$Cv=r?.isConnected??!0}get parentNode(){let e=this._$AA.parentNode,t=this._$AM;return t!==void 0&&e?.nodeType===11&&(e=t.parentNode),e}get startNode(){return this._$AA}get endNode(){return this._$AB}_$AI(e,t=this){e=R(this,e,t),pn(e)?e===I||e==null||e===``?(this._$AH!==I&&this._$AR(),this._$AH=I):e!==this._$AH&&e!==F&&this._(e):e._$litType$===void 0?e.nodeType===void 0?hn(e)?this.k(e):this._(e):this.T(e):this.$(e)}O(e){return this._$AA.parentNode.insertBefore(e,this._$AB)}T(e){this._$AH!==e&&(this._$AR(),this._$AH=this.O(e))}_(e){this._$AH!==I&&pn(this._$AH)?this._$AA.nextSibling.data=e:this.T(M.createTextNode(e)),this._$AH=e}$(e){let{values:t,_$litType$:n}=e,r=typeof n==`number`?this._$AC(e):(n.el===void 0&&(n.el=En.createElement(wn(n.h,n.h[0]),this.options)),n);if(this._$AH?._$AD===r)this._$AH.p(t);else{let e=new Dn(r,this),n=e.u(this.options);e.p(t),this.T(n),this._$AH=e}}_$AC(e){let t=Cn.get(e.strings);return t===void 0&&Cn.set(e.strings,t=new En(e)),t}k(t){mn(this._$AH)||(this._$AH=[],this._$AR());let n=this._$AH,r,i=0;for(let a of t)i===n.length?n.push(r=new e(this.O(fn()),this.O(fn()),this,this.options)):r=n[i],r._$AI(a),i++;i<n.length&&(this._$AR(r&&r._$AB.nextSibling,i),n.length=i)}_$AR(e=this._$AA.nextSibling,t){for(this._$AP?.(!1,!0,t);e!==this._$AB;){let t=on(e).nextSibling;on(e).remove(),e=t}}setConnected(e){this._$AM===void 0&&(this._$Cv=e,this._$AP?.(e))}},kn=class{get tagName(){return this.element.tagName}get _$AU(){return this._$AM._$AU}constructor(e,t,n,r,i){this.type=1,this._$AH=I,this._$AN=void 0,this.element=e,this.name=t,this._$AM=r,this.options=i,n.length>2||n[0]!==``||n[1]!==``?(this._$AH=Array(n.length-1).fill(new String),this.strings=n):this._$AH=I}_$AI(e,t=this,n,r){let i=this.strings,a=!1;if(i===void 0)e=R(this,e,t,0),a=!pn(e)||e!==this._$AH&&e!==F,a&&(this._$AH=e);else{let r=e,o,s;for(e=i[0],o=0;o<i.length-1;o++)s=R(this,r[n+o],t,o),s===F&&(s=this._$AH[o]),a||=!pn(s)||s!==this._$AH[o],s===I?e=I:e!==I&&(e+=(s??``)+i[o+1]),this._$AH[o]=s}a&&!r&&this.j(e)}j(e){e===I?this.element.removeAttribute(this.name):this.element.setAttribute(this.name,e??``)}},An=class extends kn{constructor(){super(...arguments),this.type=3}j(e){this.element[this.name]=e===I?void 0:e}},jn=class extends kn{constructor(){super(...arguments),this.type=4}j(e){this.element.toggleAttribute(this.name,!!e&&e!==I)}},Mn=class extends kn{constructor(e,t,n,r,i){super(e,t,n,r,i),this.type=5}_$AI(e,t=this){if((e=R(this,e,t,0)??I)===F)return;let n=this._$AH,r=e===I&&n!==I||e.capture!==n.capture||e.once!==n.once||e.passive!==n.passive,i=e!==I&&(n===I||r);r&&this.element.removeEventListener(this.name,this,n),i&&this.element.addEventListener(this.name,this,e),this._$AH=e}handleEvent(e){typeof this._$AH==`function`?this._$AH.call(this.options?.host??this.element,e):this._$AH.handleEvent(e)}},Nn=class{constructor(e,t,n){this.element=e,this.type=6,this._$AN=void 0,this._$AM=t,this.options=n}get _$AU(){return this._$AM._$AU}_$AI(e){R(this,e)}};let Pn={M:ln,P:j,A:un,C:1,L:Tn,R:Dn,D:hn,V:R,I:On,H:kn,N:jn,U:Mn,B:An,F:Nn},Fn=an.litHtmlPolyfillSupport;Fn?.(En,On),(an.litHtmlVersions??=[]).push(`3.3.2`);let z=(e,t,n)=>{let r=n?.renderBefore??t,i=r._$litPart$;if(i===void 0){let e=n?.renderBefore??null;r._$litPart$=i=new On(t.insertBefore(fn(),e),e,void 0,n??{})}return i._$AI(e),i},In=globalThis;var B=class extends A{constructor(){super(...arguments),this.renderOptions={host:this},this._$Do=void 0}createRenderRoot(){let e=super.createRenderRoot();return this.renderOptions.renderBefore??=e.firstChild,e}update(e){let t=this.render();this.hasUpdated||(this.renderOptions.isConnected=this.isConnected),super.update(e),this._$Do=z(t,this.renderRoot,this.renderOptions)}connectedCallback(){super.connectedCallback(),this._$Do?.setConnected(!0)}disconnectedCallback(){super.disconnectedCallback(),this._$Do?.setConnected(!1)}render(){return F}};B._$litElement$=!0,B.finalized=!0,In.litElementHydrateSupport?.({LitElement:B});let Ln=In.litElementPolyfillSupport;Ln?.({LitElement:B}),(In.litElementVersions??=[]).push(`4.2.2`);
/**
* @license
* Copyright 2020 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/let{I:Rn}=Pn,zn=e=>e,Bn=e=>e.strings===void 0,Vn=()=>document.createComment(``),Hn=(e,t,n)=>{let r=e._$AA.parentNode,i=t===void 0?e._$AB:t._$AA;if(n===void 0)n=new Rn(r.insertBefore(Vn(),i),r.insertBefore(Vn(),i),e,e.options);else{let t=n._$AB.nextSibling,a=n._$AM,o=a!==e;if(o){let t;n._$AQ?.(e),n._$AM=e,n._$AP!==void 0&&(t=e._$AU)!==a._$AU&&n._$AP(t)}if(t!==i||o){let e=n._$AA;for(;e!==t;){let t=zn(e).nextSibling;zn(r).insertBefore(e,i),e=t}}}return n},V=(e,t,n=e)=>(e._$AI(t,n),e),Un={},Wn=(e,t=Un)=>e._$AH=t,Gn=e=>e._$AH,Kn=e=>{e._$AR(),e._$AA.remove()},qn={ATTRIBUTE:1,CHILD:2,PROPERTY:3,BOOLEAN_ATTRIBUTE:4,EVENT:5,ELEMENT:6},H=e=>(...t)=>({_$litDirective$:e,values:t});var Jn=class{constructor(e){}get _$AU(){return this._$AM._$AU}_$AT(e,t,n){this._$Ct=e,this._$AM=t,this._$Ci=n}_$AS(e,t){return this.update(e,t)}update(e,t){return this.render(...t)}};
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/let Yn=(e,t)=>{let n=e._$AN;if(n===void 0)return!1;for(let e of n)e._$AO?.(t,!1),Yn(e,t);return!0},Xn=e=>{let t,n;do{if((t=e._$AM)===void 0)break;n=t._$AN,n.delete(e),e=t}while(n?.size===0)},Zn=e=>{for(let t;t=e._$AM;e=t){let n=t._$AN;if(n===void 0)t._$AN=n=new Set;else if(n.has(e))break;n.add(e),er(t)}};function Qn(e){this._$AN===void 0?this._$AM=e:(Xn(this),this._$AM=e,Zn(this))}function $n(e,t=!1,n=0){let r=this._$AH,i=this._$AN;if(i!==void 0&&i.size!==0)if(t)if(Array.isArray(r))for(let e=n;e<r.length;e++)Yn(r[e],!1),Xn(r[e]);else r!=null&&(Yn(r,!1),Xn(r));else Yn(this,e)}let er=e=>{e.type==qn.CHILD&&(e._$AP??=$n,e._$AQ??=Qn)};var tr=class extends Jn{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,n){super._$AT(e,t,n),Zn(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(Yn(this,e),Xn(this))}setValue(e){if(Bn(this._$Ct))this._$Ct._$AI(e,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}};
/**
* @license
* Copyright 2020 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/let U=()=>new nr;var nr=class{};let rr=new WeakMap,W=H(class extends tr{render(e){return I}update(e,[t]){let n=t!==this.G;return n&&this.G!==void 0&&this.rt(void 0),(n||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),I}rt(e){if(this.isConnected||(e=void 0),typeof this.G==`function`){let t=this.ht??globalThis,n=rr.get(t);n===void 0&&(n=new WeakMap,rr.set(t,n)),n.get(this.G)!==void 0&&this.G.call(this.ht,void 0),n.set(this.G,e),e!==void 0&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return typeof this.G==`function`?rr.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}});
/**
* @license
* Copyright 2021 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
function G(e,t,n){return e?t(e):n?.(e)}
/**
* @license
* Copyright 2018 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/let K=H(class extends Jn{constructor(e){if(super(e),e.type!==qn.ATTRIBUTE||e.name!==`class`||e.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(e){return` `+Object.keys(e).filter(t=>e[t]).join(` `)+` `}update(e,[t]){if(this.st===void 0){this.st=new Set,e.strings!==void 0&&(this.nt=new Set(e.strings.join(` `).split(/\s/).filter(e=>e!==``)));for(let e in t)t[e]&&!this.nt?.has(e)&&this.st.add(e);return this.render(t)}let n=e.element.classList;for(let e of this.st)e in t||(n.remove(e),this.st.delete(e));for(let e in t){let r=!!t[e];r===this.st.has(e)||this.nt?.has(e)||(r?(n.add(e),this.st.add(e)):(n.remove(e),this.st.delete(e)))}return F}});var ir=class extends B{static properties={_filteredDataPaths:{state:!0},_isInputFocused:{state:!0},_focusedDataPath:{state:!0},dataPaths:{attribute:!1},value:{type:String},placeholder:{type:String},disabled:{type:Boolean},name:{type:String}};static formAssociated=!0;#e;_inputRef=U();#t=null;constructor(){super(),this.#e=this.attachInternals(),this._filteredDataPaths=[],this._isInputFocused=!1,this._focusedDataPath=null,this.dataPaths=[],this.value=``,this.placeholder=``,this.disabled=!1}get _isDropdownOpen(){return this._isInputFocused&&!this.disabled&&!!this.#s()&&this._filteredDataPaths.length>0}render(){return P`
			<input
				${W(this._inputRef)}
				type="text"
				.value=${this.value}
				placeholder=${this.placeholder}
				@focus=${()=>{this._isInputFocused=!0,this.#o()}}
				@blur=${()=>this._isInputFocused=!1}
				@input=${e=>this.#u(e.target.value,e)}
				@click=${()=>this.#o()}
				@keyup=${()=>this.#o()}
				@keydown=${e=>this.#a(e)}
				?disabled=${this.disabled}
			>
		`}#n(){return P`
			<menu class="dropdown-menu-fwl">
				${this._filteredDataPaths.map(e=>P`
					<li
						class=${K({active:e===this._focusedDataPath})}
						@mousedown=${()=>this.#c(e)}
						@pointerenter=${()=>this.#l(e,!1)}
					>
						${q(e.path)}
					</li>
				`)}
			</menu>
		`}willUpdate(e){this._isDropdownOpen&&[`value`,`dataPaths`,`_isInputFocused`].some(t=>e.has(t))&&(this.#o(),this._filteredDataPaths.length===0?this.#l(null):this._filteredDataPaths.includes(this._focusedDataPath)||this.#l(this._filteredDataPaths[0]))}update(e){super.update(e),this.#r()}updated(){this.#i()}disconnectedCallback(){super.disconnectedCallback(),this.#t?.remove(),this.#t=null}#r(){if(!this._isDropdownOpen){this.#t?.remove(),this.#t=null,this._focusedDataPath=null;return}this.#t||(this.#t=document.createElement(`div`),this.#t.classList.add(`gaa-data-path-autocomplete-dropdown`),document.body.appendChild(this.#t)),z(this.#n(),this.#t)}#i(){if(!this.#t)return;let{top:e,left:t,width:n,height:r}=this.getBoundingClientRect(),{width:i,height:a}=this.#t.getBoundingClientRect();Object.assign(this.#t.style,{top:e+r+a>window.innerHeight?`${e-a}px`:`${e+r}px`,left:t+i>window.innerWidth?`${t+n-i}px`:`${t}px`,minWidth:`${n}px`})}#a(e){switch(e.key){case`ArrowUp`:case`ArrowDown`:{let t=this._filteredDataPaths.indexOf(this._focusedDataPath);e.key===`ArrowDown`&&t<this._filteredDataPaths.length-1?this.#l(this._filteredDataPaths[t+1]):e.key===`ArrowUp`&&t>0&&this.#l(this._filteredDataPaths[t-1]),e.preventDefault(),e.stopImmediatePropagation();break}case`Enter`:case`Tab`:this._focusedDataPath&&this.#c(this._focusedDataPath),e.preventDefault(),e.stopImmediatePropagation();break;default:this.#o();break}}#o(){let e=this.#s();if(!e){this._filteredDataPaths=[];return}let t=e.value.split(`.`).filter(e=>e!==``).map(e=>Number.isNaN(+e)?e.toLowerCase():Number);if(!t.length){this._filteredDataPaths=this.dataPaths;return}let n=[];for(let e of this.dataPaths){let{distances:r,textIndices:i}=t.reduce(({distances:t,textIndices:n,startIndex:r},i)=>{let a=-1,o=-1,s=r;for(;s<e.path.length;s++)if(e.path[s]===Number&&i===Number){a=s;break}else if(e.path[s]!==Number&&i!==Number&&(o=e.path[s].toLowerCase().indexOf(i),o>-1)){a=s;break}return{distances:[...t,a===-1?-1:a-r],textIndices:[...n,o],startIndex:s+1}},{distances:[],textIndices:[],startIndex:0});r.includes(-1)||n.push({dataPath:e,distances:r,textIndices:i})}let r=n.sort((e,n)=>{for(let r=0;r<t.length;r++){if(e.textIndices[r]!==n.textIndices[r])return e.textIndices[r]-n.textIndices[r];if(e.distances[r]!==n.distances[r])return e.distances[r]-n.distances[r]}return 0}).map(({dataPath:e})=>e);this._filteredDataPaths=r.length===1&&q(r[0].path)===e.value?[]:r}#s(){if(!this._isInputFocused||!this._inputRef.value)return null;let{selectionStart:e,selectionEnd:t,value:n}=this._inputRef.value;if(typeof e!=`number`)return null;let r=e-1;for(;;){if(r<0)return null;if(n[r]===`@`)break;if(!sr(n[r]))return null;r--}r++;let i=e;for(;i<n.length&&sr(n[i]);i++);return t>i?null:{start:r,end:i,value:n.slice(r,i)}}#c(e){let t=this.#s();if(!t)return;let n=q(e.path);this.#u(this.value.slice(0,t.start)+n+this.value.slice(t.end,this.value.length));let r=t.start+n.length;setTimeout(()=>{this._inputRef.value?.focus(),this._inputRef.value?.setSelectionRange(r,r)},0)}#l(e,t=!0){this._focusedDataPath=e;let n=this.#t;t&&n&&this.updateComplete.then(()=>n.querySelector(`li.active`).scrollIntoView({block:`nearest`}))}#u(e,t){this.value=e,this.#e.setFormValue(e),t?.preventDefault(),t?.stopImmediatePropagation(),this.dispatchEvent(new Event(`input`,{bubbles:!0,cancelable:!1,composed:!0}))}createRenderRoot(){return this}};function ar(e,{prefix:t=``}={}){let n=t.split(`.`).filter(Boolean),r=new Set,i=a([...n],e).map(e=>({path:e}));return i.sort((e,t)=>q(e.path).localeCompare(q(t.path),void 0,{sensitivity:`base`})),i;function a(e,t,n){if(n>16)return[];switch(!0){case t==null||typeof t==`number`:return[[...e]];case Array.isArray(t):return t.length>0?a([...e,Number],t[0]):[];case typeof t==`object`:return r.has(t)?[]:(r.add(t),Object.entries(t).filter(([e])=>e[0]!==`_`).flatMap(([t,n])=>a([...e,t],n)));default:return[]}}}function or(e,{prefix:t=``}={}){let{ArrayField:n,NumberField:r,SchemaField:i}=foundry.data.fields,a=t.split(`.`).filter(Boolean),o=[];for(let t of Object.values(e)){let{schema:e}=t;for(let t of s([...a,e.name],e))o.find(e=>le(e.path,t))||o.push({path:t})}return o.sort((e,t)=>q(e.path).localeCompare(q(t.path),void 0,{sensitivity:`base`})),o;function s(e,t){switch(!0){case t instanceof n:return s([...e,Number],t.element);case t instanceof i:return Object.values(t.fields).flatMap(t=>s([...e,t.name],t));case t instanceof r:return[[...e]];default:return[]}}}function q(e){return e.map(e=>e===Number?`0`:e).join(`.`)}function sr(e){let t=e.charCodeAt(0);return t>=97&&t<=122||t>=65&&t<=90||t>=48&&t<=57||[`.`,`-`,`_`].includes(e)}customElements.define(`gaa-data-path-autocomplete`,ir);let cr=[],lr=[];function ur(){return[...cr.map(({id:e,name:t,group:n})=>({value:e,label:t,group:n})),...lr.map(({id:e,name:t})=>({value:e,label:t,group:game.i18n.localize(`GRIDAWAREAURAS.AuraDisplayCustom`)}))]}function dr(){cr=[{id:`ALL`,name:game.i18n.localize(`All`),group:``,f:()=>!0},{id:`FRIENDLY`,name:game.i18n.localize(`TOKEN.DISPOSITION.FRIENDLY`),group:game.i18n.localize(`TOKEN.Disposition`),f:e=>e.document.disposition===CONST.TOKEN_DISPOSITIONS.FRIENDLY},{id:`NEUTRAL`,name:game.i18n.localize(`TOKEN.DISPOSITION.NEUTRAL`),group:game.i18n.localize(`TOKEN.Disposition`),f:e=>e.document.disposition===CONST.TOKEN_DISPOSITIONS.NEUTRAL},{id:`HOSTILE`,name:game.i18n.localize(`TOKEN.DISPOSITION.HOSTILE`),group:game.i18n.localize(`TOKEN.Disposition`),f:e=>e.document.disposition===CONST.TOKEN_DISPOSITIONS.HOSTILE},...Object.keys(game.model.Actor).filter(e=>e!==`base`).map(e=>({id:`ACTORTYPE_${e}`,name:game.i18n.localize(`TYPES.Actor.${e}`),group:game.i18n.localize(`Type`),f:t=>t.actor?.type===e}))],fr()}function fr(){lr=[];let e=game.settings.get(`grid-aware-auras`,`customAuraTargetFilters`)??[];for(let{body:t,...n}of e)try{let e=Function(`targetToken`,`sourceToken`,`aura`,t);lr.push({...n,f:e})}catch(e){b(`Could not compile custom filter '${n.name}'`,e)}}function J(e,t,n,r){let i=r?.length&&(cr.find(e=>e.id===r)??lr.find(e=>e.id===r));if(i)try{return!!i.f(e,t,n)}catch(e){b(`Error thrown in aura target filter ${i.name}`,e)}return e.disposition!==CONST.TOKEN_DISPOSITIONS.SECRET}let pr=Symbol(`noGroup`);function Y(e,{selected:t,labelSelector:n,valueSelector:r,groupSelector:i,localize:a=!0,sort:o=!1}={}){Array.isArray(e)?(n??=`label`,r??=`value`,i??=`group`):(e=Object.entries(e),n??=1,r??=0);let s=e.map(e=>{let o=typeof n==`function`?n(e):e[n],s=typeof r==`function`?r(e):e[r],c=typeof i==`function`?i(e):e[i];return{label:a?game.i18n.localize(o):o,value:s,group:c,selected:t===s}});o&&s.sort((e,t)=>e.label.localeCompare(t.label));let c=s.reduce((e,t)=>{let n=t.group?.length?t.group:pr;return e[n]??=[],e[n].push(P`<option value=${t.value} ?selected=${t.selected}>${t.label}</option>`),e},{});return[...c[pr]??[],...Object.entries(c).filter(([e])=>e!==pr).map(([e,t])=>P`
				<optgroup label=${a?game.i18n.localize(e):e}>
					${t}
				</optgroup>
			`)]}
/**
* @license
* Copyright 2018 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/let mr=`important`;``+mr;let hr=H(class extends Jn{constructor(e){if(super(e),e.type!==qn.ATTRIBUTE||e.name!==`style`||e.strings?.length>2)throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.")}render(e){return Object.keys(e).reduce((t,n)=>{let r=e[n];return r==null?t:t+`${n=n.includes(`-`)?n:n.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g,`-$&`).toLowerCase()}:${r};`},``)}update(e,[t]){let{style:n}=e.element;if(this.ft===void 0)return this.ft=new Set(Object.keys(t)),this.render(t);for(let e of this.ft)t[e]??(this.ft.delete(e),e.includes(`-`)?n.removeProperty(e):n[e]=null);for(let e in t){let r=t[e];if(r!=null){this.ft.add(e);let t=typeof r==`string`&&r.endsWith(` !important`);e.includes(`-`)||t?n.setProperty(e,t?r.slice(0,-11):r,t?mr:``):n[e]=r}}return F}}),gr=H(class extends tr{#e;#t;#n;#r;#i=null;render(e,t){return I}update(e,[t,n]){return this.#e=e.element,this.#t=t,this.#n=Xe(t.keyframes),this.#r=n,this.#i&&cancelAnimationFrame(this.#i),this.#i=requestAnimationFrame(this.#a),F}reconnected(){this.#i&&cancelAnimationFrame(this.#i),this.#i=requestAnimationFrame(this.#a)}disconnected(){this.#i&&cancelAnimationFrame(this.#i),this.#i=null}#a=()=>{if(!this.isConnected||!this.#e||this.#t.duration<=0||this.#t.keyframes.length===0)return;let{color:e,alpha:t}=Ze(this.#n,this.#t.duration,this.#t.easingFunc,Date.now());e=Ke(e,t);let n=e>>16&255,r=e>>8&255,i=e&255;this.#e.style.setProperty(this.#r,`rgb(${n} ${r} ${i} / ${Math.round(t*1e4)/100}%)`),this.#i=requestAnimationFrame(this.#a)}});var _r=class extends B{static properties={disabled:{type:Boolean},_isOpen:{state:!0}};static dropdownClasses=``;#e=null;constructor(){super(),this.disabled=!1,this._isOpen=!1}render(){return P`
			<div
				class=${K({"dropdown-button-fwl":!0,"dropdown-button-fwl-disabled":this.disabled})}
				@mousedown=${()=>this._isOpen=!this._isOpen}
			>
				${this._renderButton()}
				<i class="fas fa-chevron-down"></i>
			</div>
		`}_renderButton(){throw Error(`Must be overriden in a derived subclass.`)}_renderDropdown(){throw Error(`Must be overriden in a derived subclass.`)}#t(){if(!this._isOpen||this.disabled){this.#e?.remove(),this.#e=null;return}this.#e||(this.#e=document.createElement(`div`),this.#e.classList.add(`dropdown-container-fwl`,`application`,...this.constructor.dropdownClasses.split(` `).filter(Boolean)),document.body.appendChild(this.#e)),z(this._renderDropdown(),this.#e)}#n(){if(!this.#e)return;let{top:e,left:t,width:n,height:r}=this.getBoundingClientRect(),{width:i,height:a}=this.#e.getBoundingClientRect();Object.assign(this.#e.style,{top:e+r+a>window.innerHeight?`${e-a}px`:`${e+r}px`,left:t+i>window.innerWidth?`${t+n-i}px`:`${t}px`,minWidth:`${n}px`})}connectedCallback(){super.connectedCallback(),document.body.addEventListener(`pointerdown`,this.#r)}update(e){super.update(e),this.#t()}updated(){Promise.resolve().then(()=>this.#n())}disconnectedCallback(){super.disconnectedCallback(),this.#e?.remove(),document.body.removeEventListener(`pointerdown`,this.#r)}#r=e=>{this._isOpen&&(e.target.closest(`.dropdown-container-fwl`)===this.#e||e.target.closest(this.tagName)===this||(this._isOpen=!1))};createRenderRoot(){return this}},vr=class extends B{static properties={_rawValue:{state:!0}};static formAssociated=!0;#e=foundry.utils.randomID();#t;#n=U();#r=U();constructor(){super(),this.#t=this.attachInternals(),this._rawValue={h:0,s:100,v:100,a:100}}get name(){return this.getAttribute(`name`)}set name(e){this.setAttribute(`name`,e)}get form(){return this.#t.form}get value(){return Ve(this._rawValue)}set value(e){let t=Be(e);t&&(this._rawValue=t)}render(){let e=this._rawValue,t=Ve(e),n=Ue(t);return P`
			<div class="color-picker-fwl-interactive">
				<div
					class="color-picker-fwl-color-space"
					tabindex="0"
					@pointerdown=${this.#i}
					style=${hr({"--current-color-hue":e.h})}
					${W(this.#r)}
				>
					<div
						class="color-picker-fwl-color-space-thumb"
						style=${hr({top:Math.round((100-e.v)*100)/100+`%`,left:Math.round(e.s*100)/100+`%`})}
					></div>
				</div>

				<div class="flexrow gap-05rem">
					<div class="flexcol gap-05rem">
						<input
							type="range"
							class="color-picker-fwl-hue-range"
							min="0"
							max="359"
							step="1"
							.value=${e.h}
							@input=${e=>this.#o(e,`h`)}
						>

						<input
							type="range"
							class="color-picker-fwl-alpha-range"
							min="0"
							max="100"
							step="1"
							.value=${e.a}
							@input=${e=>this.#o(e,`a`)}
							style=${hr({"--current-color-rgb":`${t.r} ${t.g} ${t.b}`})}
						>
					</div>
				</div>
			</div>

			<div class="color-picker-fwl-inputs">
				<!-- Don't update .value if the user is focused on element, otherwise as they are typing it will keep
				reformatting what they type. On blur, request an update so the text is reformatted then instead. -->
				<div style="margin-bottom: 0.5rem;">
					<label for=${`color-picker-fwl-${this.#e}-hex`}>Hex</label>
					<input
						type="text"
						id=${`color-picker-fwl-${this.#e}-hex`}
						maxlength="9"
						.value=${document.activeElement===this.#n.value?F:n}
						@input=${this.#c}
						@blur=${()=>this.requestUpdate()}
						${W(this.#n)}
					>
				</div>

				${[`r`,`g`,`b`].map(e=>P`
					<div>
						<label for=${`color-picker-fwl-${this.#e}-${e}`}>${e.toUpperCase()}</label>
						<input
							type="number"
							id=${`color-picker-fwl-${this.#e}-${e}`}
							min="0"
							max="255"
							step="1"
							.value=${Math.round(t[e])}
							@input=${t=>this.#s(t,e)}
						>
					</div>
				`)}

				<div>
					<label for=${`color-picker-fwl-${this.#e}-a`}>A</label>
					<input
						type="number"
						id=${`color-picker-fwl-${this.#e}-a`}
						min="0"
						max="100"
						step="1"
						.value=${Math.round(e.a)}
						@input=${e=>this.#o(e,`a`)}
					>
				</div>
			</div>
		`}#i(e){let{body:t}=document;e.target.focus(),this.#a(e),t.addEventListener(`pointermove`,this.#a),t.addEventListener(`pointerup`,()=>{t.removeEventListener(`pointermove`,this.#a),this.dispatchEvent(new Event(`change`,{bubbles:!0,cancelable:!1,composed:!0}))},{once:!0})}#a=e=>{if(!this.#r.value)return;e.preventDefault(),e.stopImmediatePropagation();let{clientX:t,clientY:n}=e,{left:r,top:i,width:a,height:o}=this.#r.value.getBoundingClientRect(),s=Math.max(Math.min(t-r,a),0),c=Math.max(Math.min(n-i,o),0),{h:l,a:u}=this._rawValue,d=100*s/a,f=100*(1-c/o);this.#l({h:l,s:d,v:f,a:u})};#o(e,t){e.preventDefault(),e.stopImmediatePropagation(),this.#l({...this._rawValue,[t]:+e.currentTarget.value})}#s(e,t){e.preventDefault(),e.stopImmediatePropagation();let n=Ve(this._rawValue);this.#l({...n,[t]:+e.currentTarget.value})}#c(e){let t=e.currentTarget.value,n=He(t);n&&(this._rawValue=Be(n))}#l(e,t){t?.preventDefault(),t?.stopImmediatePropagation(),typeof e==`string`&&(e=He(e)),`r`in e&&(e=Be(e)),this._rawValue=e,this.#t.setFormValue(JSON.stringify(this.value)),this.dispatchEvent(new Event(`input`,{bubbles:!0,cancelable:!1,composed:!0}))}createRenderRoot(){return this}};customElements.get(`color-picker-fwl`)||customElements.define(`color-picker-fwl`,vr);let yr=`color-animation-editor-fwl`,br=e=>game.i18n.localize(e);var xr=class extends _r{static properties={value:{type:Object},_selectedKeyframeIndex:{state:!0}};static dropdownClasses=`color-animation-editor-dropdown-fwl`;static formAssociated=!0;#e;#t=U();constructor(){super(),this.#e=this.attachInternals(),this.value={duration:2500,easingFunc:`linear`,keyframes:[{color:16711680,alpha:.4,position:0},{color:255,alpha:.4,position:1}]},this._selectedKeyframeIndex=0}get name(){return this.getAttribute(`name`)}set name(e){this.setAttribute(`name`,e)}get form(){return this.#e.form}_renderButton(){return P`
			<div
				class="color-animation-editor-fwl-preview-bar"
				${gr(this.value,`--current-color`)}
			></div>
		`}_renderDropdown(){let e=this.value.keyframes.map(({color:e,alpha:t,position:n})=>{let{r,g:i,b:a}=We(e);return{r,g:i,b:a,alpha:t,position:n}}),t=e.map(e=>`rgb(${e.r} ${e.g} ${e.b} / ${Math.round(e.alpha*1e4)/100}%) ${Math.round(e.position*1e4)/100}%`).join(`, `),n=this.value.keyframes[this._selectedKeyframeIndex];return P`
			<div class="flexrow">
				<input
					type="number"
					min="1"
					step="1"
					.value=${this.value.duration}
					@input=${e=>this.#o({duration:+e.target.value})}
					@blur=${()=>this.#d()}
					style="margin-right: 0.5rem"
				>
				<span>ms</span>

				<button
					class=${K({"color-animation-editor-fwl-ease-button":!0,"btn-active-fwl":this.value.easingFunc===`linear`})}
					@click=${()=>this.#o({easingFunc:`linear`})}
					data-tooltip=${br(`GRIDAWAREAURAS.EasingLinear`)}
				>
					<svg viewBox="-10 -10 120 120">
						<path d="M0,100 L100,0" />
					</svg>
				</button>
				<button
					class=${K({"color-animation-editor-fwl-ease-button":!0,"btn-active-fwl":this.value.easingFunc===`easeInCubic`})}
					@click=${()=>this.#o({easingFunc:`easeInCubic`})}
					data-tooltip=${br(`GRIDAWAREAURAS.EasingEaseIn`)}
				>
					<svg viewBox="-10 -10 120 120">
						<path d="M0,100 C32,100 67,100 100,0" />
					</svg>
				</button>
				<button
					class=${K({"color-animation-editor-fwl-ease-button":!0,"btn-active-fwl":this.value.easingFunc===`easeOutCubic`})}
					@click=${()=>this.#o({easingFunc:`easeOutCubic`})}
					data-tooltip=${br(`GRIDAWAREAURAS.EasingEaseOut`)}
				>
					<svg viewBox="0 0 100 100">
						<path d="M 0,100 C 33,0 68,0 100,0" />
					</svg>
				</button>
				<button
					class=${K({"color-animation-editor-fwl-ease-button":!0,"btn-active-fwl":this.value.easingFunc===`easeInOutCubic`})}
					@click=${()=>this.#o({easingFunc:`easeInOutCubic`})}
					data-tooltip=${br(`GRIDAWAREAURAS.EasingEaseInOut`)}
				>
					<svg viewBox="-10 -10 120 120">
						<path d="M0,100 C65,100 35,0 100,0" />
					</svg>
				</button>
			</div>

			<p class="hint">Click to add a new keyframe. Right-click a keyframe to delete it.</p>

			<div class="color-animation-editor-fwl-preview">
				<div
					class="color-animation-editor-fwl-preview-track"
					style=${hr({"--gradient-stops":t})}
					@mousedown=${e=>this.#i(e)}
					${W(this.#t)}
				></div>

				<div
					class="color-animation-editor-fwl-preview-tracker"
					style=${Sr(this.value)}
				></div>

				${e.map(({r:e,g:t,b:n,position:r},i)=>P`
					<div
						class=${K({"color-animation-editor-fwl-preview-thumb":!0,active:this._selectedKeyframeIndex===i})}
						style=${hr({left:`${r*100}%`,"--current-color-rgb":`${e} ${t} ${n}`})}
						@mousedown=${e=>this.#n(e,i)}
						@contextmenu=${()=>this.#a(i)}
					></div>
				`)}
			</div>

			<div class="color-animation-editor-fwl-preview-thumb-properties-track">
				<div
					class="color-animation-editor-fwl-preview-thumb-properties"
					${W(e=>this.#f(e))}
				>
					<input
						type="number"
						min="0"
						max="100"
						step="1"
						.value=${Math.round(n.position*100)}
						@input=${e=>this.#s({position:Math.min(Math.max(e.target.value/100,0),1)})}
						@blur=${()=>this.#d()}
					>
					<span>%</span>

					<!-- <button
						type="button"
						@click=${()=>this.#a(this._selectedKeyframeIndex)}
					>
						<i class="fas fa-trash m-0"></i>
					</button> -->
				</div>
			</div>

			<color-picker-fwl
				.value=${{...We(n.color),a:n.alpha*255}}
				@input=${e=>this.#c(e.currentTarget.value)}
				@change=${()=>this.#d()}
			></color-picker-fwl>
		`}#n(e,t){e.preventDefault(),e.stopPropagation(),this._selectedKeyframeIndex=t,this.#l()}#r=e=>{let{x:t,width:n}=this.#t.value.getBoundingClientRect(),r=(e.clientX-t)/n;this.#s({position:Math.max(Math.min(r,1),0)})};#i(e){let t=e.offsetX/e.target.clientWidth,{color:n,alpha:r,insertIndex:i}=Ze(this.value.keyframes,1,`linear`,t);this.#u({...this.value,keyframes:this.value.keyframes.toSpliced(i,0,{color:n,alpha:r,position:t})}),this.#d(),this._selectedKeyframeIndex=i,this.#l()}#a(e){typeof e!=`number`||this.value.keyframes.length<=1||(this.#u({...this.value,keyframes:this.value.keyframes.toSpliced(e,1)}),this.#d(),this._selectedKeyframeIndex=Math.max(e-1,0))}#o(e){this.#u({...this.value,...e})}#s(e){if(typeof this._selectedKeyframeIndex!=`number`)return;let t=[...this.value.keyframes],n=t[this._selectedKeyframeIndex];Object.assign(n,e),`position`in e&&(t.sort((e,t)=>e.position-t.position),this._selectedKeyframeIndex=t.indexOf(n)),this.#u({...this.value,keyframes:t})}#c({r:e,g:t,b:n,a:r}){let i=e<<16|t<<8|n;this.#s({color:i,alpha:r/255})}#l(){let{body:e}=document;e.addEventListener(`pointermove`,this.#r),e.addEventListener(`pointerup`,()=>{e.removeEventListener(`pointermove`,this.#r),this.#d()},{once:!0})}#u(e){this.value=e,this.#e.setFormValue(JSON.stringify(e)),this.dispatchEvent(new Event(`input`,{bubbles:!0,cancelable:!1,composed:!0}))}#d(){this.dispatchEvent(new Event(`change`,{bubbles:!0,cancelable:!1,composed:!0}))}#f(e){e&&Promise.resolve().then(()=>{let{width:t}=e.getBoundingClientRect(),n=this.value.keyframes[this._selectedKeyframeIndex];e.style.left=`min(max(calc(${n.position*100}% - ${t/2}px), 0px), calc(100% - ${t}px))`})}};customElements.get(yr)||customElements.define(yr,xr);let Sr=H(class extends tr{#e;#t=null;render(e){this.#e=e,this.#t&&cancelAnimationFrame(this.#t),this.#t=requestAnimationFrame(this.#n)}reconnected(){this.#t&&cancelAnimationFrame(this.#t),this.#t=requestAnimationFrame(this.#n)}disconnected(){this.#t&&cancelAnimationFrame(this.#t),this.#t=null}#n=()=>{if(!this.isConnected||this.#e.duration<=0)return;let e=Date.now()/this.#e.duration%1,t=ze[this.#e.easingFunc];this.setValue(`left: ${Math.round(t(e)*1e4)/100}%`),this.#t=requestAnimationFrame(this.#n)}}),Cr=`context-menu-fwl`,wr;var X=class e extends B{static properties={items:{type:Array}};static active;_subMenu;#e;constructor(){super(),this.items=[],this._parentMenu=void 0,this._parentMenuItem=void 0}render(){return P`
			<menu class="dropdown-menu-fwl dropdown-menu-fwl-hover" @mousedown=${this.#n}>
				${this.items.map(this.#t)}
			</menu>
		`}#t=(e,t)=>{switch(e.type){case`separator`:return P`<li class="context-menu-fwl-separator"></li>`;default:return P`<li class="context-menu-fwl-item" data-item-index=${t}>
					${G(e.icon,()=>P`<i class=${e.icon}></i>`)}
					<span>${e.label}</span>
					${G(e.children?.length,()=>P`<i class="fas fa-caret-right"></i>`)}
				</li>`}};updated(){let{top:e,left:t,width:n,height:r}=this.getBoundingClientRect();if(e+r>window.innerHeight){let t=this._parentMenuItem?.getBoundingClientRect()?.height??0;this.style.top=`${e-r+t}px`}if(t+n>window.innerWidth){let e=this._parentMenu?.getBoundingClientRect()?.width??0;this.style.left=`${t-n-e}px`}}connectedCallback(){if(super.connectedCallback(),!this._parentMenu){this.#e=new AbortController;let{signal:e}=this.#e;document.addEventListener(`mousedown`,this.#i,{signal:e}),document.addEventListener(`keydown`,this.#r,{signal:e})}}disconnectedCallback(){super.disconnectedCallback(),this.#e?.abort()}#n=t=>{let n=+t.target.closest(`[data-item-index]`)?.dataset.itemIndex;if(isNaN(n))return;let r=this.items[n];if(r.children?.length){this._subMenu?.close();let n=t.target.closest(`li`),{y:i}=n.getBoundingClientRect(),{x:a,width:o}=this.getBoundingClientRect();this._subMenu=e.open({x:a+o,y:i},r.children,{parentMenu:this,parentMenuItem:n})}else r.onClick?.(),this.close()};#r=e=>{e.key===`Escape`&&this.close()};#i=e=>{setTimeout(()=>{this._isTargetInside(e.target)||this.close()},1)};close(){this.parentElement&&this.remove(),this._subMenu?.close(),this._parentMenu?._subMenu===this&&(this._parentMenu._subMenu=void 0)}_isTargetInside(e){return e===this||this.contains(e)||!!this._subMenu?._isTargetInside(e)}createRenderRoot(){return this}static open(e,t,{parentMenu:n,parentMenuItem:r}={}){wr||(wr=document.createElement(`div`),wr.id=`context-menu-fwl-container`,document.body.appendChild(wr));let i=e instanceof Event?{x:e.clientX,y:e.clientY}:e,a=document.createElement(Cr);return a.items=t.filter(Boolean),a._parentMenu=n,a._parentMenuItem=r,a.style.left=`${i.x}px`,a.style.top=`${i.y}px`,wr.appendChild(a),a}};customElements.get(`context-menu-fwl`)||customElements.define(Cr,X);let{ApplicationV2:Tr}=foundry.applications.api,Z=e=>game.i18n.localize(e);var Er=class extends Tr{#e;#t;#n;#r;#i;#a;#o;#s;#c;#l=0;#u=null;#d=[{name:`Geometry`,icon:`far fa-hexagon`,template:()=>this.#f()},{name:Z(`GRIDAWAREAURAS.TabLines`),icon:`fas fa-paint-brush`,template:()=>this.#p()},{name:Z(`GRIDAWAREAURAS.TabFill`),icon:`fas fa-fill-drip`,template:()=>this.#m()},{name:Z(`GRIDAWAREAURAS.TabVisibility`),icon:`fas fa-eye-low-vision`,template:()=>this.#h()},{name:Z(`GRIDAWAREAURAS.TabEffects`),icon:`fas fa-stars`,template:()=>this.#g()},{name:Z(`GRIDAWAREAURAS.TabMacros`),icon:`fas fa-scroll`,template:()=>this.#v()},{name:Z(`GRIDAWAREAURAS.TabSequencer`),icon:`fas fa-list-ol`,hidden:!pe(),template:()=>this.#b()},{name:Z(`GRIDAWAREAURAS.TabTerrainHeightTools`),icon:`fas fa-chart-simple`,hidden:!me(),template:()=>this.#S()}];constructor(e,{disabled:t=!1,onChange:n,onClose:r,parentId:i,attachTo:a,radiusContext:o,...s}={}){super(s),this.#e=foundry.utils.deepClone(e),this.#t=this.#D(e.ownerVisibility,e.nonOwnerVisibility),this.#n=t,this.#r=n,this.#i=r,this.#a=i,this.#o=a,this.#s=o??{},this.#c=o?.actor?ar(o):[...or(CONFIG.Actor.dataModels,{prefix:`actor`}),...or(CONFIG.Item.dataModels,{prefix:`item`})]}static DEFAULT_OPTIONS={tag:`form`,window:{contentClasses:[`sheet`,`standard-form`,`grid-aware-auras-aura-config`],icon:`far fa-hexagon`,title:`Aura Configuration`},position:{width:620,height:580}};get id(){return`gaa-aura-config-${this.#a?`-`+this.#a:``}${this.#e.id}`}_renderHTML(){return P`
			<div class="sheet-header form-group">
				<label style="flex: 0; margin-right: 1rem;">${Z(`Name`)}</label>
				<div class="form-fields">
					<input type="text" name="name" .value=${this.#e.name} ?disabled=${this.#n} required>
				</div>
			</div>

			<nav class="gaa-vertical-tabs">
				${this.#d.map((e,t)=>e.hidden?I:P`
					<a class=${K({active:this.#l===t})} @click=${()=>this.#C(t)}>
						<span class="gaa-vertical-tabs-icon"><i class=${e.icon}></i></span>
						<span>${e.name}</span>
					</a>
				`)}
			</nav>

			<div class="sheet-content">
				${this.#d[this.#l].template()??I}
			</div>

			<footer class="sheet-footer">
				<button type="button" @click=${()=>this.close()}>Close</button>
			</footer>

			${G(this.#u,()=>P`
				<div class="gaa-popover" @click=${e=>!e.target.closest(`.gaa-popover-content`)&&this.#V(null,{render:!0})}>
					<div class="gaa-popover-content">
						${this.#u}
					</div>
				</div>
			`)}
		`}#f=()=>{let e=typeof we(this.#e.radius,this.#s)!=`number`,t=this.#e.innerRadius!==``&&typeof we(this.#e.innerRadius,this.#s)!=`number`;return P`
			<div class="standard-form">
				<div class="form-group">
					<label>Radius</label>
					<div class="form-fields">
						<gaa-data-path-autocomplete
							name="radius"
							value=${this.#e.radius}
							.dataPaths=${this.#c}
							?disabled=${this.#n}>
						</gaa-data-path-autocomplete>
					</div>
					<p class="hint">${Z(`GRIDAWAREAURAS.Radius.Hint`)}</p>
					${G(e,()=>P`
						<div class="hint" style="text-align: right; color: var(--color-level-error);">${Z(`GRIDAWAREAURAS.UnresolvedRadiusConfigDialogWarning`)}</div>
					`)}
				</div>

				<div class="form-group">
					<label>Inner Radius</label>
					<div class="form-fields">
						<gaa-data-path-autocomplete
							name="innerRadius"
							value=${this.#e.innerRadius}
							placeholder="None"
							.dataPaths=${this.#c}
							?disabled=${this.#n}
						></gaa-data-path-autocomplete>
					</div>
					<p class="hint">${Z(`GRIDAWAREAURAS.InnerRadius.Hint`)}</p>
					${G(t,()=>P`
						<div class="hint" style="text-align: right; color: var(--color-level-error);">${Z(`GRIDAWAREAURAS.UnresolvedRadiusConfigDialogWarning`)}</div>
					`)}
				</div>

				<div class="form-group">
					<label>Position</label>
					<div class="form-fields">
						<select name="position" ?disabled=${this.#n}>
							${Y(se,{selected:this.#e.position})}
						</select>
					</div>
					<p class="hint">${Z(`GRIDAWAREAURAS.Position.Hint`)}</p>
				</div>
			</div>
		`};#p=()=>{let e=this.#e.lineType===v.NONE,t=this.#e.lineType===v.DASHED;return P`
			<div class="standard-form">
				<div class="form-group">
					<label>${Z(`GRIDAWAREAURAS.LineType`)}</label>
					<div class="form-fields">
						<select name="lineType" ?disabled=${this.#n} data-dtype="Number">
							${Y(v,{selected:this.#e.lineType,labelSelector:([e])=>`GRIDAWAREAURAS.LineType${e.titleCase()}`,valueSelector:([,e])=>e})}
						</select>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:e})}>
					<label>${Z(`DRAWING.LineWidth`)} <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="lineWidth" .value=${this.#e.lineWidth} required min="0" step="1" ?disabled=${this.#n}>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:e||!!this.#e.lineColorAnimation})}>
					<label>${Z(`DRAWING.StrokeColor`)}</label>
					<div class="form-fields">
						<color-picker name="lineColor" .value=${this.#e.lineColor} ?disabled=${this.#n}></color-picker>
						<button
							type="button"
							data-tooltip="Enable animation"
							@click=${()=>this.#T(`lineColorAnimation`,De())}
							?disabled=${this.#n}
						>
							<i class="fas fa-sparkles m-0"></i>
						</button>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:e||!!this.#e.lineColorAnimation})}>
					<label>${Z(`DRAWING.LineOpacity`)}</label>
					<div class="form-fields">
						<range-picker name="lineOpacity" .value=${this.#e.lineOpacity} min="0" max="1" step="0.1" ?disabled=${this.#n}></range-picker>
					</div>
				</div>

				${G(this.#e.lineColorAnimation&&!e,()=>P`
					<div class="form-group">
						<label>${Z(`DRAWING.StrokeColor`)}</label>
						<div class="form-fields">
							<color-animation-editor-fwl
								name="lineColorAnimation"
								.value=${this.#e.lineColorAnimation}
								?disabled=${this.#n}
							></color-animation-editor-fwl>
							<button
								type="button"
								class="gaa-btn-active"
								data-tooltip="Disable animation"
								@click=${()=>this.#T(`lineColorAnimation`,null)}
								?disabled=${this.#n}
							>
								<i class="fas fa-sparkles m-0"></i>
							</button>
						</div>
					</div>
				`)}

				<div class=${K({"form-group":!0,hidden:!t})}>
					<label>Dash Config <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="lineDashSize" placeholder="Dash" .value=${this.#e.lineDashSize} required min="0" step="1" ?disabled=${this.#n}>
						<input type="number" name="lineGapSize" placeholder="Gap" .value=${this.#e.lineGapSize} required min="0" step="1" ?disabled=${this.#n}>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:!t})}>
					<label>Dash Animation <span class="units">(px/s)</span></label>
					<div class="form-fields">
						<input type="number" name="lineDashOffsetAnimation" placeholder="Dash" .value=${this.#e.lineDashOffsetAnimation} required step="1" ?disabled=${this.#n}>
					</div>
				</div>
			</div>
		`};#m=()=>{let e=this.#e.fillType===CONST.DRAWING_FILL_TYPES.NONE,t=this.#e.fillType===CONST.DRAWING_FILL_TYPES.PATTERN;return P`
			<div class="standard-form">
				<div class="form-group">
					<label>${Z(`DRAWING.FillTypes`)}</label>
					<div class="form-fields">
						<select name="fillType" ?disabled=${this.#n} data-dtype="Number">
							${Y(CONST.DRAWING_FILL_TYPES,{selected:this.#e.fillType,labelSelector:([e])=>`DRAWING.FillType${e.titleCase()}`,valueSelector:([,e])=>e})}
						</select>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:e||!!this.#e.fillColorAnimation})}>
					<label>${Z(`DRAWING.FillColor`)}</label>
					<div class="form-fields">
						<color-picker name="fillColor" .value=${this.#e.fillColor} ?disabled=${this.#n}></color-picker>
						<button
							type="button"
							data-tooltip="Enable animation"
							@click=${()=>this.#T(`fillColorAnimation`,Oe())}
							?disabled=${this.#n}
						>
							<i class="fas fa-sparkles m-0"></i>
						</button>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:e||!!this.#e.fillColorAnimation})}>
					<label>${Z(`DRAWING.FillOpacity`)}</label>
					<div class="form-fields">
						<range-picker name="fillOpacity" .value=${this.#e.fillOpacity} min="0" max="1" step="0.1" ?disabled=${this.#n}></range-picker>
					</div>
				</div>

				${G(!e&&this.#e.fillColorAnimation,()=>P`
					<div class="form-group">
						<label>${Z(`DRAWING.FillColor`)}</label>
						<div class="form-fields">
							<color-animation-editor-fwl
								name="fillColorAnimation"
								.value=${this.#e.fillColorAnimation}
								?disabled=${this.#n}
							></color-animation-editor-fwl>
							<button
								type="button"
								class="gaa-btn-active"
								data-tooltip="Disable animation"
								@click=${()=>this.#T(`fillColorAnimation`,null)}
								?disabled=${this.#n}
							>
								<i class="fas fa-sparkles m-0"></i>
							</button>
						</div>
					</div>
				`)}

				<div class=${K({"form-group":!0,hidden:!t})}>
					<label>${Z(`DRAWING.FillTexture`)}</label>
					<div class="form-fields">
						<file-picker name="fillTexture" type="image" value=${this.#e.fillTexture} ?disabled=${this.#n}></file-picker>
					</div>
				</div>

				<div class=${K({"form-group":!0,hidden:!t||!!this.#e.fillTextureOffsetAnimation})}>
					<label>Texture Offset <span class="units">(px)</span></label>
					<div class="form-fields">
						<input type="number" name="fillTextureOffset.x" placeholder="x" .value=${this.#e.fillTextureOffset.x} required ?disabled=${this.#n}>
						<input type="number" name="fillTextureOffset.y" placeholder="y" .value=${this.#e.fillTextureOffset.y} required ?disabled=${this.#n}>
						<button
							type="button"
							data-tooltip="Enable animation"
							@click=${()=>this.#T(`fillTextureOffsetAnimation`,{x:0,y:0})}
							?disabled=${this.#n}
						>
							<i class="fas fa-sparkles m-0"></i>
						</button>
					</div>
				</div>

				${G(t&&this.#e.fillTextureOffsetAnimation,()=>P`
					<div class="form-group">
						<label>Texture Animation <span class="units">(px/s)</span></label>
						<div class="form-fields">
							<input type="number" name="fillTextureOffsetAnimation.x" placeholder="x" .value=${this.#e.fillTextureOffsetAnimation.x} required ?disabled=${this.#n}>
							<input type="number" name="fillTextureOffsetAnimation.y" placeholder="y" .value=${this.#e.fillTextureOffsetAnimation.y} required ?disabled=${this.#n}>
							<button
								type="button"
								class="gaa-btn-active"
								data-tooltip="Disable animation"
								@click=${()=>this.#T(`fillTextureOffsetAnimation`,null)}
								?disabled=${this.#n}
							>
								<i class="fas fa-sparkles m-0"></i>
							</button>
						</div>
					</div>
				`)}

				<div class=${K({"form-group":!0,hidden:!t})}>
					<label>Texture Scale <span class="units">(%)</span></label>
					<div class="form-fields">
						<input type="number" name="fillTextureScale.x" placeholder="x" .value=${this.#e.fillTextureScale.x} required ?disabled=${this.#n}>
						<input type="number" name="fillTextureScale.y" placeholder="y" .value=${this.#e.fillTextureScale.y} required ?disabled=${this.#n}>
					</div>
				</div>
			</div>
		`};#h=()=>P`
		<div class="standard-form">
			<div class="form-group">
				<label>Display Aura</label>
				<div class="form-fields">
					<select name="visibilityMode" ?disabled=${this.#n} @change=${this.#E}>
						${Y(ee,{selected:this.#t})}
					</select>
				</div>
			</div>

			<fieldset class=${K({disabled:this.#n,hidden:this.#t!==`CUSTOM`})} style="padding-block-end: 0;">
				<legend>Custom</legend>

				<p class="hint" style="margin-top: 0;">
					Specify under which states the aura should be visible to owners and non-owners.
					When multiple states are appliable, the aura is visible when ANY applicable state is checked.
				</p>

				<div class="visibility-grid">
					<div class="visibility-row">
						<span class="owner text-bold">Owner</span>
						<span class="nonowner text-bold">Non-owners</span>
					</div>

					<div class="visibility-row">
						<span class="title">Default</span>
						<p class="hint">When none of the below states are applicable.</p>
						<input type="checkbox" class="owner" name="ownerVisibility.default" .checked=${this.#e.ownerVisibility.default}>
						<input type="checkbox" class="nonowner" name="nonOwnerVisibility.default" .checked=${this.#e.nonOwnerVisibility.default}>
					</div>

					<div class="visibility-row">
						<span class="title">Hovered</span>
						<input type="checkbox" class="owner" name="ownerVisibility.hovered" .checked=${this.#e.ownerVisibility.hovered}>
						<input type="checkbox" class="nonowner" name="nonOwnerVisibility.hovered" .checked=${this.#e.nonOwnerVisibility.hovered}>
					</div>

					<div class="visibility-row">
						<span class="title">Controlled/Selected</span>
						<input type="checkbox" class="owner" name="ownerVisibility.controlled" .checked=${this.#e.ownerVisibility.controlled}>
					</div>

					<div class="visibility-row">
						<span class="title">Dragging</span>
						<input type="checkbox" class="owner" name="ownerVisibility.dragging" .checked=${this.#e.ownerVisibility.dragging}>
					</div>

					<div class="visibility-row">
						<span class="title">Targeted</span>
						<input type="checkbox" class="owner" name="ownerVisibility.targeted" .checked=${this.#e.ownerVisibility.targeted}>
						<input type="checkbox" class="nonowner" name="nonOwnerVisibility.targeted" .checked=${this.#e.nonOwnerVisibility.targeted}>
					</div>

					<div class="visibility-row">
						<span class="title">Combat Turn</span>
						<p class="hint">When the token has its turn in the combat tracker.</p>
						<input type="checkbox" class="owner" name="ownerVisibility.turn" .checked=${this.#e.ownerVisibility.turn}>
						<input type="checkbox" class="nonowner" name="nonOwnerVisibility.turn" .checked=${this.#e.nonOwnerVisibility.turn}>
					</div>
				</div>
			</fieldset>
		</div>
	`;#g=()=>{let e=game.settings.get(n,a),t=(e,t,n)=>X.open(e,[{label:`Edit`,icon:`fas fa-edit`,onClick:()=>this.#A(n)},{label:`Duplicate`,icon:`fas fa-clone`,onClick:()=>this.#k(t)},{label:`Delete`,icon:`fas fa-trash`,onClick:()=>this.#j(n)}]);return P`
			${G(!e,()=>P`
				<p class="alert" role="alert">Effect automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			${G(this.#e.effects.length,()=>P`<ul class="automated-item-list">
				${this.#e.effects.map((n,r)=>P`
					<li @contextmenu=${e=>t(e,n,r)}>
						<div class="flexcol">
							<span><strong>${Z(CONFIG.statusEffects.find(e=>e.id===n.effectId)?.name??`None`)}</strong></span>
							<span><em>${Z(te[n.mode]??``)}</em></span>
						</div>
						${G(!this.#n&&e,()=>P`
							<a class="menu-button" @click=${e=>t(e,n,r)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`,()=>P`
							<a class="menu-button" @click=${()=>this.#A(r)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${G(e&&this.#e.effects.length===0,()=>P`
				<p class="hint text-center">No automated effects configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#k} ?disabled=${this.#n||!e}>
					<i class="fas fa-plus"></i>
					Create Effect
				</button>
			</div>
		`};#_=e=>{let t=this.#e.effects[e];return P`
			<form class="standard-form" @submit=${t=>this.#O(t,this.#e.effects,e)}>
				<div class="form-group">
					<label>Effect</label>
					<div class="form-fields">
						<select name="effectId" ?disabled=${this.#n}>
							<option value="" hidden>-${Z(`None`)}-</option>
							${Y(CONFIG.statusEffects,{selected:t.effectId,labelSelector:`name`,valueSelector:`id`,sort:!0})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Overlay</label>
					<div class="form-fields">
						<input
							type="checkbox"
							name="isOverlay"
							.checked=${t.isOverlay??!1}
							?disabled=${this.#n}>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens" ?disabled=${this.#n}>
							${Y(ur(),{selected:t.targetTokens})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode" ?disabled=${this.#n}>
							${Y(te,{selected:t.mode})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Priority</label>
					<div class="form-fields">
						<input
							type="number"
							name="priority"
							.value=${t?.priority??0}
							step="1"
							?disabled=${this.#n}>
					</div>
				</div>

				<div class="flexrow">
					${G(this.#n,()=>P`
						<button type="button" @click=${()=>this.#V(null,{render:!0})}>
							${Z(`Close`)}
						</button>
					`,()=>P`
						<button type="button" @click=${()=>this.#j(e)}>
							<i class="fas fa-trash"></i> ${Z(`Delete`)}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${Z(`Confirm`)}
						</button>
					`)}
				</div>
			</form>
		`};#v=()=>{let e=game.settings.get(n,o),t=(e,t,n)=>X.open(e,[{label:`Edit`,icon:`fas fa-edit`,onClick:()=>this.#N(n)},{label:`Duplicate`,icon:`fas fa-clone`,onClick:()=>this.#M(t)},{label:`Delete`,icon:`fas fa-trash`,onClick:()=>this.#P(n)}]);return P`
			${G(!e,()=>P`
				<p class="alert" role="alert">Macro automation is not turned on for this world. GMs can configure this in the settings.</p>
			`)}

			${G(this.#e.macros.length,()=>P`<ul class="automated-item-list">
				${this.#e.macros.map((n,r)=>P`
					<li @contextmenu=${e=>t(e,n,r)}>
						<div class="flexcol">
							<span><strong>${game.macros.get(n.macroId)?.name??Z(`None`)}</strong></span>
							<span><em>${Z(re[n.mode]??``)}</em></span>
						</div>
						${G(!this.#n&&e,()=>P`
							<a class="menu-button" @click=${e=>t(e,n,r)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`,()=>P`
							<a class="menu-button" @click=${()=>this.#N(r)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${G(e&&this.#e.macros.length===0,()=>P`
				<p class="hint text-center">No macros configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#M} ?disabled=${this.#n||!e}>
					<i class="fas fa-plus"></i>
					Create Macro
				</button>
			</div>
		`};#y=e=>{let t=this.#e.macros[e],n=U();return P`
			<form class="standard-form"
				@dragover=${this.#F}
				@drop=${this.#n?I:e=>this.#I(e,n)}
				@submit=${t=>this.#O(t,this.#e.macros,e)}>
				<div class="form-group">
					<label>Macro ID</label>
					<div class="form-fields flexcol">
						<input type="text" name="macroId" value=${t.macroId} ?disabled=${this.#n} ${ref(n)}>
						<p class="hint">Enter a macro's ID, or drag and drop it onto the textbox.</p>
					</div>
				</div>

				<div class="form-group">
					<label>Target Tokens</label>
					<div class="form-fields">
						<select name="targetTokens" ?disabled=${this.#n}>
							${Y(ur(),{selected:t.targetTokens})}
						</select>
					</div>
				</div>

				<div class="form-group">
					<label>Trigger</label>
					<div class="form-fields">
						<select name="mode" ?disabled=${this.#n}>
							${Y(re,{selected:t.mode})}
						</select>
					</div>
				</div>

				<div class="flexrow">
					${G(this.#n,()=>P`
						<button type="button" @click=${()=>this.#V(null,{render:!0})}>
							${Z(`Close`)}
						</button>
					`,()=>P`
						<button type="button" @click=${()=>this.#P(e)}>
							<i class="fas fa-trash"></i> ${Z(`Delete`)}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${Z(`Confirm`)}
						</button>
					`)}
				</div>
			</form>
		`};#b=()=>{let e=game.settings.get(`sequencer`,`permissions-effect-create`)===0,t=(e,t,n)=>X.open(e,[{label:`Edit`,icon:`fas fa-edit`,onClick:()=>this.#R(n)},{label:`Duplicate`,icon:`fas fa-clone`,onClick:()=>this.#L(t)},{label:`Delete`,icon:`fas fa-trash`,onClick:()=>this.#z(n)}]);return P`
			${G(!e,()=>P`
				<p class="alert" role="alert">Sequencer integration requires players to have permission to create effects. GMs can configure this in the Sequencer settings.</p>
			`)}

			${G(this.#e.sequencerEffects.length,()=>P`<ul class="automated-item-list">
				${this.#e.sequencerEffects.map((n,r)=>P`
					<li @contextmenu=${e=>t(e,n,r)}>
						<div class="flexcol">
							<span><strong>${n.effectPath?.length?n.effectPath:`- No effect selected -`}</strong></span>
							<span><em>${Z(ie[n.trigger]??``)}</em></span>
							<span><em>${Z(ae[n.position]??``)}</em></span>
						</div>
						${G(!this.#n&&e,()=>P`
							<a class="menu-button" @click=${e=>t(e,n,r)}>
								<i class="fas fa-ellipsis-vertical"></i>
							</a>
						`,()=>P`
							<a class="menu-button" @click=${()=>this.#R(r)}>
								<i class="fas fa-eye"></i>
							</a>
						`)}
					</li>
				`)}
			</ul>`)}

			${G(e&&this.#e.sequencerEffects.length===0,()=>P`
				<p class="hint text-center">No sequencer effects configured.</p>
			`)}

			<div class="automated-item-list-create-button">
				<button @click=${this.#L} ?disabled=${this.#n||!e}>
					<i class="fas fa-plus"></i>
					Create Sequence
				</button>
			</div>
		`};#x=e=>{let t=this.#e.sequencerEffects[e];return P`
			<form class="flexcol" @submit=${t=>this.#O(t,this.#e.sequencerEffects,e)}>
				<div class="standard-form" style="flex: 1; overflow-y: scroll; padding-right: 1rem;">
					<input type="hidden" name="uId" value=${t.uId}>

					<div class="form-group">
						<label>Effect</label>
						<div class="form-fields">
							<input type="text" name="effectPath" value=${t.effectPath} ?disabled=${this.#n}>
							<button type="button" @click=${()=>Sequencer.DatabaseViewer.show()}>
								<i class="fas fa-database"></i>
							</button>
						</div>
						<p class="hint">The Sequencer file to play. Can be a filepath, wildcard filepath or database path.</p>
					</div>

					<div class="form-group">
						<label>Target Tokens</label>
						<div class="form-fields">
							<select name="targetTokens" ?disabled=${this.#n}>
								${Y(ur(),{selected:t.targetTokens})}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Trigger</label>
						<div class="form-fields">
							<select name="trigger" ?disabled=${this.#n}>
								${Y(ie,{selected:t.trigger})}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Position</label>
						<div class="form-fields">
							<select name="position" ?disabled=${this.#n}>
								${Y(ae,{selected:t.position})}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Repeats</label>
						<div class="form-fields">
							<label>Count</label>
							<input type="number" name="repeatCount" value=${t.repeatCount} min="1" ?disabled=${this.#n}>
							<label>Delay</label>
							<input type="number" name="repeatDelay" value=${t.repeatDelay} min="0" ?disabled=${this.#n}>
							<span class="units">ms</span>
						</div>
						<p class="hint">How many times the effect should play, and how long between repeats.</p>
					</div>

					<div class="form-group">
						<label>Start Delay</label>
						<div class="form-fields">
							<input type="number" name="delay" value=${t.delay} min="0" ?disabled=${this.#n}>
							<span class="units">ms</span>
						</div>
					</div>

					<div class="form-group">
						<label>Playback Rate</label>
						<div class="form-fields">
							<input type="number" name="playbackRate" value=${t.playbackRate} min="0.01" step="0.01" ?disabled=${this.#n}>
							<span class="units">x</span>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Opacity</label>
						<div class="form-fields">
							<range-picker name="opacity" .value=${t.opacity} min="0" max="1" step="0.05" ?disabled=${this.#n}></range-picker>
						</div>
					</div>

					<div class="form-group">
						<label>Fade In</label>
						<div class="form-fields">
							<input type="number" name="fadeInDuration" value=${t.fadeInDuration} min="0" ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeInEasing" ?disabled=${this.#n}>
								${Y(Re,{selected:t.fadeInEasing,labelSelector:([,e])=>`GRIDAWAREAURAS.${e}`})}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Fade Out</label>
						<div class="form-fields">
							<input type="number" name="fadeOutDuration" value=${t.fadeOutDuration} min="0" ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="fadeOutEasing" ?disabled=${this.#n}>
								${Y(Re,{selected:t.fadeOutEasing,labelSelector:([,e])=>`GRIDAWAREAURAS.${e}`})}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Scale</label>
						<div class="form-fields">
							<input type="number" name="scale" value=${t.scale} min="0" step="0.01" ?disabled=${this.#n}>
							<span class="units">x</span>
						</div>
					</div>

					<div class="form-group">
						<label>Scale to Object</label>
						<div class="form-fields">
							<input type="checkbox" name="scaleToObject" ?checked=${t.scaleToObject} ?disabled=${this.#n}>
						</div>
					</div>

					<div class="form-group">
						<label>Scale In</label>
						<div class="form-fields">
							<input type="number" name="scaleInScale" value=${t.scaleInScale} ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleInDuration" value=${t.scaleInDuration} min="0" step="0.01" ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleInEasing" style="flex: 2" ?disabled=${this.#n}>
								${Y(Re,{selected:t.scaleInEasing,labelSelector:([,e])=>`GRIDAWAREAURAS.${e}`})}
							</select>
						</div>
					</div>

					<div class="form-group">
						<label>Scale Out</label>
						<div class="form-fields">
							<input type="number" name="scaleOutScale" value=${t.scaleOutScale} ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">x</span>
							<input type="number" name="scaleOutDuration" value=${t.scaleOutDuration} min="0" step="0.01" ?disabled=${this.#n}>
							<span class="units" style="margin-right: 0.75rem">ms</span>
							<select name="scaleOutEasing" style="flex: 2" ?disabled=${this.#n}>
								${Y(Re,{selected:t.scaleOutEasing,labelSelector:([,e])=>`GRIDAWAREAURAS.${e}`})}
							</select>
						</div>
					</div>

					<hr/>

					<div class="form-group">
						<label>Below Tokens</label>
						<div class="form-fields">
							<input type="checkbox" name="belowTokens" ?checked=${t.belowTokens} ?disabled=${this.#n}>
						</div>
						<p class="hint">Note that auras render at the same Z-index as tokens, so this also draws the effect below auras.</p>
					</div>
				</div>

				<div class="flexrow" style="margin-top: 1rem">
					${G(this.#n,()=>P`
						<button type="button" @click=${()=>this.#V(null,{render:!0})}>
							${Z(`Close`)}
						</button>
					`,()=>P`
						<button type="button" @click=${()=>this.#z(e)}>
							<i class="fas fa-trash"></i> ${Z(`Delete`)}
						</button>
						<button type="submit">
							<i class="fas fa-check"></i> ${Z(`Confirm`)}
						</button>
					`)}
				</div>
			</form>
		`};#S=()=>P`
		<div class="standard-form">
			<div class="form-group">
				<label>Token Ruler on Drag</label>
				<div class="form-fields">
					<select name="terrainHeightTools.rulerOnDrag" ?disabled=${this.#n}>
						${Y(oe,{selected:this.#e.terrainHeightTools.rulerOnDrag})}
					</select>
				</div>
			</div>

			<div class=${K({"form-group":!0,hidden:this.#e.terrainHeightTools.rulerOnDrag===`NONE`})}>
				<label>Target Tokens</label>
				<div class="form-fields">
					<select name="terrainHeightTools.targetTokens" ?disabled=${this.#n}>
						${Y(ur(),{selected:this.#e.terrainHeightTools.targetTokens})}
					</select>
				</div>
			</div>
		</div>
	`;#C(e){this.#l=e,this.render()}#w=e=>{let t=e.target.name?.length?e.target.name:e.target.closest(`[name]`)?.name;if(!t?.length)return;let n=new FormDataExtended(e.currentTarget),r=foundry.utils.getProperty(n.object,t);foundry.utils.setProperty(this.#e,t,r),this.#B()};#T(e,t){foundry.utils.setProperty(this.#e,e,t),this.#B()}#E=e=>{let t=e.target.value;if(this.#t=t,t!==`CUSTOM`){let e=Pe[t];Object.entries(e.owner).forEach(([e,t])=>this.#e.ownerVisibility[e]=t),Object.entries(e.nonOwner).forEach(([e,t])=>this.#e.nonOwnerVisibility[e]=t),this.#r?.(this.#e)}this.render()};#D(e,t){for(let[n,r]of Object.entries(Pe))if(fe(e,r.owner)&&fe(t,r.nonOwner))return n;return`CUSTOM`}#O=(e,t,n)=>{e.preventDefault();let r=new FormDataExtended(e.currentTarget);Object.assign(t[n],r.object),this.#V(null),this.#B()};#k=e=>{this.#e.effects.push({...ke(),...foundry.utils.deepClone(e)}),this.#V(this.#_(this.#e.effects.length-1),{title:`Edit Effect`}),this.#B()};#A=e=>{this.#V(this.#_(e),{title:`Edit Effect`,render:!0})};#j=e=>{this.#e.effects=this.#e.effects.filter((t,n)=>n!==e),this.#V(null),this.#B()};#M=e=>{this.#e.macros.push({...Ae(),...foundry.utils.deepClone(e)}),this.#V(this.#y(this.#e.macros.length-1),{title:`Edit Macro`}),this.#B()};#N=e=>{this.#V(this.#y(e),{title:`Edit Macro`,render:!0})};#P=e=>{this.#e.macros=this.#e.macros.filter((t,n)=>n!==e),this.#V(null),this.#B()};#F=e=>{game.settings.get(`grid-aware-auras`,`enableMacroAutomation`)&&e.preventDefault()};#I=async(e,t)=>{let n=await this.#H(e);n&&t.value&&(t.value.value=n.id)};#L=e=>{this.#e.sequencerEffects.push({...je(),...foundry.utils.deepClone(e)}),this.#R(this.#e.sequencerEffects.length-1),this.#B()};#R=e=>{this.#V(this.#x(e),{title:`Edit Sequencer Effect`,render:!0})};#z=e=>{this.#e.sequencerEffects=this.#e.sequencerEffects.filter((t,n)=>n!==e),this.#V(null),this.#B()};#B(){this.#r?.(this.#e),this.render()}#V(e,{title:t,render:n=!1}={}){this.#u=e,this.element.querySelector(`.window-title`).innerText=`Aura Configuration`+(t?.length?` :: ${t}`:``),n&&this.render()}_onFirstRender(...e){super._onFirstRender(...e),this.element.addEventListener(`input`,this.#w.bind(this)),this.#o&&(this.#o[this.id]=this)}_onClose(...e){super._onClose(...e),this.#o&&delete this.#o[this.id]}_replaceHTML(e,t){z(e,t)}async close(e){if(this.#u!==null){this.#V(null,{render:!0});return}e?.callOnClose!==!1&&this.#i?.(),await super.close(e)}_updateFrame(e){super._updateFrame(e);let t=game.i18n.localize(`GRIDAWAREAURAS.Aura`);z(P`
			<button type="button"
				class="header-control icon fas fa-passport"
				data-tooltip=${`${t}: ${this.#e.id}`} data-tooltip-direction="UP"
				@click=${e=>{e.preventDefault(),game.clipboard.copyPlainText(this.#e.id),ui.notifications.info(game.i18n.format(`DOCUMENT.IdCopiedClipboard`,{label:t,type:`id`,id:this.#e.id}))}}>
			</button>
		`,this.window.header,{renderBefore:this.window.controls})}async#H(e){if(!game.settings.get(`grid-aware-auras`,`enableMacroAutomation`))return null;try{let t=e.dataTransfer.getData(`text/plain`),n=JSON.parse(t);if(n.type!==`Macro`||!(`uuid`in n))return null;let r=await fromUuid(n.uuid);return r instanceof Macro?r:null}catch{return null}}};let Dr=()=>({applyToNew:[]});function Or(){return game.settings.get(n,l)}function kr(){return Or().map(e=>({...Dr(),...e,config:T(e.config)}))}async function Ar(e){await game.settings.set(n,l,e)}async function jr(e){let t=Or(),n={...Dr(),config:e};await Ar([...t,n]),ui.notifications.info(`Saved aura '${e.name}' as a new preset`)}var Mr=class extends B{static properties={items:{type:Array},value:{type:Array,reflect:!0},placeholder:{type:String},labelSelector:{type:String},valueSelector:{type:String},_isOpen:{state:!0}};static formAssociated=!0;#e=null;#t;constructor(){super(),this._internals=this.attachInternals(),this.items=[],this.value=[],this.placeholder=``,this._isOpen=!1,this.labelSelector=void 0,this.labelSelector=void 0}get#n(){if(!this.value?.length)return``;let e=this.items.map((e,t)=>({item:e,value:this.#u(e),index:t}));return this.value.map(t=>e.find(e=>e.value===t)).sort((e,t)=>e.index-t.index).map(e=>this.#l(e.item)).join(`, `)}render(){return P`
			<div class="multi-select-fwl-button" @mousedown=${()=>this._isOpen=!this._isOpen}>
				<div class="multi-select-fwl-button-label-container">
					${G(!this.value?.length,()=>P`
						<span class="multi-select-fwl-button-label-placeholder">${this.placeholder}</span>
					`,()=>P`
						<span class="multi-select-fwl-button-label-primary">${this.#n}</span>
						<span class="multi-select-fwl-button-label-alternate">${this.value.length} selected</span>
					`)}
				</div>
				<i class="fas fa-chevron-down"></i>
			</div>
		`}#r(){if(!this._isOpen){this.#e&&=(this.#e.remove(),null);return}this.#e||(this.#e=document.createElement(`div`),this.#e.classList.add(`multi-select-fwl-dropdown`),document.body.appendChild(this.#e));let e=new Set(this.value??[]);z(P`<menu class="dropdown-menu-fwl dropdown-menu-fwl-hover">
			${this.items.map(t=>P`
				<li
					class=${K({checked:e.has(this.#u(t))})}
					@click=${()=>this.#c(t)}>
					<i class="fas fa-check"></i>
					<span>${this.#l(t)}</span>
				</li>
			`)}
		</menu>`,this.#e)}connectedCallback(){super.connectedCallback(),this.hasAttribute(`tabindex`)||this.setAttribute(`tabindex`,0),this.#t=new AbortController;let{signal:e}=this.#t;document.addEventListener(`mousedown`,this.#o,{signal:e}),document.addEventListener(`keydown`,this.#s,{signal:e})}disconnectedCallback(){super.disconnectedCallback(),this.#t.abort(),this.#e?.remove(),this.#e=null}update(e){super.update(e),e.has(`_isOpen`)&&this.classList.toggle(`multi-select-fwl-open`,this._isOpen),this.#r()}updated(){this.#i(),this.#a()}#i(){let e=this.querySelector(`.multi-select-fwl-button-label-primary`),t=this.querySelector(`.multi-select-fwl-button-label-alternate`);if(!e||!t)return;let n=e.scrollWidth>e.clientWidth;e.style.opacity=+!n,t.style.opacity=+!!n}#a(){if(!this.#e)return;let{top:e,left:t,width:n,height:r}=this.getBoundingClientRect(),{width:i,height:a}=this.#e.getBoundingClientRect();Object.assign(this.#e.style,{top:e+r+a>window.innerHeight?`${e-a}px`:`${e+r}px`,left:t+i>window.innerWidth?`${t+n-i}px`:`${t}px`,minWidth:`${n}px`})}#o=e=>{this._isOpen&&(e.target.closest(`.multi-select-fwl-dropdown`)===this.#e||e.target.closest(`multi-select-fwl`)===this||(this._isOpen=!1))};#s=e=>{this._isOpen&&e.key===`Escape`&&(this._isOpen=!1)};#c(e){let t=this.#u(e);this.value=this.value?.includes(t)?this.value.filter(e=>e!==t):[...this.value??[],t],this._internals.setFormValue(JSON.stringify(this.value)),this.dispatchEvent(new Event(`change`))}#l(e){switch(typeof this.labelSelector){case`function`:return this.labelSelector(e);case`string`:return e[this.labelSelector];default:return typeof e==`object`?e.label:e}}#u(e){switch(typeof this.valueSelector){case`function`:return this.valueSelector(e);case`string`:return e[this.valueSelector];default:return typeof e==`object`?e.value:e}}createRenderRoot(){return this}};customElements.get(`multi-select-fwl`)||customElements.define(`multi-select-fwl`,Mr);let{ApplicationV2:Nr}=foundry.applications.api;var Pr=class extends Nr{static DEFAULT_OPTIONS={window:{contentClasses:[`sheet`,`standard-form`,`grid-aware-auras-preset-config`],icon:`far fa-cube`,title:`Aura Preset Manager`},position:{width:720,height:`auto`}};#e;#t=new Map;constructor(){super(),this.#e=kr()}_renderHTML(){let e=Object.keys(game.model.Actor).filter(e=>e!==`base`).map(e=>({label:game.i18n.localize(`TYPES.Actor.${e}`),value:e}));return P`
			<table class="grid-aware-auras-table">
				<thead>
					<tr style="background: none">
						<th class="text-left">Name</th>
						<th class="text-center" style="width: 58px">Radius</th>
						<th class="text-center" style="width: 58px">Line</th>
						<th class="text-center" style="width: 58px">Fill</th>
						<th class="text-center" style="width: 190px">Auto-apply to <i class="fas fa-question-circle cursor-help" data-tooltip="Automatically apply this aura to newly created tokens of the selected actor types"></i></th>
						<th class="text-center" style="width: 45px">
							<a @click=${this.#n}>
								<i class="fas fa-plus"></i>
							</a>
						</th>
					</tr>
				</thead>
				<tbody>
					${this.#e.map((t,n)=>P`
						<tr @contextmenu=${e=>this.#r(t,n,e)}>
							<td>
								<a data-tooltip="Enable/disable aura" style="width: 18px" @click=${()=>this.#s(t.config.id,!t.config.enabled)}>
									<i class=${`fas fa-toggle-${t.config.enabled?`on`:`off`}`}></i>
								</a>

								<a @click=${()=>this.#o(t.config)}>
									${t.config.name}
									${G(t.config.effects?.length||t.config.macros?.length||t.config.sequencerEffects?.length,()=>P`<i class="fas fa-bolt" data-tooltip="This aura applies effects or calls macros"></i>`)}
								</a>
							</td>
							<td class="text-center" style="width: 58px">
								${t.config.radius}
							</td>
							<td class="text-center" style="width: 58px">
								${G(t.config.lineType!==v.NONE,()=>G(t.config.lineColorAnimation,e=>P`<div class="gaa-color-block" ${gr(e,`--color`)}></div>`,()=>P`<div class="gaa-color-block" style=${`--color: ${qe(t.config.lineColor,t.config.lineOpacity)}`}></div>`))}
							</td>
							<td class="text-center" style="width: 58px">
								${G(t.config.fillType!==CONST.DRAWING_FILL_TYPES.NONE,()=>G(t.config.fillColorAnimation,e=>P`<div class="gaa-color-block" ${gr(e,`--color`)}></div>`,()=>P`<div class="gaa-color-block" style=${`--color: ${qe(t.config.fillColor,t.config.fillOpacity)}`}></div>`))}
							</td>
							<td>
								<multi-select-fwl
									.items=${e}
									placeholder="None"
									.value=${t.applyToNew}
									@change=${e=>this.#c(t.config.id,e)}
								></multi-select-fwl>
							</td>
							<td class="text-center" style="width: 45px">
								${G(!this.disabled,()=>P`
									<a @click=${e=>this.#r(t,n,e)} style="width: 100%; display: inline-block;">
										<i class="fas fa-ellipsis-vertical"></i>
									</a>
								`)}
							</td>
						</tr>
					`)}
				</tbody>
			</table>
			<p class="hint">Tip: You can also save existing auras as a preset.</p>

			<footer class="sheet-footer">
				<button @click=${this.#u}>Save Presets</button>
			</footer>
		`}_replaceHTML(e,t){z(e,t)}#n=e=>{X.open(e,[{label:`New`,icon:`fas fa-file`,onClick:()=>this.#i()},{label:`Import JSON`,icon:`fas fa-upload`,onClick:()=>this.#a()}])};#r=(e,t,n)=>{n.preventDefault(),n.stopPropagation(),X.open(n,[{label:`Edit`,icon:`fas fa-edit`,onClick:()=>this.#o(e.config)},t>0&&{label:`Move to Top`,icon:`fas fa-arrow-up-to-line`,onClick:()=>this.#l(t,0)},t>0&&{label:`Move Up`,icon:`fas fa-arrow-up`,onClick:()=>this.#l(t,t-1)},t<this.#e.length-1&&{label:`Move Down`,icon:`fas fa-arrow-down`,onClick:()=>this.#l(t,t+1)},t<this.#e.length-1&&{label:`Move to Bottom`,icon:`fas fa-arrow-down-to-line`,onClick:()=>this.#l(t,this.#e.length-1)},{label:`Duplicate`,icon:`fas fa-clone`,onClick:()=>{let t=T({...e.config,id:foundry.utils.randomID()});this.#o(t),this.#e=[...this.#e,{config:t}],this.render()}},{label:`Export JSON`,icon:`fas fa-download`,onClick:()=>Fe(e.config)},{label:`Delete`,icon:`fas fa-trash`,onClick:()=>{this.#e=this.#e.filter((e,n)=>n!==t),this.render()}}])};#i(){let e=Ne();this.#e=[...this.#e,{config:e}],this.render()}async#a(){let e=await Ie();this.#e=[...this.#e,{config:e}],this.render()}#o(e){if(this.#t.has(e.id))return;let t=new Er(e,{onChange:t=>{this.#e=this.#e.map(n=>n.config.id===e.id?{...n,config:t}:n),this.render()},onClose:()=>this.#t.delete(e.id),parentId:this.id});this.#t.set(e.id,t),t.render(!0)}#s(e,t){this.#e=this.#e.map(n=>n.config.id===e?{...n,config:{...n.config,enabled:t}}:n),this.render()}#c(e,t){let n=t.target.value;this.#e=this.#e.map(t=>t.config.id===e?{...t,applyToNew:n}:t)}#l(e,t){let[n]=this.#e.splice(e,1);this.#e.splice(t,0,n),this.render()}#u=async()=>{await Ar(this.#e),this.close()};_closeOpenDialogs(){for(let e of this.#t.values())e.close({callOnClose:!1})}async close(...e){return this._closeOpenDialogs(),await super.close(...e)}},Fr=class extends B{static properties={value:{attribute:`value`,type:Array,reflect:!0},disabled:{type:Boolean},showHeader:{type:Boolean},subHeadingText:{type:String},parentId:{type:String},attachConfigsTo:{attribute:!1},radiusContext:{attribute:!1}};static formAssociated=!0;#e;#t=new Map;constructor(){super(),this.#e=this.attachInternals(),this.value=[],this.disabled=!1,this.showHeader=!0,this.subHeadingText=void 0,this.parentId=void 0,this.attachConfigsTo=void 0,this.radiusContext={actor:void 0,item:void 0}}get form(){return this.#e.form}get name(){return this.getAttribute(`name`)}get type(){return this.localName}get canEditPresets(){return game.user.isGM}render(){let e=game.settings.get(n,a),t=game.settings.get(n,o);return P`
			<table class="grid-aware-auras-table">
				<thead>
					${G(this.showHeader,()=>P`
						<tr style="background: none">
							<th style="width: 24px">&nbsp;</th>
							<th class="text-left">${G(!this.subHeadingText?.length,()=>`Name`)}</th>
							<th class="text-center" style="width: 58px">Radius</th>
							<th class="text-center" style="width: 58px">Line</th>
							<th class="text-center" style="width: 58px">Fill</th>
							<th class="text-center" style="width: 45px">
								${G(!this.disabled,()=>P`
									<a data-action="create-aura" @click=${this.#r}>
										<i class="fas fa-plus"></i>
									</a>
								`)}
							</th>
						</tr>
					`)}

					${G(this.subHeadingText?.length,()=>P`
						<tr style="background: none">
							<th colspan="6">
								<div class="grid-aware-auras-table-item-header">
									<span>${this.subHeadingText}</span>
									<hr class="hr-narrow" />
								</div>
							</th>
						</tr>
					`)}
				</thead>
				<tbody>
					${this.value.map(n=>this.#n(n,e,t))}
				</tbody>
			</table>
		`}#n(e,t,n){let r=typeof e.radius!=`number`&&isNaN(parseInt(e.radius))&&e.radius.length,i=we(e.radius,this.radiusContext);return P`
			<tr data-aura-id=${e.id} @contextmenu=${t=>this.#l(e,t)}>
				<td style="width: 24px">
					${this.disabled?P`<p style="width: 18px">
							<i class=${`fas fa-toggle-${e.enabled?`on`:`off`}`}></i>
						</p>`:P`<a data-tooltip="Enable/disable aura" style="width: 18px" @click=${()=>this.#c(e.id,!e.enabled)}>
							<i class=${`fas fa-toggle-${e.enabled?`on`:`off`}`}></i>
						</a>`}
				</td>
				<td>
					<a @click=${()=>this.#s(e)}>
						${e.name}
						${G(t&&e.effects?.length||n&&e.macros?.length||e.sequencerEffects?.length,()=>P`<i class="fas fa-bolt" data-tooltip="This aura applies effects or calls macros"></i>`)}
					</a>
				</td>
				<td class="text-center" style="width: 58px">
					${i}
					${G(r&&typeof i!=`number`,()=>P`<i class="fas fa-warning cursor-help" data-tooltip=${game.i18n.format(`GRIDAWAREAURAS.UnresolvedRadiusTableWarning`,{path:`<code>${e.radius}</code>`})}></i>`)}
					${G(r&&typeof i==`number`,()=>P`<i class="fas fa-link cursor-help" data-tooltip=${e.radius}></i>`)}
				</td>
				<td class="text-center" style="width: 58px">
					${G(e.lineType!==v.NONE,()=>G(e.lineColorAnimation,e=>P`<div class="gaa-color-block" ${gr(e,`--color`)}></div>`,()=>P`<div class="gaa-color-block" style=${`--color: ${qe(e.lineColor,e.lineOpacity)}`}></div>`))}
				</td>
				<td class="text-center" style="width: 58px">
					${G(e.fillType!==CONST.DRAWING_FILL_TYPES.NONE,()=>G(e.fillColorAnimation,e=>P`<div class="gaa-color-block" ${gr(e,`--color`)}></div>`,()=>P`<div class="gaa-color-block" style=${`--color: ${qe(e.fillColor,e.fillOpacity)}`}></div>`))}
				</td>
				<td class="text-center" style="width: 45px">
					<a @click=${t=>this.#l(e,t)} style="width: 100%; display: inline-block;">
						<i class="fas fa-ellipsis-vertical"></i>
					</a>
				</td>
			</tr>
		`}updated(e){e.has(`value`)&&this.#e.setFormValue(JSON.stringify(this.value))}#r=e=>{let t=Or();X.open(e,[{label:`New`,icon:`fas fa-file`,onClick:()=>this.#i()},(t.length||this.canEditPresets)&&{label:`Add Preset`,icon:`far fa-cube`,children:[...t.map(e=>({label:e.config.name,onClick:()=>this.#a(e.config)})),...this.canEditPresets?[t.length&&{type:`separator`},{label:`Edit presets`,onClick:()=>new Pr().render(!0)}]:[]]},{label:`Import JSON`,icon:`fas fa-upload`,onClick:()=>this.#o()}])};#i(){let e=Ne();this.value=[...this.value,e],this.#u(),this.#s(e)}#a(e){let t=T(e,{newId:!0});this.value=[...this.value,t],this.#u()}async#o(){let e=await importAuraJson();this.value=[...this.value,e],this.#u(),this.#s(e)}#s(e){if(this.#t.has(e.id))return;let t=new Er(e,{disabled:this.disabled,onChange:t=>{this.value=this.value.map(n=>n.id===e.id?{...n,...t}:n),this.#u()},onClose:()=>this.#t.delete(e.id),parentId:this.parentId,attachTo:this.attachConfigsTo,radiusContext:this.radiusContext});this.#t.set(e.id,t),t.render(!0)}#c(e,t){this.value=this.value.map(n=>n.id===e?{...n,enabled:t}:n),this.#u()}#l(e,t){t.preventDefault(),t.stopPropagation(),X.open(t,[{label:this.disabled?`View`:`Edit`,icon:this.disabled?`fas fa-eye`:`fas fa-edit`,onClick:()=>this.#s(e)},!this.disabled&&!e.enabled&&{label:`Enable`,icon:`fas fa-toggle-on`,onClick:()=>this.#c(e.id,!0)},!this.disabled&&e.enabled&&{label:`Disable`,icon:`fas fa-toggle-off`,onClick:()=>this.#c(e.id,!1)},!this.disabled&&{label:`Duplicate`,icon:`fas fa-clone`,onClick:()=>{let t=T({...e,id:foundry.utils.randomID()});this.#s(t),this.value=[...this.value,t],this.#u()}},this.canEditPresets&&{label:`Save as Preset`,icon:`fas fa-floppy-disk`,onClick:()=>jr(e)},{label:`Export JSON`,icon:`fas fa-download`,onClick:()=>Fe(e)},!this.disabled&&{label:`Delete`,icon:`fas fa-trash`,onClick:()=>{this.value=this.value.filter(t=>t.id!==e.id),this.#u()}}])}#u(){this.#e.setFormValue(JSON.stringify(this.value));let e=new Event(`change`,{bubbles:!0,composed:!0});this.dispatchEvent(e)}_closeOpenDialogs(){for(let e of this.#t.values())e.close({callOnClose:!1})}createRenderRoot(){return this}};customElements.define(`gaa-aura-table`,Fr);let{ApplicationV2:Ir}=foundry.applications.api;var Lr=class e extends Ir{#e;#t;#n=U();constructor(e,{disabled:t=!1,...n}={}){super(n),this.#e=e,this.#t=t,e.apps[this.appId]=this}static DEFAULT_OPTIONS={tag:`form`,window:{contentClasses:[`sheet`,`standard-form`],icon:`far fa-hexagon`},position:{width:500,height:`auto`},form:{closeOnSubmit:!0,handler:e.#r}};get id(){return`gaa-token-aura-config-${this.#e.id}`}get title(){return`Aura Configuration: ${this.#e.name}`}_renderHTML(){return P`
			<gaa-aura-table
				name="auras"
				.value=${w(this.#e)}
				.disabled=${this.#t}
				.parentId=${this.#e.id}
				.radiusContext=${Ce(this.#e.parent,this.#e)}
				${W(this.#n)}>
			</gaa-aura-table>

			${G(!this.#t,()=>P`
				<footer class="sheet-footer flexrow">
					<button type="submit">
						<i class="fas fa-save"></i>
						${game.i18n.localize(`Save Changes`)}
					</button>
				</footer>
			`)}
		`}static async#r(e,t,r){let{auras:a}=r.object;await this.#e.update({[`flags.${n}.${i}`]:a})}close(e={}){return this.#n.value?._closeOpenDialogs(),super.close(e)}_replaceHTML(e,t){z(e,t)}};function Rr(e,t){e.document instanceof Item&&(e instanceof DocumentOwnershipConfig||t.unshift({label:`Auras`,class:`configure-auras`,icon:`far fa-hexagon`,[e instanceof Application?`onclick`:`onClick`]:t=>{t.preventDefault();let n=typeof e.isEditable==`boolean`?!e.isEditable:!1;new Lr(e.document,{disabled:n}).render(!0)}}))}
/**
* @license
* Copyright 2017 Google LLC
* SPDX-License-Identifier: BSD-3-Clause
*/
let zr=(e,t,n)=>{let r=new Map;for(let i=t;i<=n;i++)r.set(e[i],i);return r},Br=H(class extends Jn{constructor(e){if(super(e),e.type!==qn.CHILD)throw Error(`repeat() can only be used in text expressions`)}dt(e,t,n){let r;n===void 0?n=t:t!==void 0&&(r=t);let i=[],a=[],o=0;for(let t of e)i[o]=r?r(t,o):o,a[o]=n(t,o),o++;return{values:a,keys:i}}render(e,t,n){return this.dt(e,t,n).values}update(e,[t,n,r]){let i=Gn(e),{values:a,keys:o}=this.dt(t,n,r);if(!Array.isArray(i))return this.ut=o,a;let s=this.ut??=[],c=[],l,u,d=0,f=i.length-1,p=0,m=a.length-1;for(;d<=f&&p<=m;)if(i[d]===null)d++;else if(i[f]===null)f--;else if(s[d]===o[p])c[p]=V(i[d],a[p]),d++,p++;else if(s[f]===o[m])c[m]=V(i[f],a[m]),f--,m--;else if(s[d]===o[m])c[m]=V(i[d],a[m]),Hn(e,c[m+1],i[d]),d++,m--;else if(s[f]===o[p])c[p]=V(i[f],a[p]),Hn(e,i[d],i[f]),f--,p++;else if(l===void 0&&(l=zr(o,p,m),u=zr(s,d,f)),l.has(s[d]))if(l.has(s[f])){let t=u.get(o[p]),n=t===void 0?null:i[t];if(n===null){let t=Hn(e,i[d]);V(t,a[p]),c[p]=t}else c[p]=V(n,a[p]),Hn(e,i[d],n),i[t]=null;p++}else Kn(i[f]),f--;else Kn(i[d]),d++;for(;p<=m;){let t=Hn(e,c[m+1]);V(t,a[p]),c[p++]=t}for(;d<=f;){let e=i[d++];e!==null&&Kn(e)}return this.ut=o,Wn(e,c),F}}),Vr=`gaa-token-aura-config`,Hr=Symbol(`auraTableElementRef`);var Ur=class extends B{static properties={tokenConfig:{attribute:!1}};tokenConfig;#e=U();get appId(){return`${this.tokenConfig.appId}-gridawareauras`}get#t(){return game.release.generation===12?this.tokenConfig.preview:this.tokenConfig._preview}get actor(){return this.tokenConfig.actor}get token(){return this.tokenConfig.token}render(){let e=this.actor,t=w(this.#t??this.token),r=(e?.items??[]).map(e=>({item:e,auras:w(e)})).filter(({auras:e})=>e.length>0);return P`
			<gaa-aura-table
				name=${`flags.${n}.${i}`}
				.value=${t}
				subHeadingText="Token"
				@change=${e=>{this.#n(e),this.#i()}}
				.radiusContext=${Ce(e)}
				${W(this.#e)}
				style=${hr({display:`block`,marginTop:`0.5rem`,marginBottom:r.length?`0`:`0.5rem`})}
			></gaa-aura-table>

			${Br(r,({item:e})=>e.id,({item:t,auras:n})=>P`
				<gaa-aura-table
					.value=${n}
					.parentId=${t.id}
					.showHeader=${!1}
					.subHeadingText=${t.name}
					.attachConfigsTo=${t}
					.radiusContext=${Ce(e,t)}
					@change=${e=>this.#r(t,e.target.value)}
				></gaa-aura-table>
			`)}

			${G(r.length>0,()=>P`
				<hr class="hr-narrow" />
				<p><small>Note that changes made to auras on items are saved immediately (even if you do not click '${game.i18n.localize(`TOKEN.Update`)}' below).</small></p>
			`)}
		`}connectedCallback(){super.connectedCallback(),this.actor&&(this.actor.apps[this.appId]={render:()=>this.requestUpdate(),close:()=>{}})}disconnectedCallback(){super.disconnectedCallback(),this.actor&&delete this.actor.apps[this.appId]}#n(e){game.release.generation===12&&this.tokenConfig._onChangeInput(e)}async#r(e,t){await e.update({[`flags.${n}.${i}`]:t}),k.current&&this.#t?.object&&k.current._updateAuras({token:this.#t.object})}#i(){this.dispatchEvent(new Event(`requestresize`))}createRenderRoot(){return this}_closeOpenDialogs(){this.#e.value?._closeOpenDialogs()}};customElements.define(Vr,Ur);async function Wr(e,...t){let n=await e(...t),r=()=>setTimeout(()=>{this._state===Application.RENDER_STATES.RENDERED&&this.setPosition()},0);n.find(`> nav.sheet-tabs`).append(`
		<a class="item" data-tab="gridawareauras"><i class="far fa-hexagon"></i> ${game.i18n.localize(`GRIDAWAREAURAS.Auras`)}</a>
	`);let i=this[Hr];i||(i=this[Hr]=document.createElement(Vr),i.tokenConfig=this,i.addEventListener(`requestresize`,r));let a=$(`<div class="tab" data-group="main" data-tab="gridawareauras"></div>`);return n.find(`> footer`).before(a),a.get(0).appendChild(i),r(),n}async function Gr(e,t){let n=t.querySelector(`[data-application-part='gridAwareAuras']`);if(!n){b(`Failed to add Grid-Aware Aura config to token config sheet.`);return}let r=e[Hr];r||(r=e[Hr]=document.createElement(Vr),r.tokenConfig=e),n.replaceChildren(r)}function Kr(e){let t=e[Hr];t&&(delete e[Hr],t._closeOpenDialogs())}function qr(e,t,n,{hasEntered:r,isInit:i,isPreview:a,userId:o}){if(!game.settings.get(`grid-aware-auras`,`enableEffectAutomation`)||i||a||o!==game.userId||!n.effects?.length)return;let s=Qr(e,t,n.id);for(let i of n.effects){if(!i.effectId?.length||!J(e,t,n,i.targetTokens))continue;let a=s.get(i.effectId)?.[0],o=t=>x(e.actor,i.effectId,t,{overlay:i.isOverlay},!0);switch(i.mode){case`APPLY_ON_ENTER`:case`REMOVE_ON_ENTER`:r&&!a&&o(i.mode===`APPLY_ON_ENTER`);break;case`APPLY_ON_LEAVE`:case`REMOVE_ON_LEAVE`:!r&&!a&&o(i.mode===`APPLY_ON_LEAVE`);break;case`APPLY_WHILE_INSIDE`:r&&(!a||a.priority<i.priority)?o(!0):!r&&(!a||a.mode===`REMOVE_WHILE_INSIDE`)?o(!1):a&&o(a.mode===`APPLY_WHILE_INSIDE`);break;case`REMOVE_WHILE_INSIDE`:r&&(!a||a.priority<i.priority)?o(!1):a&&o(a.mode===`APPLY_WHILE_INSIDE`);break}}}function Jr(e,t){Xr(e,t,!0)}function Yr(e,t){Xr(e,t,!1)}function Xr(e,t,n){if(!game.settings.get(`grid-aware-auras`,`enableEffectAutomation`)||t!==game.userId)return;let r=`APPLY_ON_OWNER_TURN_${n?`START`:`END`}`,i=`REMOVE_ON_OWNER_TURN_${n?`START`:`END`}`;for(let t of k.current._auraManager.getTokenAuras(e)){let n=t.config.effects.filter(e=>e.mode===r||e.mode===i);if(!(n.length<=0))for(let i of k.current._auraManager.getTokensInsideAura(e,t.config.id)){let a;for(let o of n)a??=Qr(i),!a.has(o.effectId)&&J(i,e,t.config,o.targetTokens)&&x(i.actor,o.effectId,o.mode===r,{overlay:o.isOverlay},!0)}}let a=`APPLY_ON_TARGET_TURN_${n?`START`:`END`}`,o=`REMOVE_ON_TARGET_TURN_${n?`START`:`END`}`,s;for(let{parent:t,aura:n}of k.current._auraManager.getAurasContainingToken(e,{preview:!1})){let r=n.config.effects.filter(e=>e.mode===a||e.mode===o);if(!(r.length<=0))for(let i of r)s??=Qr(e),!s.has(i.effectId)&&J(e,t,n.config,i.targetTokens)&&x(e.actor,i.effectId,i.mode===a,{overlay:i.isOverlay},!0)}}function Zr(e,t,n){if(!game.settings.get(`grid-aware-auras`,`enableEffectAutomation`)||n!==game.userId)return;let r=[];for(let{parent:n,aura:i}of k.current._auraManager.getAllAuras({preview:!1})){let a;r.push(...i.config.effects.filter(n=>!t&&n.mode===`APPLY_ON_ROUND_START`||!t&&n.mode===`REMOVE_ON_ROUND_START`||!e&&n.mode===`APPLY_ON_ROUND_END`||!e&&n.mode===`REMOVE_ON_ROUND_END`).map(e=>({parent:n,aura:i,effect:e,targetTokens:a??=k.current._auraManager.getTokensInsideAura(n,i.config.id)})))}r.sort((e,t)=>{let n=e.effect.mode===`APPLY_ON_ROUND_START`||e.effect.mode===`REMOVE_ON_ROUND_START`,r=t.effect.mode===`APPLY_ON_ROUND_START`||t.effect.mode===`REMOVE_ON_ROUND_START`;return n===r?e.effect.priority-t.effect.priority:r-+n});let i=new Map;for(let{parent:e,aura:t,effect:n,targetTokens:a}of r)for(let r of a){if(!J(r,e,t.config,n.targetTokens)||de(i,r,()=>Qr(r)).has(n.effectId))continue;let a=n.mode===`APPLY_ON_ROUND_START`||n.mode===`APPLY_ON_ROUND_END`;x(r.actor,n.effectId,a,{overlay:n.isOverlay},!0)}}function Qr(e,t,n){return ue(k.current._auraManager.getAurasContainingToken(e,{preview:!1}).filter(({parent:e,aura:r})=>e!==t||r.config.id!==n).flatMap(({parent:t,aura:n})=>n.config.effects.filter(r=>ne.includes(r.mode)&&J(e,t,n,r.targetTokens))).sort((e,t)=>t.priority-e.priority),e=>e.effectId)}function $r(e,t,n,r){if(!game.settings.get(`grid-aware-auras`,`enableMacroAutomation`))return;let{isPreview:i,hasEntered:a}=r;for(let o of n.macros)(!i&&o.mode===`ENTER_LEAVE`||!i&&o.mode===`ENTER`&&a||!i&&o.mode===`LEAVE`&&!a||i&&o.mode===`PREVIEW_ENTER_LEAVE`||i&&o.mode===`PREVIEW_ENTER`&&a||i&&o.mode===`PREVIEW_LEAVE`&&!a)&&Q(o,e,t,n,r)}function ei(e,t,n,r){for(let i of n.macros)i.mode===`TARGET_START_MOVE`&&Q(i,e,t,n,r)}function ti(e,t,n,r){for(let i of n.macros)i.mode===`TARGET_END_MOVE`&&Q(i,e,t,n,r)}function ni(e,t){ii(e,t,!0)}function ri(e,t){ii(e,t,!1)}function ii(e,t,n){if(!game.settings.get(`grid-aware-auras`,`enableMacroAutomation`))return;let r=`OWNER_TURN_${n?`START`:`END`}`;for(let i of k.current._auraManager.getTokenAuras(e)){let a;for(let o of i.config.macros)if(!(o.mode!==`OWNER_TURN_START_END`&&o.mode!==r)){a??=k.current._auraManager.getTokensInsideAura(e,i.config.id).filter(e=>!e.isPreview);for(let e of a)Q(o,e,parent,i,{isTurnStart:n,userId:t})}}let i=`TARGET_TURN_${n?`START`:`END`}`;for(let{parent:r,aura:a}of k.current._auraManager.getAurasContainingToken(e,{preview:!1}))for(let o of a.config.macros)o.mode!==`TARGET_TURN_START_END`&&o.mode!==i||Q(o,e,r,a,{isTurnStart:n,userId:t})}function ai(e,t,n){if(!game.settings.get(`grid-aware-auras`,`enableMacroAutomation`))return;let r=[],i=[];for(let{parent:n,aura:a}of k.current._auraManager.getAllAuras({preview:!1})){let o;for(let s of a.config.macros)!e&&(s.mode===`ROUND_START_END`||s.mode===`ROUND_END`)&&(o??=k.current._auraManager.getTokensInsideAura(n,a.config.id).filter(e=>!e.isPreview),r.push({parent:n,aura:a,macro:s,targetTokens:o})),!t&&(s.mode===`ROUND_START_END`||s.mode===`ROUND_START`)&&(o??=k.current._auraManager.getTokensInsideAura(n,a.config.id).filter(e=>!e.isPreview),i.push({parent:n,aura:a,macro:s,targetTokens:o}))}for(let{parent:e,aura:t,macro:i,targetTokens:a}of r)for(let r of a)Q(i,r,e,t,{isRoundStart:!1,userId:n});for(let{parent:e,aura:t,macro:r,targetTokens:a}of i)for(let i of a)Q(r,i,e,t,{isRoundStart:!0,userId:n})}function Q(e,t,n,r,i){if(!J(t,n,r,e.targetTokens))return;let a=game.macros.get(e.macroId);a?.canExecute?a.execute({token:t,parent:n,aura:r,options:i}):a||b(`Attempted to call macro with ID '${e.macroId}' due to ${e.mode} from aura '${r.name}' on token '${n.name}', but it could not be found.`)}let oi=new Promise(e=>Hooks.on(`sequencer.ready`,()=>setTimeout(e,0))),si=()=>new Promise(e=>Hooks.once(`sequencerEffectManagerReady`,e)),ci=si();Hooks.on(`canvasTearDown`,()=>ci=si());let li=new Set;Hooks.on(`endedSequencerEffect`,({data:e})=>li.delete(e.name));function di(e,t,r,{hasEntered:i,isInit:a,isPreview:o}){if(o||!pe())return;let s=r.sequencerEffects.filter(n=>J(e,t,r,n.targetTokens));if(s.length===0)return;Promise.all([oi,ci]).then(()=>{if(i&&a)for(let e of s)fi(e)&&c(e);else if(i)for(let e of s)[`ON_ENTER`,`WHILE_INSIDE`].includes(e.trigger)&&c(e);else for(let i of s)switch(i.trigger){case`WHILE_INSIDE`:if(i.position===`ON_OWNER`){if(k.current._auraManager.getTokensInsideAura(t,r.id).some(n=>!n.isPreview&&n!==e&&J(n,t,r,i.targetTokens)))continue;Sequencer.EffectManager.endEffects({name:[n,t.id,r.id,i.uId].join(`_`)})}else Sequencer.EffectManager.endEffects({name:pi(e.id,t.id,r.id,i.uId)},!1);break;case`ON_LEAVE`:c(i)}});function c(i){let o=pi(e.id,t.id,r.id,i.uId),s=fi(i)&&i.position===`ON_OWNER`;s&&(o=[n,t.id,r.id,i.uId].join(`_`));let c=new Sequence,l=c.effect().name(o).file(i.effectPath).origin(t).attachTo([`ON_TARGET`,`TARGET_TO_OWNER`].includes(i.position)?e:t).delay(i.delay).opacity(Math.min(Math.max(i.opacity,0),1)).playbackRate(i.playbackRate).belowTokens(i.belowTokens===!0).tieToDocuments(t);i.position===`TARGET_TO_OWNER`?l.stretchTo(t,{attachTo:!0}):i.position===`OWNER_TO_TARGET`&&l.stretchTo(e,{attachTo:!0}),fi(i)?l.persist():l.repeats(i.repeatCount,i.repeatDelay),!a&&i.fadeInDuration>0&&l.fadeIn(i.fadeInDuration,{ease:i.fadeInEasing}),i.fadeOutDuration>0&&l.fadeOut(i.fadeOutDuration,{ease:i.fadeOutEasing}),i.scaleToObject?l.scaleToObject(i.scale,{uniform:!0}):l.scale(i.scale),!a&&i.scaleInDuration>0&&l.scaleIn(i.scaleInScale,i.scaleInDuration,{ease:i.scaleInEasing}),i.scaleOutDuration>0&&l.scaleOut(i.scaleOutScale,i.scaleOutDuration,{ease:i.scaleOutEasing}),s&&l.playIf(()=>li.has(o)?!1:(li.add(o),!0)),l.waitUntilFinished(),c.play({local:!0})}}function fi(e){return e.trigger===`WHILE_INSIDE`}function pi(e,t,r,i){return[n,t,e,r,i].join(`_`)}function mi(e,t,r,{hasEntered:i,userId:a}){if(a===game.userId&&t.isPreview&&r.terrainHeightTools.rulerOnDrag!==`NONE`&&me()){let a=[n,t.document.uuid,r.id,e.document.uuid].join(`|`);i&&J(e,t,r,r.terrainHeightTools.targetTokens)?terrainHeightTools.drawLineOfSightRaysBetweenTokens(t,e,{group:a,drawForOthers:!1,includeEdges:r.terrainHeightTools.rulerOnDrag===`E2E`}):terrainHeightTools.clearLineOfSightRays({group:a})}}function hi(){Hooks.on(m,(...e)=>{qr(...e),$r(...e),di(...e),mi(...e)}),Hooks.on(h,(...e)=>{ei(...e)}),Hooks.on(p,(...e)=>{ti(...e)}),Hooks.on(`updateCombat`,(e,t,n,r)=>{if(!(!e.previous||e.scene&&e.scene.id!==game.canvas.scene.id)){if(e.previous.combatantId!==e.current.combatantId&&e.previous.tokenId?.length){let t=game.canvas.tokens.get(e.previous.tokenId);t&&(Yr(t,r),ri(t,r))}if(e.previous.round!==e.current.round){let t=e.previous.round===0;Zr(t,!1,r),ai(t,!1,r)}if(e.previous.combatantId!==e.current.combatantId&&e.current.tokenId?.length){let t=game.canvas.tokens.get(e.current.tokenId);t&&(Jr(t,r),ni(t,r))}}}),Hooks.on(`deleteCombat`,(e,t,n)=>{e.round>0&&(Zr(!1,!0,n),ai(!1,!0,n))})}let{ApplicationV2:gi}=foundry.applications.api;var _i=class extends gi{#e;constructor(e={}){super(e),this.#e=[...game.settings.get(`grid-aware-auras`,`customAuraTargetFilters`)??[]]}static DEFAULT_OPTIONS={id:`gaa-custom-aura-target-filter-config`,tag:`form`,window:{contentClasses:[`standard-form`],icon:`fas fa-filter`,title:`SETTINGS.CustomAuraTargetFilters.Name`,resizable:!0},position:{width:700,height:650}};_renderHTML(){let e=`https://github.com/Wibble199/FoundryVTT-Grid-Aware-Auras/blob/v${game.modules.get(`grid-aware-auras`).version}/docs/custom-aura-target-filters.md`;return P`
			<p style="margin: 0">
				${game.i18n.localize(`SETTINGS.CustomAuraTargetFilters.LongHint`)}
				<br/>
				<a href=${e} target="_blank">
					${game.i18n.localize(`SETTINGS.CustomAuraTargetFilters.LongHintLink`)}
					<i class="fas fa-external-link"></i>
				</a>
			</p>
			<div class="filter-list">
				${this.#e.map(e=>P`
					<div class="filter-item">
						<input class="name" type="text" placeholder="Name" .value=${e.name} @change=${t=>e.name=t.target.value} required>
						<div class=${K({body:!0,"is-invalid":e._error?.length})} @click=${this.#n}>
							<span>function (targetToken, sourceToken, aura) {</span>
							<textarea rows="1" @change=${t=>e.body=t.target.value} spellcheck="false">${e.body}</textarea>
							<span>}</span>
							${G(e._error?.length,()=>P`<p class="error">${e._error}</p>`)}
						</div>
						<a class="delete" @click=${this.#r(e.id)}><i class="fas fa-times"></i></a>
					</div>
				`)}
			</div>
			<footer class="form-footer">
				<button type="button" @click=${this.#t}>
					<i class="fas fa-plus"></i>
					Create New Filter
				</button>
				<button type="submit" @click=${this.#i}>
					<i class="fa-solid fa-save"></i>
					${game.i18n.localize(`Save Changes`)}
				</button>
			</footer>
		`}#t=()=>{this.#e.push({id:foundry.utils.randomID(),name:`New Filter`,body:``}),this.render()};#n=e=>{e.currentTarget.querySelector(`textarea`).focus()};#r(e){return()=>{this.#e=this.#e.filter(t=>t.id!==e),this.render()}}#i=async()=>{for(let e of this.#e)if(!e.body?.length)e._error=`Function body cannot be empty`;else try{Function(`targetToken`,`sourceToken`,`aura`,e.body),delete e._error}catch(t){e._error=t.message}if(this.#e.some(e=>e._error?.length)){await this.render();return}let e=this.#e.map(({id:e,name:t,body:n})=>({id:e,name:t,body:n}));await game.settings.set(n,c,e),await this.close()};_replaceHTML(e,t){z(e,t)}};function vi(){game.settings.register(n,s,{name:`SETTINGS.SquareGridMode.Name`,hint:`SETTINGS.SquareGridMode.Hint`,scope:`world`,default:y.EQUIDISTANT,type:Number,choices:Object.fromEntries(Object.entries(y).map(([e,t])=>[t,`GRIDAWAREAURAS.SquareGridMode${e.titleCase()}`])),config:!0,onChange:()=>k.current?._updateAuras({force:!0})}),game.settings.register(n,a,{name:`SETTINGS.EnableEffectAutomation.Name`,hint:`SETTINGS.EnableEffectAutomation.Hint`,scope:`world`,default:!1,type:Boolean,config:!0}),game.settings.register(n,o,{name:`SETTINGS.EnableMacroAutomation.Name`,hint:`SETTINGS.EnableMacroAutomation.Hint`,scope:`world`,default:!1,type:Boolean,config:!0}),game.settings.registerMenu(n,l,{name:`SETTINGS.Presets.Name`,hint:`SETTINGS.Presets.Hint`,label:`SETTINGS.Presets.Button`,icon:`far fa-cube`,type:Pr,restricted:!0}),game.settings.register(n,l,{name:`SETTINGS.Presets.Name`,scope:`world`,default:[],type:Array,config:!1}),game.settings.registerMenu(n,c,{name:`SETTINGS.CustomAuraTargetFilters.Name`,hint:`SETTINGS.CustomAuraTargetFilters.Hint`,label:`SETTINGS.CustomAuraTargetFilters.Button`,icon:`fas fa-filter`,type:_i,restricted:!0}),game.settings.register(n,c,{name:`SETTINGS.CustomAuraTargetFilters.Name`,scope:`world`,default:[],type:Array,config:!1,onChange:()=>fr()})}function yi(){ve(`lancer.actor_max_threat`,e=>e?.items?.reduce((e,t)=>{if(t.system.destroyed)return e;switch(t.type){case`mech_weapon`:return Math.max(e,bi(t.system.active_profile.range,`Threat`,1));case`npc_feature`:return t.system.type===`Weapon`?Math.max(e,bi(t.system.range,`Threat`,1)):e;case`pilot_weapon`:return Math.max(e,bi(t.system.range,`Threat`,1));default:return e}},-1)??-1,{description:`The largest/maximum weapon threat for the actor based on it's items. Returns -1 (which will disable the aura) if no items grant threat.`}),ve(`lancer.actor_max_range`,e=>e?.items?.reduce((e,t)=>{if(t.system.destroyed)return e;switch(t.type){case`mech_weapon`:return Math.max(e,bi(t.system.active_profile.range,`Range`));case`npc_feature`:return t.system.type===`Weapon`?Math.max(e,bi(t.system.range,`Range`)):e;case`pilot_weapon`:return Math.max(e,bi(t.system.range,`Range`));default:return e}},-1)??-1,{description:`The largest/maximum weapon range for the actor based on it's items. Returns -1 (which will disable the aura) if no items have a range.`})}function bi(e,t,n=-1){let r=+e?.find(e=>e.type===t)?.val;return Number.isNaN(r)?n:r}function xi(){switch(game.system.id){case`lancer`:yi();break}}let Si=[`x`,`y`,`width`,`height`,`shape`,`flags.grid-aware-auras.auras`];Hooks.once(`init`,()=>{vi(),dr(),hi(),xi(),CONFIG.Canvas.layers.gaaAuraLayer={group:`interface`,layerClass:k},game.modules.get(`grid-aware-auras`).api={...wt}}),Hooks.once(`ready`,()=>{switch(game.release.generation){case 12:libWrapper.register(n,`TokenConfig.prototype._renderInner`,Wr,libWrapper.WRAPPER),Hooks.on(`closeTokenConfig`,Kr),Hooks.on(`getItemSheetHeaderButtons`,Rr);break;case 13:{let e=new Set,t=t=>{if(!(t.prototype instanceof foundry.applications.api.ApplicationV2)||e.has(t))return;t.TABS.sheet.tabs.push({id:`gridAwareAuras`,icon:`far fa-hexagon`});let r=t.PARTS.footer;delete t.PARTS.footer,t.PARTS.gridAwareAuras={template:`modules/${n}/templates/v13-token-config-tab.hbs`,scrollable:[]},t.PARTS.footer=r,e.add(t)};for(let e of Object.values(CONFIG.Token.sheetClasses))for(let n of Object.values(e))t(n.cls);t(CONFIG.Token.prototypeSheetClass),Hooks.on(`renderTokenConfig`,Gr),Hooks.on(`renderPrototypeTokenConfig`,Gr),Hooks.on(`closeTokenConfig`,Kr),Hooks.on(`getItemSheetHeaderButtons`,Rr),Hooks.on(`getHeaderControlsApplicationV2`,Rr);break}}game.socket.on(r,({func:e,runOn:t,...n})=>{if(!(t?.length>0&&t!==game.userId))switch(e){case _:{let{actorUuid:e,effectId:t,state:r,effectOptions:i}=n;x(e,t,r,i,!1);break}}})}),Hooks.on(`preCreateToken`,(e,t)=>{let r=t.flags?.[`grid-aware-auras`]?.auras??[],a=game.actors.get(t.actorId);if(!a)return;let o=kr().filter(e=>e.applyToNew.includes(a.type));for(let e of o)r.some(t=>t.name.localeCompare(e.config.name,void 0,{sensitivity:`accent`})===0)||r.push(e.config);e.updateSource({[`flags.${n}.${i}`]:r})}),Hooks.on(`createToken`,(e,t,n)=>{let r=game.canvas.tokens.get(e.id);r&&k.current&&k.current._updateAuras({token:r,userId:n})}),Hooks.on(`updateToken`,(e,t,n,r)=>{if(!k.current)return;let i=game.canvas.tokens.get(e.id);if(!i)return;let a=`x`in t||`y`in t,o=he([`x`,`y`],e),s=a?k.current._auraManager.getAurasContainingToken(i):[];for(let e of s)Hooks.callAll(h,i,e.parent,e.aura.config,{userId:r});Object.keys(foundry.utils.flattenObject(t)).some(e=>Si.includes(e))&&k.current._updateAuras({token:i,tokenDelta:t,userId:r});let c=a?k.current._auraManager.getAurasContainingToken(i):[];for(let e of c){let t=s.some(t=>t.aura===e.aura&&t.parent===e.parent);Hooks.callAll(p,i,e.parent,e.aura.config,{startedInside:t,startPosition:o,userId:r})}}),Hooks.on(`refreshToken`,(e,{refreshPosition:t,refreshVisibility:n})=>{(t||n)&&(e.isPreview?(k.current?._updateAuras({token:e}),k.current?._testCollisionsForToken(e,{useActualPosition:!0})):k.current?._updateAuraGraphics({token:e,updatePosition:!!t}))}),Hooks.on(`hoverToken`,e=>{k.current?._updateAuraGraphics({token:e,updatePosition:!1})}),Hooks.on(`controlToken`,e=>{k.current?._updateAuraGraphics({token:e})}),Hooks.on(`targetToken`,(e,t)=>{k.current?._updateAuraGraphics({token:t})}),Hooks.on(`updateActor`,(e,t,n,r)=>{k.current?._updateActorAuras(e,{userId:r})}),Hooks.on(`createItem`,(e,t,n)=>{e.actor&&k.current?._updateActorAuras(e.actor,{userId:n})}),Hooks.on(`updateItem`,(e,t,n,r)=>{e.actor&&k.current?._updateActorAuras(e.actor,{userId:r})}),Hooks.on(`deleteItem`,(e,t,n)=>{e.actor&&k.current?._updateActorAuras(e.actor,{userId:n})}),Hooks.on(`updateCombat`,e=>{for(let t of e.combatants){let e=game.canvas.tokens.get(t.tokenId);k.current?._updateAuraGraphics({token:e})}}),Hooks.on(`deleteCombat`,e=>{for(let t of e.combatants){let e=game.canvas.tokens.get(t.tokenId);k.current?._updateAuraGraphics({token:e})}}),Hooks.on(`destroyToken`,e=>{k.current?._onDestroyToken(e)}),Hooks.on(`canvasTearDown`,()=>{k.current&&(k.current._isTearingDown=!0)})})();
//# sourceMappingURL=module.js.map