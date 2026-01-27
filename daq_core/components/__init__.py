"""
组件模块 - 包含所有可拖拽的组件实现
"""

from .base import ComponentBase, ComponentRegistry
from .mqtt_client import MQTTSubscriberComponent
from .mqtt_publisher import MQTTPublisherComponent
from .mock_device import MockDeviceComponent
from .math_ops import MathOperationComponent, CompareComponent
from .csv_storage import CSVStorageComponent
from .custom_script import CustomScriptComponent
from .threshold_alarm import ThresholdAlarmComponent
from .modbus_client import ModbusClientComponent
from .debug_print import DebugPrintComponent
from .data_probe import DataProbeComponent
from .global_variable import GlobalVariableComponent
from .timer import TimerComponent as Timer, CounterComponent as Counter
from .while_loop import WhileLoopComponent
from .conditional import ConditionalComponent
from .algorithms import (
    FFTComponent,
    MovingAverageFilterComponent,
    LowPassFilterComponent,
    HighPassFilterComponent,
    PIDControllerComponent,
    KalmanFilterComponent,
    StatisticsComponent,
)
from .protocols import (
    EtherCATMasterComponent,
    EtherCATSlaveIOComponent,
    CANopenMasterComponent,
    CANopenNodeComponent,
    CANopenPDOComponent,
    OPCUAClientComponent,
    OPCUANodeReaderComponent,
    OPCUANodeWriterComponent,
    OPCUASubscriptionComponent,
)
from .serial_port import SerialPortComponent, SerialScannerComponent
from .modbus_rtu import ModbusRTUComponent
from .scpi_device import SCPIDeviceComponent, SCPIScannerComponent
from .usb_device import USBDeviceComponent, USBHIDComponent, USBScannerComponent
from .bluetooth_device import BluetoothRFCOMMComponent, BLEDeviceComponent, BluetoothScannerComponent
from .plugin_system import PluginLoader, get_plugin_loader, init_plugin_system, create_plugin_template
from .comm_logger import (
    CommunicationLogger, HistoryDataManager, LogLevel, LogEntry,
    get_comm_logger, get_history_manager
)
from .variable_binding import (
    VariableBindingManager, DeviceMonitor, BindingDirection, BindingType,
    get_binding_manager, get_device_monitor
)
from .task_scheduler import (
    TaskScheduler, Task, TaskState, TriggerType, ConditionEvaluator,
    get_task_scheduler
)
from .report_generator import (
    ReportGenerator, HTMLReportGenerator, PDFReportGenerator, CSVReportGenerator,
    ReportBuilder, quick_report
)
from .data_replay import (
    DataPlayer, DataRecorder, DataPoint, PlaybackState,
    get_data_player, get_data_recorder
)
from .timed_loop import TimedLoopComponent, RateLimiterComponent, WatchdogComponent
from .power_protocols import (
    IEC61850ClientComponent, IEC61850GOOSEComponent,
    DNP3MasterComponent, IEC104ClientComponent, BACnetClientComponent,
)
# Database Storage Components
from .redis_cache import RedisCacheComponent
from .sqlite_storage import SQLiteStorageComponent
from .influxdb_storage import InfluxDBStorageComponent
from .timescaledb_storage import TimescaleDBStorageComponent



# 别名（向后兼容）
MockDevice = MockDeviceComponent
Compare = CompareComponent
CSVStorage = CSVStorageComponent
ThresholdAlarm = ThresholdAlarmComponent
MathOperation = MathOperationComponent
DebugPrint = DebugPrintComponent
GlobalVariable = GlobalVariableComponent
DataProbe = DataProbeComponent

FFT = FFTComponent
MovingAverageFilter = MovingAverageFilterComponent
LowPassFilter = LowPassFilterComponent
HighPassFilter = HighPassFilterComponent
PIDController = PIDControllerComponent
KalmanFilter = KalmanFilterComponent
Statistics = StatisticsComponent

EtherCATMaster = EtherCATMasterComponent
EtherCATSlaveIO = EtherCATSlaveIOComponent
CANopenMaster = CANopenMasterComponent
CANopenNode = CANopenNodeComponent
CANopenPDO = CANopenPDOComponent
OPCUAClient = OPCUAClientComponent
OPCUANodeReader = OPCUANodeReaderComponent
OPCUANodeWriter = OPCUANodeWriterComponent
OPCUASubscription = OPCUASubscriptionComponent

__all__ = [
    "ComponentBase",
    "ComponentRegistry",
    "MQTTSubscriberComponent",
    "MQTTPublisherComponent",
    "MockDeviceComponent",
    "MathOperationComponent",
    "CompareComponent",
    "CSVStorageComponent",
    "CustomScriptComponent",
    "ThresholdAlarmComponent",
    "ModbusClientComponent",
    "DebugPrintComponent",
    "GlobalVariableComponent",
    "DataProbeComponent",
    "Timer",
    "Counter",
    # 简短别名 (MVP tests use these)
    "MockDevice",
    "Compare",
    "CSVStorage",
    "ThresholdAlarm",
    "MathOperation",
    "DebugPrint",
    "GlobalVariable",
    "DataProbe",
    # 控制流组件
    "WhileLoopComponent",
    "ConditionalComponent",
    # 高级算法组件（原名 + 别名）
    "FFTComponent", "FFT",
    "MovingAverageFilterComponent", "MovingAverageFilter",
    "LowPassFilterComponent", "LowPassFilter",
    "HighPassFilterComponent", "HighPassFilter",
    "PIDControllerComponent", "PIDController",
    "KalmanFilterComponent", "KalmanFilter",
    "StatisticsComponent", "Statistics",
    # 复杂协议组件（原名 + 别名）
    "EtherCATMasterComponent", "EtherCATMaster",
    "EtherCATSlaveIOComponent", "EtherCATSlaveIO",
    "CANopenMasterComponent", "CANopenMaster",
    "CANopenNodeComponent", "CANopenNode",
    "CANopenPDOComponent", "CANopenPDO",
    "OPCUAClientComponent", "OPCUAClient",
    "OPCUANodeReaderComponent", "OPCUANodeReader",
    "OPCUANodeWriterComponent", "OPCUANodeWriter",
    "OPCUASubscriptionComponent", "OPCUASubscription",
    # 串口和 Modbus RTU 组件
    "SerialPortComponent",
    "SerialScannerComponent",
    "ModbusRTUComponent",
    # SCPI 组件
    "SCPIDeviceComponent",
    "SCPIScannerComponent",
    # USB 组件
    "USBDeviceComponent",
    "USBHIDComponent",
    "USBScannerComponent",
    # 蓝牙组件
    "BluetoothRFCOMMComponent",
    "BLEDeviceComponent",
    "BluetoothScannerComponent",
    # 插件系统
    "PluginLoader",
    "get_plugin_loader",
    "init_plugin_system",
    "create_plugin_template",
    # 通信日志和历史数据
    "CommunicationLogger",
    "HistoryDataManager",
    "LogLevel",
    "LogEntry",
    "get_comm_logger",
    "get_history_manager",
    # 变量绑定
    "VariableBindingManager",
    "DeviceMonitor",
    "BindingDirection",
    "BindingType",
    "get_binding_manager",
    "get_device_monitor",
    # 任务调度
    "TaskScheduler",
    "Task",
    "TaskState",
    "TriggerType",
    "ConditionEvaluator",
    "get_task_scheduler",
    # 报告生成
    "ReportGenerator",
    "HTMLReportGenerator",
    "PDFReportGenerator",
    "CSVReportGenerator",
    "ReportBuilder",
    "quick_report",
    # 数据回放
    "DataPlayer",
    "DataRecorder",
    "DataPoint",
    "PlaybackState",
    "get_data_player",
    "get_data_recorder",
    # 高精度定时器
    "TimedLoopComponent",
    "RateLimiterComponent",
    "WatchdogComponent",
    # Database Storage Components
    "RedisCacheComponent",
    "SQLiteStorageComponent",
    "InfluxDBStorageComponent",
    "TimescaleDBStorageComponent",
]




