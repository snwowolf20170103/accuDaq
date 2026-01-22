"""
DAQ API 服务器
提供 REST API 供前端控制 DAQ 引擎
"""

import subprocess
import threading
import sys
import os
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


if __name__ == '__main__':
    print("=" * 50)
    print("DAQ API Server")
    print("=" * 50)
    print("Endpoints:")
    print("  POST /api/engine/start - Start DAQ engine")
    print("  POST /api/engine/stop  - Stop DAQ engine")
    print("  GET  /api/engine/status - Get engine status")
    print("=" * 50)

    app.run(host='0.0.0.0', port=5000, debug=True)
