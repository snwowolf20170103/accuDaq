"""
任务调度系统
支持定时任务、条件触发、任务编排
"""

import logging
import threading
import time
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional, Callable, Union
from enum import Enum
from dataclasses import dataclass, field
from collections import deque
import heapq

logger = logging.getLogger(__name__)


class TaskState(Enum):
    """任务状态"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class TriggerType(Enum):
    """触发类型"""
    IMMEDIATE = "immediate"       # 立即执行
    SCHEDULED = "scheduled"       # 定时执行
    INTERVAL = "interval"         # 周期执行
    CRON = "cron"                 # Cron 表达式
    CONDITION = "condition"       # 条件触发
    EVENT = "event"               # 事件触发


@dataclass
class TaskResult:
    """任务执行结果"""
    task_id: str
    success: bool
    result: Any = None
    error: str = None
    start_time: float = 0
    end_time: float = 0
    duration_ms: float = 0


@dataclass
class Task:
    """任务定义"""
    id: str
    name: str
    trigger_type: TriggerType
    action: Callable  # 执行函数
    config: Dict = field(default_factory=dict)
    state: TaskState = TaskState.PENDING
    priority: int = 5  # 1-10, 1 最高
    enabled: bool = True
    max_retries: int = 0
    retry_count: int = 0
    last_run: float = 0
    next_run: float = 0
    results: List[TaskResult] = field(default_factory=list)


class ConditionEvaluator:
    """
    条件评估器
    用于评估触发条件
    """
    
    def __init__(self, component_registry: Dict = None):
        self._component_registry = component_registry or {}
    
    def set_component_registry(self, registry: Dict):
        self._component_registry = registry
    
    def evaluate(self, condition: Dict) -> bool:
        """
        评估条件
        
        条件格式：
        {
            "type": "variable" | "threshold" | "change" | "expression",
            "source": "component.port",
            "operator": ">" | "<" | "==" | "!=" | ">=" | "<=",
            "value": 100,
            "and": [...],  # 可选的 AND 条件
            "or": [...]    # 可选的 OR 条件
        }
        """
        condition_type = condition.get("type", "variable")
        
        try:
            if condition_type == "variable":
                return self._eval_variable_condition(condition)
            elif condition_type == "threshold":
                return self._eval_threshold_condition(condition)
            elif condition_type == "change":
                return self._eval_change_condition(condition)
            elif condition_type == "expression":
                return self._eval_expression_condition(condition)
            else:
                return False
        except Exception as e:
            logger.error(f"条件评估失败: {e}")
            return False
    
    def _get_value(self, source: str) -> Any:
        """获取变量值"""
        parts = source.split(".")
        if len(parts) != 2:
            return None
        
        component_id, port_name = parts
        component = self._component_registry.get(component_id)
        if component is None:
            return None
        
        try:
            return component.get_output(port_name)
        except:
            return None
    
    def _eval_variable_condition(self, condition: Dict) -> bool:
        """评估变量条件"""
        source = condition.get("source", "")
        operator = condition.get("operator", "==")
        target_value = condition.get("value")
        
        current_value = self._get_value(source)
        if current_value is None:
            return False
        
        operators = {
            ">": lambda a, b: a > b,
            "<": lambda a, b: a < b,
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            ">=": lambda a, b: a >= b,
            "<=": lambda a, b: a <= b,
        }
        
        op_func = operators.get(operator)
        if op_func:
            result = op_func(current_value, target_value)
        else:
            result = False
        
        # 处理复合条件
        if "and" in condition:
            for sub_cond in condition["and"]:
                if not self.evaluate(sub_cond):
                    return False
        
        if "or" in condition:
            or_result = False
            for sub_cond in condition["or"]:
                if self.evaluate(sub_cond):
                    or_result = True
                    break
            return result and or_result
        
        return result
    
    def _eval_threshold_condition(self, condition: Dict) -> bool:
        """评估阈值条件"""
        source = condition.get("source", "")
        threshold = condition.get("threshold", 0)
        direction = condition.get("direction", "above")  # above, below, cross
        
        current_value = self._get_value(source)
        if current_value is None:
            return False
        
        if direction == "above":
            return current_value > threshold
        elif direction == "below":
            return current_value < threshold
        else:
            # cross 需要历史值比较，简化为不等于
            return current_value != threshold
    
    def _eval_change_condition(self, condition: Dict) -> bool:
        """评估变化条件"""
        # 简化实现，实际需要维护历史值
        return True
    
    def _eval_expression_condition(self, condition: Dict) -> bool:
        """评估表达式条件"""
        expression = condition.get("expression", "")
        
        # 构建变量上下文
        context = {}
        for var_path in condition.get("variables", []):
            var_name = var_path.replace(".", "_")
            context[var_name] = self._get_value(var_path)
        
        try:
            return bool(eval(expression, {"__builtins__": {}}, context))
        except:
            return False


class TaskScheduler:
    """
    任务调度器
    
    功能：
    - 定时任务调度
    - 条件触发任务
    - 任务优先级管理
    - 任务执行记录
    """
    
    def __init__(self):
        self._tasks: Dict[str, Task] = {}
        self._task_queue: List[tuple] = []  # (next_run, priority, task_id)
        self._condition_evaluator = ConditionEvaluator()
        self._event_listeners: Dict[str, List[str]] = {}  # event_name -> [task_ids]
        self._thread: Optional[threading.Thread] = None
        self._stop_event = threading.Event()
        self._lock = threading.Lock()
        self._max_history = 100
    
    def set_component_registry(self, registry: Dict):
        """设置组件注册表"""
        self._condition_evaluator.set_component_registry(registry)
    
    def create_task(
        self,
        name: str,
        action: Callable,
        trigger_type: TriggerType = TriggerType.IMMEDIATE,
        config: Dict = None,
        priority: int = 5,
        max_retries: int = 0,
    ) -> str:
        """
        创建任务
        
        Args:
            name: 任务名称
            action: 执行函数（无参数或接收 context 字典）
            trigger_type: 触发类型
            config: 触发配置
            priority: 优先级 (1-10, 1 最高)
            max_retries: 最大重试次数
        
        Config 格式：
        - SCHEDULED: {"run_at": timestamp}
        - INTERVAL: {"interval_ms": 1000}
        - CRON: {"cron": "0 * * * *"}
        - CONDITION: {"condition": {...}}
        - EVENT: {"event": "event_name"}
        """
        task_id = str(uuid.uuid4())[:8]
        
        task = Task(
            id=task_id,
            name=name,
            trigger_type=trigger_type,
            action=action,
            config=config or {},
            priority=priority,
            max_retries=max_retries,
        )
        
        # 计算下次运行时间
        task.next_run = self._calculate_next_run(task)
        
        with self._lock:
            self._tasks[task_id] = task
            
            # 添加到队列
            if trigger_type in [TriggerType.IMMEDIATE, TriggerType.SCHEDULED, TriggerType.INTERVAL]:
                heapq.heappush(self._task_queue, (task.next_run, task.priority, task_id))
            
            # 注册事件监听
            if trigger_type == TriggerType.EVENT:
                event_name = config.get("event", "")
                if event_name:
                    if event_name not in self._event_listeners:
                        self._event_listeners[event_name] = []
                    self._event_listeners[event_name].append(task_id)
        
        logger.info(f"创建任务: {name} (ID: {task_id}, 类型: {trigger_type.value})")
        return task_id
    
    def _calculate_next_run(self, task: Task) -> float:
        """计算下次运行时间"""
        now = time.time()
        
        if task.trigger_type == TriggerType.IMMEDIATE:
            return now
        elif task.trigger_type == TriggerType.SCHEDULED:
            return task.config.get("run_at", now)
        elif task.trigger_type == TriggerType.INTERVAL:
            interval_ms = task.config.get("interval_ms", 1000)
            if task.last_run == 0:
                return now
            return task.last_run + interval_ms / 1000
        elif task.trigger_type == TriggerType.CRON:
            # 简化的 Cron 解析
            return now + 60  # 默认 1 分钟后
        else:
            return float('inf')
    
    def cancel_task(self, task_id: str):
        """取消任务"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].state = TaskState.CANCELLED
                self._tasks[task_id].enabled = False
        logger.info(f"取消任务: {task_id}")
    
    def pause_task(self, task_id: str):
        """暂停任务"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].state = TaskState.PAUSED
                self._tasks[task_id].enabled = False
    
    def resume_task(self, task_id: str):
        """恢复任务"""
        with self._lock:
            if task_id in self._tasks:
                self._tasks[task_id].state = TaskState.PENDING
                self._tasks[task_id].enabled = True
                # 重新加入队列
                task = self._tasks[task_id]
                if task.trigger_type in [TriggerType.SCHEDULED, TriggerType.INTERVAL]:
                    task.next_run = self._calculate_next_run(task)
                    heapq.heappush(self._task_queue, (task.next_run, task.priority, task_id))
    
    def remove_task(self, task_id: str):
        """删除任务"""
        with self._lock:
            if task_id in self._tasks:
                del self._tasks[task_id]
                # 从事件监听中移除
                for listeners in self._event_listeners.values():
                    if task_id in listeners:
                        listeners.remove(task_id)
        logger.info(f"删除任务: {task_id}")
    
    def get_task(self, task_id: str) -> Optional[Dict]:
        """获取任务信息"""
        task = self._tasks.get(task_id)
        if not task:
            return None
        
        return {
            "id": task.id,
            "name": task.name,
            "trigger_type": task.trigger_type.value,
            "state": task.state.value,
            "priority": task.priority,
            "enabled": task.enabled,
            "last_run": task.last_run,
            "next_run": task.next_run,
            "retry_count": task.retry_count,
            "results_count": len(task.results),
        }
    
    def list_tasks(self) -> List[Dict]:
        """列出所有任务"""
        return [self.get_task(task_id) for task_id in self._tasks.keys()]
    
    def fire_event(self, event_name: str, data: Any = None):
        """触发事件"""
        task_ids = self._event_listeners.get(event_name, [])
        for task_id in task_ids:
            task = self._tasks.get(task_id)
            if task and task.enabled:
                self._execute_task(task, {"event": event_name, "data": data})
    
    def check_conditions(self):
        """检查条件触发任务"""
        for task in self._tasks.values():
            if task.trigger_type == TriggerType.CONDITION and task.enabled:
                condition = task.config.get("condition", {})
                if self._condition_evaluator.evaluate(condition):
                    self._execute_task(task)
    
    def _execute_task(self, task: Task, context: Dict = None):
        """执行任务"""
        if not task.enabled:
            return
        
        task.state = TaskState.RUNNING
        task.last_run = time.time()
        
        result = TaskResult(
            task_id=task.id,
            success=False,
            start_time=time.time(),
        )
        
        try:
            # 执行任务
            if context:
                action_result = task.action(context)
            else:
                action_result = task.action()
            
            result.success = True
            result.result = action_result
            task.state = TaskState.COMPLETED
            task.retry_count = 0
            
        except Exception as e:
            result.success = False
            result.error = str(e)
            task.state = TaskState.FAILED
            logger.error(f"任务执行失败 {task.name}: {e}")
            
            # 重试逻辑
            if task.retry_count < task.max_retries:
                task.retry_count += 1
                task.state = TaskState.PENDING
                logger.info(f"任务将重试 {task.name} (第 {task.retry_count} 次)")
        
        result.end_time = time.time()
        result.duration_ms = (result.end_time - result.start_time) * 1000
        
        # 保存结果
        task.results.append(result)
        if len(task.results) > self._max_history:
            task.results = task.results[-self._max_history:]
        
        # 周期任务重新调度
        if task.trigger_type == TriggerType.INTERVAL and task.enabled:
            task.next_run = self._calculate_next_run(task)
            heapq.heappush(self._task_queue, (task.next_run, task.priority, task.id))
    
    def start(self):
        """启动调度器"""
        if self._thread and self._thread.is_alive():
            return
        
        self._stop_event.clear()
        self._thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self._thread.start()
        logger.info("任务调度器已启动")
    
    def stop(self):
        """停止调度器"""
        self._stop_event.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)
        logger.info("任务调度器已停止")
    
    def _scheduler_loop(self):
        """调度循环"""
        while not self._stop_event.is_set():
            try:
                now = time.time()
                
                # 检查定时任务
                while self._task_queue:
                    next_run, priority, task_id = self._task_queue[0]
                    
                    if next_run > now:
                        break
                    
                    heapq.heappop(self._task_queue)
                    
                    task = self._tasks.get(task_id)
                    if task and task.enabled:
                        self._execute_task(task)
                
                # 检查条件触发任务
                self.check_conditions()
                
                self._stop_event.wait(0.1)
                
            except Exception as e:
                logger.error(f"调度循环异常: {e}")


# 全局实例
_task_scheduler: Optional[TaskScheduler] = None


def get_task_scheduler() -> TaskScheduler:
    """获取任务调度器"""
    global _task_scheduler
    if _task_scheduler is None:
        _task_scheduler = TaskScheduler()
    return _task_scheduler
