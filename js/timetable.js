/* 本地课表界面。普通script运行，不读取学校账号，不上传导入文件。 */
(()=>{
  'use strict';
  const core=TimetableCore,key='uestc-nav-timetable-v1',days=['','周一','周二','周三','周四','周五','周六','周日'];
  const $=id=>document.getElementById(id),hasRoom=id=>byId.has(id)&&byId.get(id).type==='room';
  let model=null,settings=core.defaultSettings(),week=1,selectedDay=0,pinxueOnly=true,pending=null,readToken=0,nextEvent=null,lastRenderedDate='',coursePage=0,originRequest=null;
  const desktop=window.matchMedia('(min-width:1100px) and (min-height:650px)'),PAGE_SIZE=6;
  const fileInput=$('timetableFile'),dialog=$('timetableImportDialog');
  function text(tag,value,cls){const e=document.createElement(tag);e.textContent=value;if(cls)e.className=cls;return e;}
  function notice(message,kind='info'){$('timetableNotice').textContent=message;$('timetableNotice').dataset.kind=kind;$('timetableNotice').hidden=!message;}
  function save(failure='浏览器未能保存课表，当前页面仍可使用；刷新或关闭后需要重新导入。'){
    try{localStorage.setItem(key,JSON.stringify({version:1,name:model?.name||'',source:model?.source||null,settings}));return true;}
    catch(error){notice(failure,'error');return false;}
  }
  function viewCurrentWeek(){
    const current=core.currentWeek(settings);
    week=Math.max(1,Math.min(model?.maxWeek||1,current||1));
  }
  function init(){
    try{
      const saved=localStorage.getItem(key);
      if(saved){
        const value=JSON.parse(saved);
        if(value.version!==1)throw new Error('不支持的存储版本');
        if(value.source)model=core.parse(JSON.stringify(value.source),value.name,hasRoom);
        settings=core.validateSettings(value.settings,Math.max(12,model?.periodCount||12));
      }
    }catch(error){notice('本机课表暂时无法恢复，可重新导入；当前使用截图中的默认作息。','error');model=null;settings=core.defaultSettings();}
    viewCurrentWeek();renderSettings();render();
  }
  function open(){render();showPage('timetablePage');}
  document.querySelectorAll('[data-open-timetable]').forEach(button=>button.addEventListener('click',open));
  document.querySelectorAll('[data-import-timetable]').forEach(button=>button.addEventListener('click',()=>{
    open();fileInput.click();
  }));
  function periodLabel(event){return event.startPeriod===event.endPeriod?`第${event.startPeriod}节`:`${event.startPeriod}–${event.endPeriod}节`;}
  function clockLabel(event){return event.startTime&&event.endTime?`${event.startTime}–${event.endTime}`:event.startTime?`${event.startTime}起 · 结束时间待设置`:'钟点时间待设置';}
  function courseContext(event){return `第${event.week}周 ${days[event.day]} · ${periodLabel(event)} · ${event.title}`;}
  function originFor(event){return core.resolveOrigin(model,settings,event,manualOrigin);}
  function chooseOrigin(event,go=true){
    const source=originFor(event),picker=$('courseOriginSelect');
    picker.replaceChildren(new Option('请选择出发位置',''));
    [...startSelect.children].forEach(group=>picker.append(group.cloneNode(true)));
    picker.value=source.nodeId||'';
    $('courseOriginReason').textContent=`${source.nodeId?`当前推荐：${byId.get(source.nodeId).name} · `:''}${source.reason}。目标：${event.nodeId}。`;
    $('confirmCourseOrigin').textContent=go?'从这里出发':'使用这个起点';originRequest={event,go};
    $('courseOriginDialog').showModal();picker.focus();
  }
  function navigate(event,from=null){
    if(!event.nodeId||!hasRoom(event.nodeId))return;
    const source=from?{nodeId:from.nodeId,kind:'manual',reason:'本次手动指定'}:originFor(event);
    if(!source.nodeId){chooseOrigin(event);return;}
    if(!byId.has(source.nodeId))return;
    const label={manual:'手动指定',current:`课表推测，${source.event?.endTime}下课后出发`,previous:`课表推测，${source.event?.endTime}刚下课`}[source.kind];
    if(!startNavigation(source.nodeId,event.nodeId,`${courseContext(event)} · 从${byId.get(source.nodeId).name}出发（${label}）`)){open();notice('这间教室暂时无法规划路线，请在地图中核对。','error');}
  }
  $('courseOriginForm').addEventListener('submit',event=>{
    event.preventDefault();const request=originRequest,id=$('courseOriginSelect').value;if(!request||!byId.has(id))return;
    setManualOrigin(id);syncSelection();$('courseOriginDialog').close();
    if(request.go)navigate(request.event,{nodeId:id});else renderHome();
  });
  $('cancelCourseOrigin').addEventListener('click',()=>$('courseOriginDialog').close());
  $('courseOriginDialog').addEventListener('close',()=>{originRequest=null;});
  $('changeCourseOrigin').addEventListener('click',()=>{if(nextEvent)chooseOrigin(nextEvent,false);});
  $('autoCourseOrigin').addEventListener('click',clearManualOrigin);
  window.addEventListener('originchange',renderHome);
  window.addEventListener('pagechange',()=>{if(!$('homePage').hidden)renderHome();});
  function renderHome(){
    const go=$('nextCourseGo');nextEvent=null;go.hidden=true;$('courseOriginRow').hidden=true;
    if(!model){
      $('nextCourseKicker').textContent='课程与路线，一起安排';$('nextCourseTitle').textContent='带着课表，去上课。';
      $('nextCourseMeta').textContent='导入教务课表，查看本周课程，一键前往品学楼教室。';return;
    }
    $('nextCourseKicker').textContent='下一节品学楼课程';
    if(!settings.semesterStart){
      $('nextCourseTitle').textContent='设置首周日期，找到下一节课';$('nextCourseMeta').textContent=`已导入${model.stats.courses}门课，可先按周次浏览并导航。`;return;
    }
    nextEvent=core.nextMappedEvent(model,settings);
    // 同日还有下一节品学楼课时，以当前课程推测它的起点；否则保留“去当前课”。
    const following=core.nextMappedEvent(model,settings,Date.now(),{upcomingOnly:true});
    if(nextEvent&&core.status(nextEvent)==='ongoing'&&following?.date===core.nowParts().date)nextEvent=following;
    if(!nextEvent){
      $('nextCourseTitle').textContent='暂无后续可导航的课程';
      $('nextCourseMeta').textContent='可打开课表切换周次，或查看其他教学楼的安排。';return;
    }
    const state=core.status(nextEvent);
    $('nextCourseKicker').textContent=state==='ongoing'?'正在上课 · 品学楼':state==='unknown'?'品学楼课程 · 作息待补充':'下一节品学楼课程';
    $('nextCourseTitle').textContent=nextEvent.title;
    $('nextCourseMeta').textContent=`${nextEvent.date} ${days[nextEvent.day]} · ${clockLabel(nextEvent)} · ${periodLabel(nextEvent)} · ${nextEvent.nodeId}`;
    const source=originFor(nextEvent);
    $('courseOriginRow').hidden=false;
    $('courseOriginHint').textContent=source.nodeId?`起点：${byId.get(source.nodeId).name} · ${source.reason}`:source.reason;
    $('changeCourseOrigin').textContent=source.nodeId?'修改起点':'选择起点';
    $('autoCourseOrigin').hidden=source.kind!=='manual';
    go.textContent=source.nodeId?'去上课 ↗':'选择起点去上课';
    go.hidden=false;
  }
  $('nextCourseGo').addEventListener('click',()=>{renderHome();if(nextEvent)navigate(nextEvent);});
  function render(){
    lastRenderedDate=core.nowParts().date;
    renderHome();
    $('timetableEmpty').hidden=!!model;$('timetableContent').hidden=!model;$('clearTimetable').hidden=!model;
    $('timetableName').textContent=model?model.name:'还没有导入课表';
    $('timetableSummary').textContent=model?`${model.stats.courses}门课程 · 品学楼${model.stats.pinxueCourses}门 · ${model.stats.pinxueEvents}次上课 · ${model.stats.mappedRooms.length}间教室已匹配`:'支持WakeUp树维简易导出文件，课表仅保存在本机。';
    if(!model)return;
    const picker=$('scheduleWeek');picker.replaceChildren();
    for(let i=1;i<=model.maxWeek;i++)picker.append(new Option(`第${i}周`,String(i)));
    picker.value=String(week);$('scheduleDay').value=String(selectedDay);$('schedulePinxue').checked=pinxueOnly;
    $('schedulePrev').disabled=week<=1;$('scheduleNext').disabled=week>=model.maxWeek;
    $('scheduleToday').disabled=!settings.semesterStart;
    const current=core.currentWeek(settings),from=core.dateFor(settings.semesterStart,week,1),to=core.dateFor(settings.semesterStart,week,7);
    const currentLabel=current===null?'首周日期待设置':current<1?'学期尚未开始':current>model.maxWeek?'已超过课表最后上课周':`当前第${current}周`;
    $('scheduleRange').textContent=`${from?`${from} — ${to} · `:''}${currentLabel} · ${pinxueOnly?'品学楼课程':'全部课程'}${selectedDay?` · ${days[selectedDay]}`:''}`;
    const all=core.eventsForWeek(model,week,settings),filtered=all.filter(event=>(!pinxueOnly||event.locationStatus!=='outside')&&(!selectedDay||event.day===selectedDay));
    const list=$('scheduleList');list.dataset.view=selectedDay?'day':'week';list.replaceChildren();
    const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));coursePage=Math.min(coursePage,pages-1);
    $('schedulePager').hidden=!desktop.matches||pages<=1;$('schedulePageInfo').textContent=`${coursePage+1} / ${pages}`;
    $('schedulePagePrev').disabled=coursePage===0;$('schedulePageNext').disabled=coursePage>=pages-1;
    if(!filtered.length){list.append(text('p',`第${week}周${selectedDay?' '+days[selectedDay]:''}没有${pinxueOnly?'品学楼':''}课程。`,'schedule-no-course'));return;}
    if(desktop.matches){
      list.dataset.view='paged';
      filtered.slice(coursePage*PAGE_SIZE,(coursePage+1)*PAGE_SIZE).forEach(event=>{
        const card=courseCard(event,all);card.prepend(text('p',`${days[event.day]} · ${event.date?.slice(5)||`第${week}周`}`,'course-day-stamp'));list.append(card);
      });return;
    }
    for(const day of selectedDay?[selectedDay]:[1,2,3,4,5,6,7]){
      const events=filtered.filter(e=>e.day===day);if(!events.length)continue;
      const group=document.createElement('section');group.className='schedule-day liquid-glass';
      group.style.setProperty('--course-columns',String(Math.min(3,events.length)));
      group.dataset.today=String(events[0].date===core.nowParts().date);
      const heading=document.createElement('div');heading.className='schedule-day-heading';heading.append(text('h2',days[day]),text('span',events[0].date?events[0].date.slice(5):`${events.length}次课`));group.append(heading);
      events.forEach(event=>group.append(courseCard(event,all)));list.append(group);
    }
  }
  function courseCard(event,all){
    const card=document.createElement('article');card.className='schedule-course';
    card.dataset.mapped=String(!!event.nodeId);card.dataset.block=event.nodeId?.[0]||'';card.dataset.event=event.id;
    const state=core.status(event);card.dataset.status=state;
    const top=document.createElement('div');top.className='schedule-course-top';
    top.append(text('strong',periodLabel(event)),text('span',{upcoming:'未开始',ongoing:'正在上课',ended:'已结束',unknown:'时间待设置'}[state]));
    card.append(top,text('h3',event.title),text('p',clockLabel(event)),text('p',event.roomName||'地点待定'),text('p',event.teacherName||'教师未提供'));
    card.title=`${event.title} · ${event.roomName} · ${event.teacherName} · ${clockLabel(event)}`;
    if(!event.nodeId){card.append(text('p',event.locationStatus==='outside'?'该地点尚未纳入品学楼地图。':'品学楼门牌未匹配，请核对导出的地点。','schedule-unmapped'));return card;}
    const actions=document.createElement('div');actions.className='schedule-actions';
    const go=text('button','去上课 ↗','schedule-button schedule-accent');go.type='button';go.addEventListener('click',()=>navigate(event));actions.append(go);
    const previous=core.previousEvent(all,event);
    if(previous?.nodeId){
      const transfer=text('button',`从${previous.nodeId}出发`,'schedule-button');transfer.type='button';transfer.title=`上一节：${previous.title}`;transfer.addEventListener('click',()=>navigate(event,previous));actions.append(transfer);
    }
    card.append(actions);return card;
  }
  function renderPreview(result){
    $('importScheduleName').textContent=result.name;
    const stats=$('importScheduleStats');stats.replaceChildren();
    for(const [label,value] of [['课程',result.stats.courses],['品学楼课程',result.stats.pinxueCourses],['匹配教室',result.stats.mappedRooms.length]]){
      const item=document.createElement('div');item.append(text('dt',label),text('dd',String(value)));stats.append(item);
    }
    const courses=$('importScheduleCourses');courses.replaceChildren();
    const grouped=new Map();
    result.rules.filter(r=>r.locationStatus!=='outside').forEach(rule=>{
      if(!grouped.has(rule.courseId))grouped.set(rule.courseId,{title:rule.title,rooms:new Set()});
      grouped.get(rule.courseId).rooms.add(`${rule.roomName||'地点待定'}${rule.nodeId?' ✓':'（门牌待核对）'}`);
    });
    for(const item of grouped.values()){
      const li=text('li',item.title);li.append(text('small',[...item.rooms].join('、')));courses.append(li);
    }
    if(!grouped.size)courses.append(text('li','这份课表没有品学楼课程，导入后可在“全部课程”中查看。'));
    const uncovered=[...new Set(result.rules.filter(r=>!r.nodeId).map(r=>r.roomName||'地点待定'))];
    $('importScheduleNotes').textContent=`品学楼共${result.stats.pinxueEvents}次上课，其中${result.stats.mappedEvents}次可导航。${uncovered.length?`未覆盖地点：${uncovered.join('、')}。`:''}${result.warnings.join('')}${model?'导入后将替换当前课表。':'确认后保存在本机，可随时清除。'}`;
    $('confirmTimetableImport').textContent=model?'替换当前课表':'导入这份课表';
  }
  fileInput.addEventListener('change',async()=>{
    const file=fileInput.files?.[0];if(!file)return;
    const token=++readToken;pending=null;
    try{
      if(file.size>core.MAX_BYTES)throw new Error('文件超过2MB，请选择教务导出的课表文件。');
      notice('正在读取课表…');
      const content=await file.text();if(token!==readToken)return;
      const result=core.parse(content,file.name,hasRoom);pending=result;
      renderPreview(result);notice('请检查导入结果，确认后保存。');dialog.showModal();
    }catch(error){if(token===readToken){notice(error.message||'文件读取失败，请重试。','error');}}
    finally{if(token===readToken)fileInput.value='';}
  });
  $('cancelTimetableImport').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('close',()=>{pending=null;});
  $('confirmTimetableImport').addEventListener('click',()=>{
    if(!pending)return;
    model=pending;
    if(model.year&&settings.semesterStart&&Number(settings.semesterStart.slice(0,4))!==model.year)settings={...settings,semesterStart:''};
    settings=core.validateSettings({...settings,periods:Array.from({length:Math.max(12,model.periodCount)},(_,i)=>settings.periods[i]||['',''])},Math.max(12,model.periodCount));
    clearManualOrigin();viewCurrentWeek();selectedDay=0;pinxueOnly=true;coursePage=0;dialog.close();
    const saved=save();renderSettings();render();showPage('timetablePage');
    if(saved)notice(`已导入${model.stats.courses}门课程，品学楼${model.stats.pinxueEvents}次上课。${!settings.semesterStart?'请展开设置，填写第1周周一日期。':''}`);
    if(!settings.semesterStart)$('scheduleSettingsDialog').showModal();
  });
  $('clearTimetable').addEventListener('click',()=>{
    ++readToken;pending=null;model=null;nextEvent=null;week=1;selectedDay=0;coursePage=0;fileInput.value='';clearManualOrigin();
    let removed=false;
    try{localStorage.removeItem(key);removed=true;}catch(error){/* 当前会话仍可清除 */}
    const saved=save('课表已从当前页面移除，但浏览器未能更新本机存储；请在浏览器中清除本站数据。');
    renderSettings();render();
    if(saved)notice('本机课表已清除，作息设置已保留。');
    else if(removed)notice('本机课表已清除；作息设置仅在本次页面中保留。');
  });
  $('scheduleWeek').addEventListener('change',event=>{week=Number(event.target.value);coursePage=0;render();});
  $('scheduleDay').addEventListener('change',event=>{selectedDay=Number(event.target.value);coursePage=0;render();});
  $('schedulePinxue').addEventListener('change',event=>{pinxueOnly=event.target.checked;coursePage=0;render();});
  $('schedulePagePrev').addEventListener('click',()=>{coursePage=Math.max(0,coursePage-1);render();});
  $('schedulePageNext').addEventListener('click',()=>{coursePage++;render();});
  desktop.addEventListener('change',()=>{coursePage=0;render();});
  $('openScheduleSettings').addEventListener('click',()=>$('scheduleSettingsDialog').showModal());
  $('closeScheduleSettings').addEventListener('click',()=>$('scheduleSettingsDialog').close());
  $('schedulePrev').addEventListener('click',()=>{if(week>1){week--;coursePage=0;render();}});
  $('scheduleNext').addEventListener('click',()=>{if(model&&week<model.maxWeek){week++;coursePage=0;render();}});
  $('scheduleToday').addEventListener('click',()=>{
    if(!model)return;
    const current=core.currentWeek(settings);
    if(current===null||current<1||current>model.maxWeek){notice('今天不在这份课表的上课周范围内，可手动选择周次。');return;}
    week=current;selectedDay=core.nowParts().day;coursePage=0;notice('');render();
  });
  function renderSettings(){
    $('semesterStart').value=settings.semesterStart;
    const grid=$('schedulePeriodGrid');grid.replaceChildren();
    const count=Math.max(12,model?.periodCount||12);
    for(let i=0;i<count;i++){
      const row=document.createElement('div');row.className='schedule-period-row';row.append(text('span',`第${i+1}节`));
      for(const part of [0,1]){
        if(part)row.append(text('span','—'));
        const input=document.createElement('input');input.type='time';input.id=`period-${i+1}-${part}`;
        input.setAttribute('aria-label',`第${i+1}节${part?'结束':'开始'}时间`);input.value=settings.periods[i]?.[part]||'';row.append(input);
      }
      grid.append(row);
    }
  }
  $('scheduleSettingsForm').addEventListener('submit',event=>{
    event.preventDefault();const error=$('scheduleSettingsError');
    try{
      const periods=Array.from({length:Math.max(12,model?.periodCount||12)},(_,i)=>[0,1].map(p=>$(`period-${i+1}-${p}`).value));
      settings=core.validateSettings({semesterStart:$('semesterStart').value,periods},periods.length);clearManualOrigin();
      error.hidden=true;const saved=save();render();if(saved)notice('学期与作息设置已保存，课程日期和状态已更新。');
    }catch(problem){error.textContent=problem.message;error.hidden=false;}
  });
  $('resetScheduleTimes').addEventListener('click',()=>{
    const defaults=core.defaultSettings();
    for(let i=0;i<Math.max(12,model?.periodCount||12);i++)for(const p of [0,1])$(`period-${i+1}-${p}`).value=defaults.periods[i]?.[p]||'';
    $('scheduleSettingsError').hidden=true;
  });
  // 只在页面可见时更新状态；保存设置的输入不参与定时重绘。
  function refresh(){
    if(document.hidden)return;
    renderHome();
    if($('timetablePage').hidden||!model)return;
    if(lastRenderedDate!==core.nowParts().date){render();return;}
    const current=new Map(core.eventsForWeek(model,week,settings).map(e=>[e.id,e]));
    document.querySelectorAll('.schedule-course').forEach(card=>{
      const event=current.get(card.dataset.event);if(!event)return;
      const state=core.status(event);card.dataset.status=state;
      card.querySelector('.schedule-course-top span').textContent={upcoming:'未开始',ongoing:'正在上课',ended:'已结束',unknown:'时间待设置'}[state];
    });
  }
  setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);
  init();
})();
