# Auroraqua-UI 本地资源

作者：micromimo
来源：https://github.com/micromimo/Auroraqua-UI
固定版本：087bffc51b3c83b6214c2b3cec5c9899aaed6b2e
许可证：Mozilla Public License 2.0，全文见同目录 LICENSE。

- upstream.css：该版本 src/index.css 原文件，未修改，不直接加载。
- materials.css：机械提取上述文件中 liquid-glass、glass-button、input-glass 三组的14条顶层规则。声明、数值、悬停/按压效果与扫光动效保持原样。去除了其余页面样式、Tailwind 指令和字体引用。
- TabButton.jsx：该版本 src/components/ui/TabButton.jsx 原文件，作为对应适配的源码留存，不执行。
- ../../css/glass.css：本项目接入适配；其中标签选中材质来自 TabButton.jsx，转为普通CSS，并将粉色色相改为蓝色。该派生文件亦按 MPL-2.0 提供。

网站通过本地 materials.css 使用实际 Auroraqua 材质。无需 React、Tailwind、远程字体或构建工具。深色文字、按钮尺寸、页面布局和减少动态/透明效果设置由接入层适配。
