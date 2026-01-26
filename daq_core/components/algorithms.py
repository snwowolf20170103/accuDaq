"""
高级算法组件
包含 FFT、滤波器、PID 控制器等
"""

import numpy as np
from collections import deque
from typing import List, Optional
import logging

from .base import ComponentBase, PortType, ComponentType, ComponentRegistry

logger = logging.getLogger(__name__)


@ComponentRegistry.register
class FFTComponent(ComponentBase):
    """
    FFT 频谱分析组件
    对输入信号进行快速傅里叶变换，输出频谱数据
    """
    component_name = "FFT"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("signal", PortType.NUMBER)
        self.add_output_port("frequencies", PortType.ARRAY)
        self.add_output_port("magnitudes", PortType.ARRAY)
        self.add_output_port("dominant_freq", PortType.NUMBER)
        self.add_output_port("ready", PortType.BOOLEAN)
    
    def _on_configure(self):
        self.window_size = int(self.config.get('window_size', 256))
        self.sample_rate = self.config.get('sample_rate', 1000)  # Hz
        self.buffer: deque = deque(maxlen=self.window_size)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        signal = self.get_input("signal")
        if signal is not None:
            self.buffer.append(signal)
        
        if len(self.buffer) >= self.window_size:
            # 执行 FFT
            data = np.array(self.buffer)
            
            # 应用汉宁窗减少频谱泄露
            window = np.hanning(len(data))
            windowed_data = data * window
            
            # FFT
            fft_result = np.fft.fft(windowed_data)
            freqs = np.fft.fftfreq(len(data), 1.0 / self.sample_rate)
            
            # 只取正频率部分
            positive_freqs = freqs[:len(freqs)//2]
            magnitudes = np.abs(fft_result[:len(fft_result)//2]) * 2 / len(data)
            
            # 找主频
            dominant_idx = np.argmax(magnitudes[1:]) + 1  # 排除 DC 分量
            dominant_freq = positive_freqs[dominant_idx]
            
            self.set_output("frequencies", positive_freqs.tolist())
            self.set_output("magnitudes", magnitudes.tolist())
            self.set_output("dominant_freq", float(dominant_freq))
            self.set_output("ready", True)
        else:
            self.set_output("ready", False)


@ComponentRegistry.register
class MovingAverageFilterComponent(ComponentBase):
    """
    移动平均滤波器组件
    对输入信号进行平滑处理
    """
    component_name = "MovingAverageFilter"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("input", PortType.NUMBER)
        self.add_output_port("output", PortType.NUMBER)
        self.add_output_port("variance", PortType.NUMBER)
    
    def _on_configure(self):
        self.window_size = int(self.config.get('window_size', 10))
        self.buffer: deque = deque(maxlen=self.window_size)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        value = self.get_input("input")
        if value is not None:
            self.buffer.append(value)
            
            if len(self.buffer) > 0:
                avg = sum(self.buffer) / len(self.buffer)
                variance = sum((x - avg) ** 2 for x in self.buffer) / len(self.buffer)
                
                self.set_output("output", avg)
                self.set_output("variance", variance)


@ComponentRegistry.register
class LowPassFilterComponent(ComponentBase):
    """
    一阶低通滤波器组件
    使用指数加权移动平均实现
    """
    component_name = "LowPassFilter"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("input", PortType.NUMBER)
        self.add_output_port("output", PortType.NUMBER)
    
    def _on_configure(self):
        # 截止频率相关参数
        self.alpha = self.config.get('alpha', 0.1)  # 0-1, 越小滤波越强
        self.cutoff_freq = self.config.get('cutoff_freq', None)  # Hz
        self.sample_rate = self.config.get('sample_rate', 1000)  # Hz
        
        # 如果指定了截止频率，计算 alpha
        if self.cutoff_freq is not None:
            dt = 1.0 / self.sample_rate
            rc = 1.0 / (2 * np.pi * self.cutoff_freq)
            self.alpha = dt / (rc + dt)
        
        self.last_output: Optional[float] = None
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        value = self.get_input("input")
        if value is not None:
            if self.last_output is None:
                self.last_output = value
            else:
                self.last_output = self.alpha * value + (1 - self.alpha) * self.last_output
            
            self.set_output("output", self.last_output)


@ComponentRegistry.register  
class HighPassFilterComponent(ComponentBase):
    """
    一阶高通滤波器组件
    """
    component_name = "HighPassFilter"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("input", PortType.NUMBER)
        self.add_output_port("output", PortType.NUMBER)
    
    def _on_configure(self):
        self.alpha = self.config.get('alpha', 0.9)  # 0-1, 越大滤波越强
        self.cutoff_freq = self.config.get('cutoff_freq', None)
        self.sample_rate = self.config.get('sample_rate', 1000)
        
        if self.cutoff_freq is not None:
            dt = 1.0 / self.sample_rate
            rc = 1.0 / (2 * np.pi * self.cutoff_freq)
            self.alpha = rc / (rc + dt)
        
        self.last_input: Optional[float] = None
        self.last_output: Optional[float] = None
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        value = self.get_input("input")
        if value is not None:
            if self.last_input is None:
                self.last_input = value
                self.last_output = 0
            else:
                self.last_output = self.alpha * (self.last_output + value - self.last_input)
                self.last_input = value
            
            self.set_output("output", self.last_output)


@ComponentRegistry.register
class PIDControllerComponent(ComponentBase):
    """
    PID 控制器组件
    经典 PID 控制算法实现
    """
    component_name = "PIDController"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("setpoint", PortType.NUMBER)  # 目标值
        self.add_input_port("process_value", PortType.NUMBER)  # 当前值
        self.add_input_port("reset", PortType.BOOLEAN)  # 重置积分项
        
        self.add_output_port("output", PortType.NUMBER)  # 控制输出
        self.add_output_port("error", PortType.NUMBER)  # 当前误差
        self.add_output_port("p_term", PortType.NUMBER)  # P 项
        self.add_output_port("i_term", PortType.NUMBER)  # I 项
        self.add_output_port("d_term", PortType.NUMBER)  # D 项
    
    def _on_configure(self):
        # PID 参数
        self.kp = self.config.get('kp', 1.0)  # 比例增益
        self.ki = self.config.get('ki', 0.0)  # 积分增益
        self.kd = self.config.get('kd', 0.0)  # 微分增益
        
        # 输出限幅
        self.output_min = self.config.get('output_min', -float('inf'))
        self.output_max = self.config.get('output_max', float('inf'))
        
        # 积分限幅（防止积分饱和）
        self.integral_min = self.config.get('integral_min', -1000)
        self.integral_max = self.config.get('integral_max', 1000)
        
        # 采样时间
        self.dt = self.config.get('dt', 0.1)  # 秒
        
        # 内部状态
        self.integral = 0.0
        self.last_error: Optional[float] = None
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        setpoint = self.get_input("setpoint")
        process_value = self.get_input("process_value")
        reset = self.get_input("reset")
        
        # 重置积分项
        if reset:
            self.integral = 0.0
            self.last_error = None
        
        if setpoint is not None and process_value is not None:
            # 计算误差
            error = setpoint - process_value
            
            # P 项
            p_term = self.kp * error
            
            # I 项（带限幅）
            self.integral += error * self.dt
            self.integral = max(self.integral_min, min(self.integral_max, self.integral))
            i_term = self.ki * self.integral
            
            # D 项
            if self.last_error is not None:
                d_term = self.kd * (error - self.last_error) / self.dt
            else:
                d_term = 0.0
            self.last_error = error
            
            # 计算输出（带限幅）
            output = p_term + i_term + d_term
            output = max(self.output_min, min(self.output_max, output))
            
            # 设置输出
            self.set_output("output", output)
            self.set_output("error", error)
            self.set_output("p_term", p_term)
            self.set_output("i_term", i_term)
            self.set_output("d_term", d_term)


@ComponentRegistry.register
class KalmanFilterComponent(ComponentBase):
    """
    卡尔曼滤波器组件
    一维卡尔曼滤波器实现
    """
    component_name = "KalmanFilter"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("measurement", PortType.NUMBER)
        self.add_output_port("estimate", PortType.NUMBER)
        self.add_output_port("uncertainty", PortType.NUMBER)
    
    def _on_configure(self):
        # 过程噪声
        self.process_noise = self.config.get('process_noise', 0.01)
        # 测量噪声
        self.measurement_noise = self.config.get('measurement_noise', 0.1)
        # 初始估计
        self.estimate = self.config.get('initial_estimate', 0.0)
        # 初始不确定性
        self.uncertainty = self.config.get('initial_uncertainty', 1.0)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        measurement = self.get_input("measurement")
        if measurement is not None:
            # 预测步骤
            predicted_estimate = self.estimate
            predicted_uncertainty = self.uncertainty + self.process_noise
            
            # 更新步骤
            kalman_gain = predicted_uncertainty / (predicted_uncertainty + self.measurement_noise)
            self.estimate = predicted_estimate + kalman_gain * (measurement - predicted_estimate)
            self.uncertainty = (1 - kalman_gain) * predicted_uncertainty
            
            self.set_output("estimate", self.estimate)
            self.set_output("uncertainty", self.uncertainty)


@ComponentRegistry.register
class StatisticsComponent(ComponentBase):
    """
    统计分析组件
    计算均值、标准差、最大最小值等
    """
    component_name = "Statistics"
    component_type = ComponentType.PROCESS
    
    def _setup_ports(self):
        self.add_input_port("input", PortType.NUMBER)
        self.add_input_port("reset", PortType.BOOLEAN)
        
        self.add_output_port("mean", PortType.NUMBER)
        self.add_output_port("std", PortType.NUMBER)
        self.add_output_port("min", PortType.NUMBER)
        self.add_output_port("max", PortType.NUMBER)
        self.add_output_port("count", PortType.NUMBER)
    
    def _on_configure(self):
        self.window_size = int(self.config.get('window_size', 100))
        self.buffer: deque = deque(maxlen=self.window_size)
    
    def start(self):
        super().start()
    
    def stop(self):
        super().stop()
        
    def process(self):
        reset = self.get_input("reset")
        if reset:
            self.buffer.clear()
        
        value = self.get_input("input")
        if value is not None:
            self.buffer.append(value)
            
            if len(self.buffer) > 0:
                data = list(self.buffer)
                mean = sum(data) / len(data)
                variance = sum((x - mean) ** 2 for x in data) / len(data)
                std = variance ** 0.5
                
                self.set_output("mean", mean)
                self.set_output("std", std)
                self.set_output("min", min(data))
                self.set_output("max", max(data))
                self.set_output("count", len(data))
