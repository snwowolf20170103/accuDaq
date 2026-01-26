# AccuDaq MQTT + CSV 全流程测试计划

**文档类型**: webapp-testing 计划
**目标应用**: AccuDaq Visual Editor
**核心流程**: 从模拟数据生成到 MQTT 发布，再到 CSV 存储与 Dashboard 实时可视化。

## 1. 测试用例：MQTT 到 CSV 闭环验证 (TC-MQTT-CSV)
- **描述**: 验证用户能够建立“模拟设备 -> CSV 存储”的数据流，并在 Dashboard 中查看实时波形。
- **关联脚本**: `visual-editor/tests/mqtt_csv.spec.ts`

## 2. 详细步骤
1. **画布设计**:
    - 拖入 `Mock Device` 节点。
    - 拖入 `CSV Storage` 节点。
    - 将 `Mock Device` 的数据输出连接至存储节点的输入。
2. **参数配置**:
    - 选中 `Mock Device`，将 MQTT Topic 设为 `accudaq/demo/sensor`。
3. **可视化配置**:
    - 切换到 **Dashboard** 选项卡。
    - 添加 `折线图` 控件。
    - 绑定类型选择 `设备变量`，Topic 填入 `accudaq/demo/sensor`。
4. **运行与验证**:
    - 执行编译 (Compile)。
    - 点击运行 (RUN)。
    - **预期**: Dashboard 中的折线图开始有波形跳动。
5. **数据导出**:
    - 点击 `Download CSV`。
    - **预期**: 成功下载包含历史数据的 CSV 文件。

## 3. 自动化实现 (Playwright)
脚本已配置为模拟后端响应并自动化 UI 交互流程。
