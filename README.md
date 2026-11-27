# Google 地区助手 (Google Region Helper)

一款轻量的 Chrome / Edge Manifest V3 扩展程序，用于快速查看多账号当前的 Google 账号关联地区，并在 `policies.google.com/country-association-form` 页面一键填充美国免税州或全球任意国家/地区（绝不自动提交，始终由用户核对后手动提交）。

---

## 功能特性

- **多账号识别与地区概览**
  - 自动探测当前浏览器已登录的 Google 多账号槽位（`/u/0` 到 `/u/9`），展示邮箱与当前关联地区，支持 5 分钟本地缓存与手动刷新。
  - 按国家主名分配 Google Material 3 柔和 5 色胶囊 Tag，中立展示各账号当前地区并支持一键直达对应账号修改页。
- **双端一致操作体验（Popup + 页内悬浮面板）**
  - **Popup 弹窗**：支持选择目标 Google 账号、快捷选区、全球国家/州搜索及「打开并自动填充 / 仅打开页面」。
  - **页面右侧悬浮面板**：打开 Google 地区修改页后自动注入右侧辅助卡片（支持折叠/展开、`z-index: 1` 让位 Google 顶部账号切换浮层）。
- **快捷选区 + 全量搜索**
  - 内置 **5 个美国免税州**（俄勒冈 `OR`、特拉华 `DE`、蒙大拿 `MT`、新罕布什尔 `NH`、阿拉斯加 `AK`）与 **6 个常用国家**（日本 `JP`、土耳其 `TR`、阿根廷 `AR`、尼日利亚 `NG`、印度 `IN`、新加坡 `SG`）一键直填。
  - 支持全部 **254 个国家/地区** 与 **51 个美国州/子地区** 的中英文名称及代码实时搜索过滤（列表顶部实时统计匹配数与总数）。
- **完整键盘流导航**
  - Popup 账号下拉及双方国家/州搜索下拉均支持 `↑` / `↓` 移动高亮、`Enter` 确认、`Esc` 收起，并与鼠标悬停联动。
- **智能关联原因兜底（绝不自动提交）**
  - 模拟真实点击完成地区下拉框选择后，仅当表单**尚未勾选任何原因**时自动兜底勾选「我在过去一年内搬到了这里」；若你已在网页手动勾选其他原因则保持原样不覆盖。
  - **不包含任何自动提交逻辑**，所有填充后均需人工确认再点击网页「提交」按钮。
- **Google Material 3（GM3）亮/暗双模式**
  - 跟随系统/浏览器 `prefers-color-scheme` 自动切换浅色（`#F0F4F9` / `#0B57D0`）与深色（`#131314` / `#A8C7FA`）主题，与 `policies.google.com` 原生暗色界面保持一致。

---

## 项目架构

```text
google-region-helper/
├── manifest.json       # MV3 扩展清单（v1.5.0，声明 storage / tabs 与内容脚本注入规则）
├── popup.html          # Popup 主界面结构
├── popup-theme.css     # GM3 亮/暗双模式 CSS 变量与国家 Tag 胶囊色板
├── popup.css           # Popup 布局、Tonal 控件、向上展开搜索列表等样式
├── popup.js            # Popup 状态管理、配置持久化、预填跳转与消息触发
├── accounts.js         # Google 多账号槽位探测（/u/0..9）与自定义账号下拉组件
├── presets.js          # 美国免税州与常用国家快捷预设（Popup 与面板共用）
├── regions-data.js     # 内置 254 个国家/地区与 51 个美国子地区字典
├── region-tags.js      # 国家色板映射、大小写代码格式化与摘要拼接工具
├── dropdown-nav.js     # 通用下拉菜单键盘导航控制器（↑/↓/Enter/Esc + 鼠标联动）
├── form-filler.js      # Google 表单 DOM 自动化（选择地区下拉框 + 原因空值兜底）
├── content.js          # 页面右侧悬浮面板构建、预填任务执行与消息监听
├── content.css         # 页面浮窗 GM3 亮/暗双模式与对齐样式
├── icons/              # 扩展图标（16 / 48 / 128 px）
└── README.md           # 项目说明文档
```

### 数据流与模块职责

```text
[Popup 操作]
  popup.js ──(1) 写入 pending task──▶ chrome.storage.local ──▶ content.js (新开/跳转页面后执行)
           ──(2) 若已在目标页──────▶ chrome.tabs.sendMessage("GRH_FILL_FORM") ──▶ content.js

[页内填充]
  content.js ──▶ form-filler.js
                  ├── selectOptionInCombobox(0, country)   # 打开并点击国家选项
                  ├── selectOptionInCombobox(1, state)     # 若有子地区，等待 DOM 重建后选择州
                  └── ensureDefaultReasonIfUnchecked()     # 仅在未勾原因时兜底勾索引 1
```

---

## 本地安装与使用

1. 克隆或下载本项目到本地目录：
   ```bash
   git clone https://github.com/fxzer/google-region-helper.git
   ```
2. 打开 Chrome 或 Edge 浏览器，访问 `chrome://extensions/`（Edge 为 `edge://extensions/`）。
3. 打开右上角 **「开发者模式」**。
4. 点击 **「加载已解压的扩展程序」**，选择项目根目录 `google-region-helper`。
5. 使用方式：
   - **从任意页面直达**：点击浏览器工具栏的「Google 地区助手」图标，选择账号与目标地区，点击 **「打开并自动填充」**。
   - **在修改页内切换**：打开 `https://policies.google.com/country-association-form` 后，直接使用右侧「Google 地区助手」浮窗一键切换地区，核对无误后手动点击页面 **「提交」**。

---

## 权限与隐私说明

- `storage`：仅用于在本地 `chrome.storage.local` 缓存近期选择配置、短期预填任务及 5 分钟账号地区查询缓存。
- `tabs`：用于查询当前激活标签页或打开/跳转到 Google 地区修改页。
- `https://policies.google.com/*`：用于在本地浏览器凭当前登录态识别多账号所属地区，并向地区修改表单页注入辅助面板。
- 所有数据均在本地浏览器运行，无任何第三方服务器上传或遥测请求。
