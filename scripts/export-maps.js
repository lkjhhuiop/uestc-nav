/* 从运行时共享几何导出独立楼层SVG；网站本身不依赖Node.js。 */
const fs=require('fs');
const path=require('path');
const vm=require('vm');

const root=path.resolve(__dirname,'..');
const context=vm.createContext({console,Math,Map,Set});
for(const name of ['data.js','map.js']) {
  const file=path.join(root,'js',name);
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const render=vm.runInContext('mapBaseMarkup',context);
for(const floor of ['outdoor','1F','2F','3F','4F','5F']) {
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 800" class="nav-map" font-family="Microsoft YaHei, sans-serif">${render(floor)}</svg>`;
  const filename=floor==='outdoor'?'outdoor.svg':`floor${floor[0]}.svg`;
  fs.writeFileSync(path.join(root,'maps',filename),svg,'utf8');
}
console.log('已导出室外与1F～5F楼层SVG');
