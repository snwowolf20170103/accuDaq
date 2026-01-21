"""
.daq 项目文件解析器
解析 JSON 格式的项目文件，转换为内部数据结构
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class Position:
    """位置信息"""
    x: float
    y: float


@dataclass
class PortRef:
    """端口引用"""
    node_id: str
    port_id: str


@dataclass
class Wire:
    """连线定义"""
    id: str
    source: PortRef
    target: PortRef


@dataclass
class Node:
    """节点定义"""
    id: str
    type: str
    position: Position
    label: str = ""
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Device:
    """设备定义"""
    id: str
    name: str
    protocol: str
    config: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Widget:
    """UI 控件定义"""
    id: str
    type: str
    label: str
    layout: Dict[str, int]
    binding: Optional[PortRef] = None
    properties: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ProjectMeta:
    """项目元信息"""
    name: str
    version: str
    schema_version: str
    description: str = ""


@dataclass
class DAQProject:
    """完整的 DAQ 项目"""
    meta: ProjectMeta
    devices: List[Device]
    nodes: List[Node]
    wires: List[Wire]
    widgets: List[Widget]

    def get_node(self, node_id: str) -> Optional[Node]:
        """根据 ID 获取节点"""
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None

    def get_device(self, device_id: str) -> Optional[Device]:
        """根据 ID 获取设备"""
        for device in self.devices:
            if device.id == device_id:
                return device
        return None

    def get_incoming_wires(self, node_id: str) -> List[Wire]:
        """获取指向某节点的所有连线"""
        return [w for w in self.wires if w.target.node_id == node_id]

    def get_outgoing_wires(self, node_id: str) -> List[Wire]:
        """获取从某节点出发的所有连线"""
        return [w for w in self.wires if w.source.node_id == node_id]


class DAQProjectParser:
    """
    DAQ 项目文件解析器
    支持解析 .daq (JSON) 文件
    """

    SUPPORTED_SCHEMA_VERSIONS = ["0.1.0"]

    def __init__(self):
        self._errors: List[str] = []
        self._warnings: List[str] = []

    def parse_file(self, file_path: str) -> Optional[DAQProject]:
        """解析 .daq 文件"""
        path = Path(file_path)

        if not path.exists():
            self._errors.append(f"文件不存在: {file_path}")
            return None

        try:
            with open(path, "r", encoding="utf-8") as f:
                data = json.load(f)
            return self.parse_dict(data)

        except json.JSONDecodeError as e:
            self._errors.append(f"JSON 解析失败: {e}")
            return None
        except Exception as e:
            self._errors.append(f"读取文件失败: {e}")
            return None

    def parse_string(self, json_string: str) -> Optional[DAQProject]:
        """解析 JSON 字符串"""
        try:
            data = json.loads(json_string)
            return self.parse_dict(data)
        except json.JSONDecodeError as e:
            self._errors.append(f"JSON 解析失败: {e}")
            return None

    def parse_dict(self, data: Dict[str, Any]) -> Optional[DAQProject]:
        """解析字典数据"""
        self._errors.clear()
        self._warnings.clear()

        # 验证必需字段
        required_fields = ["meta", "devices", "logic", "ui"]
        for field in required_fields:
            if field not in data:
                self._errors.append(f"缺少必需字段: {field}")

        if self._errors:
            return None

        try:
            # 解析 meta
            meta = self._parse_meta(data["meta"])

            # 验证 schema 版本
            if meta.schema_version not in self.SUPPORTED_SCHEMA_VERSIONS:
                self._warnings.append(
                    f"Schema 版本 {meta.schema_version} 可能不完全兼容"
                )

            # 解析 devices
            devices = self._parse_devices(data["devices"])

            # 解析 logic
            nodes, wires = self._parse_logic(data["logic"])

            # 解析 ui
            widgets = self._parse_ui(data["ui"])

            project = DAQProject(
                meta=meta,
                devices=devices,
                nodes=nodes,
                wires=wires,
                widgets=widgets
            )

            logger.info(
                f"项目解析完成: {meta.name} "
                f"(节点: {len(nodes)}, 连线: {len(wires)}, 控件: {len(widgets)})"
            )

            return project

        except Exception as e:
            self._errors.append(f"解析失败: {e}")
            return None

    def _parse_meta(self, data: Dict) -> ProjectMeta:
        """解析元信息"""
        return ProjectMeta(
            name=data.get("name", "Untitled"),
            version=data.get("version", "1.0.0"),
            schema_version=data.get("schemaVersion", "0.1.0"),
            description=data.get("description", "")
        )

    def _parse_devices(self, data: List[Dict]) -> List[Device]:
        """解析设备列表"""
        devices = []
        for item in data:
            device = Device(
                id=item["id"],
                name=item.get("name", item["id"]),
                protocol=item["protocol"],
                config=item.get("config", {})
            )
            devices.append(device)
        return devices

    def _parse_logic(self, data: Dict) -> tuple[List[Node], List[Wire]]:
        """解析逻辑图"""
        nodes = []
        wires = []

        # 解析节点
        for item in data.get("nodes", []):
            pos = item.get("position", {"x": 0, "y": 0})
            node = Node(
                id=item["id"],
                type=item["type"],
                position=Position(x=pos.get("x", 0), y=pos.get("y", 0)),
                label=item.get("label", ""),
                properties=item.get("properties", {})
            )
            nodes.append(node)

        # 解析连线
        for item in data.get("wires", []):
            source = item["source"]
            target = item["target"]
            wire = Wire(
                id=item["id"],
                source=PortRef(node_id=source["nodeId"], port_id=source["portId"]),
                target=PortRef(node_id=target["nodeId"], port_id=target["portId"])
            )
            wires.append(wire)

        return nodes, wires

    def _parse_ui(self, data: Dict) -> List[Widget]:
        """解析 UI 控件"""
        widgets = []
        for item in data.get("widgets", []):
            binding = None
            if "binding" in item and item["binding"]:
                binding = PortRef(
                    node_id=item["binding"].get("nodeId", ""),
                    port_id=item["binding"].get("portId", "")
                )

            widget = Widget(
                id=item["id"],
                type=item["type"],
                label=item.get("label", ""),
                layout=item["layout"],
                binding=binding,
                properties=item.get("properties", {})
            )
            widgets.append(widget)

        return widgets

    def get_errors(self) -> List[str]:
        """获取解析错误"""
        return self._errors.copy()

    def get_warnings(self) -> List[str]:
        """获取警告信息"""
        return self._warnings.copy()
