/* 无界面测试：动态起点、16:9布局、地图滚轮、室外结构。只使用合成课表。 */
const {chromium}=require(process.env.TIMETABLE_PLAYWRIGHT||'playwright');
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs'),{pathToFileURL}=require('node:url');
const shots=process.argv[2]&&path.resolve(process.argv[2]);
const raw={unitCount:12,unitCounts:84,year:2026,activities:Array.from({length:84},()=>[])};
function put(day,periods,course,room){for(const p of periods)raw.activities[(day-1)*12+p-1].push({courseId:course,courseName:course,teacherName:'示例教师',roomName:'品学楼'+room,vaildWeeks:'000000010'});}
put(1,[1,2],'周一课程一','A101');put(1,[3,4],'周一课程二','A105');put(1,[5,6],'周一课程三','C204');
put(2,[1,2],'周二课程一','A211');put(2,[3,4],'周二课程二','B410');put(3,[9,10],'周三课程','C204');
put(4,[5,6],'下午课程','B410');put(4,[9,10],'晚间课程','A211');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.TIMETABLE_BROWSER?{executablePath:process.env.TIMETABLE_BROWSER}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1366,height:768},timezoneId:'Asia/Shanghai',locale:'zh-CN',reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-15T16:06:00+08:00')});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    const snap=async name=>{if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,name+'.png'),fullPage:true,animations:'disabled'});}};
    async function fit(label,selectors=[]){
      const result=await page.evaluate(selectors=>{
        const root=document.documentElement,shell=document.querySelector('.app-shell').getBoundingClientRect();
        const elements=selectors.map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {selector,top:r.top,bottom:r.bottom,height:r.height,client:e.clientHeight,scroll:e.scrollHeight};});
        return {width:innerWidth,height:innerHeight,rootWidth:root.scrollWidth,rootHeight:root.scrollHeight,ratio:shell.width/shell.height,elements};
      },selectors);
      assert(result.rootWidth<=result.width&&result.rootHeight<=result.height,label+': 页面不应滚动 '+JSON.stringify(result));
      assert(Math.abs(result.ratio-16/9)<.01,label+': 16:9工作区');
      for(const e of result.elements){assert(e.height>0&&e.top>=0&&e.bottom<=result.height+1,label+': 可见区域 '+JSON.stringify(e));assert(e.scroll<=e.client+3,label+': 内容被裁切 '+JSON.stringify(e));}
      console.log('布局通过',label,result.width+'×'+result.height);
    }
    await fit('初始首页',['#planForm','#homeMapPanel']);
    assert.equal(await page.locator('#homeMap .overview-room').count(),46);assert.equal(await page.locator('#homeMap .room-text').count(),0);
    await page.getByRole('button',{name:'我的课表',exact:true}).click();
    await page.locator('#timetableFile').setInputFiles({name:'测试课表.html',mimeType:'text/html',buffer:Buffer.from(JSON.stringify(raw))});
    await page.locator('#timetableImportDialog').waitFor({state:'visible'});
    await fit('导入预览',['#timetableImportDialog']);
    await page.getByRole('button',{name:'导入这份课表',exact:true}).click();
    assert.equal(await page.locator('.schedule-course').count(),6);await fit('课程分页',['#timetableContent','#scheduleList','.schedule-course']);
    await page.getByRole('button',{name:'下一页课程',exact:true}).click();assert.equal(await page.locator('.schedule-course').count(),2);
    await page.getByRole('button',{name:'学期与作息',exact:true}).click();await fit('作息弹窗',['#scheduleSettingsDialog']);await page.getByRole('button',{name:'关闭设置',exact:true}).click();
    await page.locator('#brandHome').click();
    assert.match(await page.locator('#nextCourseTitle').innerText(),/晚间课程/);assert.match(await page.locator('#courseOriginHint').innerText(),/B410.*16:05刚下课/);
    await page.locator('#startSelect').selectOption('A101');assert.match(await page.locator('#courseOriginHint').innerText(),/A101.*手动/);
    await page.locator('#autoCourseOrigin').click();assert.match(await page.locator('#courseOriginHint').innerText(),/B410/);
    await page.locator('#nextCourseGo').click();assert.equal(await page.locator('#startSelect').inputValue(),'B410');assert.equal(await page.locator('#endSelect').inputValue(),'A211');
    assert.match(await page.locator('.course-route-context').innerText(),/课表推测.*16:05/);
    assert.equal(await page.evaluate(()=>manualOrigin),null);
    await page.getByRole('button',{name:'修改路线',exact:true}).click();
    await page.clock.setSystemTime(new Date('2026-10-15T15:30:00+08:00'));await page.evaluate(()=>window.dispatchEvent(new Event('pagechange')));
    assert.match(await page.locator('#nextCourseTitle').innerText(),/晚间课程/);assert.match(await page.locator('#courseOriginHint').innerText(),/B410.*下课后出发/);
    await page.clock.setSystemTime(new Date('2026-10-15T19:20:00+08:00'));await page.evaluate(()=>window.dispatchEvent(new Event('pagechange')));
    assert.match(await page.locator('#courseOriginHint').innerText(),/超过45分钟/);
    await page.locator('#nextCourseGo').click();assert.equal(await page.locator('#courseOriginSelect').inputValue(),'');
    await page.locator('#courseOriginSelect').selectOption('ENTRANCE_2');await page.getByRole('button',{name:'从这里出发',exact:true}).click();
    assert.equal(await page.locator('#startSelect').inputValue(),'ENTRANCE_2');
    await page.getByRole('button',{name:'修改路线',exact:true}).click();
    await page.locator('#homeMap [data-entrance="ENTRANCE_3"]').click();assert.match(await page.locator('#courseOriginHint').innerText(),/入口3.*手动/);
    await page.locator('#autoCourseOrigin').click();
    await page.clock.setSystemTime(new Date('2026-10-15T16:06:00+08:00'));await page.evaluate(()=>window.dispatchEvent(new Event('pagechange')));
    // 鼠标围绕地图中心缩放，页面不移动；到边界后保持合法视图。
    const rect=await page.locator('#homeMap').boundingBox(),cursor={x:Math.round(rect.x+rect.width*.6),y:Math.round(rect.y+rect.height*.45)};await page.mouse.move(cursor.x,cursor.y);
    const world=()=>page.locator('#homeMap').evaluate((e,p)=>{const q=new DOMPoint(p.x,p.y).matrixTransform(e.getScreenCTM().inverse());return {x:q.x,y:q.y};},cursor);
    const anchor=await world();
    const before=await page.locator('#homeMap').getAttribute('viewBox');await page.mouse.wheel(0,-300);
    await page.waitForFunction(()=>mapStates.home.zoom>1);
    const zoomed=await page.locator('#homeMap').getAttribute('viewBox');assert.notEqual(zoomed,before);
    const anchored=await world();assert(Math.hypot(anchor.x-anchored.x,anchor.y-anchored.y)<.1,'缩放保持鼠标下的地图位置 '+JSON.stringify({anchor,anchored,cursor,before,zoomed}));
    assert.equal(await page.evaluate(()=>scrollY),0);
    await page.mouse.wheel(0,-10000);await page.waitForFunction(()=>mapStates.home.zoom===3);
    await page.mouse.wheel(0,10000);await page.waitForFunction(()=>mapStates.home.zoom===1);
    await page.locator('#endSelect').selectOption('A309');
    const pin=await page.evaluate(()=>{const target=byId.get('A309'),c=[...document.querySelectorAll('#homeMap .route-layer circle')].find(e=>Math.abs(Number(e.getAttribute('cx'))-target.x)<.01&&Math.abs(Number(e.getAttribute('cy'))-target.y)<.01);return !!c;});assert(pin,'高层目标按真实房间坐标标记');
    await page.locator('#homeMap [data-block="C"]').click();assert.equal(await page.evaluate(()=>mapStates.home.floor),'1F');
    await page.locator('#homeMapPanel [data-floor="outdoor"]').click();
    for(const [width,height] of [[1280,720],[1366,768],[1920,1080]]){
      await page.setViewportSize({width,height});await fit('课程首页',['#planForm','#homeMapPanel','.schedule-home']);
      if(width===1366)await snap('workbench-home');
      await page.locator('#startSelect').selectOption('C101');await page.locator('#endSelect').selectOption('C524');await page.getByRole('button',{name:'开始规划',exact:true}).click();
      assert.equal(await page.locator('#routeStepList li').count(),5);
      await fit('五层路线',['.route-sidebar','#routeStepList','#routeMapPanel']);
      if(width===1366){await page.locator('#routeMapPanel [data-floor="outdoor"]').click();await page.mouse.move(10,10);await snap('workbench-route');}
      await page.locator('#viewDetails').click();await fit('五层详情',['#timeline','.detail-grid','.arrival']);
      await page.locator('#brandHome').click();
      await page.getByRole('button',{name:'我的课表',exact:true}).click();await page.locator('#scheduleDay').selectOption('0');
      await fit('课程列表',['#timetableContent','#scheduleList','.schedule-course']);
      await page.locator('#brandHome').click();
    }
    await page.setViewportSize({width:390,height:844});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.clock.setSystemTime(new Date('2026-10-15T19:20:00+08:00'));await page.evaluate(()=>window.dispatchEvent(new Event('pagechange')));
    await page.locator('#nextCourseGo').click();await page.locator('#courseOriginSelect').selectOption('ENTRANCE_1');await page.getByRole('button',{name:'从这里出发',exact:true}).click();assert.equal(await page.locator('#startSelect').inputValue(),'ENTRANCE_1');
    assert.deepEqual(errors,[]);console.log('通过：当前/刚下课/长间隔起点、手动优先和一次使用、地图选起点、滚轮1～3倍、室外46间结构和高层标记、桌面四页一屏、手机。');
    await context.close();
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
