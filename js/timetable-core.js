/* WakeUp树维简易导出：纯数据解析与日程计算，无DOM、联网或脚本执行。 */
const TimetableCore=(()=>{
  'use strict';
  const DAY=86400000,MAX_BYTES=2*1024*1024;
  const defaultPeriods=[['08:30','09:15'],['09:20','10:05'],['10:20','11:05'],['11:10','11:55'],['14:30','15:15'],['15:20','16:05'],['16:20','17:05'],['17:10','17:55'],['19:30','20:15'],['20:20','21:05'],['21:10','21:55'],['','']];
  function defaultSettings(){return {semesterStart:'2026-08-31',periods:defaultPeriods.map(pair=>pair.slice())};}
  function dateNumber(value){
    if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return null;
    const n=Date.parse(value+'T00:00:00Z');
    return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===value?n:null;
  }
  function minutes(value){
    if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))return null;
    return Number(value.slice(0,2))*60+Number(value.slice(3));
  }
  function validateSettings(value,periodCount=12){
    const start=value?.semesterStart||'';
    if(start&&(dateNumber(start)===null||start<'2000-01-01'||start>'2100-12-31'||new Date(dateNumber(start)).getUTCDay()!==1))throw new Error('学期首日请填写2000～2100年间第1周周一的日期。');
    if(!Array.isArray(value?.periods))throw new Error('请填写节次作息。');
    let previousEnd=-1;
    const periods=Array.from({length:periodCount},(_,i)=>{
      const pair=value.periods[i]||['',''];
      if(!Array.isArray(pair))throw new Error(`第${i+1}节时间格式不正确。`);
      const [a,b]=pair;
      if(a===''&&b==='')return ['',''];
      const begin=minutes(a),end=minutes(b);
      if(begin===null||end===null||end<=begin)throw new Error(`请检查第${i+1}节的开始、结束时间。`);
      if(begin<previousEnd)throw new Error(`第${i+1}节与前面的作息时间重叠。`);
      previousEnd=end;return [a,b];
    });
    return {semesterStart:start,periods};
  }
  function matchRoom(raw,hasRoom){
    const value=raw.normalize('NFKC').replace(/\s+/g,'').toUpperCase();
    const match=/^品学楼([ABC]\d{3}[ABC]?)$/.exec(value);
    if(!match)return {nodeId:null,locationStatus:value.startsWith('品学楼')?'unmapped':'outside'};
    const id=match[1];
    return hasRoom(id)?{nodeId:id,locationStatus:'mapped'}:{nodeId:null,locationStatus:'unmapped'};
  }
  function parse(text,filename,hasRoom=()=>false){
    if(typeof text!=='string'||text.length>MAX_BYTES)throw new Error('课表文件过大，请选择不超过2MB的导出文件。');
    let raw;
    try{raw=JSON.parse(text.replace(/^\uFEFF/,'').trim());}catch(error){throw new Error('未识别到课程数据。请选择WakeUp教程导出的树维简易导入HTML文件或相同格式的JSON。');}
    const count=raw?.unitCount;
    if(!Number.isInteger(count)||count<1||count>24||!Array.isArray(raw.activities)||![6,7].includes(raw.activities.length/count))throw new Error('课表结构不完整：需要每天节数和6天或7天的课程格子。');
    if(raw.unitCounts!==undefined&&raw.unitCounts!==raw.activities.length)throw new Error('课表格子数量与声明不一致，请重新导出。');
    const source={unitCount:count,unitCounts:raw.activities.length,year:raw.year,activities:[]};
    const occurrences=new Map(),warnings=[];
    let duplicateSlots=0,ignored=0,records=0;
    function string(value,required=false){
      if((typeof value!=='string'&&typeof value!=='number')||(required&&!String(value).trim())||String(value).length>1000)throw new Error('课程字段缺失或过长，请重新导出课表。');
      return String(value).trim();
    }
    raw.activities.forEach((cell,index)=>{
      if(!Array.isArray(cell)||cell.length>100)throw new Error('某个课表格子的课程列表无效。');
      const clean=[];
      cell.forEach(value=>{
        if(!value||typeof value!=='object')throw new Error('课表包含无效的课程记录。');
        if(++records>10000)throw new Error('课程记录数量异常，请检查导出文件。');
        const fullName=string(value.courseName,true),courseId=string(value.courseId??fullName,true);
        const teacherName=string(value.teacherName??''),teacherId=string(value.teacherId??''),roomName=string(value.roomName??''),roomId=string(value.roomId??'');
        const mask=value.vaildWeeks??value.validWeeks;
        if(typeof mask!=='string'||!/^0[01]{1,59}$/.test(mask))throw new Error('上课周次格式无效：需要以第0周占位开头的周次位串。');
        clean.push({courseName:fullName,courseId,teacherName,teacherId,roomName,roomId,vaildWeeks:mask});
        const weeks=[...mask].flatMap((v,w)=>v==='1'?[w]:[]);
        if(!weeks.length){ignored++;return;}
        const title=fullName.replace(/\([^()]*\)\s*$/,'').trim()||fullName;
        const canonical=s=>s.split(/[,，]/).map(x=>x.trim()).filter(Boolean).sort().join(',');
        const signature=JSON.stringify([courseId,fullName,canonical(teacherName),canonical(teacherId),roomId,roomName]);
        const day=Math.floor(index/count)+1,period=index%count+1;
        const details={courseId,fullName,title,teacherName,roomName,...matchRoom(roomName,hasRoom)};
        weeks.forEach(week=>{
          const key=JSON.stringify([signature,day,week]);
          if(!occurrences.has(key))occurrences.set(key,{signature,details,day,week,periods:new Set()});
          const item=occurrences.get(key);
          if(item.periods.has(period))duplicateSlots++;
          item.periods.add(period);
        });
      });
      source.activities.push(clean);
    });
    const grouped=new Map();
    for(const item of occurrences.values()){
      const runs=[];
      [...item.periods].sort((a,b)=>a-b).forEach(period=>{
        const last=runs[runs.length-1];
        if(last&&last[1]===period-1)last[1]=period;else runs.push([period,period]);
      });
      runs.forEach(([startPeriod,endPeriod])=>{
        const key=JSON.stringify([item.signature,item.day,startPeriod,endPeriod]);
        if(!grouped.has(key))grouped.set(key,{...item.details,day:item.day,startPeriod,endPeriod,weeks:[]});
        grouped.get(key).weeks.push(item.week);
      });
    }
    const rules=[...grouped.values()].sort((a,b)=>a.day-b.day||a.startPeriod-b.startPeriod||a.courseId.localeCompare(b.courseId));
    if(!rules.length)throw new Error('文件里没有有效的上课安排。');
    rules.forEach((r,i)=>{r.id=`rule-${i+1}`;r.weeks.sort((a,b)=>a-b);});
    if(duplicateSlots)warnings.push(`已合并${duplicateSlots}条重复的周次课节记录。`);
    if(ignored)warnings.push(`已略过${ignored}条没有上课周次的记录。`);
    const pinxue=rules.filter(r=>r.locationStatus!=='outside'),mapped=rules.filter(r=>r.nodeId);
    return {version:1,name:String(filename||'我的课表').replace(/\.(html?|json)$/i,''),year:Number.isInteger(raw.year)?raw.year:null,periodCount:count,maxWeek:rules.reduce((max,r)=>Math.max(max,r.weeks[r.weeks.length-1]),1),source,rules,warnings,
      stats:{courses:new Set(rules.map(r=>r.courseId)).size,pinxueCourses:new Set(pinxue.map(r=>r.courseId)).size,mappedRooms:[...new Set(mapped.map(r=>r.nodeId))].sort(),pinxueRules:pinxue.length,pinxueEvents:pinxue.reduce((n,r)=>n+r.weeks.length,0),mappedEvents:mapped.reduce((n,r)=>n+r.weeks.length,0)}};
  }
  function dateFor(start,week,day){const n=dateNumber(start);return n===null?null:new Date(n+((week-1)*7+day-1)*DAY).toISOString().slice(0,10);}
  function nowParts(now=Date.now()){
    const d=new Date(Number(now)+8*3600000);
    return {date:d.toISOString().slice(0,10),day:d.getUTCDay()||7,minute:d.getUTCHours()*60+d.getUTCMinutes()};
  }
  function currentWeek(settings,now=Date.now()){
    const start=dateNumber(settings.semesterStart);return start===null?null:Math.floor((dateNumber(nowParts(now).date)-start)/(7*DAY))+1;
  }
  function eventsForWeek(model,week,settings){
    if(!Number.isInteger(week)||week<1||week>model.maxWeek)return [];
    return model.rules.filter(r=>r.weeks.includes(week)).map(rule=>{
      const date=dateFor(settings.semesterStart,week,rule.day),start=settings.periods[rule.startPeriod-1]?.[0]||'',end=settings.periods[rule.endPeriod-1]?.[1]||'';
      const at=time=>date&&minutes(time)!==null?Date.parse(`${date}T${time}:00+08:00`):null;
      return {...rule,id:`${rule.id}-w${week}`,week,date,startTime:start,endTime:end,startAt:at(start),endAt:at(end)};
    }).sort((a,b)=>a.day-b.day||a.startPeriod-b.startPeriod||a.courseId.localeCompare(b.courseId));
  }
  function status(event,now=Date.now()){
    if(event.startAt===null||event.endAt===null)return 'unknown';
    return now<event.startAt?'upcoming':now<event.endAt?'ongoing':'ended';
  }
  function nextMappedEvent(model,settings,now=Date.now(),{upcomingOnly=false}={}){
    if(!settings.semesterStart)return null;
    for(let week=Math.max(1,currentWeek(settings,now));week<=model.maxWeek;week++){
      // 未知结束时刻的当天课程仍需提示补充作息，不能直接跳过当作已下课。
      const event=eventsForWeek(model,week,settings).find(e=>e.nodeId&&(upcomingOnly?(e.startAt!==null?e.startAt>now:e.date>=nowParts(now).date):(e.endAt!==null?e.endAt>now:e.date>=nowParts(now).date)));
      if(event)return event;
    }
    return null;
  }
  function previousEvent(events,event){
    const before=events.filter(e=>e.day===event.day&&e.endPeriod<event.startPeriod);
    const lastPeriod=Math.max(0,...before.map(e=>e.endPeriod));
    const candidates=before.filter(e=>e.endPeriod===lastPeriod);
    return candidates.length===1?candidates[0]:null;
  }
  const ORIGIN_TTL=45*60000;
  function resolveOrigin(model,settings,target,manual,now=Date.now()){
    const today=nowParts(now).date,unknown=reason=>({nodeId:null,kind:'unknown',reason});
    if(manual&&manual.nodeId&&manual.date===today&&now>=manual.at&&now-manual.at<=ORIGIN_TTL)return {nodeId:manual.nodeId,kind:'manual',reason:'本次手动指定'};
    if(!target?.date||!settings.semesterStart)return unknown('学期日期待设置，请选择出发位置');
    if(target.date!==today)return unknown('目标课程不在今天，请选择出发位置');
    if(target.startAt===null||target.endAt===null)return unknown('课程作息不完整，请选择出发位置');
    if(target.endAt<=now)return unknown('这次课已结束，请选择出发位置');
    const all=eventsForWeek(model,target.week,settings).filter(e=>e.day===target.day);
    const active=all.filter(e=>e.startAt!==null&&e.endAt!==null&&e.startAt<=now&&e.endAt>now);
    if(active.length>1)return unknown('当前时段有课程冲突，请选择出发位置');
    const current=active[0];
    // 点击正在进行的目标课时，不能用目标教室反推出“已经到达”。
    if(current&&current.id!==target.id){
      if(!current.nodeId)return unknown('当前课程在地图覆盖范围外，请选择出发位置');
      return {nodeId:current.nodeId,kind:'current',reason:`课表推测 · 当前课程 ${current.title}，${current.endTime}下课后出发`,event:current};
    }
    const before=all.filter(e=>e.id!==target.id&&e.endPeriod<target.startPeriod&&(e.startAt===null||e.startAt<=now));
    const lastPeriod=Math.max(0,...before.map(e=>e.endPeriod)),latest=before.filter(e=>e.endPeriod===lastPeriod);
    if(latest.length>1)return unknown('上一时段有课程冲突，请选择出发位置');
    if(!latest.length)return unknown('暂无近期课程位置，请选择出发位置');
    const previous=latest[0];
    if(previous.endAt===null||previous.startAt===null||previous.endAt>now)return unknown('上一节课的结束状态不明确，请选择出发位置');
    if(!previous.nodeId)return unknown('上一节课的教室未纳入地图，请选择出发位置');
    if(now-previous.endAt>ORIGIN_TTL)return unknown('距上一节下课已超过45分钟，请选择出发位置');
    return {nodeId:previous.nodeId,kind:'previous',reason:`课表推测 · 上一节 ${previous.endTime}刚下课`,event:previous};
  }
  return {MAX_BYTES,ORIGIN_TTL,defaultSettings,validateSettings,matchRoom,parse,dateFor,nowParts,currentWeek,eventsForWeek,status,nextMappedEvent,previousEvent,resolveOrigin};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TimetableCore;
