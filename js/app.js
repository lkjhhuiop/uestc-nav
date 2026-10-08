/* 页面、选点、地图交互与路线详情。使用普通 script，双击 index.html 即可运行。 */
// 界面图标统一为20px线性SVG，避免不同平台的符号字形不一致。
function uiIcon(name) {
  const paths={
    moon:'<path d="M20 13.3A8.2 8.2 0 0 1 10.7 4a8.2 8.2 0 1 0 9.3 9.3Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.4 1.4m11.2 11.2L19 19M5 19l1.4-1.4M17.6 6.4 19 5"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 4 4"/>',
    swap:'<path d="M8 4v16m-4-4 4 4 4-4M16 20V4m-4 4 4-4 4 4"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    back:'<path d="M19 12H5m6-6-6 6 6 6"/>',
    north:'<path d="m5 19 7-15 7 15-7-4-7 4Z"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    minus:'<path d="M5 12h14"/>',
    reset:'<path d="M8 4H4v4m12-4h4v4M4 16v4h4m12-4v4h-4"/><circle cx="12" cy="12" r="3"/>',
    shield:'<path d="m12 3 7 3v6c0 4-7 8-7 8s-7-4-7-8V6l7-3Z"/><path d="m8.5 11.5 2.3 2.3 4.7-4.7"/>'
  };
  return `<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
}
const edgeIndex=new Map();
edges.forEach(edge=>{edgeIndex.set(`${edge.from}|${edge.to}`,edge);edgeIndex.set(`${edge.to}|${edge.from}`,edge);});
function routeSteps(path) {
  const groups=[];
  for(let i=1;i<path.length;i++) {
    const a=byId.get(path[i-1]),b=byId.get(path[i]),edge=edgeIndex.get(`${a.id}|${b.id}`);
    let kind=edge.kind;
    if(kind==='stair-access')kind='ring';
    const direction=Number(b.floor[0])-Number(a.floor[0]);
    const key=kind==='stairs'?`${kind}:${a.shaft}:${Math.sign(direction)}`:
      kind==='bridge'?`${kind}:${a.floor}`:kind==='outdoor'?'outdoor':`${kind}:${a.floor}:${a.block||b.block||''}`;
    const last=groups[groups.length-1];
    if(last && last.key===key) {last.to=b;last.distance+=edge.weight;last.ids.push(b.id);}
    else groups.push({key,kind,from:a,to:b,distance:edge.weight,ids:[a.id,b.id]});
  }
  const steps=groups.filter(g=>g.distance>0).map(g=> {
    let title='',note='',floor=g.to.floor,block=g.to.block||'all';
    if(g.kind==='stairs') {
      title=`经${g.from.name}${Number(g.to.floor[0])>Number(g.from.floor[0])?'上':'下'}至${g.to.floor}`;
      note=`${g.from.floor} → ${g.to.floor}，同一座楼梯连续换层。`;
    } else if(g.kind==='bridge') {
      title=g.from.floor==='2F'?'通过二楼露天连廊':`通过三楼${g.from.block||''}—${g.to.block||''}连廊`;
      note=`${g.from.block||'交汇处'} → ${g.to.block||'交汇处'}，按图中连接通道行走。`;block='all';
    } else if(g.kind==='entry') {
      title=g.to.floor==='outdoor'?`从${g.from.name}走出`:`由${g.to.name}进入一楼`;
      note='这是同一地面高度的室内外通行，不需要上下楼。';
    } else if(g.kind==='access') {
      title=g.to.isGate?`前往${g.to.name}`:`进入${g.to.block}区一楼环廊`;
      note='通过建筑入口通道，地面道路可通往ABC各区入口。';
    } else if(g.kind==='outdoor') {
      title=`沿室外步道前往${g.to.name}`;note=`从${g.from.name}出发，沿蓝色路线行走。`;
    } else if(g.kind==='door') {
      title=g.to.type==='room'?`到达 ${g.to.name}`:`从${g.from.name}走入环廊`;
      note=g.to.type==='room'?'请核对现场门牌，祝你学习顺利。':'出门后按照路线选择绕行方向。';
    } else {
      title=`沿${g.from.block||g.to.block}区${g.from.floor}环廊行走`;
      note=`前往${g.to.name}。环廊双向通行，浅蓝箭头仅表示门牌递增方向。`;
    }
    return {title,note,floor,block,distance:g.distance,kind:g.kind,ids:g.ids};
  });
  const last=byId.get(path[path.length-1]);
  if(!steps.length || last.type!=='room')steps.push({title:`已到达${last.name}`,note:path.length===1?'起点与终点相同，无需步行。':'已抵达所选位置。',floor:last.floor,block:last.block||'all',distance:0,kind:'arrival',ids:[last.id]});
  return steps;
}
// 室内1F和室外处于同一地面高度，行程里合并显示。
function routeFloors(path) {return path.map(id=>byId.get(id).floor==='outdoor'?'1F':byId.get(id).floor).filter((floor,index,all)=>index===0||floor!==all[index-1]);}
function floorOf(node){return node.floor==='outdoor'?'1F':node.floor;}
// 左侧仅保留每层一条指引；细分步骤仍用于绘图和展开页。
function summarizeRouteFloors(path,steps) {
  const floors=[...new Set(routeFloors(path))];
  const destination=byId.get(path[path.length-1]);
  return floors.map((floor,index)=>{
    const onFloor=path.map(id=>byId.get(id)).filter(node=>floorOf(node)===floor);
    const end=onFloor[onFloor.length-1];
    const label=floor==='1F'?'地面 / 1F':floor;
    const blocks=[...new Set(onFloor.filter(node=>node.type==='corridor'||node.type==='room').map(node=>node.block).filter(Boolean))];
    const detail=steps.filter(step=>floorOf(step)===floor);
    const features=[];
    if(onFloor.some(node=>node.floor==='outdoor'))features.push('室外步道');
    if(blocks.length)features.push(`${blocks.join('、')}区环廊`);
    if(detail.some(step=>step.kind==='bridge'))features.push(floor==='2F'?'中央露天连廊':'跨区连廊');
    if(detail.some(step=>step.kind==='stairs'))features.push('楼梯换层');
    let distance=0;
    for(let i=1;i<path.length;i++) {
      const a=byId.get(path[i-1]),b=byId.get(path[i]),edge=edgeIndex.get(`${a.id}|${b.id}`);
      const owner=edge.kind==='stairs'?floorOf(b):floorOf(a);
      if(owner===floor)distance+=edge.weight;
    }
    const title=path.length===1?`${label} · 已在${destination.name}`:index===floors.length-1?`${label} · 到达${destination.name}`:`${label} · 前往${end.name}`;
    const note=features.length?`途经${features.join('、')}，按地图高亮路段前进。`:'沿图中高亮路线继续前行。';
    return {floor,title,note,distance};
  });
}
const groundNodes=nodes.filter(node=>node.floor==='outdoor'||node.floor==='1F');
const groundIds=new Set(groundNodes.map(node=>node.id));
const groundEdges=edges.filter(edge=>groundIds.has(edge.from)&&groundIds.has(edge.to));
function planRoute(startId,endId) {
  // 地面出发、地面到达时，优先不换层；高层路线使用完整路网。
  const groundPreferred=groundIds.has(startId)&&groundIds.has(endId);
  const result=dijkstra(groundPreferred?groundNodes:nodes,groundPreferred?groundEdges:edges,startId,endId);
  return Object.assign(result,{groundPreferred});
}
const startSelect=document.getElementById('startSelect'),endSelect=document.getElementById('endSelect');
const roomSearch=document.getElementById('roomSearch');
const motionPreference=window.matchMedia('(prefers-reduced-motion: reduce)');
let currentRoute=null;
let selectedRouteStep=null,hoveredRouteStep=null,routeFloorBeforeHover=null;
const mapStates={home:{floor:'outdoor',block:'all',zoom:1,panX:0,panY:0},route:{floor:'outdoor',block:'all',zoom:1,panX:0,panY:0}};
function button(text,className,onClick) {
  const element=document.createElement('button');element.type='button';element.className=className==='step-map-button'?className:`glass-button ${className||''}`;
  const label=document.createElement('span');label.textContent=text;element.append(label);
  element.addEventListener('click',onClick);return element;
}
function addOptions(select) {
  const entrances=document.createElement('optgroup');entrances.label='室外入口';
  nodes.filter(n=>n.type==='entrance'&&!n.isDoor).forEach(n=>entrances.append(new Option(n.name,n.id)));select.append(entrances);
  const gates=document.createElement('optgroup');gates.label='建筑入口 · 地面互通';
  buildingEntrances.forEach(entry=>gates.append(new Option(byId.get(entry.id).name,entry.id)));select.append(gates);
  for(const block of Object.keys(buildings)) {
    for(let floor=1;floor<=buildings[block].floors;floor++) {
      const group=document.createElement('optgroup');group.label=`${block}区 · ${floor}F`;
      nodes.filter(n=>n.type==='room'&&n.block===block&&n.floor===`${floor}F`).forEach(n=>group.append(new Option(n.name,n.id)));select.append(group);
    }
  }
}
addOptions(startSelect);addOptions(endSelect);startSelect.value='ENTRANCE_4';endSelect.value='B312';
nodes.filter(n=>n.type==='room').forEach(n=>document.getElementById('roomSuggestions').append(new Option(`${n.block}区 · ${n.floor}`,n.id)));
for(let i=1;i<=5;i++) {
  const id=`ENTRANCE_${i}`,element=button(`入口${i}`,'',()=>{startSelect.value=id;syncSelection();});
  element.dataset.node=id;document.getElementById('entranceButtons').append(element);
}
destinations.forEach(id=>{
  const element=button(id,'',()=>{endSelect.value=id;roomSearch.value='';syncSelection();});
  element.dataset.node=id;document.getElementById('destinationButtons').append(element);
});
function pointLabel(id) {const node=byId.get(id);return node.type==='room'?`${node.name} · ${node.floor}`:node.name;}
let lastDestination=endSelect.value;
function syncSelection() {
  [['entranceButtons',startSelect.value],['destinationButtons',endSelect.value]].forEach(pair=>{
    document.querySelectorAll(`#${pair[0]} button`).forEach(element=>{const active=element.dataset.node===pair[1];element.classList.toggle('active',active);element.setAttribute('aria-pressed',String(active));});
  });
  const destination=byId.get(endSelect.value);
  // 已进入室内预览时，换终点同步到它所在的分区和楼层；室外总览保持总览。
  const preview=mapStates.home;
  if(lastDestination!==destination.id && preview.floor!=='outdoor' && destination.block && (preview.floor!==destination.floor||preview.block!==destination.block)) {
    preview.floor=destination.floor==='outdoor'?'1F':destination.floor;preview.block=destination.block;resetView(preview);
  }
  lastDestination=destination.id;
  document.getElementById('selectionInfo').textContent=destination.type==='room'?`${destination.block}区 · ${destination.floor} · ${destination.side}${destination.block==='C'?'，门牌位置参考现场导视图。':'，门牌沿顺时针递增。'}`:destination.isDoor?'已选择建筑入口，ABC各入口均通过地面道路连通。':'已选择室外入口为目的地。';
  document.getElementById('errorMessage').hidden=true;
  renderMap('home');
}
startSelect.addEventListener('change',()=>{roomSearch.value='';syncSelection();});
endSelect.addEventListener('change',()=>{roomSearch.value='';syncSelection();});
roomSearch.addEventListener('input',()=>{
  const id=roomSearch.value.trim().toUpperCase();
  if(byId.has(id)&&byId.get(id).type==='room') {endSelect.value=id;syncSelection();}
});
document.getElementById('swapPoints').addEventListener('click',()=>{const start=startSelect.value;startSelect.value=endSelect.value;endSelect.value=start;roomSearch.value='';syncSelection();});
function showPage(id) {
  document.querySelectorAll('main > section').forEach(page=>{page.hidden=page.id!==id;});
  if(id==='homePage')renderMap('home');
  if(id==='routePage' && currentRoute)renderMap('route');
  const page=document.getElementById(id);
  if(!motionPreference.matches) {
    page.classList.remove('page-enter');void page.offsetWidth;page.classList.add('page-enter');
    // 动画类不能永久留在玻璃卡片的祖先上，否则浏览器会保留合成层，
    // backdrop-filter 只能采样透明 section，而看不到页面后的动态背景。
    const releasePageLayer=event=>{
      if(event.target!==page||event.animationName!=='pageReveal')return;
      page.classList.remove('page-enter');
      page.removeEventListener('animationend',releasePageLayer);
    };
    page.addEventListener('animationend',releasePageLayer);
  }
  window.scrollTo(0,0);
  const heading=document.querySelector(`#${id} h1`);if(heading)heading.focus({preventScroll:true});
}
document.querySelectorAll('[data-page]').forEach(element=>element.addEventListener('click',()=>showPage(element.dataset.page)));
document.getElementById('brandHome').addEventListener('click',event=>{event.preventDefault();showPage('homePage');});
document.getElementById('viewDetails').addEventListener('click',()=>showPage('detailPage'));
// 主题偏好只保存在本机，file:// 下存储被禁用时仍可正常切换。
const themeMedia=window.matchMedia('(prefers-color-scheme: dark)');let manualTheme=null;
try{manualTheme=localStorage.getItem('uestc-nav-theme');}catch(error){/* 隐私模式下忽略存储 */}
function setTheme(theme) {
  document.documentElement.dataset.theme=theme;
  const dark=theme==='dark',toggle=document.getElementById('themeToggle');
  toggle.setAttribute('aria-pressed',String(dark));toggle.setAttribute('aria-label',dark?'切换至浅色模式':'切换至深色模式');toggle.title=dark?'切换浅色模式':'切换深色模式';toggle.firstElementChild.innerHTML=uiIcon(dark?'sun':'moon');
}
setTheme(manualTheme==='light'||manualTheme==='dark'?manualTheme:themeMedia.matches?'dark':'light');
document.getElementById('themeToggle').addEventListener('click',()=>{
  const toggle=document.getElementById('themeToggle');
  if(!motionPreference.matches) {toggle.classList.remove('theme-changing');void toggle.offsetWidth;toggle.classList.add('theme-changing');}
  manualTheme=document.documentElement.dataset.theme==='dark'?'light':'dark';setTheme(manualTheme);
  try{localStorage.setItem('uestc-nav-theme',manualTheme);}catch(error){/* 不影响当前会话 */}
});
if(themeMedia.addEventListener)themeMedia.addEventListener('change',event=>{if(!manualTheme)setTheme(event.matches?'dark':'light');});
function resetView(state) {state.zoom=1;state.panX=0;state.panY=0;}
function chooseFloor(scope,floor) {
  const state=mapStates[scope];state.floor=floor;resetView(state);
  if(scope==='route') {state.block='all';selectedRouteStep=null;hoveredRouteStep=null;routeFloorBeforeHover=null;renderMap(scope);syncRouteStepSelection();return;}
  if(floor==='outdoor'||floor==='1F')state.block='all';
  else if(floor==='5F')state.block='C';
  else {
    const chosen=scope==='home'?byId.get(endSelect.value):currentRoute&&currentRoute.path.map(id=>byId.get(id)).find(n=>n.floor===floor&&n.block);
    if(chosen&&chosen.block)state.block=chosen.block;
    else if(state.block!=='all'&&buildings[state.block].floors<Number(floor[0]))state.block='all';
  }
  renderMap(scope);
}
function chooseBlock(scope,block) {
  if(scope==='route')return;
  const state=mapStates[scope];state.block=block;resetView(state);
  if(block!=='all'&&state.floor==='outdoor') {
    const selected=byId.get(endSelect.value);
    const routeNode=scope==='route'&&currentRoute&&currentRoute.path.map(id=>byId.get(id)).find(n=>n.block===block);
    const candidate=routeNode?routeNode.floor:selected.block===block?selected.floor:'1F';
    state.floor=candidate==='outdoor'?'1F':candidate;
  }
  renderMap(scope);
}
function mountMap(scope) {
  const panel=document.getElementById(`${scope}MapPanel`);
  panel.innerHTML=`
    <div class="map-panel-header"><div><span class="map-kicker">CAMPUS MAP</span><h2>品学楼<span class="map-subtitle">地面道路总览</span></h2></div><span class="map-state">位置预览</span></div>
    <div class="map-control-bar"><div class="floor-tabs liquid-glass" role="group" aria-label="${scope==='home'?'预览':'路线'}楼层"></div>${scope==='home'?'<div class="map-toolbar"><div class="block-tabs liquid-glass" role="group" aria-label="聚焦分区"></div></div>':'<span class="overview-lock liquid-glass">全图视角</span>'}</div>
    <div class="map-stage">
      <svg id="${scope}Map" class="nav-map overview" viewBox="0 0 1000 800" role="group" aria-label="品学楼交互地图"><g class="base-layer"></g><g class="route-layer" aria-hidden="true" pointer-events="none"></g></svg>
      <div class="map-compass" aria-hidden="true">${uiIcon('north')}<small>图上方</small></div>
      <div class="map-tools liquid-glass"><button type="button" class="glass-button" data-tool="plus" aria-label="放大地图">${uiIcon('plus')}</button><button type="button" class="glass-button" data-tool="minus" aria-label="缩小地图">${uiIcon('minus')}</button><button type="button" class="glass-button" data-tool="reset" aria-label="重置地图视图">${uiIcon('reset')}</button></div>
      <div class="map-overlay liquid-glass"><span><i class="legend-line"></i>${scope==='home'?'起点':'规划路线'}</span><span><i class="legend-end"></i>终点</span></div>
    </div><div class="map-selection" aria-live="polite"></div>`;
  ['outdoor','1F','2F','3F','4F','5F'].forEach(floor=>{
    const element=button(floor==='outdoor'?(scope==='route'?'室外 · 总览':'室外'):floor,'',()=>chooseFloor(scope,floor));element.dataset.floor=floor;panel.querySelector('.floor-tabs').append(element);
  });
  (scope==='home'?['all','A','B','C']:[]).forEach(block=>{
    const element=button(block==='all'?'全图':`${block}区`,'',()=>chooseBlock(scope,block));element.dataset.block=block;panel.querySelector('.block-tabs').append(element);
  });
  panel.querySelectorAll('[data-tool]').forEach(element=>element.addEventListener('click',()=>{
    const state=mapStates[scope];
    if(element.dataset.tool==='reset')resetView(state);
    else {state.zoom=Math.max(1,Math.min(3,state.zoom+(element.dataset.tool==='plus'?.5:-.5)));clampPan(state);}
    updateView(scope);
  }));
  const svg=panel.querySelector('.nav-map');
  function activate(event) {
    if(dragged)return;
    const target=event.target.closest('[data-node],[data-entrance],[data-block]');if(!target)return;
    if(target.dataset.block) {if(scope==='home')chooseBlock(scope,target.dataset.block);return;}
    if(target.dataset.entrance)startSelect.value=target.dataset.entrance;
    if(target.dataset.node)endSelect.value=target.dataset.node;
    roomSearch.value='';
    if(scope==='route') {
      Object.assign(mapStates.home,mapStates.route);syncSelection();showPage('homePage');
    } else syncSelection();
  }
  let drag=null,dragged=false;
  svg.addEventListener('click',activate);
  svg.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();dragged=false;activate(event);}});
  svg.addEventListener('pointerdown',event=>{
    dragged=false;const state=mapStates[scope];if(state.zoom<=1)return;
    drag={x:event.clientX,y:event.clientY,panX:state.panX,panY:state.panY};
    // 捕获实际目标，保留放大后教室的正常点击语义。
    event.target.setPointerCapture(event.pointerId);svg.classList.add('dragging');
  });
  svg.addEventListener('pointermove',event=>{
    if(!drag)return;const state=mapStates[scope],rect=svg.getBoundingClientRect(),base=viewBoxFor(state.block);
    const scale=Math.max(base[2]/state.zoom/rect.width,base[3]/state.zoom/rect.height);
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(Math.abs(dx)+Math.abs(dy)>5)dragged=true;
    state.panX=drag.panX-dx*scale;state.panY=drag.panY-dy*scale;clampPan(state);updateView(scope);
  });
  function endDrag(){drag=null;svg.classList.remove('dragging');}
  svg.addEventListener('pointerup',endDrag);svg.addEventListener('pointercancel',endDrag);
}
function clampPan(state) {
  const box=viewBoxFor(state.block);
  state.panX=Math.max(-box[2]*(1-1/state.zoom)/2,Math.min(box[2]*(1-1/state.zoom)/2,state.panX));
  state.panY=Math.max(-box[3]*(1-1/state.zoom)/2,Math.min(box[3]*(1-1/state.zoom)/2,state.panY));
}
function updateView(scope) {
  const state=mapStates[scope];if(scope==='route')state.block='all';
  const base=viewBoxFor(state.block),w=base[2]/state.zoom,h=base[3]/state.zoom;
  const panel=document.getElementById(`${scope}MapPanel`),svg=panel.querySelector('.nav-map');
  const x=base[0]+(base[2]-w)/2+state.panX,y=base[1]+(base[3]-h)/2+state.panY;
  svg.setAttribute('viewBox',`${x} ${y} ${w} ${h}`);
  svg.classList.toggle('overview',state.block==='all'&&state.zoom<2);svg.classList.toggle('zoomed',state.zoom>1);
  // SVG 裁切不会自动移除键盘焦点；只有视野内的地图位置参与 Tab 顺序。
  const mapVisible=svg.getClientRects().length>0;
  svg.querySelectorAll('.map-room,.map-entrance,.map-block').forEach(element=>{
    if(!mapVisible){element.setAttribute('tabindex','-1');return;}
    const bounds=element.getBBox();
    const visible=bounds.width>0&&bounds.height>0&&bounds.x<x+w&&bounds.x+bounds.width>x&&bounds.y<y+h&&bounds.y+bounds.height>y;
    element.setAttribute('tabindex',visible?'0':'-1');
  });
  panel.querySelector('[data-tool="minus"]').disabled=state.zoom<=1;panel.querySelector('[data-tool="plus"]').disabled=state.zoom>=3;
}
function renderMap(scope) {
  const panel=document.getElementById(`${scope}MapPanel`);if(!panel.querySelector('.nav-map'))return;
  const state=mapStates[scope],svg=panel.querySelector('.nav-map');
  const floorChanged=svg.dataset.renderedFloor!==state.floor;
  const active=document.activeElement,restoreMapFocus=svg.contains(active);
  const focusedPoint=restoreMapFocus&&active.closest('.map-room,.map-entrance,.map-block');
  const focusAttribute=focusedPoint&&(focusedPoint.hasAttribute('data-node')?'data-node':focusedPoint.hasAttribute('data-entrance')?'data-entrance':'data-block');
  const focusValue=focusedPoint&&focusedPoint.getAttribute(focusAttribute);
  panel.querySelector('.base-layer').innerHTML=mapBaseMarkup(state.floor);
  const first=byId.get(scope==='route'&&currentRoute?currentRoute.path[0]:startSelect.value);
  const last=byId.get(scope==='route'&&currentRoute?currentRoute.path[currentRoute.path.length-1]:endSelect.value);
  let overlay='';
  const activeStep=hoveredRouteStep!==null?hoveredRouteStep:selectedRouteStep;
  const activeFloor=activeStep===null?null:currentRoute.floorSteps[activeStep].floor;
  if(scope==='route'&&currentRoute)overlay=routeMarkup(currentRoute.path,state.floor,currentRoute.steps,activeFloor);
  else {
    [[first,'#1677ff','起'],[last,'#e25475','终']].forEach(pair=>{
      const node=pair[0];
      if(nodeVisibleOnFloor(node,state.floor))overlay+=pinMarkup(node.x,node.y,pair[1],pair[2]);
      else if(state.floor==='outdoor'&&node.block) {
        const r=buildings[node.block].ring;
        overlay+=pinMarkup(r[0]+r[2]/2,r[1]+r[3]/2+48,pair[1],node.name);
      }
    });
  }
  if(scope==='route'&&panel.querySelector('.route-layer').childElementCount)svg.classList.add('route-interacting');
  panel.querySelector('.route-layer').innerHTML=overlay;
  svg.dataset.renderedFloor=state.floor;
  if(floorChanged&&!motionPreference.matches) {
    svg.classList.remove('map-refresh');void svg.getBoundingClientRect();svg.classList.add('map-refresh');
  }
  panel.querySelectorAll('.map-room').forEach(room=>{room.classList.toggle('selected',room.dataset.node===last.id);room.classList.toggle('start-selected',room.dataset.node===first.id);});
  panel.querySelectorAll('.floor-tabs button').forEach(element=>{const selected=element.dataset.floor===state.floor;element.classList.toggle('active',selected);element.setAttribute('aria-pressed',String(selected));});
  panel.querySelectorAll('.block-tabs button').forEach(element=>{
    const block=element.dataset.block,selected=block===state.block;element.classList.toggle('active',selected);element.setAttribute('aria-pressed',String(selected));
    element.disabled=state.floor==='5F'&&(block==='A'||block==='B');
  });
  panel.querySelector('.map-subtitle').textContent=state.floor==='outdoor'?(scope==='route'?'全部楼层 · 路线总览':'地面总览'):`${state.block==='all'?'全区':state.block+'区'} · ${state.floor}`;
  panel.querySelector('.map-state').textContent=state.floor==='outdoor'&&scope==='route'?'多楼层总览':state.floor==='outdoor'||state.floor==='1F'?'地面互通':state.floor==='2F'?'中央露天互通':state.floor==='3F'?'两侧连廊互通':state.floor==='5F'?'仅C区':'位置预览';
  const legend=panel.querySelector('.map-overlay');
  if(scope==='route'&&currentRoute&&state.floor==='outdoor') {
    const usedFloors=new Set(currentRoute.path.map(id=>byId.get(id).floor==='outdoor'?'1F':byId.get(id).floor));
    legend.classList.add('overview-legend');
    legend.innerHTML=[...usedFloors].sort().map(level=>`<span><i class="legend-line" style="background:${routeFloorColors[level]}"></i>${level==='1F'?'地面/1F':level}</span>`).join('')+'<span><i class="legend-end"></i>终点</span>';
  } else {
    legend.classList.remove('overview-legend');
    legend.innerHTML=`<span><i class="legend-line" style="background:${scope==='route'?(routeFloorColors[state.floor]||'#1677ff'):'#1677ff'}"></i>${scope==='home'?'起点':'规划路线'}</span><span><i class="legend-end"></i>终点</span>`;
  }
  panel.querySelector('.map-selection').innerHTML=`<span class="selection-label">当前选择</span><strong>${svgEscape(pointLabel(first.id))}</strong><span class="selection-arrow">${uiIcon('arrow')}</span><span class="selection-end">${svgEscape(pointLabel(last.id))}</span>`;
  svg.setAttribute('aria-label',`${state.floor==='outdoor'&&scope==='route'?'全部楼层':state.floor==='outdoor'?'室外':state.floor}${state.block==='all'?'总览':state.block+'区'}地图，${scope==='route'?'不同颜色表示不同楼层，左侧步骤可高亮对应路线':'点击入口或教室选择位置'}`);
  updateView(scope);
  if(restoreMapFocus) {
    // 重绘只恢复原本在本图内的焦点，避免选点表单或楼层按钮被抢焦点。
    const replacement=focusedPoint&&Array.from(svg.querySelectorAll(`[${focusAttribute}]`)).find(element=>element.getAttribute(focusAttribute)===focusValue&&element.getAttribute('tabindex')==='0');
    const fallback=panel.querySelector(`.block-tabs button[data-block="${state.block}"]`)||panel.querySelector('.floor-tabs button.active');
    if(replacement||fallback)(replacement||fallback).focus({preventScroll:true});
  }
  if(scope==='route'&&currentRoute) {
    const visible=state.floor==='outdoor'||currentRoute.path.some(id=>{const n=byId.get(id);return nodeVisibleOnFloor(n,state.floor)&&(state.block==='all'||n.block===state.block);});
    const note=state.floor==='1F'?'地面步道连通ABC全部建筑入口，进出建筑不计换层。':state.floor==='2F'?'二楼中央为露天连廊。':state.floor==='3F'?'三楼两侧连廊分别连接A—C和B—C。':state.floor==='5F'?'A、B区没有五楼。':'';
    document.getElementById('floorMessage').textContent=state.floor==='outdoor'?'已按颜色显示整条路线的各楼层路段；点击左侧步骤可定位并高亮。':(visible?'已在全图中显示当前楼层的路线段。':'路线不经过当前楼层，请切换楼层。')+note+' 需要查看细节时可手动放大并拖动地图。';
  }
}
function stepMapFloor(step){return step.floor;}
function syncRouteStepSelection() {
  document.querySelectorAll('#routeStepList .route-step').forEach((element,index)=>{
    const active=index===(hoveredRouteStep!==null?hoveredRouteStep:selectedRouteStep);
    element.classList.toggle('active',active);
    element.setAttribute('aria-pressed',String(index===selectedRouteStep));
  });
}
function previewRouteStep(index) {
  if(!currentRoute||hoveredRouteStep===index)return;
  if(hoveredRouteStep===null)routeFloorBeforeHover=mapStates.route.floor;
  hoveredRouteStep=index;mapStates.route.floor=stepMapFloor(currentRoute.floorSteps[index]);
  resetView(mapStates.route);renderMap('route');syncRouteStepSelection();
}
function clearRouteStepPreview() {
  if(hoveredRouteStep===null)return;
  hoveredRouteStep=null;
  mapStates.route.floor=selectedRouteStep===null?routeFloorBeforeHover:stepMapFloor(currentRoute.floorSteps[selectedRouteStep]);
  routeFloorBeforeHover=null;resetView(mapStates.route);renderMap('route');syncRouteStepSelection();
}
function selectRouteStep(index) {
  if(!currentRoute)return;
  selectedRouteStep=index;hoveredRouteStep=null;routeFloorBeforeHover=null;
  mapStates.route.floor=stepMapFloor(currentRoute.floorSteps[index]);resetView(mapStates.route);
  renderMap('route');syncRouteStepSelection();
  const list=document.getElementById('routeStepList'),item=list.children[index];
  if(item){const top=item.offsetTop-list.offsetTop;list.scrollTop=Math.max(0,top-list.clientHeight/3);}
}
function renderRouteStepList() {
  const list=document.getElementById('routeStepList');list.replaceChildren();
  document.getElementById('routeStepCount').textContent=`${currentRoute.floorSteps.length} 层`;
  currentRoute.floorSteps.forEach((step,index)=>{
    const li=document.createElement('li'),control=document.createElement('button');
    const floor=step.floor;
    control.type='button';control.className='route-step';
    control.style.setProperty('--step-color',routeFloorColors[floor]||routeFloorColors['1F']);
    control.setAttribute('aria-label',`第${index+1}层指引，${step.title}，约${step.distance}米。点击在地图中高亮`);
    control.setAttribute('aria-pressed','false');
    const number=document.createElement('span');number.className='route-step-number';number.textContent=index+1;
    const body=document.createElement('span');body.className='route-step-body';
    const title=document.createElement('strong');title.textContent=step.title;
    const note=document.createElement('small');note.textContent=step.note;
    body.append(title,note);
    const meta=document.createElement('span');meta.className='route-step-meta';meta.textContent=floor==='1F'?'地面':floor;
    control.append(number,body,meta);li.append(control);list.append(li);
    control.addEventListener('pointerenter',event=>{if(event.pointerType==='mouse')previewRouteStep(index);});
    control.addEventListener('focus',()=>previewRouteStep(index));
    control.addEventListener('click',()=>selectRouteStep(index));
  });
  list.onpointerleave=clearRouteStepPreview;
  list.onfocusout=event=>{if(!list.contains(event.relatedTarget))clearRouteStepPreview();};
}
document.querySelectorAll('.header-actions,.detail-summary,.arrival').forEach(element=>element.classList.add('liquid-glass'));
document.querySelectorAll('.primary,.round-button').forEach(element=>element.classList.add('glass-button'));
document.querySelector('.search-field').classList.add('input-glass');
document.getElementById('swapPoints').innerHTML=uiIcon('swap');
document.querySelector('.search-symbol').innerHTML=uiIcon('search');
document.querySelector('.privacy-symbol').innerHTML=uiIcon('shield');
document.querySelector('.detail-symbol').innerHTML=uiIcon('arrow');
document.querySelectorAll('.primary .button-arrow').forEach(element=>{element.innerHTML=uiIcon('arrow');});
document.querySelectorAll('.page-heading > .round-button').forEach(element=>{element.innerHTML=uiIcon('back');});
mountMap('home');mountMap('route');syncSelection();
function animateNumber(element,target) {
  if(element._countFrame)cancelAnimationFrame(element._countFrame);
  if(motionPreference.matches||target===0) {element.textContent=target;return;}
  const started=performance.now(),duration=520;
  function frame(now) {
    const progress=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-progress,3);
    element.textContent=Math.round(target*eased);
    if(progress<1)element._countFrame=requestAnimationFrame(frame);else element._countFrame=null;
  }
  element._countFrame=requestAnimationFrame(frame);
}
document.getElementById('planForm').addEventListener('submit',event=>{
  event.preventDefault();const error=document.getElementById('errorMessage');
  const query=roomSearch.value.trim().toUpperCase();
  if(query && (!byId.has(query)||byId.get(query).type!=='room')) {
    error.textContent='未找到这个门牌。C区各层房号不同，部分教室带 A/B/C 后缀，请按现场门牌输入。';error.hidden=false;roomSearch.focus();return;
  }
  if(query)endSelect.value=query;
  currentRoute=planRoute(startSelect.value,endSelect.value);
  if(!currentRoute.path.length) {error.textContent='这两个地点暂未连通，请更换起点或终点。';error.hidden=false;return;}
  error.hidden=true;currentRoute.steps=routeSteps(currentRoute.path);
  currentRoute.floorSteps=summarizeRouteFloors(currentRoute.path,currentRoute.steps);
  selectedRouteStep=null;hoveredRouteStep=null;routeFloorBeforeHover=null;
  const changes=currentRoute.steps.filter(step=>step.kind==='stairs').length;
  const minutes=Math.ceil(currentRoute.distance/80);
  document.querySelectorAll('.route-label').forEach(element=>{element.textContent=`${byId.get(startSelect.value).name} → ${byId.get(endSelect.value).name}`;});
  animateNumber(document.getElementById('minutes'),minutes);
  animateNumber(document.getElementById('distance'),currentRoute.distance);
  animateNumber(document.getElementById('changes'),changes);
  const bridges=currentRoute.steps.filter(step=>step.kind==='bridge').map(step=>step.title);
  document.getElementById('routeHint').textContent=currentRoute.path.length===1?'你已经在目的地，无需步行。':currentRoute.groundPreferred?'地面优先 · 全程无需上下楼，沿一楼环廊与室外步道前往目的地。':bridges.length?bridges.join('；')+'。':'按环廊与楼梯连接计算，沿地图路线前往目的地。';
  document.getElementById('detailMeta').textContent=`约 ${minutes} 分钟 · 模拟 ${currentRoute.distance} 米 · ${changes} 次换层过程`;
  const journey=document.getElementById('floorJourney');journey.replaceChildren();
  journey.append(button('全部总览','',()=>chooseFloor('route','outdoor')));
  currentRoute.floorSteps.forEach(({floor})=>{
    const arrow=document.createElement('span');arrow.textContent='→';journey.append(arrow);
    journey.append(button(floor==='1F'?'地面 / 1F':floor,'',()=>chooseFloor('route',floor)));
  });
  Object.assign(mapStates.route,{floor:'outdoor',block:'all'});resetView(mapStates.route);
  const routeMap=document.getElementById('routeMap');routeMap.classList.remove('route-interacting');
  document.querySelector('#routeMapPanel .route-layer').replaceChildren();
  renderRouteStepList();renderDetails();showPage('routePage');
});
function renderDetails() {
  const list=document.getElementById('timeline');list.replaceChildren();
  currentRoute.floorSteps.forEach((step,index)=>{
    const li=document.createElement('li'),number=document.createElement('span'),card=document.createElement('div');
    number.className='step-number';number.textContent=index+1;card.className='step-card glass liquid-glass';li.style.setProperty('--step-index',Math.min(index,8));
    const title=document.createElement('h3');title.textContent=step.title;
    const meta=document.createElement('small');meta.textContent=`${step.floor==='1F'?'地面 / 1F':step.floor} · 约 ${step.distance} 米 · ${Math.round(step.distance/80*60)} 秒`;
    const note=document.createElement('p');note.textContent=step.note;card.append(title,meta,note);
    card.append(button('在地图中查看 ↗','step-map-button',()=>{selectRouteStep(index);showPage('routePage');}));
    li.append(number,card);list.append(li);
  });
}
