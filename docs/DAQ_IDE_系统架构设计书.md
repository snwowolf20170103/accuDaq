# DAQ IDE 系统架构设计书 (SAD)

> **文档性质**: 系统架构设计 (System Architecture Design)
> **角色视角**: IT 架构师 / 架构专家 (IT Architect / Architectural Expert)
> **依据**: 基于 awesome-chatgpt-prompts 的 IT Architect 角色 & 全版需求文档
> **日期**: 2026-01-09

---

## 1. 架构概览 (Architecture Overview)

本系统采用 **微内核插件化架构 (Microkernel Plugin Architecture)**，结合 **前后端分离 (Frontend-Backend Separation)** 模式。
核心设计理念是 **解耦**：
1.  **UI 与 逻辑解耦**: 编辑器 (VSCode) 仅作为配置界面，运行时引擎 (Core Engine) 可独立运行。
2.  **业务与 驱动解耦**: 核心引擎通过 HAL (硬件抽象层) 与具体设备交互，支持动态加载驱动插件。

### 1.1 系统上下文图 (System Context)

```mermaid
graph TD
    User[用户/开发者] -->|操作| VSCode IDE[VSCode 插件 (UI层)]
    VSCode IDE -- IPC/JSON-RPC --> DAQ Core[DAQ 核心引擎 (Runtime)]
    DAQ Core -- HAL Interface --> Drivers[设备驱动插件]
    Drivers -- Modbus/TCP/Serial --> Hardware[物理设备/传感器]
    DAQ Core -- SQL --> DB[(时序/关系数据库)]
    DAQ Core --> WebServer[内嵌 Web 服务器] --> RemoteUser[Web 监控端]
```

## 2. 技术栈选型 (Technology Stack)

作为架构师，基于健壮性、跨平台和性能需求，选定以下技术栈：

*   **IDE 宿主环境**: **VSCode Extension API** (TypeScript)
    *   *理由*: 拥有庞大的生态，极佳的编辑器体验，天然跨平台。
*   **前端交互层 (WebView)**: **React** + **React Flow** (流程图) + **WebGL/Canvas** (波形绘制)。
    *   *理由*: React 生态成熟；WebGL 解决高频数据渲染性能问题。
*   **核心逻辑引擎 (Backend)**: **Python** (初期/快速迭代) -> **Rust/C++** (后期/高性能)。
    *   *理由*: 初期 Python 拥有 `pymodbus`, `pyserial`, `pandas` 等丰富库，开发效率极高。后期核心计算模块可用 Rust 重写并通过 PyO3 调用。
    *   *进程间通信 (IPC)*: **JSON-RPC over Stdio/WebSockets**。
*   **嵌入式/模拟器层**: **WebAssembly (WASM)** + **LVGL**。
    *   *理由*: 允许在浏览器/IDE中直接运行嵌入式 C 代码编译的 UI，实现“所见即所得”。

## 3. 核心子系统设计 (Core Subsystems)

### 3.1 DAQ-IR (中间表示层)

这是系统的灵魂。所有的可视化流程图和代码都映射到同一个 IR 数据结构。

```json
{
  "version": "1.0",
  "nodes": [
    { "id": "sensor_01", "type": "driver.modbus", "config": { "address": 1 } },
    { "id": "filter_avg", "type": "algo.average", "config": { "window": 10 } },
    { "id": "chart_view", "type": "ui.trend_chart", "config": { "color": "red" } }
  ],
  "links": [
    { "source": "sensor_01.output", "target": "filter_avg.input" },
    { "source": "filter_avg.output", "target": "chart_view.data" }
  ]
}
```
*   **设计约束**: 任何对 UI 的拖拽操作，本质上都是对这个 JSON 对象的增删改查。

### 3.2 进程间通信 (IPC) 架构

为了解决 VSCode (Node.js) 无法直接高效控制硬件的问题，我们设计了双层架构：

1.  **Extension Host (Node.js)**: 负责管理 UI 状态、文件读写、Git 操作。
2.  **DAQ Engine (Python/C++)**: 作为一个独立子进程启动。
    *   **控制流**: 使用 `stdin/stdout` 传输 JSON-RPC 命令 (如 `StartTask`, `StopTask`)。
    *   **数据流**: 使用 **ZeroMQ** 或 **Localhost WebSocket** 推送高频采集数据到前端，避开 Node.js 的性能瓶颈，直接送达 WebView。

### 3.3 插件加载机制 (Plugin System)

系统必须支持第三方扩展。
*   **驱动插件**: 实现标准 `IDevice` 接口 (`connect`, `read`, `write`, `disconnect`)。
*   **UI 插件**: 提供 JSON 描述文件 + React 组件包。
*   **架构决策**: 采用 **IoC (控制反转)** 容器，在引擎启动时扫描 `/plugins` 目录动态注册组件。

## 4. 数据架构 (Data Architecture)

### 4.1 实时数据流
*   采用 **发布-订阅 (Pub-Sub)** 模式。
*   设备采集线程 -> `DataBus` -> 1. 计算模块 -> 2. UI 订阅者 -> 3. 存储队列。

### 4.2 存储方案
*   **配置数据**: YAML/JSON 文件 (易于 Git 版本控制)。
*   **运行时时序数据**:
    *   *轻量级*: SQLite (单文件，部署简单)。
    *   *企业级*: InfluxDB / TimescaleDB (支持海量数据写入)。

## 5. 安全性与合规性 (Security & Compliance)

*   **硬件隔离**: 驱动程序运行在受控的 `try-catch` 块或独立线程中，防止硬件故障导致主程序崩溃。
*   **数据完整性**: 采集数据落盘时增加 CRC 校验和时间戳，确保数据可溯源。
*   **网络安全**: 若开启 Web 远程监控，强制要求 **JWT 身份验证** 和 `HTTPS` 加密。

## 6. 可扩展性与性能 (Scalability & Performance)

*   **水平扩展**: 支持通过网络互联多个 DAQ 节点（分布式采集）。
*   **性能目标**:
    *   系统启动时间 < 5秒。
    *   单节点支持至少 500 个 Tags 的 100ms 级并发采集。
    *   UI 渲染延迟 < 50ms。

---

**修订记录**:
*   v1.0 - 初始架构草案 - 2026-01-09
