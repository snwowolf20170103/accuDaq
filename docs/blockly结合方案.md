# Blockly 与 accuDaq 结合方案

**文档版本**: 1.0  
**创建日期**: 2026-01-21  

---

## 一、背景分析

### 1.1 Blockly 简介

Blockly 是一个开源的可视化编程库，使用拖拽式积木块来表示编程概念（变量、循环、逻辑表达式等）。2025年11月，Raspberry Pi 基金会正式成为 Blockly 的官方维护者。

**核心特点**：
- 🧩 积木式拖拽编程
- 🐍 可生成 Python / JavaScript 代码
- 👶 适合编程初学者
- 🔧 支持自定义积木块

### 1.2 当前项目现状

| 模块 | 当前技术 | 描述 |
|------|---------|------|
| 可视化编辑器 | React Flow | 节点-连线式数据流编辑 |
| 编译器 | Python | `.daq` JSON → Python 代码 |
| 组件库 | 6个组件 | MockDevice, MQTT, Math, CSV等 |

---

## 二、React Flow vs Blockly 对比

| 对比维度 | React Flow (当前方案) | Blockly |
|---------|---------------------|---------|
| **编程范式** | 数据流图（节点连线） | 顺序积木（命令式） |
| **目标用户** | 工程师/技术人员 | 初学者/终端用户 |
| **适用场景** | DAQ 管道设计 | 简单脚本逻辑 |
| **学习曲线** | 中等 | 低 |
| **代码输出** | `.daq` JSON | Python/JS 直接生成 |
| **自定义能力** | 自定义节点 | 自定义积木块 |

---

## 三、集成方案选项

### 方案一：Blockly 作为"脚本编辑层" ⭐ 推荐

**核心思路**：保留 React Flow 作为主要 DAQ 管道设计工具，增加 Blockly 用于用户自定义逻辑脚本。

**架构示意**：
```
┌─────────────────────────────────────────────────────────────┐
│  React Flow 画布（主管道设计）                               │
│                                                              │
│  [MockDevice] ──▶ [CustomScript] ──▶ [CSVStorage]           │
│                        │                                     │
│                   ┌────▼────┐                                │
│                   │ Blockly │  ← 用户在此定义逻辑             │
│                   │  编辑器  │                                │
│                   └─────────┘                                │
└─────────────────────────────────────────────────────────────┘
```

**适用场景**：
- 用户需要在节点内编写自定义处理逻辑
- 报警规则配置
- 数据过滤条件定义
- 简单的 IF-THEN 逻辑

**优点**：
- ✅ 保留现有架构
- ✅ 渐进式集成
- ✅ 用户可按需使用

**缺点**：
- ⚠️ 需要维护两套编辑器
- ⚠️ 需要设计 Blockly → Python 的适配层

---

### 方案二：Blockly 完全替代 React Flow

**核心思路**：用 Blockly 全面替换 React Flow，为每个 DAQ 组件创建对应的积木块。

**示例积木设计**：
```
┌──────────────────────────┐
│ 读取 [Mock设备 ▼] 的数据  │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 如果 数据 > [30] 则       │
│   ┌────────────────────┐ │
│   │ 设置报警灯为 [红色] │ │
│   └────────────────────┘ │
└──────────────────────────┘
         │
         ▼
┌──────────────────────────┐
│ 保存数据到 CSV 文件      │
└──────────────────────────┘
```

**优点**：
- ✅ 对新手极其友好
- ✅ 统一的编程范式

**缺点**：
- ❌ 数据流可视化效果较差
- ❌ 需要重写大量前端代码
- ❌ 复杂管道难以表达

---

### 方案三：双模式切换编辑器

**核心思路**：用户可在 React Flow 和 Blockly 视图之间切换。

```
┌─────────────────────────────────────┐
│  [📊 可视化模式] | [🧩 积木模式]    │  ← 模式切换按钮
├─────────────────────────────────────┤
│                                     │
│     根据模式显示不同编辑器          │
│                                     │
└─────────────────────────────────────┘
```

**优点**：
- ✅ 满足不同用户需求
- ✅ 灵活性最高

**缺点**：
- ⚠️ 实现复杂度高
- ⚠️ 双向同步困难

---

## 四、推荐方案详细设计（方案一）

### 4.1 技术依赖

```bash
# 安装 Blockly 相关依赖
npm install blockly react-blockly
```

### 4.2 组件实现

**BlocklyEditor.tsx**：
```typescript
// visual-editor/src/components/BlocklyEditor.tsx
import { BlocklyWorkspace } from 'react-blockly';
import Blockly from 'blockly';

interface BlocklyEditorProps {
  onCodeGenerated: (code: string) => void;
  initialXml?: string;
}

const BlocklyEditor = ({ onCodeGenerated, initialXml }: BlocklyEditorProps) => {
  // 工具箱配置
  const toolboxConfig = {
    kind: 'categoryToolbox',
    contents: [
      {
        kind: 'category',
        name: '逻辑',
        colour: '#5C81A6',
        contents: [
          { kind: 'block', type: 'controls_if' },
          { kind: 'block', type: 'logic_compare' },
          { kind: 'block', type: 'logic_operation' },
        ]
      },
      {
        kind: 'category',
        name: '数学',
        colour: '#5CA65C',
        contents: [
          { kind: 'block', type: 'math_number' },
          { kind: 'block', type: 'math_arithmetic' },
        ]
      },
      {
        kind: 'category',
        name: 'DAQ 专用',
        colour: '#A65C5C',
        contents: [
          { kind: 'block', type: 'daq_read_input' },
          { kind: 'block', type: 'daq_set_output' },
          { kind: 'block', type: 'daq_set_alarm' },
        ]
      }
    ]
  };

  const handleWorkspaceChange = (workspace: Blockly.Workspace) => {
    const code = Blockly.Python.workspaceToCode(workspace);
    onCodeGenerated(code);
  };

  return (
    <BlocklyWorkspace
      toolboxConfiguration={toolboxConfig}
      initialXml={initialXml}
      onWorkspaceChange={handleWorkspaceChange}
      className="blockly-workspace"
      workspaceConfiguration={{
        grid: {
          spacing: 20,
          length: 3,
          colour: '#ccc',
          snap: true,
        },
      }}
    />
  );
};

export default BlocklyEditor;
```

### 4.3 自定义 DAQ 积木块

```typescript
// visual-editor/src/blocks/daqBlocks.ts
import Blockly from 'blockly';

// 定义"读取输入"积木
Blockly.Blocks['daq_read_input'] = {
  init: function() {
    this.appendDummyInput()
        .appendField('读取输入')
        .appendField(new Blockly.FieldTextInput('value'), 'PORT_NAME');
    this.setOutput(true, 'Number');
    this.setColour(230);
    this.setTooltip('读取节点输入端口的值');
  }
};

// Python 代码生成器
Blockly.Python['daq_read_input'] = function(block: Blockly.Block) {
  const portName = block.getFieldValue('PORT_NAME');
  const code = `self.get_input("${portName}")`;
  return [code, Blockly.Python.ORDER_FUNCTION_CALL];
};

// 定义"设置输出"积木
Blockly.Blocks['daq_set_output'] = {
  init: function() {
    this.appendValueInput('VALUE')
        .setCheck('Number')
        .appendField('设置输出')
        .appendField(new Blockly.FieldTextInput('result'), 'PORT_NAME')
        .appendField('为');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(160);
  }
};

Blockly.Python['daq_set_output'] = function(block: Blockly.Block) {
  const portName = block.getFieldValue('PORT_NAME');
  const value = Blockly.Python.valueToCode(block, 'VALUE', Blockly.Python.ORDER_ATOMIC);
  return `self.set_output("${portName}", ${value})\n`;
};

// 定义"设置报警"积木
Blockly.Blocks['daq_set_alarm'] = {
  init: function() {
    this.appendValueInput('CONDITION')
        .setCheck('Boolean')
        .appendField('当条件');
    this.appendDummyInput()
        .appendField('时触发报警');
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(0);
  }
};
```

### 4.4 集成到 CustomScript 节点

```typescript
// visual-editor/src/components/CustomScriptNode.tsx
import { useState } from 'react';
import { Handle, Position } from 'reactflow';
import BlocklyEditor from './BlocklyEditor';

const CustomScriptNode = ({ data }) => {
  const [showBlockly, setShowBlockly] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  return (
    <div className="custom-script-node">
      <Handle type="target" position={Position.Left} />
      
      <div className="node-header">
        <span>🧩 自定义脚本</span>
        <button onClick={() => setShowBlockly(true)}>
          编辑逻辑
        </button>
      </div>

      {/* Blockly 弹窗编辑器 */}
      {showBlockly && (
        <div className="blockly-modal">
          <BlocklyEditor
            onCodeGenerated={setGeneratedCode}
            initialXml={data.blocklyXml}
          />
          <div className="modal-actions">
            <button onClick={() => setShowBlockly(false)}>保存</button>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
};
```

---

## 五、实施计划

| 阶段 | 工作内容 | 预计工时 |
|------|---------|---------|
| **Phase 1** | Blockly 基础集成 + 弹窗编辑器 | 2天 |
| **Phase 2** | 自定义 DAQ 积木块开发 | 2天 |
| **Phase 3** | 代码生成 + 与编译器对接 | 2天 |
| **Phase 4** | UI 优化 + 测试 | 1天 |

**总计**: 约 7 个工作日

---

## 六、待确认问题

在正式实施前，需要确认以下问题：

1. **目标用户定位**
   - 主要面向工程师/技术人员？→ 保持 React Flow 为主
   - 需要支持非技术用户？→ 增加 Blockly 脚本层

2. **用户可定制范围**
   - 完整 DAQ 管道设计？
   - 仅小型逻辑脚本/条件？
   - 报警规则/触发器？

3. **界面呈现方式偏好**
   - 嵌入式弹窗（编辑特定节点时显示）
   - 独立标签页（在画布和脚本视图间切换）

---

## 七、参考资源

- [Blockly 官方文档](https://developers.google.com/blockly)
- [react-blockly GitHub](https://github.com/nbudin/react-blockly)
- [Blockly 自定义积木教程](https://developers.google.com/blockly/guides/create-custom-blocks/overview)
- [Raspberry Pi Foundation Blockly](https://github.com/RaspberryPiFoundation/blockly)
