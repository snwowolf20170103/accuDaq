"""
AI 功能增强模块
提供智能代码生成、自然语言处理、智能推荐等功能
"""

import os
import json
import logging
import time
from typing import Any, Dict, List, Optional, Callable
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class AIProvider(Enum):
    """AI 提供商"""
    OPENAI = "openai"
    AZURE_OPENAI = "azure_openai"
    ANTHROPIC = "anthropic"
    LOCAL = "local"  # 本地模型，如 Ollama


@dataclass
class AIConfig:
    """AI 配置"""
    provider: AIProvider = AIProvider.OPENAI
    api_key: str = ""
    api_base: str = ""
    model: str = "gpt-4"
    temperature: float = 0.7
    max_tokens: int = 4096


class AIAssistant:
    """
    AI 助手
    
    功能：
    - 自然语言代码生成
    - 代码补全与建议
    - 错误诊断
    - 组件推荐
    - 文档生成
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        
        self._initialized = True
        self._config = AIConfig()
        self._client = None
        self._conversation_history: List[Dict] = []
        self._max_history = 20
    
    def configure(self, config: Dict):
        """配置 AI"""
        if "provider" in config:
            self._config.provider = AIProvider(config["provider"])
        if "api_key" in config:
            self._config.api_key = config["api_key"]
        if "api_base" in config:
            self._config.api_base = config["api_base"]
        if "model" in config:
            self._config.model = config["model"]
        if "temperature" in config:
            self._config.temperature = config["temperature"]
        
        self._init_client()
    
    def _init_client(self):
        """初始化 AI 客户端"""
        try:
            if self._config.provider == AIProvider.OPENAI:
                import openai
                openai.api_key = self._config.api_key
                if self._config.api_base:
                    openai.api_base = self._config.api_base
                self._client = openai
                
            elif self._config.provider == AIProvider.ANTHROPIC:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self._config.api_key)
                
            elif self._config.provider == AIProvider.LOCAL:
                # 使用本地 Ollama 或其他本地模型
                self._client = None
                
            logger.info(f"AI 客户端已初始化: {self._config.provider.value}")
        except Exception as e:
            logger.error(f"AI 客户端初始化失败: {e}")
            self._client = None
    
    def chat(self, message: str, context: Dict = None) -> str:
        """
        与 AI 对话
        
        Args:
            message: 用户消息
            context: 上下文信息 (当前项目、组件等)
        """
        # 添加到历史
        self._conversation_history.append({"role": "user", "content": message})
        
        # 限制历史长度
        if len(self._conversation_history) > self._max_history:
            self._conversation_history = self._conversation_history[-self._max_history:]
        
        try:
            response = self._call_ai(message, context)
            self._conversation_history.append({"role": "assistant", "content": response})
            return response
        except Exception as e:
            logger.error(f"AI 调用失败: {e}")
            return f"抱歉，AI 服务暂时不可用: {str(e)}"
    
    def _call_ai(self, message: str, context: Dict = None) -> str:
        """调用 AI API"""
        system_prompt = self._build_system_prompt(context)
        
        if self._config.provider == AIProvider.OPENAI:
            return self._call_openai(system_prompt, message)
        elif self._config.provider == AIProvider.ANTHROPIC:
            return self._call_anthropic(system_prompt, message)
        elif self._config.provider == AIProvider.LOCAL:
            return self._call_local(system_prompt, message)
        else:
            return "未配置 AI 服务"
    
    def _build_system_prompt(self, context: Dict = None) -> str:
        """构建系统提示词"""
        base_prompt = """你是 DAQ IDE 的 AI 助手，专门帮助用户进行数据采集与控制系统的开发。

你的能力包括：
1. 生成 Python DAQ 组件代码
2. 解释和优化现有代码
3. 推荐适合的组件和配置
4. 诊断和修复错误
5. 生成测试报告
6. 创建 UI 界面描述

DAQ 系统的核心组件类型：
- 设备组件: MockDevice, SerialPort, ModbusRTU, USB, Bluetooth
- 通信协议: MQTT, OPC-UA, EtherCAT, CANopen, IEC 61850
- 数据处理: FFT, Filter, Statistics, PID
- 存储: CSV, Database
- 控制: Timer, Conditional, WhileLoop

请用专业、简洁的语言回答问题。如果生成代码，请确保代码完整可用。"""

        if context:
            base_prompt += f"\n\n当前上下文:\n{json.dumps(context, ensure_ascii=False, indent=2)}"
        
        return base_prompt
    
    def _call_openai(self, system_prompt: str, message: str) -> str:
        """调用 OpenAI API"""
        try:
            messages = [{"role": "system", "content": system_prompt}]
            messages.extend(self._conversation_history[-10:])
            
            response = self._client.ChatCompletion.create(
                model=self._config.model,
                messages=messages,
                temperature=self._config.temperature,
                max_tokens=self._config.max_tokens,
            )
            
            return response.choices[0].message.content
        except Exception as e:
            raise Exception(f"OpenAI API 错误: {e}")
    
    def _call_anthropic(self, system_prompt: str, message: str) -> str:
        """调用 Anthropic API"""
        try:
            response = self._client.messages.create(
                model=self._config.model,
                max_tokens=self._config.max_tokens,
                system=system_prompt,
                messages=self._conversation_history[-10:],
            )
            
            return response.content[0].text
        except Exception as e:
            raise Exception(f"Anthropic API 错误: {e}")
    
    def _call_local(self, system_prompt: str, message: str) -> str:
        """调用本地模型 (Ollama)"""
        import requests
        
        try:
            response = requests.post(
                "http://localhost:11434/api/generate",
                json={
                    "model": self._config.model or "llama2",
                    "prompt": f"{system_prompt}\n\nUser: {message}\nAssistant:",
                    "stream": False,
                },
                timeout=60,
            )
            
            if response.ok:
                return response.json().get("response", "")
            else:
                raise Exception(f"本地模型错误: {response.text}")
        except requests.exceptions.ConnectionError:
            return "本地 AI 模型未启动，请确保 Ollama 服务正在运行"
    
    def generate_component_code(self, description: str) -> str:
        """
        根据自然语言描述生成组件代码
        
        Args:
            description: 组件功能描述
        """
        prompt = f"""请根据以下描述生成一个 DAQ 组件的完整 Python 代码:

描述: {description}

要求:
1. 继承 ComponentBase 类
2. 使用 @ComponentRegistry.register 装饰器
3. 实现 _setup_ports, _on_configure, start, stop, process 方法
4. 添加完整的类型注解和文档字符串
5. 代码必须可以直接运行

请只输出 Python 代码，不要其他解释。"""

        return self.chat(prompt, {"task": "code_generation"})
    
    def diagnose_error(self, error_message: str, code: str = None) -> str:
        """
        诊断错误
        
        Args:
            error_message: 错误信息
            code: 相关代码
        """
        prompt = f"""请分析以下错误并提供解决方案:

错误信息:
{error_message}
"""
        if code:
            prompt += f"""
相关代码:
```python
{code}
```
"""
        prompt += """
请提供:
1. 错误原因分析
2. 具体解决步骤
3. 修复后的代码（如果适用）"""

        return self.chat(prompt, {"task": "error_diagnosis"})
    
    def recommend_components(self, requirements: str) -> List[Dict]:
        """
        推荐组件
        
        Args:
            requirements: 需求描述
        """
        prompt = f"""根据以下需求，推荐合适的 DAQ 组件组合:

需求: {requirements}

请返回 JSON 格式的推荐列表，包含:
- component_type: 组件类型
- reason: 推荐理由
- config: 建议配置

只返回 JSON 数组，不要其他内容。"""

        response = self.chat(prompt, {"task": "recommendation"})
        
        try:
            # 尝试解析 JSON
            import re
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
        except:
            pass
        
        return []
    
    def generate_documentation(self, code: str) -> str:
        """为代码生成文档"""
        prompt = f"""请为以下代码生成详细的 API 文档:

```python
{code}
```

文档格式要求:
1. 类/函数概述
2. 参数说明
3. 返回值说明
4. 使用示例
5. 注意事项"""

        return self.chat(prompt, {"task": "documentation"})
    
    def generate_test_cases(self, code: str) -> str:
        """为代码生成测试用例"""
        prompt = f"""请为以下代码生成完整的单元测试:

```python
{code}
```

要求:
1. 使用 pytest 框架
2. 覆盖所有公开方法
3. 包含边界条件测试
4. 包含异常处理测试"""

        return self.chat(prompt, {"task": "test_generation"})
    
    def clear_history(self):
        """清除对话历史"""
        self._conversation_history.clear()


class CodeGenerator:
    """
    代码生成器
    
    功能：
    - 从可视化设计生成代码
    - 支持多种语言输出
    - 支持增量更新
    """
    
    def __init__(self):
        self._templates: Dict[str, str] = {}
        self._load_templates()
    
    def _load_templates(self):
        """加载代码模板"""
        self._templates = {
            "component": '''"""
{description}
"""

from daq_core.components.base import ComponentBase, ComponentType, PortType, ComponentRegistry


@ComponentRegistry.register
class {class_name}(ComponentBase):
    """
    {description}
    
    配置参数:
{config_docs}
    """
    
    component_type = ComponentType.{component_type}
    component_name = "{component_name}"
    component_description = "{description}"
    component_icon = "{icon}"

    def __init__(self, instance_id: str = None):
        super().__init__(instance_id)
{init_vars}

    def _setup_ports(self):
{input_ports}
{output_ports}

    def _on_configure(self):
{config_defaults}

    def start(self):
        super().start()
{start_code}

    def stop(self):
{stop_code}
        super().stop()

    def process(self):
        if not self._is_running:
            return
{process_code}
''',
            "project": '''"""
DAQ 项目: {project_name}
生成时间: {timestamp}
"""

from daq_core.engine import DAQEngine
from daq_core.components import (
{imports}
)


def main():
    """主入口"""
    engine = DAQEngine()
    
{component_creation}

{connections}
    
    try:
        engine.start()
        print("DAQ 引擎已启动，按 Ctrl+C 停止...")
        while True:
            pass
    except KeyboardInterrupt:
        engine.stop()
        print("DAQ 引擎已停止")


if __name__ == "__main__":
    main()
''',
        }
    
    def generate_component(self, spec: Dict) -> str:
        """
        根据规格生成组件代码
        
        Args:
            spec: 组件规格 {
                name: str,
                description: str,
                component_type: str,
                icon: str,
                inputs: [{name, type, description}],
                outputs: [{name, type, description}],
                config: [{key, default, description}],
                process_logic: str,
            }
        """
        template = self._templates["component"]
        
        # 生成输入端口代码
        input_ports = ""
        for port in spec.get("inputs", []):
            input_ports += f'        self.add_input_port("{port["name"]}", PortType.{port["type"].upper()}, "{port.get("description", "")}")\n'
        
        # 生成输出端口代码
        output_ports = ""
        for port in spec.get("outputs", []):
            output_ports += f'        self.add_output_port("{port["name"]}", PortType.{port["type"].upper()}, "{port.get("description", "")}")\n'
        
        # 生成配置代码
        config_defaults = ""
        config_docs = ""
        for cfg in spec.get("config", []):
            default_val = repr(cfg["default"])
            config_defaults += f'        self.config.setdefault("{cfg["key"]}", {default_val})\n'
            config_docs += f'        {cfg["key"]}: {type(cfg["default"]).__name__} - {cfg.get("description", "")}\n'
        
        code = template.format(
            class_name=spec.get("name", "CustomComponent"),
            description=spec.get("description", ""),
            component_type=spec.get("component_type", "PROCESS").upper(),
            component_name=spec.get("name", "Custom"),
            icon=spec.get("icon", "⚙️"),
            config_docs=config_docs or "        无",
            init_vars="        pass",
            input_ports=input_ports or "        pass",
            output_ports=output_ports or "        pass",
            config_defaults=config_defaults or "        pass",
            start_code="        pass",
            stop_code="        pass",
            process_code=spec.get("process_logic", "        pass"),
        )
        
        return code


# 全局实例
_ai_assistant: Optional[AIAssistant] = None
_code_generator: Optional[CodeGenerator] = None


def get_ai_assistant() -> AIAssistant:
    """获取 AI 助手"""
    global _ai_assistant
    if _ai_assistant is None:
        _ai_assistant = AIAssistant()
    return _ai_assistant


def get_code_generator() -> CodeGenerator:
    """获取代码生成器"""
    global _code_generator
    if _code_generator is None:
        _code_generator = CodeGenerator()
    return _code_generator
