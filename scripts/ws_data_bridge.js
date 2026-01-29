/**
 * WebSocket 数据桥接服务
 * 为不懂 MQTT 的第三方前端提供简单的 WebSocket 接口
 * 
 * 用法：
 * - ws://localhost:9000/modbus      → 接收 modbus/data 主题的数据
 * - ws://localhost:9000/sensors     → 接收 sensors/# 所有传感器数据
 * - ws://localhost:9000/raw?topic=xxx → 自定义主题
 */

const WebSocket = require('ws');
const mqtt = require('mqtt');

const WS_PORT = 9000;
const MQTT_BROKER = 'mqtt://localhost:1883';

// 路径到 MQTT 主题的映射
const PATH_TO_TOPIC = {
    '/modbus': 'modbus/data',
    '/sine_wave': 'sensor/sine_wave',
    '/sensor': 'sensor/#',
};

// HTTP 服务器
const express = require('express');
const app = express();
const server = require('http').createServer(app);

// WebSocket 服务器
const wss = new WebSocket.Server({
    server,
    verifyClient: (info) => {
        console.log(`[WebSocket] 新连接请求: ${info.req.url}`);
        return true;
    }
});

// MQTT 客户端（全局共享）
const mqttClient = mqtt.connect(MQTT_BROKER);
const subscriptions = new Map(); // topic -> Set<WebSocket>

mqttClient.on('connect', () => {
    console.log(`[MQTT] 已连接到 Broker: ${MQTT_BROKER}`);
});

mqttClient.on('error', (err) => {
    console.error(`[MQTT] 连接错误: ${err.message}`);
});

// 接收 MQTT 消息，分发给订阅的 WebSocket 客户端
mqttClient.on('message', (topic, message) => {
    const payload = message.toString();

    // 找到订阅了这个主题的所有 WebSocket 连接
    subscriptions.forEach((clients, subscribedTopic) => {
        // 支持通配符匹配
        if (matchTopic(topic, subscribedTopic)) {
            clients.forEach(ws => {
                if (ws.readyState === WebSocket.OPEN) {
                    // 发送格式：{ topic, data, timestamp }
                    ws.send(JSON.stringify({
                        topic: topic,
                        data: tryParseJSON(payload),
                        timestamp: Date.now()
                    }));
                }
            });
        }
    });
});

// WebSocket 连接处理
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://localhost:${WS_PORT}`);
    const path = url.pathname;
    const queryTopic = url.searchParams.get('topic');

    // 确定订阅的主题
    let topic = queryTopic || PATH_TO_TOPIC[path];

    if (!topic) {
        ws.send(JSON.stringify({
            error: `未知路径: ${path}。可用路径: ${Object.keys(PATH_TO_TOPIC).join(', ')} 或使用 ?topic=xxx`
        }));
        ws.close();
        return;
    }

    console.log(`[WebSocket] 新客户端连接: ${path} → 订阅主题: ${topic}`);

    // 添加到订阅列表
    if (!subscriptions.has(topic)) {
        subscriptions.set(topic, new Set());
        mqttClient.subscribe(topic);
        console.log(`[MQTT] 订阅新主题: ${topic}`);
    }
    subscriptions.get(topic).add(ws);

    // 发送欢迎消息
    ws.send(JSON.stringify({
        type: 'welcome',
        message: `已连接到数据流: ${topic}`,
        timestamp: Date.now()
    }));

    // 客户端断开处理
    ws.on('close', () => {
        console.log(`[WebSocket] 客户端断开: ${path}`);
        const clients = subscriptions.get(topic);
        if (clients) {
            clients.delete(ws);
            // 如果没有客户端订阅这个主题了，取消 MQTT 订阅
            if (clients.size === 0) {
                subscriptions.delete(topic);
                mqttClient.unsubscribe(topic);
                console.log(`[MQTT] 取消订阅: ${topic}`);
            }
        }
    });

    ws.on('error', (err) => {
        console.error(`[WebSocket] 错误: ${err.message}`);
    });
});

// HTTP 服务（提供状态页面）
app.get('/', (req, res) => {
    const status = {
        service: 'AccuDaq WebSocket Data Bridge',
        mqtt_broker: MQTT_BROKER,
        ws_port: WS_PORT,
        active_topics: Array.from(subscriptions.keys()),
        active_connections: Array.from(subscriptions.values()).reduce((sum, set) => sum + set.size, 0),
        available_endpoints: Object.entries(PATH_TO_TOPIC).map(([path, topic]) => ({
            path: `ws://localhost:${WS_PORT}${path}`,
            topic: topic
        }))
    };
    res.json(status);
});

server.listen(WS_PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║      AccuDaq WebSocket 数据桥接服务已启动                  ║
╠════════════════════════════════════════════════════════════╣
║  WebSocket 端口: ${WS_PORT}                                     ║
║  MQTT Broker:   ${MQTT_BROKER}                  ║
║                                                            ║
║  可用接口:                                                 ║
${Object.entries(PATH_TO_TOPIC).map(([path, topic]) =>
        `║  - ws://localhost:${WS_PORT}${path.padEnd(20)} → ${topic}`).join('\n')}
║                                                            ║
║  自定义主题:                                               ║
║  - ws://localhost:${WS_PORT}/raw?topic=your/topic          ║
║                                                            ║
║  状态页面: http://localhost:${WS_PORT}/                    ║
╚════════════════════════════════════════════════════════════╝
    `);
});

// 工具函数：尝试解析 JSON
function tryParseJSON(str) {
    try {
        return JSON.parse(str);
    } catch {
        return str;
    }
}

// 工具函数：MQTT 主题通配符匹配
function matchTopic(actual, pattern) {
    if (actual === pattern) return true;

    const actualParts = actual.split('/');
    const patternParts = pattern.split('/');

    for (let i = 0; i < patternParts.length; i++) {
        if (patternParts[i] === '#') return true;
        if (patternParts[i] === '+') continue;
        if (patternParts[i] !== actualParts[i]) return false;
    }

    return actualParts.length === patternParts.length;
}
