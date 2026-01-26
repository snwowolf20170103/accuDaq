"""
LVGL UI 设计器集成模块
与 accuoaLv 项目（VSCode LVGL 设计器扩展）集成
"""

import os
import json
import logging
import subprocess
from typing import Any, Dict, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class LVGLDesignerBridge:
    """
    LVGL 设计器桥接器
    
    功能：
    - 与 accuoaLv VSCode 扩展交互
    - 导入/导出 LVGL UI 设计
    - 代码生成协调
    
    accuoaLv 是一个独立的 VSCode 扩展项目，提供 LVGL UI 可视化设计能力。
    本桥接器负责在 DAQ 系统和 LVGL 设计器之间进行数据交换。
    """
    
    def __init__(self, lvgl_project_path: str = None):
        """
        初始化
        
        Args:
            lvgl_project_path: accuoaLv 项目路径
        """
        self._lvgl_project_path = lvgl_project_path or self._find_lvgl_project()
        self._design_cache: Dict[str, Dict] = {}
    
    def _find_lvgl_project(self) -> Optional[str]:
        """查找 accuoaLv 项目路径"""
        # 尝试在相邻目录查找
        possible_paths = [
            r"F:\workspaces2025\accuoaLv",
            r"C:\workspace\accuoaLv",
            os.path.join(os.path.dirname(__file__), "..", "..", "accuoaLv"),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                logger.info(f"找到 LVGL 设计器项目: {path}")
                return path
        
        logger.warning("未找到 accuoaLv 项目")
        return None
    
    @property
    def is_available(self) -> bool:
        """检查 LVGL 设计器是否可用"""
        return self._lvgl_project_path is not None and os.path.exists(self._lvgl_project_path)
    
    def get_design_files(self) -> List[Dict]:
        """
        获取可用的 LVGL 设计文件列表
        
        Returns:
            设计文件列表 [{name, path, modified_time}]
        """
        if not self.is_available:
            return []
        
        design_files = []
        
        # 查找 .json 设计文件
        test_projects_dir = os.path.join(self._lvgl_project_path, "test-projects")
        if os.path.exists(test_projects_dir):
            for root, dirs, files in os.walk(test_projects_dir):
                for file in files:
                    if file.endswith(".json") and not file.startswith("."):
                        filepath = os.path.join(root, file)
                        design_files.append({
                            "name": file,
                            "path": filepath,
                            "modified_time": os.path.getmtime(filepath),
                        })
        
        return design_files
    
    def load_design(self, design_path: str) -> Optional[Dict]:
        """
        加载 LVGL 设计文件
        
        Args:
            design_path: 设计文件路径
        
        Returns:
            设计数据
        """
        try:
            with open(design_path, 'r', encoding='utf-8') as f:
                design = json.load(f)
            
            self._design_cache[design_path] = design
            logger.info(f"已加载 LVGL 设计: {design_path}")
            return design
        except Exception as e:
            logger.error(f"加载 LVGL 设计失败: {e}")
            return None
    
    def save_design(self, design_path: str, design: Dict) -> bool:
        """
        保存 LVGL 设计文件
        
        Args:
            design_path: 设计文件路径
            design: 设计数据
        """
        try:
            with open(design_path, 'w', encoding='utf-8') as f:
                json.dump(design, f, ensure_ascii=False, indent=2)
            
            self._design_cache[design_path] = design
            logger.info(f"已保存 LVGL 设计: {design_path}")
            return True
        except Exception as e:
            logger.error(f"保存 LVGL 设计失败: {e}")
            return False
    
    def generate_c_code(self, design: Dict, output_dir: str) -> Optional[Dict[str, str]]:
        """
        从设计生成 C 代码
        
        Args:
            design: 设计数据
            output_dir: 输出目录
        
        Returns:
            生成的文件 {filename: content}
        """
        try:
            # 如果 accuoaLv 有代码生成器，调用它
            generator_script = os.path.join(
                self._lvgl_project_path, 
                "src", 
                "backend", 
                "codeGenerator.ts"
            )
            
            if os.path.exists(generator_script):
                # 通过 Node.js 调用 TypeScript 代码生成器
                # 这里简化实现，实际需要完整的调用逻辑
                pass
            
            # 简化的代码生成
            return self._simple_code_generation(design, output_dir)
            
        except Exception as e:
            logger.error(f"生成 C 代码失败: {e}")
            return None
    
    def _simple_code_generation(self, design: Dict, output_dir: str) -> Dict[str, str]:
        """简化的代码生成"""
        files = {}
        
        # 生成头文件
        header = """/**
 * LVGL UI 头文件
 * 由 DAQ IDE 自动生成
 */

#ifndef UI_H
#define UI_H

#include "lvgl.h"

void ui_init(void);
void ui_update(void);

#endif /* UI_H */
"""
        files["ui.h"] = header
        
        # 生成源文件
        components = design.get("components", [])
        
        source = """/**
 * LVGL UI 源文件
 * 由 DAQ IDE 自动生成
 */

#include "ui.h"

/* 组件声明 */
"""
        
        for comp in components:
            comp_type = comp.get("type", "obj")
            comp_name = comp.get("name", f"obj_{comp.get('id', '0')}")
            source += f"static lv_obj_t *{comp_name};\n"
        
        source += """

void ui_init(void) {
    /* 初始化 UI 组件 */
"""
        
        for comp in components:
            comp_type = comp.get("type", "obj")
            comp_name = comp.get("name", f"obj_{comp.get('id', '0')}")
            parent = comp.get("parent", "lv_scr_act()")
            
            # 根据类型生成创建代码
            if comp_type == "label":
                source += f'    {comp_name} = lv_label_create({parent});\n'
                if "text" in comp.get("properties", {}):
                    source += f'    lv_label_set_text({comp_name}, "{comp["properties"]["text"]}");\n'
            elif comp_type == "button":
                source += f'    {comp_name} = lv_btn_create({parent});\n'
            elif comp_type == "slider":
                source += f'    {comp_name} = lv_slider_create({parent});\n'
            else:
                source += f'    {comp_name} = lv_obj_create({parent});\n'
            
            # 设置位置
            if "x" in comp and "y" in comp:
                source += f'    lv_obj_set_pos({comp_name}, {comp["x"]}, {comp["y"]});\n'
            
            # 设置尺寸
            if "width" in comp and "height" in comp:
                source += f'    lv_obj_set_size({comp_name}, {comp["width"]}, {comp["height"]});\n'
            
            source += "\n"
        
        source += """}

void ui_update(void) {
    /* 更新 UI 状态 */
}
"""
        files["ui.c"] = source
        
        # 写入文件
        os.makedirs(output_dir, exist_ok=True)
        for filename, content in files.items():
            filepath = os.path.join(output_dir, filename)
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return files
    
    def create_daq_ui_binding(self, design: Dict, daq_components: List[Dict]) -> Dict:
        """
        创建 DAQ 组件与 LVGL UI 的绑定
        
        Args:
            design: LVGL 设计数据
            daq_components: DAQ 组件列表
        
        Returns:
            绑定配置
        """
        bindings = []
        
        ui_components = design.get("components", [])
        
        for ui_comp in ui_components:
            ui_name = ui_comp.get("name", "")
            ui_type = ui_comp.get("type", "")
            
            # 查找可能的 DAQ 数据源
            for daq_comp in daq_components:
                daq_name = daq_comp.get("name", "")
                daq_outputs = daq_comp.get("outputs", [])
                
                # 简单的名称匹配规则
                for output in daq_outputs:
                    output_name = output.get("name", "")
                    
                    # 如果 UI 组件名称包含 DAQ 输出名称，建议绑定
                    if output_name.lower() in ui_name.lower():
                        bindings.append({
                            "ui_component": ui_name,
                            "ui_property": self._get_ui_property_for_type(ui_type),
                            "daq_component": daq_name,
                            "daq_output": output_name,
                            "transform": None,  # 可选的数据转换
                        })
        
        return {
            "version": "1.0",
            "bindings": bindings,
        }
    
    def _get_ui_property_for_type(self, ui_type: str) -> str:
        """根据 UI 类型获取默认绑定属性"""
        property_map = {
            "label": "text",
            "slider": "value",
            "arc": "value",
            "bar": "value",
            "gauge": "value",
            "switch": "checked",
            "checkbox": "checked",
            "led": "on",
        }
        return property_map.get(ui_type, "value")
    
    def open_in_vscode(self, design_path: str = None):
        """
        在 VSCode 中打开 LVGL 设计器
        
        Args:
            design_path: 可选的设计文件路径
        """
        try:
            if design_path:
                subprocess.Popen(["code", design_path])
            elif self._lvgl_project_path:
                subprocess.Popen(["code", self._lvgl_project_path])
            else:
                logger.warning("无法打开 VSCode: 未指定路径")
        except Exception as e:
            logger.error(f"打开 VSCode 失败: {e}")


class LVGLSimulator:
    """
    LVGL 模拟器接口
    
    用于在 PC 上预览 LVGL UI
    """
    
    def __init__(self, simulator_path: str = None):
        self._simulator_path = simulator_path
        self._process: Optional[subprocess.Popen] = None
    
    def start(self, ui_code_path: str = None):
        """启动模拟器"""
        if self._process and self._process.poll() is None:
            logger.warning("模拟器已在运行")
            return
        
        try:
            # 启动 SDL 模拟器
            # 实际实现需要编译好的模拟器可执行文件
            logger.info("启动 LVGL 模拟器...")
        except Exception as e:
            logger.error(f"启动模拟器失败: {e}")
    
    def stop(self):
        """停止模拟器"""
        if self._process:
            self._process.terminate()
            self._process = None


# 全局实例
_lvgl_bridge: Optional[LVGLDesignerBridge] = None


def get_lvgl_bridge() -> LVGLDesignerBridge:
    """获取 LVGL 设计器桥接器"""
    global _lvgl_bridge
    if _lvgl_bridge is None:
        _lvgl_bridge = LVGLDesignerBridge()
    return _lvgl_bridge
