"""
LVGL 集成模块
通过调用 accuoaLV 项目实现 LVGL UI 生成

accuoaLV 是独立开发的 LVGL UI Designer VSCode 扩展，
本模块提供与其集成的接口，不修改 accuoaLV 代码。

集成方式：
1. 项目文件互转：.daq <-> .lvgl-project
2. UI Widget 配置导出为 LVGL 组件定义
3. 调用 accuoaLV 的代码生成器生成 C 代码
"""

import json
import os
import subprocess
from typing import Dict, List, Any, Optional
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class LVGLIntegration:
    """
    LVGL 集成类
    与 accuoaLV 项目进行交互
    """
    
    # accuoaLV 项目路径（可配置）
    ACCUOALV_PATH = os.environ.get('ACCUOALV_PATH', r'f:\workspaces2025\accuoaLv')
    
    # Widget 类型映射：accuDaq Dashboard Widget -> LVGL 组件
    WIDGET_TYPE_MAP = {
        'gauge': 'arc',          # Gauge -> LVGL Arc
        'led': 'led',            # LED -> LVGL LED
        'switch': 'switch',      # Switch -> LVGL Switch
        'number_input': 'spinbox',  # NumberInput -> LVGL Spinbox
        'line_chart': 'chart',   # LineChart -> LVGL Chart
        'number': 'label',       # Number display -> LVGL Label
        'button': 'button',      # Button -> LVGL Button
        'label': 'label',        # Label -> LVGL Label
        'slider': 'slider',      # Slider -> LVGL Slider
        'bar': 'bar',            # Progress bar -> LVGL Bar
    }
    
    def __init__(self, accuoalv_path: Optional[str] = None):
        """
        初始化 LVGL 集成
        
        Args:
            accuoalv_path: accuoaLV 项目路径，默认使用环境变量或预设路径
        """
        self.accuoalv_path = Path(accuoalv_path or self.ACCUOALV_PATH)
        
    def check_accuoalv_available(self) -> bool:
        """检查 accuoaLV 是否可用"""
        if not self.accuoalv_path.exists():
            logger.warning(f"accuoaLV path not found: {self.accuoalv_path}")
            return False
        
        # 检查关键文件
        required_files = [
            'package.json',
            'src/codegen/LVGLCodeGenerator.ts',
        ]
        
        for f in required_files:
            if not (self.accuoalv_path / f).exists():
                logger.warning(f"accuoaLV missing file: {f}")
                return False
        
        return True
    
    def convert_daq_to_lvgl_project(self, daq_project: Dict) -> Dict:
        """
        将 accuDaq 项目转换为 accuoaLV 项目格式
        
        Args:
            daq_project: accuDaq .daq 项目数据
            
        Returns:
            accuoaLV .lvgl-project 格式数据
        """
        lvgl_project = {
            "metadata": {
                "name": daq_project.get("meta", {}).get("name", "Untitled"),
                "version": "1.0.0",
                "description": f"Converted from accuDaq project",
                "author": daq_project.get("meta", {}).get("author", ""),
                "created": daq_project.get("meta", {}).get("createdAt", ""),
                "modified": daq_project.get("meta", {}).get("modifiedAt", ""),
            },
            "settings": {
                "screenWidth": 800,
                "screenHeight": 480,
                "colorDepth": 16,
                "theme": "default",
            },
            "widgets": [],
            "resources": {
                "images": [],
                "fonts": []
            }
        }
        
        # 转换 UI widgets
        ui_widgets = daq_project.get("ui", {}).get("widgets", [])
        for widget in ui_widgets:
            lvgl_widget = self._convert_widget(widget)
            if lvgl_widget:
                lvgl_project["widgets"].append(lvgl_widget)
        
        return lvgl_project
    
    def _convert_widget(self, daq_widget: Dict) -> Optional[Dict]:
        """
        转换单个 widget 到 LVGL 格式
        """
        widget_type = daq_widget.get("type", "")
        lvgl_type = self.WIDGET_TYPE_MAP.get(widget_type)
        
        if not lvgl_type:
            logger.warning(f"Unknown widget type: {widget_type}")
            return None
        
        config = daq_widget.get("config", {})
        position = daq_widget.get("position", {})
        
        # 基础 LVGL widget 结构
        lvgl_widget = {
            "id": daq_widget.get("id", ""),
            "type": lvgl_type,
            "name": config.get("label", config.get("title", f"widget_{daq_widget.get('id', '')}")),
            "x": position.get("x", 0) * 100,  # Grid to pixels
            "y": position.get("y", 0) * 60,
            "width": position.get("w", 2) * 100,
            "height": position.get("h", 2) * 60,
            "properties": {},
            "styles": {},
            "events": []
        }
        
        # 根据类型设置特定属性
        if lvgl_type == 'arc':
            lvgl_widget["properties"] = {
                "bg_start_angle": 135,
                "bg_end_angle": 45,
                "value": 0,
                "min": config.get("min", 0),
                "max": config.get("max", 100),
            }
        elif lvgl_type == 'led':
            lvgl_widget["properties"] = {
                "color": config.get("onColor", "#00ff00"),
                "brightness": 255,
            }
        elif lvgl_type == 'chart':
            lvgl_widget["properties"] = {
                "chart_type": "line",
                "point_count": 100,
                "series_count": 1,
            }
        elif lvgl_type == 'label':
            lvgl_widget["properties"] = {
                "text": config.get("label", "0"),
                "text_align": "center",
            }
        elif lvgl_type == 'switch':
            lvgl_widget["properties"] = {
                "checked": False,
            }
        elif lvgl_type == 'slider':
            lvgl_widget["properties"] = {
                "value": config.get("value", 0),
                "min": config.get("min", 0),
                "max": config.get("max", 100),
            }
        
        # 添加数据绑定信息
        binding = daq_widget.get("binding", {})
        if binding:
            lvgl_widget["userData"] = {
                "dataBinding": {
                    "type": binding.get("type", ""),
                    "path": binding.get("path", ""),
                }
            }
        
        return lvgl_widget
    
    def export_to_lvgl_project(self, daq_project: Dict, output_path: str) -> str:
        """
        导出为 .lvgl-project 文件
        
        Args:
            daq_project: accuDaq 项目数据
            output_path: 输出文件路径
            
        Returns:
            输出文件路径
        """
        lvgl_project = self.convert_daq_to_lvgl_project(daq_project)
        
        output_path = Path(output_path)
        if not output_path.suffix:
            output_path = output_path.with_suffix('.lvgl-project')
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(lvgl_project, f, indent=2, ensure_ascii=False)
        
        logger.info(f"Exported LVGL project to: {output_path}")
        return str(output_path)
    
    def generate_lvgl_code(self, daq_project: Dict, output_dir: str, 
                          multi_file: bool = True) -> Dict[str, str]:
        """
        生成 LVGL C 代码
        
        Args:
            daq_project: accuDaq 项目数据
            output_dir: 输出目录
            multi_file: 是否生成多文件结构
            
        Returns:
            生成的文件路径字典
        """
        # 先转换为 LVGL 项目格式
        lvgl_project = self.convert_daq_to_lvgl_project(daq_project)
        
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        
        generated_files = {}
        
        if multi_file:
            # 多文件结构
            generated_files = self._generate_multi_file_code(lvgl_project, output_dir)
        else:
            # 单文件
            generated_files = self._generate_single_file_code(lvgl_project, output_dir)
        
        return generated_files
    
    def _generate_multi_file_code(self, lvgl_project: Dict, output_dir: Path) -> Dict[str, str]:
        """生成多文件 LVGL 代码结构"""
        files = {}
        project_name = lvgl_project["metadata"]["name"].replace(" ", "_").lower()
        
        # 1. ui.h - 主头文件
        ui_h = self._generate_ui_header(lvgl_project, project_name)
        ui_h_path = output_dir / "ui.h"
        ui_h_path.write_text(ui_h, encoding='utf-8')
        files["ui.h"] = str(ui_h_path)
        
        # 2. ui.c - 主源文件
        ui_c = self._generate_ui_source(lvgl_project, project_name)
        ui_c_path = output_dir / "ui.c"
        ui_c_path.write_text(ui_c, encoding='utf-8')
        files["ui.c"] = str(ui_c_path)
        
        # 3. ui_events.h
        events_h = self._generate_events_header(lvgl_project, project_name)
        events_h_path = output_dir / "ui_events.h"
        events_h_path.write_text(events_h, encoding='utf-8')
        files["ui_events.h"] = str(events_h_path)
        
        # 4. ui_events.c
        events_c = self._generate_events_source(lvgl_project, project_name)
        events_c_path = output_dir / "ui_events.c"
        events_c_path.write_text(events_c, encoding='utf-8')
        files["ui_events.c"] = str(events_c_path)
        
        logger.info(f"Generated {len(files)} LVGL files in {output_dir}")
        return files
    
    def _generate_single_file_code(self, lvgl_project: Dict, output_dir: Path) -> Dict[str, str]:
        """生成单文件 LVGL 代码"""
        project_name = lvgl_project["metadata"]["name"].replace(" ", "_").lower()
        
        code = f"""/**
 * Generated by accuDaq LVGL Integration
 * Project: {lvgl_project["metadata"]["name"]}
 * 
 * This file was auto-generated. Do not edit manually.
 */

#include "lvgl.h"

// Widget declarations
"""
        
        # 添加 widget 声明
        for widget in lvgl_project.get("widgets", []):
            widget_name = widget.get("name", widget["id"]).replace(" ", "_").lower()
            code += f"static lv_obj_t *{widget_name};\n"
        
        code += f"""
// UI initialization function
void ui_init(void) {{
    lv_obj_t *screen = lv_scr_act();
    
"""
        
        # 添加 widget 创建代码
        for widget in lvgl_project.get("widgets", []):
            code += self._generate_widget_code(widget)
        
        code += "}\n"
        
        output_path = output_dir / f"{project_name}_ui.c"
        output_path.write_text(code, encoding='utf-8')
        
        return {f"{project_name}_ui.c": str(output_path)}
    
    def _generate_ui_header(self, project: Dict, name: str) -> str:
        """生成 ui.h 头文件"""
        guard = f"__{name.upper()}_UI_H__"
        
        code = f"""/**
 * @file ui.h
 * @brief LVGL UI Header - Generated by accuDaq
 */

#ifndef {guard}
#define {guard}

#ifdef __cplusplus
extern "C" {{
#endif

#include "lvgl.h"

// Screen dimensions
#define SCREEN_WIDTH  {project["settings"]["screenWidth"]}
#define SCREEN_HEIGHT {project["settings"]["screenHeight"]}

// Widget getters
"""
        
        for widget in project.get("widgets", []):
            widget_name = widget.get("name", widget["id"]).replace(" ", "_").lower()
            code += f"lv_obj_t *ui_get_{widget_name}(void);\n"
        
        code += f"""
// UI initialization
void ui_init(void);

// UI update (call periodically to update data bindings)
void ui_update(void);

#ifdef __cplusplus
}}
#endif

#endif /* {guard} */
"""
        return code
    
    def _generate_ui_source(self, project: Dict, name: str) -> str:
        """生成 ui.c 源文件"""
        code = f"""/**
 * @file ui.c
 * @brief LVGL UI Implementation - Generated by accuDaq
 */

#include "ui.h"
#include "ui_events.h"

// Widget objects
"""
        
        for widget in project.get("widgets", []):
            widget_name = widget.get("name", widget["id"]).replace(" ", "_").lower()
            code += f"static lv_obj_t *{widget_name};\n"
        
        code += """
// Widget getters
"""
        
        for widget in project.get("widgets", []):
            widget_name = widget.get("name", widget["id"]).replace(" ", "_").lower()
            code += f"""lv_obj_t *ui_get_{widget_name}(void) {{
    return {widget_name};
}}

"""
        
        code += """void ui_init(void) {
    lv_obj_t *screen = lv_scr_act();
    lv_obj_set_style_bg_color(screen, lv_color_hex(0x1a1a2e), 0);
    
"""
        
        for widget in project.get("widgets", []):
            code += self._generate_widget_code(widget)
        
        code += """}

void ui_update(void) {
    // Update data bindings here
    // This function should be called periodically
}
"""
        return code
    
    def _generate_events_header(self, project: Dict, name: str) -> str:
        """生成 ui_events.h"""
        guard = f"__{name.upper()}_UI_EVENTS_H__"
        return f"""/**
 * @file ui_events.h
 * @brief UI Event Handlers - Generated by accuDaq
 */

#ifndef {guard}
#define {guard}

#include "lvgl.h"

// Event handlers - implement these in ui_events.c

#endif /* {guard} */
"""
    
    def _generate_events_source(self, project: Dict, name: str) -> str:
        """生成 ui_events.c"""
        return f"""/**
 * @file ui_events.c
 * @brief UI Event Handlers Implementation
 * 
 * This file is safe to edit. Add your event handler implementations here.
 */

#include "ui_events.h"
#include "ui.h"

// Add your event handler implementations here
"""
    
    def _generate_widget_code(self, widget: Dict) -> str:
        """生成单个 widget 的创建代码"""
        widget_type = widget.get("type", "")
        widget_name = widget.get("name", widget["id"]).replace(" ", "_").lower()
        props = widget.get("properties", {})
        
        x = widget.get("x", 0)
        y = widget.get("y", 0)
        w = widget.get("width", 100)
        h = widget.get("height", 100)
        
        code = f"    // {widget.get('name', widget['id'])}\n"
        
        if widget_type == "arc":
            code += f"""    {widget_name} = lv_arc_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_arc_set_range({widget_name}, {props.get('min', 0)}, {props.get('max', 100)});
    lv_arc_set_value({widget_name}, {props.get('value', 0)});
    lv_arc_set_bg_angles({widget_name}, {props.get('bg_start_angle', 135)}, {props.get('bg_end_angle', 45)});
    
"""
        elif widget_type == "led":
            color = props.get("color", "#00ff00").lstrip("#")
            code += f"""    {widget_name} = lv_led_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_led_set_color({widget_name}, lv_color_hex(0x{color}));
    lv_led_off({widget_name});
    
"""
        elif widget_type == "label":
            text = props.get("text", "Label")
            code += f"""    {widget_name} = lv_label_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_label_set_text({widget_name}, "{text}");
    lv_obj_set_style_text_align({widget_name}, LV_TEXT_ALIGN_CENTER, 0);
    
"""
        elif widget_type == "chart":
            code += f"""    {widget_name} = lv_chart_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_chart_set_type({widget_name}, LV_CHART_TYPE_LINE);
    lv_chart_set_point_count({widget_name}, {props.get('point_count', 100)});
    lv_chart_add_series({widget_name}, lv_palette_main(LV_PALETTE_BLUE), LV_CHART_AXIS_PRIMARY_Y);
    
"""
        elif widget_type == "switch":
            code += f"""    {widget_name} = lv_switch_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    
"""
        elif widget_type == "slider":
            code += f"""    {widget_name} = lv_slider_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_slider_set_range({widget_name}, {props.get('min', 0)}, {props.get('max', 100)});
    lv_slider_set_value({widget_name}, {props.get('value', 0)}, LV_ANIM_OFF);
    
"""
        elif widget_type == "button":
            code += f"""    {widget_name} = lv_btn_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_obj_t *{widget_name}_label = lv_label_create({widget_name});
    lv_label_set_text({widget_name}_label, "{props.get('text', 'Button')}");
    lv_obj_center({widget_name}_label);
    
"""
        elif widget_type == "bar":
            code += f"""    {widget_name} = lv_bar_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    lv_bar_set_range({widget_name}, {props.get('min', 0)}, {props.get('max', 100)});
    lv_bar_set_value({widget_name}, {props.get('value', 0)}, LV_ANIM_OFF);
    
"""
        else:
            code += f"""    // Unknown widget type: {widget_type}
    {widget_name} = lv_obj_create(screen);
    lv_obj_set_pos({widget_name}, {x}, {y});
    lv_obj_set_size({widget_name}, {w}, {h});
    
"""
        
        return code


# 全局实例
lvgl_integration = LVGLIntegration()
