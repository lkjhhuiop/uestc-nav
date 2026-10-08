/* SVG 底图、标记和路线共用 data.js 中的几何数据。纯字符串生成，无 fetch，支持 file://。
 * maps/*.svg 是同一绘图函数导出的独立地图；运行时内联绘制以支持主题与门牌选择。
 */
const mapStyles=`
.map-bg{fill:var(--map-bg,#edf3ef)}.land{fill:var(--map-land,#dce8db)}
.road-edge{fill:none;stroke:var(--map-road-edge,#d1dfd7);stroke-width:25;stroke-linejoin:round;stroke-linecap:round}
.road{fill:none;stroke:var(--map-road,#fff);stroke-width:19;stroke-linejoin:round;stroke-linecap:round}
.building-shadow{fill:#123552;opacity:.07}.building{fill:var(--map-building,#fbfdff);stroke:var(--map-wall,#b9ccdc);stroke-width:2}
.courtyard{fill:var(--map-land,#dce8db);stroke:var(--map-wall,#b9ccdc);stroke-width:1}
.ring-base{fill:none;stroke:var(--map-corridor,#e0eaf3);stroke-width:22;stroke-linecap:round;stroke-linejoin:round}
.ring-center{fill:none;stroke:var(--map-guide,#adc5db);stroke-width:1;stroke-dasharray:3 5}
.map-label{fill:var(--map-text,#344f69);font-weight:600;text-anchor:middle;font-size:23px}
.map-sub{fill:var(--map-muted,#648174);font-size:13px;text-anchor:middle}
.room{fill:var(--map-room,#edf4fc);stroke:var(--map-room-border,#afc7e0);stroke-width:1}
.room-inner{fill:var(--map-inner,#e5f1ee);stroke:var(--map-room-border,#afc7e0);stroke-width:1}
.room-text{fill:var(--map-text,#344f69);font:10px -apple-system,BlinkMacSystemFont,'Microsoft YaHei',sans-serif;text-anchor:middle;pointer-events:none}
.room-door{stroke:var(--map-room-border,#afc7e0);stroke-width:2}
.facility{fill:var(--map-building,#fbfdff);stroke:var(--map-wall,#b9ccdc);stroke-width:1.2}
.facility-text{fill:var(--map-text,#344f69);font-size:9px;font-weight:700;text-anchor:middle;pointer-events:none}
.map-room{cursor:pointer}.map-room:hover .room-shape,.map-room:focus .room-shape{fill:var(--map-hover,#d4e7ff);stroke:#1677ff;stroke-width:2}
.map-room:focus{outline:none}.map-room.selected .room-shape{fill:var(--map-selected,#fce4e9);stroke:#e25475;stroke-width:2}
.map-room.start-selected .room-shape{fill:var(--map-hover,#d4e7ff);stroke:#1677ff;stroke-width:2}
.rest-zone{fill:var(--map-inner,#e5f1ee);stroke:var(--map-wall,#b9ccdc);stroke-width:1}
.entrance-span{fill:var(--map-inner,#e5f1ee);stroke:#389484;stroke-width:1.5;pointer-events:all}
.entrance-step{stroke:#389484;stroke-width:1;pointer-events:none}
.entrance-label-bg{fill:var(--map-inner,#e5f1ee);pointer-events:none}
.entrance-label{fill:var(--map-text,#344f69);font-size:10px;text-anchor:middle;pointer-events:none}
.map-entrance:hover .entrance-span,.map-entrance:focus .entrance-span{fill:var(--map-hover,#d4e7ff);stroke:#1677ff;stroke-width:2}
.stair{fill:var(--map-stair,#f3e9f4);stroke:#a568ac;stroke-width:2;stroke-linejoin:round}
.stair-zone{fill:var(--map-stair,#f3e9f4);stroke:#a568ac;stroke-width:2;stroke-linejoin:round}
.stair-step{stroke:#a568ac;stroke-width:1.3}
.stair-label{fill:var(--map-muted,#648174);font-size:9px;text-anchor:middle}
.bridge-under{fill:none;stroke:var(--map-wall,#b9ccdc);stroke-width:22;stroke-linejoin:round;stroke-linecap:round}
.bridge-line{fill:none;stroke:var(--map-bridge,#eaf3fc);stroke-width:17;stroke-linejoin:round;stroke-linecap:round}
.bridge-dash{fill:none;stroke:#86a7ce;stroke-width:1;stroke-dasharray:5 5}
.bridge-text{fill:var(--map-text,#344f69);font-size:13px;text-anchor:middle;paint-order:stroke;stroke:var(--map-building,#fbfdff);stroke-width:5px;stroke-linejoin:round}
.number-flow{fill:none;stroke:#73a1ca;stroke-width:2;opacity:.85}
.origin-star{fill:#40a9d5;stroke:var(--map-building,#fbfdff);stroke-width:1.5}
.route-halo{fill:none;stroke:var(--map-route-halo,#fff);stroke-width:12;stroke-linejoin:round;stroke-linecap:round}
.route-line{fill:none;stroke:var(--route-color,#1677ff);stroke-width:7;stroke-linejoin:round;stroke-linecap:round}
.route-direction{fill:none;stroke:#fff;stroke-width:1.6;stroke-linejoin:round;stroke-linecap:round}
.route-dimmed{opacity:.28}.route-focus-halo{fill:none;stroke:var(--map-route-halo,#fff);stroke-width:19;stroke-linecap:round;stroke-linejoin:round}
.route-focus-line{fill:none;stroke:var(--route-color,#1677ff);stroke-width:11;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 7px var(--route-color,#1677ff))}
.route-focus-dot{fill:var(--route-color,#1677ff);stroke:#fff;stroke-width:4;filter:drop-shadow(0 0 7px var(--route-color,#1677ff))}
.route-stair-dot{fill:var(--map-building,#fbfdff);stroke:var(--route-color,#1677ff);stroke-width:4}
.route-stair-label{fill:var(--map-text,#344f69);font-size:12px;font-weight:700;text-anchor:middle;paint-order:stroke;stroke:var(--map-building,#fbfdff);stroke-width:5px;stroke-linejoin:round}
.pin-ring{fill:var(--map-building,#fbfdff);stroke:var(--map-wall,#b9ccdc);stroke-width:2}
.pin-text{fill:var(--map-text,#344f69);font-size:19px;font-weight:700;text-anchor:middle}
.entrance-hit{fill:none;pointer-events:all;transform-box:fill-box;transform-origin:center}.overview .entrance-hit{transform:scale(2.5)}
.map-transition{fill:var(--map-building,#fbfdff);stroke:#1677ff;stroke-width:2}
.transition-text{fill:var(--map-text,#344f69);font-size:11px;font-weight:600;text-anchor:middle}
.overview .room-text,.overview .stair-label{display:none}.map-poi{fill:var(--map-muted,#648174);font-size:17px;text-anchor:middle}
.floor-closed{fill:var(--map-muted,#648174);opacity:.45;font-size:21px;text-anchor:middle}
`;
function svgEscape(value) {return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');}
function svgText(x,y,text,className,extra) {return `<text x="${x}" y="${y}" class="${className||'map-label'}" ${extra||''}>${svgEscape(text)}</text>`;}
function svgRect(x,y,w,h,className,r) {return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r||0}" class="${className}"/>`;}
function cPolygon(points,className,extra) {return `<polygon points="${points.map(p=>{const q=cMapPoint(p[0],p[1]);return `${q.x},${q.y}`;}).join(' ')}" class="${className}" ${extra||''}/>`;}
function cLine(a,b,className) {
  const p=cMapPoint(...a),q=cMapPoint(...b);
  return `<line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="${className}"/>`;
}
function cSlantAngle(side) {
  const a=cMapPoint(...cSlantPoint(side,0)),b=cMapPoint(...cSlantPoint(side,1));
  return Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
}
function cSlantEntranceMarkup(entry) {
  const b=cSlantBands.outer,n=byId.get(entry.id),angle=cSlantAngle(entry.slant);
  let svg=`<g data-entrance="${n.id}" class="map-entrance" role="button" tabindex="0" aria-label="选择${n.name}为起点"><title>${n.name} · 整段出入口</title>`;
  svg+=cPolygon(cSlantPolygon(entry.slant,b.start,b.end,b.near,b.far),'entrance-span');
  [-20,-27,-34].forEach(offset=>{svg+=cLine(cSlantPoint(entry.slant,b.start,offset),cSlantPoint(entry.slant,b.end,offset),'entrance-step');});
  svg+=svgRect(n.x-18,n.y-7,36,14,'entrance-label-bg',2).replace('/>',` transform="rotate(${angle} ${n.x} ${n.y})"/>`);
  svg+=svgText(n.x,n.y+3,'出入口','entrance-label',`transform="rotate(${angle} ${n.x} ${n.y})"`);
  return svg+'</g>';
}
function pointString(ids) {return ids.map(id=>{const n=byId.get(id);return `${n.x},${n.y}`;}).join(' ');}
function lineMarkup(points,cls) {return `<polyline points="${points}" class="${cls}"/>`;}
function stairMarkup(node) {
  if(node.block==='C'&&(node.key==='NE'||node.key==='SE')) {
    const side=node.key==='NE'?'upperDiag':'lowerDiag',b=cSlantBands.inner;
    // 内侧沿边按25%休息区、50%楼梯、25%休息区连续分段。
    let steps='';
    for(let i=1;i<7;i++) {
      const u=b.start+(b.end-b.start)*(.25+.5*i/7);
      steps+=cLine(cSlantPoint(side,u,b.near),cSlantPoint(side,u,b.far),'stair-step');
    }
    return `<g role="img" aria-label="${svgEscape(node.name)}"><title>${svgEscape(node.name)} · ${node.floor} · 内侧中间约50%</title>${cPolygon(cSlantZone(side,.25,.75),'stair-zone')}${steps}${svgText(node.x,node.y+3,'梯','facility-text')}</g>`;
  }
  if(node.block==='C')return `<g role="img" aria-label="${svgEscape(node.name)}"><title>${svgEscape(node.name)} · ${node.floor}</title><rect x="${node.x-8}" y="${node.y-8}" width="16" height="16" rx="3" class="stair"/>${svgText(node.x,node.y+3,'梯','facility-text')}</g>`;
  const x=node.x+(node.key.indexOf('W')>=0?17:node.key.indexOf('E')>=0?-17:0);
  const y=node.y+(node.key.indexOf('N')>=0?17:-17);
  return `<g role="img" aria-label="${svgEscape(node.name)}"><title>${svgEscape(node.name)} · ${node.floor}</title><path class="stair" d="M ${x} ${y-7} L ${x+7} ${y+6} L ${x-7} ${y+6} Z"/></g>`;
}
function mapBaseMarkup(floor) {
  const outdoor=floor==='outdoor'; let svg=`<style>${mapStyles}</style>`;
  if(floorPlanImages[floor])return svg+`<image href="${svgEscape(floorPlanImages[floor])}" x="0" y="0" width="1000" height="800"/>`;
  svg+=svgRect(0,0,1000,800,'map-bg');
  if(outdoor || floor==='1F') {
    [[25,60,200,180],[20,390,85,230],[810,220,100,180],[20,745,260,40],[900,70,70,200]].forEach(r=>{svg+=svgRect(r[0],r[1],r[2],r[3],'land',28);});
    edges.filter(e=>e.kind==='outdoor').forEach(e=>{const points=pointString([e.from,e.to]);svg+=lineMarkup(points,'road-edge')+lineMarkup(points,'road');});
    svg+=svgRect(830,92,105,80,'building',10)+svgText(882,125,'P','map-label')+svgText(882,152,'停车区域','map-sub');
    svg+=svgText(147,176,'宿舍方向 ↖','map-poi')+svgText(267,205,'自行车停靠点','map-poi')+svgText(105,753,'校车停靠点','map-poi')+svgText(896,779,'自行车停靠点','map-poi');
    // 总览和1F显示地面白色道路；高层连廊只在所属楼层显示。
  }
  for(const block of Object.keys(buildings)) {
    const info=buildings[block], b=info.bounds,r=info.ring;
    if(!outdoor && Number(floor[0])>info.floors) {
      svg+=svgRect(b[0],b[1],b[2],b[3],'land',20)+svgText(b[0]+b[2]/2,b[1]+b[3]/2,`${block}区最高4F`,'floor-closed');continue;
    }
    if(block==='C') {
      const outline=[[350,79],[679,79],[752,151],[752,309],[679,372],[350,372]];
      svg+=cPolygon(outline,'building-shadow','transform="translate(4 6)"');
      svg+=cPolygon(outline,'building');
      svg+=cPolygon([[427,164],[650,164],[679,184],[679,265],[650,286],[427,286]],'courtyard');
    } else {
      svg+=svgRect(b[0]+4,b[1]+6,b[2],b[3],'building-shadow',22)+svgRect(b[0],b[1],b[2],b[3],'building',20);
      svg+=svgRect(r[0]+28,r[1]+28,r[2]-56,r[3]-56,'courtyard',8);
    }
    if(outdoor) {
      svg+=`<g class="map-block" data-block="${block}" role="button" tabindex="0" aria-label="查看${block}区楼层">`;
      svg+=svgRect(b[0],b[1],b[2],b[3],'block-hit',20).replace('class="block-hit"','fill="none" pointer-events="all"');
      svg+=svgText(r[0]+r[2]/2,r[1]+r[3]/2-4,`${block} 区`)+svgText(r[0]+r[2]/2,r[1]+r[3]/2+22,`${info.floors}层 · 环形教学楼`,'map-sub')+'</g>';
    } else {
      const ring=rings.find(item=>item.block===block && item.floor===floor);
      const points=pointString(ring.ids.concat(ring.ids[0]));
      svg+=lineMarkup(points,'ring-base')+lineMarkup(points,'ring-center');
      if(floor==='1F')edges.filter(e=>e.kind==='access'&&byId.get(e.from).block===block&&!buildingEntrances.some(entry=>entry.slant&&entry.inside===e.from)).forEach(e=>{
        const access=pointString([e.from,e.to]);svg+=lineMarkup(access,'road-edge')+lineMarkup(access,'road');
      });
      roomShapes.filter(room=>room.block===block && room.floor===floor).forEach(room=> {
        const node=byId.get(room.id),door=byId.get(node.door);
        svg+=`<g class="map-room" data-node="${room.id}" role="button" tabindex="0" aria-label="选择${room.id}为终点"><title>${room.id} · ${node.side}</title>`;
        svg+=`<line x1="${door.x}" y1="${door.y}" x2="${room.x}" y2="${room.y}" class="room-door"/>`;
        const cls=`${room.inside?'room-inner':'room'} room-shape`;
        svg+=room.polygon?cPolygon(room.polygon,cls):svgRect(room.x-room.w/2,room.y-room.h/2,room.w,room.h,cls,room.block==='C'?0:3);
        const labelAttrs=room.polygon?`transform="rotate(${cSlantAngle(room.group)} ${room.x} ${room.y})"`:'';
        const fontSize=room.id.length>4?(room.w<30?8:9):10;
        svg+=svgText(room.x,room.y+fontSize*.35,room.id,'room-text',`${labelAttrs} style="font-size:${fontSize}px"`)+'</g>';
      });
      if(block==='C') {
        for(const side of Object.keys(cSlants))for(const [start,end] of [[0,.25],[.75,1]]) {
          const points=cSlantZone(side,start,end),b=cSlantBands.inner;
          const center=cMapPoint(...cSlantPoint(side,b.start+(b.end-b.start)*(start+end)/2,(b.near+b.far)/2));
          svg+=`<g role="img" aria-label="休息区"><title>斜边楼梯侧翼休息区 · 约25%</title>${cPolygon(points,'rest-zone')}${svgText(center.x,center.y+3,'休','facility-text')}</g>`;
        }
        const facilities=[
          [386,358,'卫生间','卫'],[386,157,'卫生间','卫',12],[604,80,'卫生间','卫'],[712,358,'卫生间','卫'],
          [386,338,'开水间','水'],[436,360,'物管','物'],[712,157,'电梯','电',12],
          [495,80,floor==='1F'?'妈咪宝贝屋':'教师休息室',floor==='1F'?'婴':'茶']
        ];
        if(floor==='1F')facilities.push([437,339,'学生科创团队','创']);
        if(floor==='2F'||floor==='4F')facilities.push([414,360,'学生研讨室','研']);
        facilities.forEach(item=>{const size=item[4]||16;svg+=`<g role="img" aria-label="${item[2]}"><title>${item[2]}</title>${svgRect(item[0]-size/2,item[1]-size/2,size,size,'facility',3)}${svgText(item[0],item[1]+3,item[3],'facility-text')}</g>`;});
      }
      svg+=svgText(r[0]+r[2]/2,r[1]+r[3]/2-3,`${block} · ${floor}`)+svgText(r[0]+r[2]/2,r[1]+r[3]/2+18,'中 庭','map-sub');
      // 箭头仅表示门牌递增方向，走廊允许双向行走。
      if(block!=='C') {
        const ax=r[0]+r[2]*.48,ay=r[1];
        svg+=`<path d="M ${ax-15} ${ay} h 30 m -6 -4 l 6 4 -6 4" class="number-flow"/>`;
      }
      const first=byId.get(block==='C'?roomShapes.find(room=>room.block==='C'&&room.floor===floor).id:`${block}${floor[0]}01`);
      const sx=first.x+(block==='C'?-21:block==='B'?-23:0),sy=first.y+(block==='A'?24:0);
      svg+=`<path class="origin-star" d="M ${sx} ${sy-8} l 2.5 5.5 5.5 2.5 -5.5 2.5 -2.5 5.5 -2.5 -5.5 -5.5 -2.5 5.5 -2.5 Z"><title>${block==='C'?'本层首个门牌':block+'区01起点，顺时针递增'}</title></path>`;
    }
  }
  // 室内连廊覆盖建筑填充，确保入口到环廊的通道也可见。
  if(!outdoor) bridgePaths.filter(b=>b.floor===floor).forEach(b=>{const points=pointString(b.ids);svg+=lineMarkup(points,'bridge-under')+lineMarkup(points,'bridge-line')+lineMarkup(points,'bridge-dash');});
  // 楼梯位于连廊落点上方，防止2F中央、3F两侧连廊盖住步梯标记。
  if(!outdoor)nodes.filter(node=>node.floor===floor&&node.type==='stairs').forEach(node=>{svg+=stairMarkup(node);});
  if(floor==='2F') svg+=svgText(550,575,'2F 露天互通','bridge-text');
  if(floor==='3F') svg+=svgText(415,419,'3F A—C','bridge-text')+svgText(687,419,'3F B—C','bridge-text');
  if(outdoor || floor==='1F') {
    buildingEntrances.forEach(entry=>{
      if(entry.slant){svg+=cSlantEntranceMarkup(entry);return;}
      const n=byId.get(entry.id);
      svg+=`<g data-entrance="${n.id}" class="map-entrance" role="button" tabindex="0" aria-label="选择${n.name}为起点"><title>${n.name} · 地面互通</title><rect class="entrance-hit" x="${n.x-16}" y="${n.y-16}" width="32" height="32"/><rect x="${n.x-7}" y="${n.y-7}" width="14" height="14" rx="3" fill="var(--map-building,#fbfdff)" stroke="#389484" stroke-width="2"/><path d="M ${n.x-3} ${n.y+3} v -6 h 6 v 6" fill="none" stroke="#389484" stroke-width="1.5"/></g>`;
    });
    nodes.filter(n=>n.type==='entrance'&&!n.isDoor).forEach(n=>{
      const number=n.id.slice(-1);
      svg+=`<g data-entrance="${n.id}" class="map-entrance" role="button" tabindex="0" aria-label="选择入口${number}为起点"><rect class="entrance-hit" x="${n.x-16}" y="${n.y-16}" width="32" height="32"/><circle cx="${n.x}" cy="${n.y}" r="20" class="pin-ring"/>${svgText(n.x,n.y+7,number,'pin-text')}</g>`;
    });
  }
  return svg;
}
function pinMarkup(x,y,color,label) {
  return `<g><circle cx="${x}" cy="${y}" r="21" fill="${color}" opacity=".13"/><circle cx="${x}" cy="${y}" r="11" fill="${color}" stroke="white" stroke-width="3"/>${label?svgText(x,y-26,label,'bridge-text'):''}</g>`;
}
// 室外标签是整条路线总览；室外和1F处于同一地面高度，共用蓝色。
const routeFloorColors={'1F':'#2778f5','2F':'#00aeb8','3F':'#8757e8','4F':'#e69a36','5F':'#e86696'};
function routeEdgeFloor(a,b) {
  if(a.floor==='outdoor'||b.floor==='outdoor')return '1F';
  return a.floor;
}
function routeStepSegments(step,floor) {
  if(step.kind==='stairs')return [];
  const segments=[];let ids=[],level='';
  function flush(){if(ids.length>1)segments.push({ids,level});ids=[];}
  for(let i=1;i<step.ids.length;i++) {
    const a=byId.get(step.ids[i-1]),b=byId.get(step.ids[i]);
    const visible=floor==='outdoor'||(nodeVisibleOnFloor(a,floor)&&nodeVisibleOnFloor(b,floor));
    const nextLevel=floor==='outdoor'?routeEdgeFloor(a,b):floor;
    if(!visible){flush();continue;}
    if(ids.length&&level!==nextLevel)flush();
    if(!ids.length){ids=[a.id];level=nextLevel;}
    ids.push(b.id);
  }
  flush();return segments;
}
function routeSegmentMarkup(segment,focused,dimmed) {
  const color=routeFloorColors[segment.level]||routeFloorColors['1F'];
  let svg=`<g class="route-floor${dimmed?' route-dimmed':''}" data-route-floor="${segment.level}" style="--route-color:${color}">`;
  const points=pointString(segment.ids);
  svg+=lineMarkup(points,'route-halo')+lineMarkup(points,'route-line');
  if(focused)svg+=lineMarkup(points,'route-focus-halo')+lineMarkup(points,'route-focus-line');
  // 白色箭头表示行走方向，与门牌编号方向区分。
  for(let i=1;i<segment.ids.length;i++) {
    const a=byId.get(segment.ids[i-1]),b=byId.get(segment.ids[i]);
    if(Math.hypot(b.x-a.x,b.y-a.y)<35)continue;
    const angle=Math.atan2(b.y-a.y,b.x-a.x)*180/Math.PI;
    svg+=`<path class="route-direction" d="M -4 -3 L 0 0 -4 3" transform="translate(${(a.x+b.x)/2} ${(a.y+b.y)/2}) rotate(${angle})"/>`;
  }
  return svg+'</g>';
}
function routeMarkup(path,floor,steps,activeFloor) {
  let svg='',focusMarkup='',focusNode=null;
  steps.forEach(step=>{
    const stepFloor=step.floor==='outdoor'?'1F':step.floor;
    const focused=stepFloor===activeFloor,dimmed=activeFloor!==null&&!focused;
    routeStepSegments(step,floor).forEach(segment=>{
      const markup=routeSegmentMarkup(segment,focused,dimmed);
      if(focused)focusMarkup+=markup;else svg+=markup;
    });
    if(step.kind==='stairs') {
      const from=byId.get(step.ids[0]),to=byId.get(step.ids[step.ids.length-1]);
      if(floor==='outdoor'||step.ids.some(id=>nodeVisibleOnFloor(byId.get(id),floor))) {
        const color=routeFloorColors[to.floor]||routeFloorColors['1F'];
        const marker=`<g style="--route-color:${color}" class="${dimmed?'route-dimmed':''}"><circle cx="${to.x}" cy="${to.y}" r="${focused?15:10}" class="${focused?'route-focus-dot':'route-stair-dot'}"/>${svgText(to.x,to.y-21,`${from.floor}→${to.floor}`,'route-stair-label')}</g>`;
        if(focused)focusMarkup+=marker;else svg+=marker;
      }
    }
    if(focused) {
      const visible=step.ids.map(id=>byId.get(id)).filter(node=>floor==='outdoor'||nodeVisibleOnFloor(node,floor));
      const last=visible[visible.length-1];
      if(last)focusNode=last;
    }
  });
  if(focusNode)focusMarkup+=`<g style="--route-color:${routeFloorColors[activeFloor]}"><circle cx="${focusNode.x}" cy="${focusNode.y}" r="9" class="route-focus-dot"/>${svgText(focusNode.x,focusNode.y-25,activeFloor==='1F'?'地面/1F':activeFloor,'route-stair-label')}</g>`;
  svg+=focusMarkup;
  const first=byId.get(path[0]),last=byId.get(path[path.length-1]);
  if(first&&(floor==='outdoor'||nodeVisibleOnFloor(first,floor)))svg+=pinMarkup(first.x,first.y,'#1677ff','起');
  if(last&&(floor==='outdoor'||nodeVisibleOnFloor(last,floor)))svg+=pinMarkup(last.x,last.y,'#e25475','终');
  return svg;
}
function viewBoxFor(block) {
  if(block==='all')return [0,0,1000,800];
  const b=buildings[block].bounds;return [b[0]-24,b[1]-24,b[2]+48,b[3]+48];
}
