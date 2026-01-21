# 技术项目报告：DAQ 系统架构与集成

## 1. 执行摘要 (Executive Summary)
DAQ（数据采集）系统是一个低代码/无代码平台，旨在通过可视化方式构建数据采集和处理流程。该系统由 **可视化编辑器（前端）**（基于 React 构建）和 **核心引擎（后端）**（基于 Python 构建）组成。

本报告重点阐述系统的技术实现，特别是前端可视化控件与后端可执行组件之间的桥接机制。

## 2. 系统架构概览 (System Architecture Overview)
系统采用 **基于编译器的架构 (Compiler-Based Architecture)**。前端并非通过 API 调用实时控制后端，而是作为项目规范（模型）的生成器，后端将该规范 *编译* 为可执行的 Python 脚本。

*   **前端**：基于 React 的单页应用 (SPA)，使用 `React Flow` 实现节点编辑器。负责管理 UI 状态并生成项目的 JSON 表示。
*   **后端**：基于 Python 的引擎，包含 **编译器**（解析 JSON 并生成代码）和 **运行时引擎**（执行逻辑）。

## 3. 前后端集成机制 (Frontend-Backend Integration Mechanism)

前端控件与后端组件的核心连接通过三个关键层建立：**共享数据模型**、**类型映射** 和 **代码生成**。

### 3.1 共享数据模型 (The Shared Data Model - `.daq` JSON Schema)
前后端之间的“契约”是 `.daq` 文件格式（JSON）。
*   **前端职责**：当用户将组件（例如“数学运算”）拖到画布上时，前端会创建一个包含 `id`、`type`（例如 `"daq:math"`）、`position` 和 `properties` 的 JSON 对象。
*   **后端职责**：后端读取此 JSON 文件。它不了解“拖放”操作，只关注 `nodes`（节点）和 `wires`（连线）中定义的结构化数据。

**前端生成的 JSON 示例：**
```json
{
    "id": "node_1",
    "type": "daq:math",
    "properties": {
        "operation": "scale",
        "scale": 1.5
    }
}
```

### 3.2 组件映射 ("Rosetta Stone")
前端 TypeScript 代码中定义的视觉组件与后端 Python 代码中的逻辑类之间存在严格的映射关系。

*   **前端定义** (`visual-editor/src/data/componentLibrary.ts`)：
    定义组件的 *外观* 及其拥有的 *属性*。
    ```typescript
    {
        type: 'math',  // 对应 'daq:math'
        name: 'Math Operation',
        defaultProperties: { operation: 'scale', scale: 1.0 }
    }
    ```

*   **后端映射** (`daq_core/compiler/codegen.py`)：
    定义如何将特定的前端字符串标识转换为 Python 类。
    ```python
    NODE_TYPE_MAPPING = {
        "daq:math": "MathOperation",     # 映射 'daq:math' -> MathOperation 类
        "daq:mock_device": "MockDevice", # 映射 'daq:mock_device' -> MockDevice 类
        # ...
    }
    ```

### 3.3 编译流水线 (The Compilation Pipeline)
这是实际“连接”两端的流程。当用户点击“运行”时：
1.  **序列化**：前端将当前的 React 状态序列化为 JSON 字符串/文件。
2.  **解析**：后端 `DAQCompiler` 读取此 JSON。
3.  **拓扑排序**：后端分析节点间的依赖关系（连线），确保执行顺序正确。
4.  **代码生成**：
    *   `CodeGenerator` 遍历 JSON 中的节点。
    *   在 `NODE_TYPE_MAPPING` 中查找对应的 `type`。
    *   从 JSON 中提取 `properties`（如 `scale: 1.5`）并将其转换为 Python 字典参数。
    *   写入实例化类的 Python 代码行，例如：
        ```python
        node_1 = engine.add_component("MathOperation", "node_1", {"operation": "scale", "scale": 1.5})
        ```
5.  **连线**：生成器遍历 JSON 中的 `wires` 列表并生成连接调用：
    ```python
    engine.connect("node_1", "output", "node_2", "input")
    ```

## 4. 数据流总结 (Summary of Data Flow)
| 阶段 | 组件 | 动作 | 数据格式 |
| :--- | :--- | :--- | :--- |
| **设计** | 可视化编辑器 | 用户拖拽 "Math Node" | React State |
| **保存** | 文件系统 | 保存项目 | `.daq` JSON 文件 |
| **编译** | `codegen.py` | 映射 `daq:math` → `MathOperation` | Python 源代码 |
| **运行** | `engine.py` | `class MathOperation` 执行逻辑 | 二进制/内存数据 |

## 5. 结论 (Conclusion)
这种“连接”是 **逻辑上** 的，而非直接连接。前端提供 **配置**（通过 JSON 属性），后端提供 **实现**（通过 Python 类）。`codegen.py` 文件充当桥梁，将前者转换为后者，确保用户在屏幕上看到的内容正是引擎所执行的内容。
