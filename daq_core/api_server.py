"""
DAQ API 服务器
提供 REST API 供前端控制 DAQ 引擎
"""

import subprocess
import threading
import sys
import os
from typing import Dict
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 全局变量：存储运行中的引擎进程
engine_process = None
engine_lock = threading.Lock()


@app.route('/api/engine/start', methods=['POST'])
def start_engine():
    """启动 DAQ 引擎"""
    global engine_process

    with engine_lock:
        if engine_process is not None and engine_process.poll() is None:
            return jsonify({"error": "Engine is already running"}), 400

        try:
            # 获取项目根目录
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            script_path = os.path.join(project_root, 'run_realtime_app.py')

            if not os.path.exists(script_path):
                return jsonify({"error": f"Script not found: {script_path}. Please compile first."}), 400

            # 启动引擎进程
            engine_process = subprocess.Popen(
                [sys.executable, script_path],
                cwd=project_root,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )

            return jsonify({
                "status": "started",
                "pid": engine_process.pid,
                "message": "DAQ Engine started successfully"
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route('/api/engine/stop', methods=['POST'])
def stop_engine():
    """停止 DAQ 引擎"""
    global engine_process

    with engine_lock:
        if engine_process is None:
            return jsonify({"error": "Engine is not running"}), 400

        if engine_process.poll() is not None:
            engine_process = None
            return jsonify({"error": "Engine has already stopped"}), 400

        try:
            # 终止进程
            engine_process.terminate()
            engine_process.wait(timeout=5)
            engine_process = None

            return jsonify({
                "status": "stopped",
                "message": "DAQ Engine stopped successfully"
            })

        except subprocess.TimeoutExpired:
            engine_process.kill()
            engine_process = None
            return jsonify({
                "status": "killed",
                "message": "DAQ Engine killed (timeout)"
            })

        except Exception as e:
            return jsonify({"error": str(e)}), 500


@app.route('/api/engine/status', methods=['GET'])
def engine_status():
    """获取引擎状态"""
    global engine_process

    with engine_lock:
        if engine_process is None:
            return jsonify({"status": "stopped", "running": False})

        if engine_process.poll() is None:
            return jsonify({
                "status": "running",
                "running": True,
                "pid": engine_process.pid
            })
        else:
            # 进程已结束
            engine_process = None
            return jsonify({"status": "stopped", "running": False})


@app.route('/api/health', methods=['GET'])
def health():
    """健康检查"""
    return jsonify({"status": "ok"})


# Debug state storage
debug_state = {
    "enabled": False,
    "breakpoints": [],
    "port_values": {},
    "executing_node": None,
    "paused": False
}
debug_lock = threading.Lock()


@app.route('/api/debug/state', methods=['GET'])
def get_debug_state():
    """获取调试状态"""
    with debug_lock:
        return jsonify(debug_state)


@app.route('/api/debug/enable', methods=['POST'])
def enable_debug():
    """启用调试模式"""
    with debug_lock:
        debug_state["enabled"] = True
        return jsonify({"status": "ok", "enabled": True})


@app.route('/api/debug/disable', methods=['POST'])
def disable_debug():
    """禁用调试模式"""
    with debug_lock:
        debug_state["enabled"] = False
        debug_state["breakpoints"] = []
        debug_state["port_values"] = {}
        debug_state["executing_node"] = None
        debug_state["paused"] = False
        return jsonify({"status": "ok", "enabled": False})


@app.route('/api/debug/breakpoint', methods=['POST'])
def toggle_breakpoint():
    """切换断点"""
    data = request.get_json() or {}
    node_id = data.get("nodeId")
    
    if not node_id:
        return jsonify({"error": "nodeId required"}), 400
    
    with debug_lock:
        if node_id in debug_state["breakpoints"]:
            debug_state["breakpoints"].remove(node_id)
            action = "removed"
        else:
            debug_state["breakpoints"].append(node_id)
            action = "added"
        
        return jsonify({
            "status": "ok",
            "nodeId": node_id,
            "action": action,
            "breakpoints": debug_state["breakpoints"]
        })


@app.route('/api/debug/continue', methods=['POST'])
def debug_continue():
    """继续执行（从断点）"""
    with debug_lock:
        debug_state["paused"] = False
        return jsonify({"status": "ok", "paused": False})


# ============ AI/LLM API ============
import requests

# AI 配置（本地 LLM）
ai_config = {
    "api_endpoint": "http://10.20.99.119:8001/v1/chat/completions",
    "model": "qwen3-vl",
    "temperature": 0.7,
    "max_tokens": 2000
}

# DAQ 专家系统提示词
DAQ_SYSTEM_PROMPT = """你是 accuDaq 数据采集系统的 AI 助手。

可用组件：
- MockDevice: 模拟数据源（正弦波/随机/方波/三角波）
- ModbusClient: Modbus TCP 设备读取
- MQTTSubscriber/MQTTPublisher: MQTT 通信
- MathOperation: 数学运算（+、-、*、/）
- Compare: 比较逻辑（>、<、=、>=、<=）
- ThresholdAlarm: 阈值报警
- DebugPrint: 调试打印
- GlobalVariable: 全局变量读写
- CSVStorage: CSV 数据存储
- Timer: 定时器
- Counter: 计数器

用户可以：
1. 询问组件使用方法
2. 请求生成数据采集脚本
3. 询问如何配置设备连接
4. 询问 Dashboard 设计建议

请提供简洁、准确的回答。如果是代码相关，请提供可执行的示例。"""


@app.route('/api/ai/config', methods=['GET', 'POST'])
def ai_config_endpoint():
    """获取或更新 AI 配置"""
    global ai_config
    
    if request.method == 'GET':
        return jsonify(ai_config)
    else:
        data = request.get_json() or {}
        ai_config.update(data)
        return jsonify({"status": "ok", "config": ai_config})


@app.route('/api/ai/chat', methods=['POST'])
def ai_chat():
    """AI 聊天接口（非流式）"""
    data = request.get_json() or {}
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "messages required"}), 400
    
    try:
        # 构建请求
        full_messages = [
            {"role": "system", "content": DAQ_SYSTEM_PROMPT},
            *messages
        ]
        
        response = requests.post(
            ai_config["api_endpoint"],
            json={
                "model": ai_config["model"],
                "messages": full_messages,
                "temperature": ai_config.get("temperature", 0.7),
                "max_tokens": ai_config.get("max_tokens", 2000),
                "stream": False
            },
            timeout=60
        )
        
        if response.status_code != 200:
            return jsonify({"error": f"LLM API error: {response.status_code}"}), 500
        
        result = response.json()
        content = result.get("choices", [{}])[0].get("message", {}).get("content", "")
        model_name = result.get("model", ai_config["model"])
        
        return jsonify({
            "content": content,
            "model": model_name,
            "status": "ok"
        })
        
    except requests.exceptions.Timeout:
        return jsonify({"error": "LLM API timeout"}), 504
    except requests.exceptions.ConnectionError:
        return jsonify({"error": "Cannot connect to LLM API"}), 503
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/ai/chat/stream', methods=['POST'])
def ai_chat_stream():
    """AI 聊天接口（流式）"""
    from flask import Response, stream_with_context
    
    data = request.get_json() or {}
    messages = data.get('messages', [])
    
    if not messages:
        return jsonify({"error": "messages required"}), 400
    
    def generate():
        try:
            full_messages = [
                {"role": "system", "content": DAQ_SYSTEM_PROMPT},
                *messages
            ]
            
            response = requests.post(
                ai_config["api_endpoint"],
                json={
                    "model": ai_config["model"],
                    "messages": full_messages,
                    "temperature": ai_config.get("temperature", 0.7),
                    "max_tokens": ai_config.get("max_tokens", 2000),
                    "stream": True
                },
                stream=True,
                timeout=60
            )
            
            if response.status_code != 200:
                yield f'data: {{"error": "LLM API error: {response.status_code}"}}\n\n'
                return
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data: '):
                        yield line_str + '\n\n'
                        
        except Exception as e:
            yield f'data: {{"error": "{str(e)}"}}\n\n'
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )


if __name__ == '__main__':
    print("=" * 50)
    print("DAQ API Server")
    print("=" * 50)
    print("Endpoints:")
    print("  POST /api/engine/start - Start DAQ engine")
    print("  POST /api/engine/stop  - Stop DAQ engine")
    print("  GET  /api/engine/status - Get engine status")
    print("  POST /api/ai/chat      - AI chat (non-streaming)")
    print("  POST /api/ai/chat/stream - AI chat (streaming)")
    print("  GET/POST /api/ai/config - AI configuration")
    print("  GET  /api/logs         - Get communication logs")
    print("  GET  /api/history/*    - History data endpoints")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)


# ============ Communication Logs API ============
from daq_core.components.comm_logger import get_comm_logger, get_history_manager, LogLevel


@app.route('/api/logs', methods=['GET'])
def get_logs():
    """获取通信日志"""
    level = request.args.get('level')
    source = request.args.get('source', '')
    start_time = request.args.get('start_time', type=float)
    end_time = request.args.get('end_time', type=float)
    limit = request.args.get('limit', 100, type=int)
    
    level_enum = LogLevel(level) if level else None
    
    logger = get_comm_logger()
    logs = logger.get_logs(
        level=level_enum,
        source=source,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )
    
    return jsonify({"logs": logs, "count": len(logs)})


@app.route('/api/logs/db', methods=['GET'])
def get_logs_from_db():
    """从数据库获取历史日志"""
    level = request.args.get('level')
    source = request.args.get('source', '')
    start_time = request.args.get('start_time', type=float)
    end_time = request.args.get('end_time', type=float)
    limit = request.args.get('limit', 100, type=int)
    
    level_enum = LogLevel(level) if level else None
    
    logger = get_comm_logger()
    logs = logger.get_logs_from_db(
        level=level_enum,
        source=source,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )
    
    return jsonify({"logs": logs, "count": len(logs)})


@app.route('/api/logs/clear', methods=['POST'])
def clear_logs():
    """清除内存中的日志"""
    logger = get_comm_logger()
    logger.clear_memory_logs()
    return jsonify({"status": "ok", "message": "Logs cleared"})


@app.route('/api/logs/export', methods=['GET'])
def export_logs():
    """导出日志"""
    import tempfile
    import os
    
    format_type = request.args.get('format', 'json')
    
    with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{format_type}', delete=False) as f:
        filepath = f.name
    
    logger = get_comm_logger()
    success = logger.export_logs(filepath, format=format_type)
    
    if not success:
        return jsonify({"error": "Export failed"}), 500
    
    from flask import send_file
    return send_file(
        filepath,
        as_attachment=True,
        download_name=f'comm_logs_{int(time.time())}.{format_type}'
    )


# ============ History Data API ============
import time


@app.route('/api/history/sources', methods=['GET'])
def get_history_sources():
    """获取所有数据源"""
    manager = get_history_manager()
    sources = manager.get_sources()
    return jsonify({"sources": sources})


@app.route('/api/history/metrics', methods=['GET'])
def get_history_metrics():
    """获取所有指标"""
    source = request.args.get('source')
    manager = get_history_manager()
    metrics = manager.get_metrics(source)
    return jsonify({"metrics": metrics})


@app.route('/api/history/query', methods=['GET'])
def query_history():
    """查询历史数据"""
    source = request.args.get('source')
    metric = request.args.get('metric')
    start_time = request.args.get('start_time', type=float)
    end_time = request.args.get('end_time', type=float)
    limit = request.args.get('limit', 1000, type=int)
    
    manager = get_history_manager()
    data = manager.query(
        source=source,
        metric=metric,
        start_time=start_time,
        end_time=end_time,
        limit=limit
    )
    
    return jsonify({"data": data, "count": len(data)})


@app.route('/api/history/aggregate', methods=['GET'])
def aggregate_history():
    """聚合历史数据"""
    source = request.args.get('source')
    metric = request.args.get('metric')
    start_time = request.args.get('start_time', type=float)
    end_time = request.args.get('end_time', type=float)
    interval = request.args.get('interval', 60, type=int)
    aggregation = request.args.get('aggregation', 'avg')
    
    if not source or not metric:
        return jsonify({"error": "source and metric required"}), 400
    
    if not start_time or not end_time:
        return jsonify({"error": "start_time and end_time required"}), 400
    
    manager = get_history_manager()
    data = manager.aggregate(
        source=source,
        metric=metric,
        start_time=start_time,
        end_time=end_time,
        interval_seconds=interval,
        aggregation=aggregation
    )
    
    return jsonify({"data": data, "count": len(data)})


@app.route('/api/history/export', methods=['GET'])
def export_history():
    """导出历史数据为 CSV"""
    import tempfile
    
    source = request.args.get('source')
    metric = request.args.get('metric')
    start_time = request.args.get('start_time', type=float)
    end_time = request.args.get('end_time', type=float)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
        filepath = f.name
    
    manager = get_history_manager()
    success = manager.export_to_csv(
        filepath=filepath,
        source=source,
        metric=metric,
        start_time=start_time,
        end_time=end_time
    )
    
    if not success:
        return jsonify({"error": "Export failed"}), 500
    
    from flask import send_file
    return send_file(
        filepath,
        as_attachment=True,
        download_name=f'history_data_{int(time.time())}.csv'
    )


@app.route('/api/history/cleanup', methods=['POST'])
def cleanup_history():
    """清理旧的历史数据"""
    data = request.get_json() or {}
    days = data.get('days', 30)
    
    manager = get_history_manager()
    manager.delete_old_data(days)
    
    return jsonify({"status": "ok", "message": f"Deleted data older than {days} days"})


# ============ Task Scheduler API ============
from daq_core.components.task_scheduler import get_task_scheduler, TriggerType


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    """获取所有任务"""
    scheduler = get_task_scheduler()
    tasks = scheduler.list_tasks()
    return jsonify({"tasks": tasks, "count": len(tasks)})


@app.route('/api/tasks', methods=['POST'])
def create_task():
    """创建任务（简化版，实际任务需要在后端定义 action）"""
    data = request.get_json() or {}
    name = data.get('name', 'Unnamed Task')
    trigger_type = data.get('trigger_type', 'immediate')
    config = data.get('config', {})
    priority = data.get('priority', 5)
    
    # 创建一个简单的打印任务作为演示
    def demo_action():
        print(f"Task executed: {name}")
        return {"status": "ok"}
    
    scheduler = get_task_scheduler()
    task_id = scheduler.create_task(
        name=name,
        action=demo_action,
        trigger_type=TriggerType(trigger_type),
        config=config,
        priority=priority
    )
    
    return jsonify({"status": "ok", "task_id": task_id})


@app.route('/api/tasks/<task_id>', methods=['GET'])
def get_task_detail(task_id):
    """获取任务详情"""
    scheduler = get_task_scheduler()
    task = scheduler.get_task(task_id)
    if not task:
        return jsonify({"error": "Task not found"}), 404
    return jsonify(task)


@app.route('/api/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    """删除任务"""
    scheduler = get_task_scheduler()
    scheduler.remove_task(task_id)
    return jsonify({"status": "ok", "message": f"Task {task_id} deleted"})


@app.route('/api/tasks/<task_id>/pause', methods=['POST'])
def pause_task(task_id):
    """暂停任务"""
    scheduler = get_task_scheduler()
    scheduler.pause_task(task_id)
    return jsonify({"status": "ok", "message": f"Task {task_id} paused"})


@app.route('/api/tasks/<task_id>/resume', methods=['POST'])
def resume_task(task_id):
    """恢复任务"""
    scheduler = get_task_scheduler()
    scheduler.resume_task(task_id)
    return jsonify({"status": "ok", "message": f"Task {task_id} resumed"})


@app.route('/api/tasks/<task_id>/cancel', methods=['POST'])
def cancel_task(task_id):
    """取消任务"""
    scheduler = get_task_scheduler()
    scheduler.cancel_task(task_id)
    return jsonify({"status": "ok", "message": f"Task {task_id} cancelled"})


@app.route('/api/tasks/scheduler/start', methods=['POST'])
def start_scheduler():
    """启动调度器"""
    scheduler = get_task_scheduler()
    scheduler.start()
    return jsonify({"status": "ok", "message": "Scheduler started"})


@app.route('/api/tasks/scheduler/stop', methods=['POST'])
def stop_scheduler():
    """停止调度器"""
    scheduler = get_task_scheduler()
    scheduler.stop()
    return jsonify({"status": "ok", "message": "Scheduler stopped"})


# ============ Data Replay API ============
from daq_core.components.data_replay import get_data_player
from werkzeug.utils import secure_filename
import tempfile


@app.route('/api/replay/load', methods=['POST'])
def load_replay_data():
    """加载回放数据文件"""
    if 'file' not in request.files:
        return jsonify({"error": "No file provided"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    
    filename = secure_filename(file.filename)
    
    # 保存到临时文件
    temp_dir = tempfile.gettempdir()
    temp_path = os.path.join(temp_dir, filename)
    file.save(temp_path)
    
    player = get_data_player()
    
    if filename.endswith('.csv'):
        success = player.load_csv(temp_path)
    elif filename.endswith('.json'):
        success = player.load_json(temp_path)
    else:
        return jsonify({"error": "Unsupported file format"}), 400
    
    if not success:
        return jsonify({"error": "Failed to load file"}), 500
    
    time_range = player.get_time_range()
    
    return jsonify({
        "status": "ok",
        "total_count": player.get_total_count(),
        "channels": player.get_channels(),
        "time_range": list(time_range)
    })


@app.route('/api/replay/play', methods=['POST'])
def play_replay():
    """开始回放"""
    player = get_data_player()
    player.play()
    return jsonify({"status": "ok", "state": "playing"})


@app.route('/api/replay/pause', methods=['POST'])
def pause_replay():
    """暂停回放"""
    player = get_data_player()
    player.pause()
    return jsonify({"status": "ok", "state": "paused"})


@app.route('/api/replay/stop', methods=['POST'])
def stop_replay():
    """停止回放"""
    player = get_data_player()
    player.stop()
    return jsonify({"status": "ok", "state": "stopped"})


@app.route('/api/replay/seek', methods=['POST'])
def seek_replay():
    """跳转到指定位置"""
    position = request.args.get('position', type=float)
    if position is None:
        return jsonify({"error": "position required"}), 400
    
    player = get_data_player()
    player.seek(position)
    return jsonify({"status": "ok", "position": position})


@app.route('/api/replay/speed', methods=['POST'])
def set_replay_speed():
    """设置回放速度"""
    speed = request.args.get('value', type=float)
    if speed is None:
        return jsonify({"error": "value required"}), 400
    
    player = get_data_player()
    player.set_speed(speed)
    return jsonify({"status": "ok", "speed": speed})


@app.route('/api/replay/step/forward', methods=['POST'])
def step_forward_replay():
    """单步前进"""
    player = get_data_player()
    player.step_forward()
    return jsonify({"status": "ok"})


@app.route('/api/replay/step/backward', methods=['POST'])
def step_backward_replay():
    """单步后退"""
    player = get_data_player()
    player.step_backward()
    return jsonify({"status": "ok"})


@app.route('/api/replay/state', methods=['GET'])
def get_replay_state():
    """获取回放状态"""
    player = get_data_player()
    time_range = player.get_time_range()
    
    return jsonify({
        "state": player.get_state().value,
        "progress": player.get_progress(),
        "current_time": player.get_current_time(),
        "total_count": player.get_total_count(),
        "channels": player.get_channels(),
        "time_range": list(time_range)
    })


# ============ Report Generation API ============
from daq_core.components.report_generator import ReportBuilder


@app.route('/api/report/generate', methods=['POST'])
def generate_report():
    """生成报告"""
    data = request.get_json() or {}
    title = data.get('title', 'DAQ Report')
    format_type = data.get('format', 'html')
    sections = data.get('sections', [])
    
    generator = ReportBuilder.create(format_type)
    generator.set_title(title)
    generator.set_author(data.get('author', 'accuDaq'))
    
    for section in sections:
        section_type = section.get('type', 'text')
        section_title = section.get('title', '')
        content = section.get('content')
        
        if section_type == 'text':
            generator.add_text(section_title, content)
        elif section_type == 'table':
            generator.add_table(section_title, content.get('headers', []), content.get('rows', []))
        elif section_type == 'key_value':
            generator.add_key_value(section_title, content)
    
    # 生成到临时文件
    temp_dir = tempfile.gettempdir()
    ext = {'html': '.html', 'pdf': '.pdf', 'csv': '.csv'}.get(format_type, '.html')
    temp_path = os.path.join(temp_dir, f'report_{int(time.time())}{ext}')
    
    success = generator.generate(temp_path)
    if not success:
        return jsonify({"error": "Failed to generate report"}), 500
    
    from flask import send_file
    return send_file(
        temp_path,
        as_attachment=True,
        download_name=f'report{ext}'
    )


# ============ i18n API ============
from daq_core.i18n import get_i18n, set_language, t


@app.route('/api/i18n/languages', methods=['GET'])
def get_languages():
    """获取支持的语言列表"""
    i18n = get_i18n()
    return jsonify({
        "languages": i18n.get_supported_languages(),
        "current": i18n.current_language
    })


@app.route('/api/i18n/language', methods=['GET'])
def get_current_language():
    """获取当前语言"""
    i18n = get_i18n()
    return jsonify({"language": i18n.current_language})


@app.route('/api/i18n/language', methods=['POST'])
def set_current_language():
    """设置当前语言"""
    data = request.get_json() or {}
    lang = data.get('language', 'zh-CN')
    set_language(lang)
    return jsonify({"status": "ok", "language": lang})


@app.route('/api/i18n/translate', methods=['GET'])
def translate():
    """翻译文本"""
    key = request.args.get('key', '')
    text = t(key)
    return jsonify({"key": key, "text": text})


@app.route('/api/i18n/translations', methods=['GET'])
def get_translations():
    """获取所有翻译"""
    lang = request.args.get('lang')
    i18n = get_i18n()
    
    if lang:
        translations = i18n._translations.get(lang, {})
    else:
        translations = i18n._translations.get(i18n.current_language, {})
    
    return jsonify({"translations": translations})


# ============ Variable Binding API ============
from daq_core.components.variable_binding import get_binding_manager, get_device_monitor


@app.route('/api/bindings', methods=['GET'])
def get_bindings():
    """获取所有变量绑定"""
    manager = get_binding_manager()
    return jsonify({"bindings": manager.list_bindings()})


@app.route('/api/bindings', methods=['POST'])
def create_binding():
    """创建变量绑定"""
    data = request.get_json() or {}
    
    manager = get_binding_manager()
    binding_id = manager.create_binding(
        source_component=data.get('source_component', ''),
        source_port=data.get('source_port', ''),
        target_component=data.get('target_component', ''),
        target_property=data.get('target_property', ''),
        update_interval_ms=data.get('update_interval_ms', 100),
    )
    
    return jsonify({"status": "ok", "binding_id": binding_id})


@app.route('/api/bindings/<binding_id>', methods=['DELETE'])
def delete_binding(binding_id):
    """删除变量绑定"""
    manager = get_binding_manager()
    manager.remove_binding(binding_id)
    return jsonify({"status": "ok"})


@app.route('/api/devices/status', methods=['GET'])
def get_devices_status():
    """获取所有设备状态"""
    monitor = get_device_monitor()
    return jsonify({"devices": monitor.get_all_status()})


# ============ AI Assistant API ============
from daq_core.ai_assistant import get_ai_assistant, get_code_generator


@app.route('/api/ai/assistant/chat', methods=['POST'])
def ai_assistant_chat():
    """与 AI 助手对话"""
    data = request.get_json() or {}
    message = data.get('message', '')
    context = data.get('context', {})
    
    ai = get_ai_assistant()
    response = ai.chat(message, context)
    
    return jsonify({"response": response})


@app.route('/api/ai/assistant/configure', methods=['POST'])
def ai_assistant_configure():
    """配置 AI 助手"""
    data = request.get_json() or {}
    
    ai = get_ai_assistant()
    ai.configure(data)
    
    return jsonify({"status": "ok"})


@app.route('/api/ai/assistant/generate-code', methods=['POST'])
def ai_assistant_generate_code():
    """AI 生成组件代码"""
    data = request.get_json() or {}
    description = data.get('description', '')
    
    ai = get_ai_assistant()
    code = ai.generate_component_code(description)
    
    return jsonify({"code": code})


@app.route('/api/ai/assistant/diagnose', methods=['POST'])
def ai_assistant_diagnose():
    """AI 错误诊断"""
    data = request.get_json() or {}
    error = data.get('error', '')
    code = data.get('code', '')
    
    ai = get_ai_assistant()
    diagnosis = ai.diagnose_error(error, code)
    
    return jsonify({"diagnosis": diagnosis})


@app.route('/api/ai/assistant/recommend', methods=['POST'])
def ai_assistant_recommend():
    """AI 组件推荐"""
    data = request.get_json() or {}
    requirements = data.get('requirements', '')
    
    ai = get_ai_assistant()
    recommendations = ai.recommend_components(requirements)
    
    return jsonify({"recommendations": recommendations})


@app.route('/api/ai/assistant/clear-history', methods=['POST'])
def ai_assistant_clear_history():
    """清除 AI 对话历史"""
    ai = get_ai_assistant()
    ai.clear_history()
    return jsonify({"status": "ok"})


# ============ Code Generation API ============
@app.route('/api/codegen/component', methods=['POST'])
def generate_component_code():
    """生成组件代码"""
    data = request.get_json() or {}
    
    generator = get_code_generator()
    code = generator.generate_component(data)
    
    return jsonify({"code": code})


# ============ LVGL Integration API ============
from daq_core.lvgl_integration import get_lvgl_bridge


@app.route('/api/lvgl/status', methods=['GET'])
def lvgl_status():
    """获取 LVGL 设计器状态"""
    bridge = get_lvgl_bridge()
    return jsonify({
        "available": bridge.is_available,
        "project_path": bridge._lvgl_project_path,
    })


@app.route('/api/lvgl/designs', methods=['GET'])
def get_lvgl_designs():
    """获取 LVGL 设计文件列表"""
    bridge = get_lvgl_bridge()
    designs = bridge.get_design_files()
    return jsonify({"designs": designs})


@app.route('/api/lvgl/load', methods=['POST'])
def load_lvgl_design():
    """加载 LVGL 设计"""
    data = request.get_json() or {}
    design_path = data.get('path', '')
    
    bridge = get_lvgl_bridge()
    design = bridge.load_design(design_path)
    
    if design:
        return jsonify({"status": "ok", "design": design})
    else:
        return jsonify({"error": "Failed to load design"}), 400


@app.route('/api/lvgl/generate-code', methods=['POST'])
def generate_lvgl_code():
    """生成 LVGL C 代码"""
    data = request.get_json() or {}
    design = data.get('design', {})
    output_dir = data.get('output_dir', tempfile.gettempdir())
    
    bridge = get_lvgl_bridge()
    files = bridge.generate_c_code(design, output_dir)
    
    if files:
        return jsonify({"status": "ok", "files": list(files.keys())})
    else:
        return jsonify({"error": "Failed to generate code"}), 400


@app.route('/api/lvgl/open-designer', methods=['POST'])
def open_lvgl_designer():
    """在 VSCode 中打开 LVGL 设计器"""
    data = request.get_json() or {}
    design_path = data.get('path')
    
    bridge = get_lvgl_bridge()
    bridge.open_in_vscode(design_path)
    
    return jsonify({"status": "ok"})


# ============ Cloud Deployment API ============
from daq_core.cloud_deployment import get_deployment_manager, DeploymentConfig, DeploymentTarget


@app.route('/api/deploy/prepare', methods=['POST'])
def prepare_deployment():
    """准备部署文件"""
    data = request.get_json() or {}
    
    config = DeploymentConfig(
        target=DeploymentTarget(data.get('target', 'docker')),
        image_name=data.get('image_name', 'daq-app'),
        image_tag=data.get('image_tag', 'latest'),
        port=data.get('port', 5000),
        replicas=data.get('replicas', 1),
    )
    
    manager = get_deployment_manager(os.path.dirname(os.path.dirname(__file__)))
    files = manager.prepare_deployment(config)
    
    return jsonify({"status": "ok", "files": {k: str(v) for k, v in files.items()}})


@app.route('/api/deploy/execute', methods=['POST'])
def execute_deployment():
    """执行部署"""
    data = request.get_json() or {}
    
    config = DeploymentConfig(
        target=DeploymentTarget(data.get('target', 'docker')),
        image_name=data.get('image_name', 'daq-app'),
        image_tag=data.get('image_tag', 'latest'),
        port=data.get('port', 5000),
        replicas=data.get('replicas', 1),
    )
    
    manager = get_deployment_manager(os.path.dirname(os.path.dirname(__file__)))
    success = manager.deploy(config)
    
    if success:
        return jsonify({"status": "ok", "message": "Deployment successful"})
    else:
        return jsonify({"error": "Deployment failed"}), 500


@app.route('/api/deploy/status', methods=['GET'])
def deployment_status():
    """获取部署状态"""
    target = request.args.get('target', 'docker')
    
    config = DeploymentConfig(
        target=DeploymentTarget(target),
    )
    
    manager = get_deployment_manager(os.path.dirname(os.path.dirname(__file__)))
    status = manager.get_deployment_status(config)
    
    return jsonify(status)


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查端点"""
    return jsonify({
        "status": "healthy",
        "timestamp": time.time(),
        "version": "1.0.0",
    })


# ============ CI/CD Automation API ============
from daq_core.automation import (
    get_pipeline_runner, get_build_monitor,
    PipelineBuilder, CIConfigGenerator, Pipeline, BuildStep, PipelineStage, BuildStatus
)

# 存储流水线
_pipelines: Dict = {}


@app.route('/api/cicd/pipelines', methods=['GET'])
def get_pipelines():
    """获取所有流水线"""
    return jsonify({
        "pipelines": [p.to_dict() for p in _pipelines.values()]
    })


@app.route('/api/cicd/template', methods=['POST'])
def create_pipeline_from_template():
    """从模板创建流水线"""
    data = request.get_json() or {}
    template = data.get('template', 'python')
    project_name = data.get('project_name', 'My Project')
    
    if template == 'python':
        pipeline = PipelineBuilder.create_python_pipeline(project_name)
    elif template == 'nodejs':
        pipeline = PipelineBuilder.create_nodejs_pipeline(project_name)
    elif template == 'embedded':
        pipeline = PipelineBuilder.create_embedded_pipeline(project_name)
    elif template == 'daq':
        pipeline = PipelineBuilder.create_daq_pipeline(project_name)
    else:
        return jsonify({"error": "Unknown template"}), 400
    
    _pipelines[pipeline.id] = pipeline
    return jsonify({"status": "ok", "pipeline": pipeline.to_dict()})


@app.route('/api/cicd/run', methods=['POST'])
def run_pipeline():
    """运行流水线"""
    data = request.get_json() or {}
    pipeline_id = data.get('pipeline_id')
    
    if pipeline_id not in _pipelines:
        return jsonify({"error": "Pipeline not found"}), 404
    
    pipeline = _pipelines[pipeline_id]
    runner = get_pipeline_runner(os.path.dirname(os.path.dirname(__file__)))
    
    # 在后台线程运行
    def run_in_background():
        runner.run_pipeline(pipeline)
        get_build_monitor().save_to_history(pipeline)
    
    import threading
    thread = threading.Thread(target=run_in_background)
    thread.start()
    
    return jsonify({"status": "ok", "message": "Pipeline started"})


@app.route('/api/cicd/status/<pipeline_id>', methods=['GET'])
def get_pipeline_status(pipeline_id):
    """获取流水线状态"""
    if pipeline_id not in _pipelines:
        return jsonify({"error": "Pipeline not found"}), 404
    
    pipeline = _pipelines[pipeline_id]
    return jsonify({"pipeline": pipeline.to_dict()})


@app.route('/api/cicd/cancel', methods=['POST'])
def cancel_pipeline():
    """取消流水线"""
    runner = get_pipeline_runner()
    runner.cancel()
    return jsonify({"status": "ok"})


@app.route('/api/cicd/history', methods=['GET'])
def get_build_history():
    """获取构建历史"""
    monitor = get_build_monitor()
    return jsonify({
        "history": monitor.get_history(),
        "statistics": monitor.get_statistics(),
    })


@app.route('/api/cicd/export', methods=['POST'])
def export_ci_config():
    """导出 CI 配置"""
    data = request.get_json() or {}
    pipeline_id = data.get('pipeline_id')
    format_type = data.get('format', 'github')
    
    if pipeline_id not in _pipelines:
        return jsonify({"error": "Pipeline not found"}), 404
    
    pipeline = _pipelines[pipeline_id]
    
    if format_type == 'github':
        config = CIConfigGenerator.generate_github_actions(pipeline)
    elif format_type == 'gitlab':
        config = CIConfigGenerator.generate_gitlab_ci(pipeline)
    elif format_type == 'jenkins':
        config = CIConfigGenerator.generate_jenkins_pipeline(pipeline)
    else:
        return jsonify({"error": "Unknown format"}), 400
    
    return jsonify({"config": config})





