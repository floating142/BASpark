# BASpark GNOME 扩展

BASpark GNOME 扩展是 Blue Archive 风格点击与拖尾特效的 GNOME Shell 重建项目，支持 Wayland/X11。

本项目为 [BASpark](https://github.com/DoomVoss/BASpark) 项目的分支，但由于原实现效果不理想，已进行彻底重构，专注于 GNOME Shell 平台的高还原度视觉体验。

## 项目说明

本项目基于 Unity 原始序列化数据（JSON）进行参数映射，而非直接模拟。

本项目仅还原了 Blue Archive 风格的相似视觉与动作效果，暂未实现光照等高级渲染，性能优化也尚未深入，鼠标点击识别采用轮询方式，可能存在响应延迟或资源占用等不足。

欢迎有兴趣的开发者提交 PR 或 Issue 共同完善！

## 目录结构

```text
gnome-extension/
├── install-local.sh           # 一键本地安装/同步/重载脚本
└── baspark-desktop@baspark/   # 主扩展目录
    ├── extension.js           # 扩展主入口，生命周期管理
    ├── prefs.js               # 偏好设置面板（如有）
    ├── modules/               # 功能模块（输入、特效、参数、网格、工具等）
    ├── assets/                # 运行时贴图与网格资源
    ├── schemas/               # GSettings schema 配置
    └── metadata.json          # 扩展元数据

```

## 安装与开发

1. 进入 gnome-extension 目录，执行：

   ```bash
   ./install-local.sh
   ```

   - 自动同步扩展到本地 ~/.local/share/gnome-shell/extensions/
   - 自动编译 schema
   - 自动尝试 enable/disable
   - Wayland 下如遇代码热重载失效，需重新登录

2. 偏好设置项详见 schema，可通过 `gnome-extensions prefs baspark-desktop@baspark` 调整。

3. 推荐每次改动后重复执行 install-local.sh，确保同步与 schema 更新。

## 架构与模块说明

- extension.js：扩展主入口，负责生命周期、信号、定时器、配置加载。
- modules/
  - config-subsystems.js：GSettings 配置读取与参数裁剪，Unity 参数映射。
  - input.js：输入事件采样、去重、拖尾采样、距离累计发射。
  - effects.js：各子系统粒子发射与绘制，拖尾流、渐变采样、贴图遮罩。
  - mesh-profiles.js：OBJ 网格载入与几何信息。
  - core-utils.js：插值、曲线、数值工具。
  - runtime.js：Actor/定时器管理与日志。
- assets/：运行时贴图与网格资源（png/obj）。
- schemas/：GSettings schema（org.gnome.shell.extensions.baspark-desktop.gschema.xml）。
- metadata.json：扩展元数据，支持 GNOME 45~48。

已测试发行版:
- Ubuntu 24.04 LTS (Gnome 46/Wayland)

## 调试与常见问题

- 日志查看：
  ```bash
  journalctl --user -f /usr/bin/gnome-shell
  ```
- 代码热重载失效：Wayland 下需重新登录
- 偏好设置无效：确认 schema 已编译、扩展目录同步
- 性能问题：调整 poll-interval-ms、关闭 distance-emitter、缩小 global-scale

## 参考项目

本项目部分分析和工具参考了以下开源项目，特此致谢：

- [MoeXCOM](https://github.com/LXY1226/MoeXCOM)
- [AssetRipper](https://github.com/AssetRipper/AssetRipper)
- [AssetStudio](https://github.com/aelurum/AssetStudio)
- [Il2CppDumper](https://github.com/Perfare/Il2CppDumper)

本项目大部分编码任务由 chatGPT-5.3-Codex 完成。

## 许可证

本项目遵循 MIT License，详见根目录 LICENSE。

## 免责声明

* 本软件为个人兴趣驱动的同人交流项目，仅用于学习、研究及爱好者之间的技术与视觉效果分享，严禁任何形式的商业用途，包括但不限于倒卖、收费分发或捆绑盈利行为。
* 本程序不包含任何已知的病毒、恶意代码或后门程序，仅用于实现桌面视觉特效功能。但用户应自行判断并承担运行第三方程序所带来的潜在风险。
* 在任何情况下，作者均不对因使用或无法使用本软件所产生的任何直接、间接、附带或衍生损失承担责任，包括但不限于数据丢失、设备损坏、系统异常或业务中断等。
* 本项目所使用的视觉元素、美术风格及资源灵感均源自 Nexon / Yostar 游戏《Blue Archive》。相关版权归原权利人所有，本项目不对相关美术资产主张任何权利。

## copyright Yostar 

该仓库仅供学习和展示用途。开发者不对任何人因使用本项目而可能引发的直接或间接的损失、损害、法律责任或其他后果承担任何责任。用户在使用本项目时需自行承担风险，并确保遵守所有相关法律法规。如果有人使用本项目从事任何未经授权或非法的活动，开发者对此不承担任何责任。用户应对自身的行为负责，并了解使用本项目可能带来的任何风险。

This project is intended solely for educational purposes. The developers are not liable for any direct or indirect loss, damage, legal liability, or other consequences that may arise from the use of this project. Users assume all risks associated with the use of this project and must ensure compliance with all relevant laws and regulations. If anyone uses this project for any unauthorized or illegal activities, the developers bear no responsibility. Users are responsible for their own actions and should understand the risks involved in using this project.

“蔚蓝档案”是上海星啸网络科技有限公司的注册商标，版权所有。

「ブルーアーカイブ」は株式会社Yostarの登録商標です。著作権はすべて保有されています。

"Blue Archive" is a registered trademark of NEXON Korea Corp. & NEXON GAMES Co., Ltd. All rights reserved.

