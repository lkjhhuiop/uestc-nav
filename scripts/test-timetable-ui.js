/* 可选的无界面集成测试；需开发环境提供Playwright及浏览器，网页运行不需要。
 * node scripts/test-timetable-ui.js <私人课表路径> [截图目录]
 * TIMETABLE_PLAYWRIGHT可指定Playwright模块，TIMETABLE_BROWSER可指定浏览器可执行文件。
 * 使用全新临时浏览器上下文，不连接现有浏览器，不复制原始课表。
 */
const {chromium}=require(process.env.TIMETABLE_PLAYWRIGHT||'playwright');
const {pathToFileURL}=require('node:url'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const input=process.argv[2]&&path.resolve(process.argv[2]),shots=process.argv[3]&&path.resolve(process.argv[3]);
if(!input)throw new Error('请传入本地测试课表路径。');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.TIMETABLE_BROWSER?{executablePath:process.env.TIMETABLE_BROWSER}:{})});
  try{
    const context=await browser.newContext({viewport:{width:1360,height:1000},timezoneId:'Asia/Shanghai',locale:'zh-CN',reducedMotion:'reduce'});
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-15T14:53:00+08:00')});
    await page.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await page.getByRole('button',{name:'我的课表',exact:true}).click();
    await page.locator('#timetableFile').setInputFiles(input);
    await page.locator('#timetableImportDialog').waitFor({state:'visible'});
    assert.match(await page.locator('#importScheduleNotes').innerText(),/96次上课/);
    await page.getByRole('button',{name:'导入这份课表',exact:true}).click();
    assert.equal(await page.locator('#scheduleWeek').inputValue(),'7');
    assert.match(await page.locator('#timetableSummary').innerText(),/13门课程.*7门.*96次上课.*7间教室/);
    assert.equal(await page.locator('.schedule-course').count(),6);
    await page.getByRole('button',{name:'下一页课程',exact:true}).click();assert.equal(await page.locator('.schedule-course').count(),2);
    await page.locator('#scheduleWeek').selectOption('5');
    assert.equal(await page.locator('.schedule-course').filter({hasText:'iArt'}).count(),0);
    await page.locator('#scheduleWeek').selectOption('7');
    await page.locator('#scheduleDay').selectOption('4');
    const iart=page.locator('.schedule-course').filter({hasText:'iArt'});
    assert.equal(await iart.getAttribute('data-status'),'ongoing');assert.match(await iart.innerText(),/14:30–16:05/);
    await iart.getByRole('button',{name:'去上课 ↗',exact:true}).click();
    await page.locator('#courseOriginDialog').waitFor({state:'visible'});
    assert.equal(await page.locator('#courseOriginSelect').inputValue(),'','默认入口4不算本次起点');
    await page.locator('#courseOriginSelect').selectOption('ENTRANCE_4');
    await page.getByRole('button',{name:'从这里出发',exact:true}).click();
    assert.equal(await page.locator('#routePage').isVisible(),true);assert.equal(await page.locator('#endSelect').inputValue(),'C204');
    assert.match(await page.locator('.course-route-context').innerText(),/第7周 周四.*iArt/);
    await page.locator('.course-route-back').click();
    await page.locator('.schedule-course').filter({hasText:'iArt'}).getByRole('button',{name:'从B410出发',exact:true}).click();
    assert.equal(await page.locator('#startSelect').inputValue(),'B410');assert.equal(await page.locator('#endSelect').inputValue(),'C204');
    await page.getByRole('button',{name:'修改路线',exact:true}).click();
    await page.locator('#endSelect').selectOption('A101');await page.getByRole('button',{name:'开始规划',exact:true}).click();
    assert.equal(await page.locator('.course-route-context').isVisible(),false,'手动规划清除课程上下文');
    await page.getByRole('button',{name:'我的课表',exact:true}).click();
    await page.getByRole('button',{name:'学期与作息',exact:true}).click();
    assert.equal(await page.locator('#semesterStart').inputValue(),'2026-08-31');assert.equal(await page.locator('#period-12-1').inputValue(),'');
    await page.locator('#semesterStart').fill('2026-09-01');await page.getByRole('button',{name:'保存设置',exact:true}).click();
    assert.match(await page.locator('#scheduleSettingsError').innerText(),/周一/);
    await page.locator('#semesterStart').fill('2026-08-31');await page.getByRole('button',{name:'保存设置',exact:true}).click();
    await page.getByRole('button',{name:'关闭设置',exact:true}).click();
    await page.reload();assert.match(await page.locator('#nextCourseTitle').innerText(),/iArt/);
    await page.getByRole('button',{name:'我的课表',exact:true}).click();
    await page.locator('#timetableFile').setInputFiles({name:'bad.html',mimeType:'text/html',buffer:Buffer.from('<script>window.INJECTED=true</script>')});
    await page.waitForFunction(()=>document.getElementById('timetableNotice').dataset.kind==='error');
    assert.match(await page.locator('#timetableSummary').innerText(),/13门课程/);assert.equal(await page.evaluate(()=>window.INJECTED),undefined);
    await page.locator('#schedulePinxue').uncheck();
    const foreign=page.locator('.schedule-course').filter({hasText:'立人楼B210'});
    assert((await foreign.count())>0);assert.equal(await foreign.getByRole('button').count(),0);
    await page.locator('#schedulePinxue').check();await page.locator('#scheduleDay').selectOption('4');
    // 异常文件提示保留在交互断言里，截图只展示正常课程视图。
    await page.locator('#timetableFile').setInputFiles(input);await page.locator('#timetableImportDialog').waitFor({state:'visible'});
    await page.getByRole('button',{name:'取消导入',exact:true}).click();assert.match(await page.locator('#timetableSummary').innerText(),/96次上课/);
    await page.locator('#timetableNotice').evaluate(e=>e.hidden=true);
    if(shots){fs.mkdirSync(shots,{recursive:true});await page.screenshot({path:path.join(shots,'timetable-desktop.png'),fullPage:true,animations:'disabled'});}
    for(const width of [390,320]){
      await page.setViewportSize({width,height:844});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth),`${width}px手机布局不应横向溢出`);
      if(shots&&width===390)await page.screenshot({path:path.join(shots,'timetable-mobile.png'),fullPage:true,animations:'disabled'});
    }
    await page.locator('#themeToggle').click();assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
    if(shots)await page.screenshot({path:path.join(shots,'timetable-dark-mobile.png'),fullPage:true,animations:'disabled'});
    await page.locator('#timetableFile').setInputFiles(input);await page.locator('#timetableImportDialog').waitFor({state:'visible'});
    await page.getByRole('button',{name:'替换当前课表',exact:true}).click();assert.match(await page.locator('#timetableSummary').innerText(),/96次上课/);
    await page.getByRole('button',{name:'清除课表',exact:true}).click();assert.equal(await page.locator('#timetableEmpty').isVisible(),true);
    await page.reload();assert.match(await page.locator('#nextCourseTitle').innerText(),/带着课表/);
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('uestc-nav-timetable-v1')).source),null);
    assert.deepEqual(errors,[]);
    console.log('通过：file://导入/取消/替换/清除、周日筛选、C204导航、B410→C204、手动规划、设置、持久化、异常文件、320/390px布局、深色模式。');
    await context.close();
    const blocked=await browser.newContext({viewport:{width:1360,height:1000},reducedMotion:'reduce'});
    await blocked.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    const privatePage=await blocked.newPage(),privateErrors=[];privatePage.on('pageerror',e=>privateErrors.push(e.message));
    await privatePage.goto(pathToFileURL(path.resolve(__dirname,'../index.html')).href);
    await privatePage.getByRole('button',{name:'我的课表',exact:true}).click();
    await privatePage.locator('#timetableFile').setInputFiles(input);await privatePage.locator('#timetableImportDialog').waitFor({state:'visible'});
    await privatePage.getByRole('button',{name:'导入这份课表',exact:true}).click();
    assert.match(await privatePage.locator('#timetableNotice').innerText(),/未能保存/);
    assert.match(await privatePage.locator('#timetableSummary').innerText(),/13门课程/);assert.deepEqual(privateErrors,[]);
    await blocked.close();console.log('通过：本地存储被禁用时课表仍可在当前会话使用。');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
