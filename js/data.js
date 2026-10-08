/* 品学楼拓扑。所有楼层共用 1000×800 坐标系，长度单位是估算米数。
 * C区门牌及相对布局按现场1F～5F导视图整理；图纸未标北向，坐标仍是示意值。
 * 待实测：房间宽度、门口间距、建筑入口和跨区连廊的精确坐标。
 */
const buildings = {
  A: { name:'品学楼 A区', floors:4, rooms:13, bounds:[175,440,300,300], ring:[225,490,200,200], start:'南侧偏西', color:'#4d88e8' },
  B: { name:'品学楼 B区', floors:4, rooms:13, bounds:[600,440,300,300], ring:[650,490,200,200], start:'西侧偏北', color:'#6691d3' },
  C: { name:'品学楼 C区', floors:5, bounds:[345,60,410,320], ring:[405,122,270,206], color:'#608f85' }
};
// 现场导视图的C区局部坐标逆时针旋转90°并适配现有总图范围。
// 原图左侧的宽直边因此落在靠近A/B区的下侧，右侧斜角落在远侧上方。
function cMapPoint(x,y) {return {x:550+1.25*(y-225),y:220-.77*(x-551)};}
function cPhotoPoint(t) {
  t=((t%1)+1)%1;
  if(t<.25)return {x:405+960*t,y:122,side:'照片上方'};
  if(t<.33)return {x:645+750*(t-.25),y:122+537.5*(t-.25),side:'照片右上斜角'};
  if(t<.42)return {x:705,y:165+(t-.33)*110/.09,side:'照片右侧'};
  if(t<.5)return {x:705-750*(t-.42),y:275+662.5*(t-.42),side:'照片右下斜角'};
  if(t<.75)return {x:645-960*(t-.5),y:328,side:'照片下方'};
  return {x:405,y:328-824*(t-.75),side:'照片左侧'};
}
// 参数 t 从西北角起，沿北→东→南→西顺时针递增，每边占 1/4。
function ringPoint(block, t) {
  if(block==='C') {
    const p=cPhotoPoint(t);return {...cMapPoint(p.x,p.y),side:p.side};
  }
  const r=buildings[block].ring, x=r[0], y=r[1], w=r[2], h=r[3];
  t=((t%1)+1)%1;
  if(t<.25) return {x:x+w*t*4,y:y,nx:0,ny:-1,side:'北'};
  if(t<.5) return {x:x+w,y:y+h*(t-.25)*4,nx:1,ny:0,side:'东'};
  if(t<.75) return {x:x+w-w*(t-.5)*4,y:y+h,nx:0,ny:1,side:'南'};
  return {x:x,y:y+h-h*(t-.75)*4,nx:-1,ny:0,side:'西'};
}
const roomStations = {
  A:[.7125,.80,.88,.96,.04,.12,.20,.28,.36,.44,.52,.60,.66],
  B:[.9625,.04,.11,.18,.28,.36,.44,.52,.60,.68,.7725,.82,.8675],
  C:[] // C区逐层门牌由下方现场图数据生成。
};
// 每组房号按现场图的阅读方向排列：上/右为正向，下边从右到左，左边从下到上。
// 房间轮廓是按导视图拓扑重绘的示意比例，不直接把透视照片像素当作测绘坐标。
const cFloorGroups={
  1:{topOuter:'101 103 105 107',topInner:'102 104 106 108',rightOuter:'109',rightInner:'110 111 112',bottomOuter:'113 115 117 119',bottomInner:'114 116 118 120'},
  2:{topOuter:'201 203 205 207 209',topInner:'202 204 206 208 210',upperDiag:'211 212 213',rightInner:'214 216',rightOuter:'215A 215B 215C',lowerDiag:'217 218 219',bottomInner:'220 222 224 226 228',bottomOuter:'221 223 225 227 229',leftOuter:'230 231'},
  3:{topOuter:'301 303 305 307 309 311',topInner:'302 304 306 308 310 312',upperDiag:'313 314',rightOuter:'315',rightInner:'316',lowerDiag:'317 318',bottomOuter:'319 321 323 325 327 329',bottomInner:'320 322 324 326 328 330',leftOuter:'331 332 333 334 335 336'},
  4:{topOuter:'401A 401B 403A 403B 405',topInner:'402A 402B 404A 404B 406A 406B',upperDiag:'407 408',rightOuter:'409',rightInner:'410 411',lowerDiag:'412 413',bottomInner:'414 416 418',bottomOuter:'415 417 419',leftOuter:'420 421 422 423'},
  5:{topOuter:'501 503 505 506',topInner:'502 504',upperDiag:'507 508 509',rightInner:'510 512',rightOuter:'511 513',lowerDiag:'514 515 516',bottomInner:'518 520',bottomOuter:'517 519',leftOuter:'521 522 523 524'}
};
// 按现场导视图估读的沿走廊长度比例；同侧内外排共用起止线。
// 2F前两组为约1.5个单元，4F的405是完整教室，其余A/B为半间。
const cRoomWeights={
  2:{topOuter:[1.5,1.5,1,1,1],topInner:[1.5,1.5,1,1,1],bottomOuter:[1,1,1,1.5,1.5],bottomInner:[1,1,1,1.5,1.5]},
  4:{topOuter:[1,1,1,1,2]}
};
// 保留2F中央入口空档，以及3F侧排的辅助用房空间。
const cRoomIntervals={
  2:{leftOuter:[[0,.3],[.7,1]]},
  3:{rightOuter:[[1/3,1]],rightInner:[[0,2/3]]}
};
const cSlants={upperDiag:{t:.25,end:.33,key:'NE'},lowerDiag:{t:.42,end:.5,key:'SE'}};
// 外侧立面延伸到两端角部；内侧避开相邻直排教室。
// 同一个立面范围供2F～5F教室与1F整段入口使用。
const cSlantBands={outer:{start:-.18,end:1.18,near:-14,far:-40},inner:{start:.1,end:.9,near:14,far:32}};
function cSlantPoint(side,u,offset=0) {
  const s=cSlants[side],a=cPhotoPoint(s.t),b=cPhotoPoint(s.end);
  const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy);
  return [a.x+dx*u-dy/length*offset,a.y+dy*u+dx/length*offset];
}
function cSlantPolygon(side,start,end,near,far) {
  return [cSlantPoint(side,start,near),cSlantPoint(side,end,near),cSlantPoint(side,end,far),cSlantPoint(side,start,far)];
}
function cSlantZone(side,start,end) {
  const b=cSlantBands.inner,span=b.end-b.start;
  return cSlantPolygon(side,b.start+span*start,b.start+span*end,b.near,b.far);
}
function cPlacements(floor) {
  const result=[];
  const sideNames={topOuter:'地图左侧外侧',topInner:'地图左侧内侧',upperDiag:'地图左上斜角',rightOuter:'地图上侧外侧',rightInner:'地图上侧内侧',lowerDiag:'地图右上斜角',bottomOuter:'地图右侧外侧',bottomInner:'地图右侧内侧',leftOuter:'地图下侧'};
  for(const [group,labels] of Object.entries(cFloorGroups[floor])) {
    const names=labels.split(' ');
    const weights=cRoomWeights[floor]?.[group]||names.map(()=>1),total=weights.reduce((a,b)=>a+b,0);
    let cursor=0;
    names.forEach((number,index)=>{
      const interval=cRoomIntervals[floor]?.[group]?.[index]||[cursor/total,(cursor+weights[index])/total];
      cursor+=weights[index];
      const [start,end]=interval,u=(start+end)/2,span=end-start;
      let t,x,y,w,h,polygon;
      if(group==='topOuter'||group==='topInner') {
        x=412+212*u;y=group==='topOuter'?94:151;t=(x-405)/960;
        w=212*span;h=28;
      } else if(group==='bottomOuter'||group==='bottomInner') {
        x=624-212*u;y=group==='bottomOuter'?355:299;t=.5+(645-x)/960;
        w=212*span;h=28;
      } else if(group==='leftOuter') {
        x=367;y=316-174*u;t=.75+(328-y)/824;
        w=31;h=174*span;
      } else if(group==='rightOuter'||group==='rightInner') {
        x=group==='rightOuter'?731:675;
        y=195+60*u;
        t=.33+(y-165)*.09/110;
        w=36;h=60*span;
      } else {
        const side=cSlants[group],band=cSlantBands.outer,bandSpan=band.end-band.start;
        const along=band.start+bandSpan*u;
        t=side.t+(side.end-side.t)*along;
        [x,y]=cSlantPoint(group,along,(band.near+band.far)/2);
        polygon=cSlantPolygon(group,band.start+bandSpan*start,band.start+bandSpan*end,band.near,band.far);
      }
      t=Math.round(t*1e6)/1e6; // 与ringId相同精度，避免楼梯/房门共站时生成重号节点。
      const center=cMapPoint(x,y);
      result.push({id:`C${number}`,group,interval,t,x:center.x,y:center.y,...(polygon?{polygon}:{w:h*1.25,h:w*.77}),inside:group.endsWith('Inner'),side:sideNames[group]});
    });
  }
  return result;
}
const nodes=[], edges=[], roomShapes=[], rings=[], bridgePaths=[];
const byId=new Map();
function addNode(id,name,floor,x,y,type,extra) {
  const node=Object.assign({id,name,floor,x,y,type},extra||{});
  nodes.push(node); byId.set(id,node); return node;
}
function connect(from,to,weight,kind,extra) {
  const a=byId.get(from),b=byId.get(to);
  edges.push(Object.assign({from,to,weight:weight===null?Math.max(1,Math.round(Math.hypot(a.x-b.x,a.y-b.y)*.36)):weight,kind:kind||'walk'},extra||{}));
}
const stairStations=[{key:'NW',t:0,name:'西北'},{key:'NE',t:.25,name:'东北'},{key:'SE',t:.5,name:'东南'},{key:'SW',t:.75,name:'西南'}];
function ringId(block,floor,t) {return `${block}${floor}_R${Math.round(t*1000000)}`;}
function stairId(block,floor,key) {return `${block}${floor}_STAIR_${key}`;}
// 房间门口直接接在环廊上；每一个转角都是节点，不会穿中庭抄近路。
for(const block of Object.keys(buildings)) {
  const info=buildings[block];
  for(let floor=1;floor<=info.floors;floor++) {
    const level=`${floor}F`;
    if(block==='C') {
      const placements=cPlacements(floor);
      const sorted=Array.from(new Set([0,.25,.29,.33,.42,.46,.5,.625,.75,.875,...placements.map(p=>p.t)])).sort((a,b)=>a-b);
      for(const t of sorted) {
        const p=ringPoint('C',t);
        addNode(ringId('C',floor,t),`C区${p.side}环廊`,level,p.x,p.y,'corridor',{block:'C',t,side:p.side});
      }
      const ids=sorted.map(t=>ringId('C',floor,t));
      rings.push({block:'C',floor:level,ids});
      ids.forEach((id,index)=>connect(id,ids[(index+1)%ids.length],null,'ring',{block:'C'}));
      placements.forEach(room=>{
        const door=ringId('C',floor,room.t),id=room.id;
        addNode(id,id,level,room.x,room.y,'room',{block:'C',door,side:room.side,t:room.t});
        connect(id,door,4,'door');
        roomShapes.push({...room,block:'C',floor:level});
      });
      [{key:'NW',t:0,name:'照片左上'},{key:'NE',t:.29,name:'左上斜边',slant:'upperDiag'},{key:'SE',t:.46,name:'右上斜边',slant:'lowerDiag'},{key:'SW',t:.75,name:'照片左下'},{key:'W',t:.875,name:'照片左侧中央'}].forEach(stair=>{
        const p=stair.slant?cMapPoint(...cSlantPoint(stair.slant,.5,23)):ringPoint('C',stair.t),id=stairId('C',floor,stair.key);
        addNode(id,`C区${stair.name}楼梯`,level,p.x,p.y,'stairs',{block:'C',shaft:`C_${stair.key}`,key:stair.key});
        connect(id,ringId('C',floor,stair.t),stair.slant?null:0,'stair-access');
        if(floor>1)connect(stairId('C',floor-1,stair.key),id,18,'stairs');
      });
      continue;
    }
    const stations=[0,.25,.5,.75].concat(roomStations[block]);
    if(block==='A') stations.push(.32,.7125);
    if(block==='B') stations.push(.915,.60);
    const sorted=Array.from(new Set(stations)).sort((a,b)=>a-b);
    for(const t of sorted) {
      const p=ringPoint(block,t);
      addNode(ringId(block,floor,t),`${block}区${p.side}侧环廊`,level,p.x,p.y,'corridor',{block,t,side:p.side});
    }
    const ids=sorted.map(t=>ringId(block,floor,t));
    rings.push({block,floor:level,ids});
    ids.forEach((id,index)=>connect(id,ids[(index+1)%ids.length],null,'ring',{block}));
    roomStations[block].forEach((t,index)=> {
      const p=ringPoint(block,t);
      const number=index+1,x=p.x+p.nx*32,y=p.y+p.ny*32;
      const id=`${block}${floor}${('0'+number).slice(-2)}`;
      addNode(id,id,level,x,y,'room',{block,number,door:ringId(block,floor,t),side:'外侧',t});
      connect(id,ringId(block,floor,t),4,'door');
      roomShapes.push({id,block,floor:level,x,y,w:34,h:34,inside:false});
    });
    stairStations.forEach(stair=> {
      const p=ringPoint(block,stair.t);
      addNode(stairId(block,floor,stair.key),`${block}区${stair.name}楼梯`,level,p.x,p.y,'stairs',{block,shaft:`${block}_${stair.key}`,key:stair.key});
      connect(stairId(block,floor,stair.key),ringId(block,floor,stair.t),0,'stair-access');
      if(floor>1) connect(stairId(block,floor-1,stair.key),stairId(block,floor,stair.key),18,'stairs');
    });
  }
}
// 连廊只存在于已确认楼层。中间2F露天连廊是一个三向交汇结构。
function bridge(name,floor,from,to,points) {
  let previous=from;
  const path=[from];
  points.forEach((point,index)=> {
    const id=`BRIDGE_${name}_${index}`;
    addNode(id,name,`${floor}F`,point[0],point[1],'corridor',{bridge:name});
    connect(previous,id,null,'bridge',{label:name});path.push(id);previous=id;
  });
  connect(previous,to,null,'bridge',{label:name});path.push(to);
  bridgePaths.push({name,floor:`${floor}F`,ids:path});
}
addNode('JUNCTION_2','二楼露天连廊交汇处','2F',550,546,'corridor',{bridge:'二楼露天连廊'});
bridge('二楼露天连廊 A段',2,ringId('A',2,.32),'JUNCTION_2',[]);
bridge('二楼露天连廊 B段',2,'JUNCTION_2',ringId('B',2,.915),[[550,558]]);
bridge('二楼露天连廊 C段',2,'JUNCTION_2',ringId('C',2,.875),[]);
bridge('三楼 A—C 连廊',3,ringId('A',3,.25),ringId('C',3,0),[[425,404],[421,404]]);
bridge('三楼 B—C 连廊',3,ringId('B',3,0),ringId('C',3,.75),[[650,404],[679,404]]);
// 地面步道可通往全部13个建筑入口；入口1～5与建筑入口分开建模。
// 参考图：A/B各四角入口；C北侧两端、南侧两端及南侧中央入口。
const outdoorNodes=[
 ['ENTRANCE_1','入口1',155,360],['ENTRANCE_2','入口2',305,155],['ENTRANCE_3','入口3',815,60],
 ['ENTRANCE_4','入口4',125,700],['ENTRANCE_5','入口5',550,775],
 ['PATH_NW','西北步道',285,290],['PATH_NE','东北步道',800,175],
 ['PATH_N','北侧道路西端',320,25],['PATH_N2','北侧道路东端',795,25],
 ['PATH_E','东侧道路',950,400],['PATH_ES','东南道路',950,765],
 ['PATH_W','西侧步道',140,540],
 ['GROUND_NW','C区西北门前步道',400,25],['GROUND_NE','C区东北门前步道',700,25],
 ['GROUND_W','楼间道路西端',155,410],['GROUND_A_NW','A区西北门前步道',225,410],
 ['GROUND_C_SW','C区西南门前步道',400,410],['GROUND_A_NE','A区东北门前步道',425,410],
 ['GROUND_CENTER','中央地面道路',550,410],['GROUND_B_NW','B区西北门前步道',650,410],
 ['GROUND_C_SE','C区东南门前步道',700,410],['GROUND_B_NE','B区东北门前步道',850,410],
 ['GROUND_E','楼间道路东端',950,410],['GROUND_MID','A/B区之间地面通道',550,590],
 ['GROUND_SW','南侧道路西端',125,765],['GROUND_A_SW','A区西南门前步道',225,765],
 ['GROUND_A_SE','A区东南门前步道',425,765],['GROUND_S','中央南侧地面道路',550,765],
 ['GROUND_B_SW','B区西南门前步道',650,765],['GROUND_B_SE','B区东南门前步道',850,765]
];
for(const entry of outdoorNodes) addNode(entry[0],entry[1],'outdoor',entry[2],entry[3],entry[0].indexOf('ENTRANCE')===0?'entrance':'corridor');
function outside(a,b) {connect(a,b,null,'outdoor');}
function roadChain(ids) {for(let i=1;i<ids.length;i++)outside(ids[i-1],ids[i]);}
roadChain(['ENTRANCE_1','PATH_NW','ENTRANCE_2','PATH_N','GROUND_NW','GROUND_NE','PATH_N2','ENTRANCE_3','PATH_NE','PATH_E','GROUND_E','PATH_ES']);
roadChain(['ENTRANCE_1','PATH_W','ENTRANCE_4','GROUND_SW','GROUND_A_SW','GROUND_A_SE','GROUND_S','GROUND_B_SW','GROUND_B_SE','PATH_ES']);
roadChain(['ENTRANCE_1','GROUND_W','GROUND_A_NW','GROUND_C_SW','GROUND_A_NE','GROUND_CENTER','GROUND_B_NW','GROUND_C_SE','GROUND_B_NE','GROUND_E']);
roadChain(['GROUND_CENTER','GROUND_MID','GROUND_S','ENTRANCE_5']);
const buildingEntrances=[
 {block:'A',key:'NW',name:'西北入口',t:0,x:225,y:440,road:'GROUND_A_NW'},
 {block:'A',key:'NE',name:'东北入口',t:.25,x:425,y:440,road:'GROUND_A_NE'},
 {block:'A',key:'SW',name:'西南入口',t:.75,x:225,y:740,road:'GROUND_A_SW'},
 {block:'A',key:'SE',name:'东南入口',t:.5,x:450,y:740,road:'GROUND_A_SE'},
 {block:'B',key:'NW',name:'西北入口',t:0,x:650,y:440,road:'GROUND_B_NW'},
 {block:'B',key:'NE',name:'东北入口',t:.25,x:850,y:440,road:'GROUND_B_NE'},
 {block:'B',key:'SW',name:'西南入口',t:.75,x:650,y:740,road:'GROUND_B_SW'},
 {block:'B',key:'SE',name:'东南入口',t:.5,x:875,y:740,road:'GROUND_B_SE'},
 {block:'C',key:'NW',name:'西北斜边入口',t:.29,...cMapPoint(...cSlantPoint('upperDiag',.5,-27)),slant:'upperDiag',road:'GROUND_NW'},
 {block:'C',key:'NE',name:'东北斜边入口',t:.46,...cMapPoint(...cSlantPoint('lowerDiag',.5,-27)),slant:'lowerDiag',road:'GROUND_NE'},
 {block:'C',key:'SW',name:'西南入口',t:0,x:421,y:375,road:'GROUND_C_SW'},
 {block:'C',key:'S',name:'南侧中央入口',t:.875,x:550,y:375,road:'GROUND_CENTER'},
 {block:'C',key:'SE',name:'东南入口',t:.75,x:679,y:375,road:'GROUND_C_SE'}
];
for(const entry of buildingEntrances) {
  entry.id=`DOOR_${entry.block}_${entry.key}`;entry.inside=`${entry.block}1_GATE_${entry.key}`;
  const name=`${entry.block}区${entry.name}`;
  addNode(entry.id,name,'outdoor',entry.x,entry.y,'entrance',{block:entry.block,isDoor:true});
  addNode(entry.inside,name,'1F',entry.x,entry.y,'corridor',{block:entry.block,isGate:true});
  outside(entry.road,entry.id);
  connect(entry.id,entry.inside,1,'entry'); // 同一高度的室内外边界，不是上下楼。
  const target=ringId(entry.block,1,entry.t);
  if(entry.key==='SE' && entry.block!=='C') {
    // 东南门通过角部通道转入环廊，避免斜线贴着南侧教室角穿过。
    const bend=`${entry.inside}_BEND`;
    addNode(bend,name+'通道','1F',entry.x,byId.get(target).y,'corridor',{block:entry.block});
    connect(entry.inside,bend,null,'access',{label:name});connect(bend,target,null,'access',{label:name});
  } else connect(entry.inside,target,null,'access',{label:name});
}
// 1F视图同时展示同一地面高度的室外路段，跨区路线不再被人为截断。
function nodeVisibleOnFloor(node,floor) {return node.floor===floor || (floor==='1F' && node.floor==='outdoor');}
const destinations=['A201','B312','C205','C524'];
const mapFiles={outdoor:'maps/outdoor.svg','1F':'maps/floor1.svg','2F':'maps/floor2.svg','3F':'maps/floor3.svg','4F':'maps/floor4.svg','5F':'maps/floor5.svg'};
// 后续换用真实SVG：例如 {'1F':'maps/real-floor1.svg'}，同时校准节点坐标。
// 留空时使用当前共享几何绘图。maps/*.svg 为当前几何的独立导出参考。
const floorPlanImages={};
