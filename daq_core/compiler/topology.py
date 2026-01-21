"""
拓扑排序模块
对节点进行拓扑排序，确定执行顺序
"""

import logging
from typing import Dict, List, Set, Tuple
from collections import defaultdict

from .parser import DAQProject, Node, Wire

logger = logging.getLogger(__name__)


class TopologySort:
    """
    节点拓扑排序
    使用 Kahn 算法确定节点执行顺序
    """

    def __init__(self, project: DAQProject):
        self.project = project
        self._sorted_nodes: List[Node] = []
        self._has_cycle = False
        self._cycle_nodes: List[str] = []

    def sort(self) -> List[Node]:
        """
        执行拓扑排序
        返回按执行顺序排列的节点列表
        """
        nodes = self.project.nodes
        wires = self.project.wires

        if not nodes:
            return []

        # 构建邻接表和入度表
        # key: node_id, value: list of successor node_ids
        graph: Dict[str, List[str]] = defaultdict(list)
        # key: node_id, value: in-degree count
        in_degree: Dict[str, int] = {node.id: 0 for node in nodes}

        for wire in wires:
            source_id = wire.source.node_id
            target_id = wire.target.node_id

            # 避免重复边
            if target_id not in graph[source_id]:
                graph[source_id].append(target_id)
                in_degree[target_id] += 1

        # Kahn 算法
        # 找出所有入度为 0 的节点（数据源节点）
        queue: List[str] = [
            node_id for node_id, degree in in_degree.items() if degree == 0
        ]
        result: List[str] = []
        visited_count = 0

        while queue:
            # 按节点 ID 排序保证确定性
            queue.sort()
            current = queue.pop(0)
            result.append(current)
            visited_count += 1

            for successor in graph[current]:
                in_degree[successor] -= 1
                if in_degree[successor] == 0:
                    queue.append(successor)

        # 检查是否有环
        if visited_count != len(nodes):
            self._has_cycle = True
            # 找出环中的节点
            self._cycle_nodes = [
                node_id for node_id, degree in in_degree.items() if degree > 0
            ]
            logger.error(f"检测到循环依赖，涉及节点: {self._cycle_nodes}")
        else:
            self._has_cycle = False

        # 转换为 Node 对象列表
        self._sorted_nodes = [
            self.project.get_node(node_id) for node_id in result
            if self.project.get_node(node_id) is not None
        ]

        logger.info(f"拓扑排序完成，执行顺序: {[n.id for n in self._sorted_nodes]}")
        return self._sorted_nodes

    def has_cycle(self) -> bool:
        """是否存在循环依赖"""
        return self._has_cycle

    def get_cycle_nodes(self) -> List[str]:
        """获取循环依赖中的节点 ID"""
        return self._cycle_nodes

    def get_execution_levels(self) -> List[List[Node]]:
        """
        获取执行层级
        同一层级的节点可以并行执行
        返回：[[level0_nodes], [level1_nodes], ...]
        """
        nodes = self.project.nodes
        wires = self.project.wires

        if not nodes:
            return []

        # 计算每个节点的层级
        node_level: Dict[str, int] = {node.id: 0 for node in nodes}

        # 多次遍历直到收敛
        changed = True
        max_iterations = len(nodes) + 1
        iterations = 0

        while changed and iterations < max_iterations:
            changed = False
            iterations += 1

            for wire in wires:
                source_id = wire.source.node_id
                target_id = wire.target.node_id
                new_level = node_level[source_id] + 1

                if new_level > node_level[target_id]:
                    node_level[target_id] = new_level
                    changed = True

        # 按层级分组
        max_level = max(node_level.values()) if node_level else 0
        levels: List[List[Node]] = [[] for _ in range(max_level + 1)]

        for node in nodes:
            level = node_level[node.id]
            levels[level].append(node)

        return levels

    def get_source_nodes(self) -> List[Node]:
        """获取所有数据源节点（无输入的节点）"""
        incoming_wires = defaultdict(list)
        for wire in self.project.wires:
            incoming_wires[wire.target.node_id].append(wire)

        source_nodes = [
            node for node in self.project.nodes
            if not incoming_wires[node.id]
        ]
        return source_nodes

    def get_sink_nodes(self) -> List[Node]:
        """获取所有终点节点（无输出的节点）"""
        outgoing_wires = defaultdict(list)
        for wire in self.project.wires:
            outgoing_wires[wire.source.node_id].append(wire)

        sink_nodes = [
            node for node in self.project.nodes
            if not outgoing_wires[node.id]
        ]
        return sink_nodes

    def validate_connections(self) -> Tuple[bool, List[str]]:
        """
        验证连接的有效性
        返回：(是否有效, 错误列表)
        """
        errors = []
        node_ids = {node.id for node in self.project.nodes}

        for wire in self.project.wires:
            if wire.source.node_id not in node_ids:
                errors.append(f"连线 {wire.id} 的源节点不存在: {wire.source.node_id}")
            if wire.target.node_id not in node_ids:
                errors.append(f"连线 {wire.id} 的目标节点不存在: {wire.target.node_id}")
            if wire.source.node_id == wire.target.node_id:
                errors.append(f"连线 {wire.id} 形成自环")

        return len(errors) == 0, errors
