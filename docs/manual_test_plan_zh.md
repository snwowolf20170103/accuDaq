# DAQ IDE MVP 手动确认测试计划

本计划详细说明了如何一步步手动验证 DAQ IDE 核心模块及其集成流程。

## 验证步骤概览

### 1. Python 引擎 (`daq_core`) 验证
验证核心 Python 组件是否能通过 MQTT 通信并正确处理数据。

#### 步骤 1.1: 启动 MQTT Broker
- **操作**: 确保本地已安装并启动 Mosquitto（或其他 MQTT Broker）。
- **验证**: Broker 监听在 `localhost:1883`。

#### 步骤 1.2: 运行基础演示脚本
- **文件**: `f:\workspaces2025\accuDaq\daq_core\examples\demo_basic.py`
- **操作**: 在终端运行 `python f:\workspaces2025\accuDaq\daq_core\examples\demo_basic.py`集中
- **验证选项**:
  - **选项 2 (推荐初次测试)**: "组件直接测试 (无需 MQTT)"。验证数学运算和 CSV 存储逻辑是否正确。
  - **选项 1**: "基础数据流 (需要 MQTT)"。验证 MockDevice 发布数据、MQTTSubscriber 接收并处理的完整流程。

---

### 2. 可视化编辑器 (`visual-editor`) 验证
验证 UI 交互功能以及配置导出是否正常。

#### 步骤 2.1: 启动编辑器
- **操作**: 在 `f:\workspaces2025\accuDaq\visual-editor` 目录下运行 `npm run dev`。
- **操作**: 浏览器打开 `http://localhost:3000`。

#### 步骤 2.2: UI 功能测试
- **拖拽连接**: 从左侧组件库拖入 MQTT、Math、CSV 节点。
- **建立连线**: 连接节点间的输入输出端口。
- **属性配置**: 选中节点，在右侧面板修改配置（如 MQTT Topic、数学运算符）。

#### 步骤 2.3: 导出项目
- **操作**: 点击工具栏的 "Export Project"（导出项目）按钮。
- **结果**: 浏览器应下载一个 `.daq` (JSON) 文件。

---

### 3. 集成与编译器验证
验证编辑器设计的蓝图是否能成功转化为可运行的代码。

#### 步骤 3.1: 编译器测试
- **文件**: `f:\workspaces2025\accuDaq\daq_core\examples\test_compiler.py`
- **操作**: 执行该脚本，它会编译 `examples/golden_sample.daq`。
- **结果**: 检查是否在 `examples` 文件夹生成了 `golden_sample_generated.py`。

#### 3.2 运行生成代码
- **操作**: 运行由编译器生成的 Python 脚本。
- **结果**: 观察数据流是否按照在编辑器中定义的逻辑运行（MQTT 接收 -> 处理 -> 存储）。

## 常用测试命令汇总
- **启动编辑器**: `cd visual-editor; npm run dev`
- **运行引擎演示**: `python daq_core/examples/demo_basic.py`
- **运行编译器测试**: `python daq_core/examples/test_compiler.py`
