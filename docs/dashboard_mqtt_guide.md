# Dashboard MQTT 数据对接指南

本文档旨在指导如何使用 AccuDaq Dashboard 对接 MQTT 数据。我们将使用提供的模拟脚本生成数据，并在 Dashboard 中进行展示。

## 1. 前置条件

*   **MQTT Broker**: 确保您能连接到 MQTT 服务。
    *   推荐地址: `192.168.1.9`
    *   默认端口: `1883`
## 2. 启动 MQTT Broker (服务端)

**最新方式：使用 MQTT Broker 组件**

我们已新增了内置组件，您无需手动运行脚本。

1.  在左侧组件库中找到 **Communication (通信)** 分类。
2.  找到 **MQTT Broker** 组件，将其拖入画布。
    *   默认端口：1883 (TCP), 8083 (WebSocket)
3.  点击顶部工具栏的 **Run (运行)** 按钮。
    *   组件会自动在后台启动 MQTT 服务。
4.  此时，您的机器 (192.168.1.9) 已成为 MQTT 服务器。

**验证：**
*   组件的 `Status` 输出应显示 "Active" 或 "Running"。

---

## 3. 启动数据模拟器 (可选)

如果您没有真实的设备，可以使用之前的模拟脚本来产生数据进行测试。

1.  打开一个新的终端。
2.  运行模拟脚本 (连接本机 Broker 发布数据):
    ```bash
    # 注意: 这里连接 localhost，因为是在同一台机器上
    python scripts/mqtt_dummy_generator.py --broker 127.0.0.1
    ```

## 3. Dashboard 配置指南

现在我们将在 Dashboard 中订阅这个数据。

### 步骤 1: 添加 MQTT 订阅组件

1.  在左侧组件库中找到 **Communication (通信)** 分类。
2.  拖拽 **MQTT Subscribe** 组件到画布上。
3.  选中该组件，在 **Properties (属性)** 面板中配置：
    *   **Server URL (服务器地址)**: `ws://192.168.1.9:8083/mqtt` 
        *   *(注意：Web 端通常使用 WebSocket 连接 MQTT，端口通常是 8083 或 9001，请根据实际 Broker 配置确认。如果 Dashboard 运行在 Electron/本地环境，可能支持 tcp://192.168.1.9:1883)*
    *   **Topic (主题)**: `sensor/sine_wave`
        *   *(必须与脚本中的主题一致)*

### 步骤 2: 添加图表组件

1.  在左侧组件库中找到 **Dashboard (仪表盘)** 或 **Visualization** 分类。
2.  拖拽 **Line Chart (折线图)** 组件到画布上。

### 步骤 3: 绑定数据

1.  确保 **MQTT Subscribe** 组件的输出端口（通常是 `data` 或 `message`）已经有数据流出。
2.  将 **MQTT Subscribe** 的输出连接到 **Line Chart** 的输入。
    *   或者，在 Chart 的属性面板中，找到 **Data Source (数据源)**。
    *   选择或者输入变量路径，例如：`MQTT_Subscribe_1.data.value`。
        *   *(脚本发送的 JSON 数据包含 `value` 字段，所以我们需要提取这个字段)*

### 步骤 4: 运行与验证

1.  点击顶部工具栏的 **Run (运行)** 按钮。
2.  观察折线图，你应该能看到一条正弦波曲线正在实时绘制。

## 故障排除

*   **连不上 MQTT?**
    *   检查防火墙是否允许 1883 (TCP) 和 8083/9001 (WebSocket) 端口。
    *   确认 Broker 是否开启了 WebSocket 支持（Web 端通常必须用 WebSocket）。
*   **没有数据?**
    *   使用 MQTT 工具（如 MQTTX 或 MQTT Explorer）连接到 `192.168.1.9`，订阅 `sensor/#` 确认是否有数据发出。
    *   检查 Dashboard 中的 Topic 拼写是否正确。
