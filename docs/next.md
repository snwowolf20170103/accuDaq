# accuDaq 第二阶段开发规划

## 文档说明

本文档基于《MVP需求文档v2.0》，对比现有系统实现情况，制定第二阶段开发计划。

**规划周期**: 2-3个月
**优先级标记**: 🔴 高优先级 | 🟡 中优先级 | 🟢 低优先级
**文档版本**: 1.0
**更新日期**: 2026-01-20

---

## 一、现有实现评估

### ✅ 已完成功能（第一阶段成果）

| 模块 | 实现状态 | 完成度 | 说明 |
|------|---------|-------|------|
| **可视化编辑器** | ✅ 完成 | 90% | React + @xyflow/react，支持组件拖拽和连线 |
| **编译器架构** | ✅ 完成 | 95% | Parser → Topology → CodeGen → Compiler 四阶段完整 |
| **组件注册表** | ✅ 完成 | 100% | 装饰器注册，动态实例化机制完善 |
| **端口系统** | ✅ 完成 | 90% | 类型检查，数据流转，前后端对应 |
| **运行引擎** | ✅ 完成 | 85% | DAQEngine 主循环，组件生命周期管理 |
| **MQTT通信** | ✅ 完成 | 90% | 前后端实时数据传输 |
| **Dashboard** | ✅ 完成 | 60% | 固定布局，LineChart 和 Gauge 组件 |
| **数据存储** | ✅ 完成 | 80% | CSV存储组件，支持时间戳和追加模式 |
| **项目管理** | ⚠️ 部分 | 40% | 支持保存/加载，但仅用localStorage，无.daq文件管理 |

### ❌ MVP必需但缺失的功能

| MVP需求 | 当前状态 | 差距分析 |
|---------|---------|---------|
| **VSCode扩展集成** | ❌ 未实现 | 仅有空框架，未集成可视化编辑器 |
| **双模式切换** | ❌ 未实现 | 无代码编辑模式，无模式选择 |
| **Modbus TCP** | ❌ 未实现 | 仅有Mock Device和MQTT，缺少工业协议 |
| **拖拽式Dashboard设计器** | ❌ 未实现 | 当前Dashboard是固定布局，不可定制 |
| **设备管理面板** | ❌ 未实现 | 无设备列表、连接状态管理 |
| **项目模板** | ❌ 未实现 | 无"空白项目"和"基础数据采集"模板 |
| **AI辅助** | ❌ 未实现 | 无Chat窗口，无LLM集成 |
| **调试功能** | ❌ 未实现 | 无高亮执行，无数据流可视化 |

### 🎯 核心组件完成度对比

#### 已实现组件（6个）
- ✅ Mock Device（虚拟设备）
- ✅ MQTT Subscribe（MQTT订阅）
- ✅ MQTT Publish（MQTT发布）
- ✅ Math Operation（数学运算）
- ✅ Compare（比较逻辑）
- ✅ CSV Storage（CSV存储）

#### MVP要求但缺失的组件（5个）
- ❌ Modbus Reader（Modbus读取）
- ❌ Debug Print（调试打印）
- ❌ Global Variable（全局变量）
- ❌ Threshold Alarm（阈值报警）
- ❌ While Loop（循环控制）

---

## 二、第二阶段开发目标

### 核心目标：实现MVP验收标准

**验收场景**：用户能够在10分钟内完成以下操作：
1. 新建一个"温度监控"项目
2. 在设备管理中添加一个"虚拟温度传感器"
3. 在可视化模式下，拖入"读取"节点和"大于"判断节点（温度>30）
4. 在UI设计器中拖入一个"波形图"和一个"报警灯"
5. 点击运行，看到波形图在动，当虚拟温度超过30时，报警灯变红
6. 停止运行，能在文件夹中找到保存的CSV数据

### 技术债务清理
- 替换localStorage为文件系统（.daq文件）
- 前端TypeScript严格类型检查
- 完善错误处理和日志系统
- 添加单元测试框架

---

## 三、功能开发优先级与计划

### 阶段 2.1：VSCode集成与项目管理（4周）🔴

#### Week 1-2：VSCode扩展核心功能
**目标**：将独立的Web应用集成到VSCode

| 任务 | 工作量 | 负责模块 | 关键产出 |
|------|-------|---------|---------|
| Webview集成 | 3天 | vscode-extension | 在VSCode中嵌入React编辑器 |
| 文件系统桥接 | 2天 | vscode-extension | VSCode API ↔ 前端文件操作 |
| 命令注册 | 2天 | vscode-extension | `accudaq.newProject`, `accudaq.run` 等命令 |
| 侧边栏面板 | 2天 | vscode-extension | 组件库、设备管理侧边栏 |
| 状态栏集成 | 1天 | vscode-extension | 显示运行状态、模式切换 |

**技术方案**：
```typescript
// extension.ts 核心结构
export function activate(context: vscode.ExtensionContext) {
    // 1. 注册命令
    context.subscriptions.push(
        vscode.commands.registerCommand('accudaq.newProject', createProject),
        vscode.commands.registerCommand('accudaq.openEditor', openVisualEditor),
        vscode.commands.registerCommand('accudaq.compile', compileProject),
        vscode.commands.registerCommand('accudaq.run', runProject)
    )

    // 2. 创建Webview Provider
    const editorProvider = new DAQEditorProvider(context.extensionUri)
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('accudaq.editor', editorProvider)
    )
}
```

#### Week 3-4：项目文件系统
**目标**：实现.daq项目文件管理

| 任务 | 工作量 | 关键产出 |
|------|-------|---------|
| .daq文件格式升级 | 2天 | 支持meta/devices/logic/ui完整结构 |
| 项目模板系统 | 2天 | 空白项目、温度监控模板 |
| 文件监听与自动保存 | 1天 | 文件变更监听，自动保存机制 |
| 项目导入/导出 | 2天 | 支持.daq文件压缩包（含资源） |
| 最近项目列表 | 1天 | 快速打开面板 |

**项目目录结构**：
```
temperature-monitor.daq/
├── project.json          # 项目配置（.daq文件）
├── generated/            # 编译生成的代码
│   └── run_app.py
├── data/                 # 数据存储
│   └── output.csv
└── assets/               # 资源文件
    └── dashboard-config.json
```

---

### 阶段 2.2：Modbus支持与设备管理（3周）🔴

#### Week 5-6：Modbus TCP组件
**目标**：实现工业现场最常用的通信协议

**后端组件实现** (`components/modbus_client.py`):
```python
@ComponentRegistry.register
class ModbusClientComponent(ComponentBase):
    component_name = "ModbusClient"
    component_type = ComponentType.DEVICE

    def _setup_ports(self):
        self.add_output_port("value", PortType.NUMBER)
        self.add_output_port("status", PortType.BOOLEAN)

    def _on_configure(self):
        self.host = self.config.get('host', '192.168.1.10')
        self.port = self.config.get('port', 502)
        self.register = self.config.get('register', 0)
        self.client = ModbusTcpClient(self.host, port=self.port)

    def start(self):
        super().start()
        self.client.connect()

    def process(self):
        if self.client.connected:
            result = self.client.read_holding_registers(self.register, 1)
            if not result.isError():
                self.set_output("value", result.registers[0])
                self.set_output("status", True)
```

**前端组件定义** (`componentLibrary.ts`):
```typescript
{
    type: 'modbus_tcp',
    name: 'Modbus TCP',
    category: 'device',
    icon: '🏭',
    description: 'Read data from Modbus TCP device',
    outputs: [
        { id: 'value', name: 'Value', type: 'number' },
        { id: 'status', name: 'Status', type: 'boolean' }
    ],
    defaultProperties: {
        host: '192.168.1.10',
        port: 502,
        register: 0,
        slave_id: 1,
        interval_ms: 1000
    },
    propertySchema: [...]
}
```

| 任务 | 工作量 | 依赖库 |
|------|-------|-------|
| pymodbus集成 | 2天 | `pip install pymodbus` |
| Modbus客户端组件 | 2天 | pymodbus.client |
| 寄存器读取功能 | 1天 | read_holding_registers |
| 错误处理与重连 | 1天 | 超时、断线重连逻辑 |
| 前端配置界面 | 2天 | IP、端口、寄存器地址配置 |

#### Week 7：设备管理面板
**目标**：统一管理所有设备连接

**功能清单**：
- 设备列表显示（虚拟设备、Modbus设备、MQTT设备）
- 连接状态指示（🟢 已连接 | 🔴 断开 | 🟡 连接中）
- 一键连接/断开操作
- Raw Data Viewer（实时数据监视窗口）
- 设备配置快速编辑

**界面设计**：
```typescript
// DevicePanel.tsx
const DevicePanel = () => {
    const devices = [
        { id: '1', name: 'Mock Sensor', type: 'mock', status: 'connected' },
        { id: '2', name: 'Modbus PLC', type: 'modbus', status: 'disconnected' },
    ]

    return (
        <div className="device-panel">
            <h3>设备管理</h3>
            <button onClick={addDevice}>+ 添加设备</button>
            {devices.map(device => (
                <DeviceCard key={device.id} device={device} />
            ))}
        </div>
    )
}
```

---

### 阶段 2.3：补充核心组件（2周）🟡

#### Week 8：逻辑与调试组件

| 组件名称 | 类型 | 功能描述 | 工作量 |
|---------|------|---------|-------|
| Debug Print | Sink | 打印数据到控制台 | 1天 |
| Global Variable | Logic | 全局变量读写 | 1天 |
| Threshold Alarm | Logic | 阈值判断并触发报警 | 1天 |
| Data Logger | Sink | 带时间戳的数据日志 | 1天 |
| Signal Filter | Process | 简单滤波（移动平均） | 1天 |

#### Week 9：控制与流程组件

| 组件名称 | 类型 | 功能描述 | 工作量 |
|---------|------|---------|-------|
| While Loop | Control | 周期性循环执行 | 2天 |
| Conditional | Control | if-else条件分支 | 1天 |
| Timer | Control | 定时触发 | 1天 |
| Counter | Logic | 计数器（累加/递减） | 1天 |

**示例：Debug Print组件**
```python
@ComponentRegistry.register
class DebugPrintComponent(ComponentBase):
    component_name = "DebugPrint"

    def _setup_ports(self):
        self.add_input_port("data", PortType.ANY)

    def process(self):
        data = self.get_input("data")
        if data is not None:
            print(f"[DEBUG] {self.instance_id}: {data}")
            logger.info(f"Debug output: {data}")
```

---

### 阶段 2.4：拖拽式Dashboard设计器（3周）🔴

#### Week 10-11：Dashboard核心功能
**目标**：从固定布局升级为可定制设计器

**技术选型**：
- 布局引擎: `react-grid-layout`
- Widget库扩展: 基于现有LineChart和Gauge

**功能列表**：

| 功能 | 描述 | 工作量 |
|------|------|-------|
| Grid布局系统 | 拖拽调整位置和大小 | 3天 |
| Widget库扩展 | LED指示灯、开关按钮、数值输入框 | 3天 |
| 变量绑定面板 | 绑定设备变量或全局变量 | 2天 |
| Dashboard配置保存 | 保存到.daq的ui字段 | 1天 |
| 运行时渲染 | 根据配置动态渲染Dashboard | 2天 |

**新增Widget组件**：
1. **LED指示灯** (LEDWidget.tsx)
   - 绑定boolean变量
   - 颜色：红/绿/黄可配置

2. **开关按钮** (SwitchWidget.tsx)
   - 双向绑定
   - 发送命令到后端组件

3. **数值输入框** (NumberInputWidget.tsx)
   - 实时修改变量值
   - 范围验证

4. **进度条** (ProgressBarWidget.tsx)
   - 显示0-100%进度
   - 支持阈值颜色变化

**Dashboard配置格式**：
```json
{
  "ui": {
    "widgets": [
      {
        "id": "widget-1",
        "type": "line_chart",
        "position": { "x": 0, "y": 0, "w": 6, "h": 4 },
        "config": {
          "title": "Temperature Trend",
          "dataSource": "global.temperature",
          "color": "#4a90d9"
        }
      },
      {
        "id": "widget-2",
        "type": "led",
        "position": { "x": 6, "y": 0, "w": 2, "h": 2 },
        "config": {
          "label": "Alarm",
          "dataSource": "global.alarm_triggered",
          "colorOn": "#e74c3c",
          "colorOff": "#27ae60"
        }
      }
    ]
  }
}
```

#### Week 12：Dashboard编辑模式
**目标**：实现所见即所得的编辑体验

- 编辑/预览模式切换
- Widget属性编辑面板
- 数据源选择器（从可用变量列表选择）
- 布局模板（1x1, 2x2, 自定义）

---

### 阶段 2.5：双模式支持（2周）🟡

#### Week 13：代码编辑模式
**目标**：支持专业用户直接编写Python脚本

**实现方案**：
```typescript
// 模式切换逻辑
type EditorMode = 'visual' | 'code'

const ModeSelector = () => {
    const [mode, setMode] = useState<EditorMode>('visual')

    const switchToCode = () => {
        // 1. 编译当前可视化项目
        const code = compileToCode(nodes, edges)
        // 2. 切换到Monaco编辑器
        setCodeContent(code)
        setMode('code')
    }

    return (
        <div className="mode-selector">
            <button onClick={() => setMode('visual')}>📊 可视化</button>
            <button onClick={switchToCode}>💻 代码</button>
        </div>
    )
}
```

**代码编辑器集成**：
- 使用 Monaco Editor（VSCode同款）
- Python语法高亮和自动补全
- 与daq_core SDK集成
- 运行脚本按钮（调用Python解释器）

#### Week 14：单向代码生成
**目标**：可视化 → 代码（单向）

**限制说明**（MVP阶段）：
- ✅ 支持：从可视化图生成Python代码
- ❌ 不支持：从代码反向生成可视化图（留待未来版本）

**生成代码质量优化**：
- 添加详细注释
- 变量命名优化（从节点label生成有意义的变量名）
- 代码格式化（使用black）

---

### 阶段 2.6：AI辅助功能（2周）🟢

#### Week 15：AI Chat集成
**目标**：提供基础的代码生成和解释功能

**技术方案**：
- LLM Provider: OpenAI API / Claude API
- 对话界面: 侧边栏Chat窗口
- 上下文管理: 项目文件、组件库文档

**功能范围（MVP限定）**：
1. **代码解释**
   - "这段代码是做什么的？"
   - 显示逐行解释

2. **简单代码生成**
   - "帮我写一个Modbus读取脚本"
   - 生成可运行的Python代码片段

3. **组件推荐**
   - "我想实现温度报警功能"
   - 推荐使用Threshold Alarm组件

**明确不做**（MVP范围外）：
- ❌ 全自动项目创建
- ❌ 复杂业务逻辑生成
- ❌ 代码重构建议

#### Week 16：AI提示词优化
**目标**：提高AI回答准确性

**System Prompt设计**：
```python
SYSTEM_PROMPT = """
你是accuDaq数据采集系统的AI助手。

可用组件：
- MockDevice: 模拟数据源
- ModbusClient: Modbus TCP设备读取
- MathOperation: 数学运算
- Compare: 比较逻辑
- CSVStorage: 数据存储
...

用户可以：
1. 询问代码含义
2. 请求生成简单脚本
3. 询问如何使用组件

请提供简洁、可执行的代码示例。
"""
```

**界面设计**：
```typescript
const AIChat = () => {
    const [messages, setMessages] = useState([])

    const sendMessage = async (text: string) => {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            body: JSON.stringify({
                message: text,
                context: {
                    project: currentProject,
                    components: availableComponents
                }
            })
        })
        const result = await response.json()
        setMessages([...messages, { role: 'user', text }, { role: 'assistant', text: result.reply }])
    }

    return <ChatWindow messages={messages} onSend={sendMessage} />
}
```

---

### 阶段 2.7：调试与验证功能（1周）🟡

#### Week 17：执行可视化
**目标**：帮助用户理解数据流动

**功能设计**：
1. **高亮执行模式**
   - 慢速运行（1秒1次tick）
   - 正在执行的组件高亮显示
   - 连线上显示数据值

2. **断点功能**
   - 点击组件设置断点
   - 执行到断点时暂停
   - 查看当前变量值

3. **数据流监视**
   - 实时显示端口数据
   - 历史数据回放
   - 数据异常检测（NaN、超范围）

**UI实现**：
```typescript
const DebugOverlay = ({ node, isExecuting, portData }) => {
    return (
        <div className={`debug-overlay ${isExecuting ? 'executing' : ''}`}>
            <div className="port-values">
                {Object.entries(portData).map(([port, value]) => (
                    <div key={port}>{port}: {value}</div>
                ))}
            </div>
        </div>
    )
}
```

---

## 四、技术架构升级

### 4.1 前端架构优化

#### 状态管理升级
**现状**：使用useState分散管理
**升级**：引入Zustand统一状态管理

```typescript
// store/useProjectStore.ts
import create from 'zustand'

interface ProjectStore {
    nodes: DAQNode[]
    edges: DAQEdge[]
    mode: EditorMode
    isRunning: boolean

    setNodes: (nodes: DAQNode[]) => void
    setEdges: (edges: DAQEdge[]) => void
    switchMode: (mode: EditorMode) => void
    // ...
}

export const useProjectStore = create<ProjectStore>((set) => ({
    nodes: [],
    edges: [],
    mode: 'visual',
    isRunning: false,

    setNodes: (nodes) => set({ nodes }),
    // ...
}))
```

#### TypeScript严格模式
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

### 4.2 后端架构优化

#### API服务层
**新增REST API**（使用Flask）：

```python
# api/server.py
from flask import Flask, request, jsonify
from daq_core.compiler import DAQCompiler
from daq_core.engine import DAQEngine

app = Flask(__name__)
engine_instance = None

@app.route('/api/compile', methods=['POST'])
def compile_project():
    daq_project = request.json
    compiler = DAQCompiler(daq_project)
    code = compiler.compile()
    return jsonify({'code': code, 'status': 'success'})

@app.route('/api/engine/start', methods=['POST'])
def start_engine():
    global engine_instance
    # 从.daq文件加载并启动
    engine_instance = create_engine_from_project()
    engine_instance.start()
    return jsonify({'status': 'running'})
```

#### 插件系统设计
**目标**：支持用户自定义组件

```python
# components/plugin_loader.py
class PluginLoader:
    @staticmethod
    def load_from_directory(path: str):
        for file in os.listdir(path):
            if file.endswith('_component.py'):
                module = importlib.import_module(file[:-3])
                # 自动注册装饰器会生效
```

### 4.3 文件系统设计

#### .daq文件完整结构
```json
{
  "meta": {
    "name": "温度监控系统",
    "version": "1.0.0",
    "schemaVersion": "2.0.0",
    "description": "监控温度并在超过阈值时报警",
    "author": "用户名",
    "createdAt": "2026-01-20T10:00:00Z",
    "modifiedAt": "2026-01-20T15:30:00Z"
  },
  "settings": {
    "tickInterval": 100,
    "autoSave": true,
    "debugMode": false
  },
  "devices": [
    {
      "id": "device-1",
      "type": "modbus_tcp",
      "name": "PLC主站",
      "config": {
        "host": "192.168.1.10",
        "port": 502,
        "slaveId": 1
      }
    }
  ],
  "logic": {
    "nodes": [...],
    "wires": [...]
  },
  "ui": {
    "widgets": [...],
    "layout": "grid",
    "theme": "dark"
  }
}
```

---

## 五、测试与质量保证

### 5.1 测试策略

| 测试类型 | 覆盖范围 | 工具 | 目标覆盖率 |
|---------|---------|------|-----------|
| 单元测试 | 组件逻辑 | pytest | 80% |
| 集成测试 | 编译流程 | pytest | 70% |
| E2E测试 | 用户操作流程 | Playwright | 50% |
| 前端测试 | React组件 | Vitest + RTL | 60% |

### 5.2 关键测试用例

#### MVP验收测试（自动化）
```python
# tests/test_mvp_acceptance.py
def test_mvp_workflow():
    """
    测试MVP验收标准的完整流程：
    1. 创建项目
    2. 添加设备
    3. 配置逻辑
    4. 配置UI
    5. 运行
    6. 验证数据
    """
    # 1. 创建项目
    project = create_project("temperature_monitor")
    assert project.exists()

    # 2. 添加虚拟温度传感器
    device = project.add_device("mock_device", {
        "wave_type": "sine",
        "amplitude": 20,
        "offset": 25
    })

    # 3. 添加逻辑节点
    reader = project.add_node("device_reader", device.id)
    compare = project.add_node("compare", {"threshold": 30})
    project.connect(reader.output("value"), compare.input("input1"))

    # 4. 配置UI
    project.add_widget("line_chart", {
        "dataSource": "device.value"
    })
    project.add_widget("led", {
        "dataSource": "compare.result"
    })

    # 5. 运行
    project.compile()
    project.run(duration=10)

    # 6. 验证
    assert project.csv_exists()
    data = project.read_csv()
    assert len(data) > 0
```

### 5.3 性能基准

| 指标 | 目标值 | 测量方法 |
|------|-------|---------|
| 编译速度 | < 2秒 | 100节点项目编译时间 |
| 运行时延迟 | < 100ms | 主循环tick延迟 |
| 内存占用 | < 200MB | 运行时峰值内存 |
| Dashboard刷新率 | 10 FPS | MQTT消息到UI渲染延迟 |

---

## 六、文档与用户体验

### 6.1 用户文档

| 文档类型 | 内容 | 优先级 |
|---------|------|-------|
| 快速入门 | 10分钟教程（对应MVP验收标准） | 🔴 高 |
| 组件手册 | 所有组件的API文档 | 🔴 高 |
| 示例项目 | 5个典型案例（温度监控、数据记录等） | 🟡 中 |
| 视频教程 | 3-5分钟演示视频 | 🟢 低 |
| API参考 | Python SDK文档 | 🟡 中 |

### 6.2 用户引导

#### 首次启动向导
```typescript
const WelcomeWizard = () => {
    const steps = [
        {
            title: "欢迎使用accuDaq",
            content: "可视化数据采集IDE"
        },
        {
            title: "选择项目模板",
            options: ["空白项目", "温度监控", "数据记录"]
        },
        {
            title: "配置工作区",
            content: "选择项目保存位置"
        }
    ]

    return <StepWizard steps={steps} />
}
```

#### 上下文帮助
- 鼠标悬停显示组件说明
- 属性面板显示参数提示
- 错误消息提供解决方案链接

---

## 七、里程碑与交付计划

### 时间线（17周 ≈ 4个月）

```
Month 1 (Week 1-4)
├─ Week 1-2: VSCode集成 ✅ 核心优先级
├─ Week 3-4: 项目文件系统 ✅ 核心优先级
└─ 交付物: VSCode扩展Beta版

Month 2 (Week 5-9)
├─ Week 5-6: Modbus支持 ✅ 核心优先级
├─ Week 7: 设备管理面板 ✅ 核心优先级
├─ Week 8-9: 补充核心组件 ⚠️ 重要
└─ 交付物: 工业现场可用版本

Month 3 (Week 10-13)
├─ Week 10-12: Dashboard设计器 ✅ 核心优先级
├─ Week 13: 代码编辑模式 ⚠️ 重要
└─ 交付物: UI定制版本

Month 4 (Week 14-17)
├─ Week 14: 单向代码生成 ⚠️ 重要
├─ Week 15-16: AI辅助 ⭕ 可选
├─ Week 17: 调试功能 ⚠️ 重要
└─ 交付物: MVP完整版
```

### 关键里程碑

| 里程碑 | 时间点 | 验收标准 |
|--------|-------|---------|
| M1: VSCode集成 | Week 4 | 可在VSCode中创建和编辑.daq项目 |
| M2: Modbus支持 | Week 7 | 可连接真实Modbus设备并读取数据 |
| M3: Dashboard可定制 | Week 12 | 可拖拽设计自定义仪表盘 |
| M4: MVP验收通过 | Week 17 | 通过10分钟验收测试 |

---

## 八、资源需求与团队分工

### 8.1 人力资源

| 角色 | 人数 | 主要职责 |
|------|------|---------|
| 前端开发 | 2人 | React编辑器、Dashboard设计器 |
| 后端开发 | 2人 | 组件开发、编译器优化 |
| VSCode扩展开发 | 1人 | 扩展集成、API桥接 |
| 测试工程师 | 1人 | 自动化测试、质量保证 |
| UI/UX设计师 | 0.5人 | 界面设计、用户体验优化 |
| **总计** | **6.5人月** | **4个月周期** |

### 8.2 技术栈清单

#### 新增依赖

**Python后端**：
```bash
pip install pymodbus>=3.0.0      # Modbus支持
pip install flask>=2.0.0         # API服务
pip install black                # 代码格式化
pip install pytest-cov           # 测试覆盖率
```

**前端**：
```bash
npm install zustand              # 状态管理
npm install react-grid-layout    # Dashboard布局
npm install monaco-editor        # 代码编辑器
npm install @playwright/test     # E2E测试
```

**VSCode扩展**：
```bash
npm install @vscode/webview-ui-toolkit
```

---

## 九、风险管理

### 9.1 技术风险

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| VSCode Webview性能问题 | 高 | 中 | 提前做性能测试，考虑虚拟化渲染 |
| Modbus设备兼容性 | 中 | 高 | 支持多种Modbus变体，提供调试工具 |
| AI API稳定性 | 低 | 中 | 降级为可选功能，支持本地模型 |
| 大规模项目性能 | 高 | 中 | 限制MVP节点数量（<100），优化算法 |

### 9.2 进度风险

**关键路径**：VSCode集成 → Modbus支持 → Dashboard设计器

**应对策略**：
- 🔴 高优先级功能必须完成
- 🟡 中优先级功能可延期
- 🟢 低优先级功能（AI）可砍掉

### 9.3 范围蔓延控制

**明确不做**（留待后续版本）：
- ❌ 复杂协议（EtherCAT, OPC UA）
- ❌ 嵌入式支持（LVGL, FPGA）
- ❌ 高级算法（FFT, PID）
- ❌ 代码到可视化反向转换
- ❌ 云平台部署

---

## 十、成功指标

### 10.1 技术指标

- ✅ 支持至少50个节点的项目
- ✅ 编译时间 < 3秒
- ✅ 运行时CPU占用 < 30%
- ✅ Dashboard刷新率 > 10 FPS
- ✅ 代码测试覆盖率 > 70%

### 10.2 用户体验指标

- ✅ 新用户10分钟内完成MVP验收流程
- ✅ 项目创建流程 < 3步
- ✅ 错误提示清晰率 > 90%
- ✅ 文档完整性 > 95%

### 10.3 MVP验收标准（重申）

**核心场景**：温度监控项目（10分钟完成）

1. ✅ 创建"温度监控"项目（< 1分钟）
2. ✅ 添加虚拟温度传感器（< 1分钟）
3. ✅ 拖拽配置逻辑节点（< 3分钟）
4. ✅ 设计Dashboard界面（< 3分钟）
5. ✅ 运行并查看实时数据（< 1分钟）
6. ✅ 导出CSV数据（< 1分钟）

**验收方法**：邀请5名测试用户，90%成功率

---

## 十一、后续版本展望（V3.0+）

### 可能的方向

1. **嵌入式支持**
   - LVGL UI设计器
   - 交叉编译工具链
   - 固件烧录集成

2. **高级协议**
   - OPC UA
   - EtherCAT
   - CANopen

3. **算法库**
   - FFT频谱分析
   - 数字滤波器
   - PID控制器

4. **云原生**
   - Web IDE版本
   - 云端编译
   - 远程设备管理

5. **双向转换**
   - 代码 → 可视化图
   - AST解析与反向工程

---

## 附录

### A. 组件开发规范（第二阶段）

所有新组件必须包含：
1. 后端Python实现（继承ComponentBase）
2. 前端TypeScript定义（添加到componentLibrary）
3. 编译器映射（更新NODE_TYPE_MAPPING）
4. 单元测试（pytest）
5. 用户文档（Markdown）
6. 示例项目

### B. 代码提交规范

使用Conventional Commits：
```
feat(modbus): 添加Modbus TCP组件
fix(compiler): 修复拓扑排序bug
docs(readme): 更新安装说明
test(engine): 添加引擎集成测试
```

### C. 项目模板清单

**1. 空白项目**
- 无预设节点
- 仅包含项目结构

**2. 温度监控**（验收标准模板）
- Mock温度传感器
- 阈值判断（>30°C）
- 波形图 + LED报警灯
- CSV数据记录

**3. 数据记录器**
- 多路数据采集
- 时间戳记录
- 自动文件切分

**4. Modbus轮询**
- Modbus TCP设备
- 多寄存器读取
- 数据聚合

**5. 实时监控**
- 高频数据采集
- 实时曲线显示
- 异常检测

---

## 总结

第二阶段开发将在现有核心架构基础上，补齐MVP必需功能，重点是：

1. **VSCode集成**（最高优先级）- 从Web应用到IDE扩展的跨越
2. **Modbus支持**（工业现场必备）- 打通与真实设备的连接
3. **Dashboard设计器**（差异化功能）- 从固定布局到自定义设计
4. **组件库扩充**（功能完整性）- 覆盖MVP要求的所有基础组件

通过17周的开发，最终交付一个能够通过10分钟验收测试的MVP产品，为后续的市场推广和用户反馈迭代奠定基础。

---

**文档维护者**: accuDaq开发团队
**下次更新**: 每月里程碑评审后
**问题反馈**: 项目Issue追踪系统



