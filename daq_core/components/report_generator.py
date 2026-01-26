"""
报告生成系统
支持 PDF、HTML、CSV 格式的测试报告生成
"""

import os
import json
import time
import logging
from datetime import datetime
from typing import Any, Dict, List, Optional
from abc import ABC, abstractmethod
from pathlib import Path

logger = logging.getLogger(__name__)


class ReportSection:
    """报告段落"""
    
    def __init__(self, title: str, content: Any, section_type: str = "text"):
        self.title = title
        self.content = content
        self.section_type = section_type  # text, table, chart, image


class ReportTemplate:
    """报告模板"""
    
    def __init__(self, name: str):
        self.name = name
        self.header_text = ""
        self.footer_text = ""
        self.logo_path = None
        self.styles = {}
        self.sections: List[str] = []  # 段落顺序


class ReportGenerator(ABC):
    """报告生成器基类"""
    
    def __init__(self):
        self.title = "DAQ Report"
        self.author = ""
        self.created_at = datetime.now()
        self.sections: List[ReportSection] = []
        self.metadata: Dict = {}
    
    def set_title(self, title: str):
        self.title = title
        return self
    
    def set_author(self, author: str):
        self.author = author
        return self
    
    def add_metadata(self, key: str, value: Any):
        self.metadata[key] = value
        return self
    
    def add_section(self, title: str, content: Any, section_type: str = "text"):
        self.sections.append(ReportSection(title, content, section_type))
        return self
    
    def add_text(self, title: str, text: str):
        return self.add_section(title, text, "text")
    
    def add_table(self, title: str, headers: List[str], rows: List[List[Any]]):
        return self.add_section(title, {"headers": headers, "rows": rows}, "table")
    
    def add_key_value(self, title: str, data: Dict[str, Any]):
        return self.add_section(title, data, "key_value")
    
    def add_chart(self, title: str, chart_config: Dict):
        return self.add_section(title, chart_config, "chart")
    
    def add_image(self, title: str, image_path: str):
        return self.add_section(title, image_path, "image")
    
    @abstractmethod
    def generate(self, output_path: str) -> bool:
        pass


class HTMLReportGenerator(ReportGenerator):
    """HTML 报告生成器"""
    
    def __init__(self):
        super().__init__()
        self.styles = """
        <style>
            * { box-sizing: border-box; }
            body { 
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0; padding: 20px;
                background: #f5f5f5;
                color: #333;
            }
            .container { 
                max-width: 1200px; 
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
            h2 { color: #34495e; margin-top: 30px; }
            .meta { color: #7f8c8d; font-size: 0.9em; margin-bottom: 20px; }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                margin: 15px 0;
            }
            th, td { 
                padding: 12px 15px; 
                text-align: left; 
                border: 1px solid #ddd;
            }
            th { background: #3498db; color: white; }
            tr:nth-child(even) { background: #f9f9f9; }
            tr:hover { background: #f1f1f1; }
            .key-value { display: grid; grid-template-columns: 200px 1fr; gap: 10px; }
            .key-value .key { font-weight: bold; color: #555; }
            .key-value .value { color: #333; }
            .section { margin-bottom: 30px; }
            .footer { 
                margin-top: 40px; 
                padding-top: 20px; 
                border-top: 1px solid #ddd;
                color: #7f8c8d;
                font-size: 0.85em;
                text-align: center;
            }
            .chart-placeholder {
                background: #ecf0f1;
                padding: 40px;
                text-align: center;
                border-radius: 4px;
                color: #7f8c8d;
            }
        </style>
        """
    
    def generate(self, output_path: str) -> bool:
        try:
            html_parts = [
                "<!DOCTYPE html>",
                "<html lang='zh-CN'>",
                "<head>",
                "<meta charset='UTF-8'>",
                "<meta name='viewport' content='width=device-width, initial-scale=1.0'>",
                f"<title>{self.title}</title>",
                self.styles,
                "</head>",
                "<body>",
                "<div class='container'>",
                f"<h1>{self.title}</h1>",
                f"<div class='meta'>作者: {self.author} | 生成时间: {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}</div>",
            ]
            
            # 添加段落
            for section in self.sections:
                html_parts.append(f"<div class='section'>")
                html_parts.append(f"<h2>{section.title}</h2>")
                
                if section.section_type == "text":
                    html_parts.append(f"<p>{section.content}</p>")
                
                elif section.section_type == "table":
                    data = section.content
                    html_parts.append("<table>")
                    html_parts.append("<thead><tr>")
                    for header in data["headers"]:
                        html_parts.append(f"<th>{header}</th>")
                    html_parts.append("</tr></thead>")
                    html_parts.append("<tbody>")
                    for row in data["rows"]:
                        html_parts.append("<tr>")
                        for cell in row:
                            html_parts.append(f"<td>{cell}</td>")
                        html_parts.append("</tr>")
                    html_parts.append("</tbody></table>")
                
                elif section.section_type == "key_value":
                    html_parts.append("<div class='key-value'>")
                    for key, value in section.content.items():
                        html_parts.append(f"<div class='key'>{key}</div>")
                        html_parts.append(f"<div class='value'>{value}</div>")
                    html_parts.append("</div>")
                
                elif section.section_type == "chart":
                    # 简单的图表占位符
                    html_parts.append(f"<div class='chart-placeholder'>图表: {json.dumps(section.content)}</div>")
                
                elif section.section_type == "image":
                    if os.path.exists(section.content):
                        html_parts.append(f"<img src='{section.content}' style='max-width: 100%;'>")
                    else:
                        html_parts.append(f"<p>图片: {section.content}</p>")
                
                html_parts.append("</div>")
            
            # 页脚
            html_parts.extend([
                "<div class='footer'>",
                f"由 accuDaq 生成 | {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "</div>",
                "</div>",
                "</body>",
                "</html>",
            ])
            
            # 写入文件
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            with open(output_path, 'w', encoding='utf-8') as f:
                f.write("\n".join(html_parts))
            
            logger.info(f"HTML 报告已生成: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"生成 HTML 报告失败: {e}")
            return False


class CSVReportGenerator(ReportGenerator):
    """CSV 报告生成器"""
    
    def generate(self, output_path: str) -> bool:
        import csv
        
        try:
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            
            with open(output_path, 'w', encoding='utf-8-sig', newline='') as f:
                writer = csv.writer(f)
                
                # 写入标题和元数据
                writer.writerow([self.title])
                writer.writerow([f"作者: {self.author}", f"生成时间: {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}"])
                writer.writerow([])
                
                # 写入段落
                for section in self.sections:
                    writer.writerow([f"## {section.title}"])
                    
                    if section.section_type == "text":
                        writer.writerow([section.content])
                    
                    elif section.section_type == "table":
                        data = section.content
                        writer.writerow(data["headers"])
                        for row in data["rows"]:
                            writer.writerow(row)
                    
                    elif section.section_type == "key_value":
                        for key, value in section.content.items():
                            writer.writerow([key, value])
                    
                    writer.writerow([])
            
            logger.info(f"CSV 报告已生成: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"生成 CSV 报告失败: {e}")
            return False


class PDFReportGenerator(ReportGenerator):
    """PDF 报告生成器"""
    
    def generate(self, output_path: str) -> bool:
        # 尝试使用 reportlab
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            
            return self._generate_with_reportlab(output_path)
        except ImportError:
            pass
        
        # 回退到 HTML 转 PDF（使用 pdfkit）
        try:
            import pdfkit
            return self._generate_with_pdfkit(output_path)
        except ImportError:
            pass
        
        # 最后回退：生成 HTML
        logger.warning("PDF 库不可用，回退到 HTML 格式")
        html_path = output_path.replace('.pdf', '.html')
        return HTMLReportGenerator().generate(html_path)
    
    def _generate_with_reportlab(self, output_path: str) -> bool:
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.styles import getSampleStyleSheet
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
            from reportlab.lib import colors
            from reportlab.lib.units import inch
            from reportlab.pdfbase import pdfmetrics
            from reportlab.pdfbase.ttfonts import TTFont
            
            os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
            
            doc = SimpleDocTemplate(output_path, pagesize=A4)
            styles = getSampleStyleSheet()
            elements = []
            
            # 标题
            elements.append(Paragraph(self.title, styles['Title']))
            elements.append(Spacer(1, 12))
            elements.append(Paragraph(
                f"Author: {self.author} | Generated: {self.created_at.strftime('%Y-%m-%d %H:%M:%S')}",
                styles['Normal']
            ))
            elements.append(Spacer(1, 24))
            
            # 段落
            for section in self.sections:
                elements.append(Paragraph(section.title, styles['Heading2']))
                elements.append(Spacer(1, 8))
                
                if section.section_type == "text":
                    elements.append(Paragraph(str(section.content), styles['Normal']))
                
                elif section.section_type == "table":
                    data = section.content
                    table_data = [data["headers"]] + data["rows"]
                    t = Table(table_data)
                    t.setStyle(TableStyle([
                        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
                        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
                        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                        ('FONTSIZE', (0, 0), (-1, -1), 10),
                        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
                        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
                        ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ]))
                    elements.append(t)
                
                elif section.section_type == "key_value":
                    for key, value in section.content.items():
                        elements.append(Paragraph(f"<b>{key}:</b> {value}", styles['Normal']))
                
                elements.append(Spacer(1, 16))
            
            doc.build(elements)
            logger.info(f"PDF 报告已生成: {output_path}")
            return True
            
        except Exception as e:
            logger.error(f"生成 PDF 报告失败: {e}")
            return False
    
    def _generate_with_pdfkit(self, output_path: str) -> bool:
        try:
            import pdfkit
            
            # 先生成 HTML
            html_gen = HTMLReportGenerator()
            html_gen.title = self.title
            html_gen.author = self.author
            html_gen.sections = self.sections
            
            temp_html = output_path.replace('.pdf', '_temp.html')
            if html_gen.generate(temp_html):
                pdfkit.from_file(temp_html, output_path)
                os.remove(temp_html)
                logger.info(f"PDF 报告已生成: {output_path}")
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"生成 PDF 报告失败: {e}")
            return False


class ReportBuilder:
    """
    报告构建器工厂
    """
    
    @staticmethod
    def create(format_type: str = "html") -> ReportGenerator:
        """
        创建报告生成器
        
        Args:
            format_type: html, pdf, csv
        """
        generators = {
            "html": HTMLReportGenerator,
            "pdf": PDFReportGenerator,
            "csv": CSVReportGenerator,
        }
        
        generator_class = generators.get(format_type.lower(), HTMLReportGenerator)
        return generator_class()
    
    @staticmethod
    def create_test_report(
        title: str,
        test_results: List[Dict],
        summary: Dict = None,
        format_type: str = "html",
    ) -> ReportGenerator:
        """
        创建测试报告
        
        Args:
            title: 报告标题
            test_results: 测试结果列表 [{"name": "", "status": "", "duration": 0, ...}]
            summary: 汇总信息
            format_type: 报告格式
        """
        generator = ReportBuilder.create(format_type)
        generator.set_title(title)
        
        # 汇总信息
        if summary:
            generator.add_key_value("测试汇总", summary)
        
        # 测试结果表格
        headers = ["测试名称", "状态", "耗时(ms)", "备注"]
        rows = []
        for result in test_results:
            rows.append([
                result.get("name", ""),
                result.get("status", ""),
                result.get("duration", 0),
                result.get("message", ""),
            ])
        generator.add_table("测试结果", headers, rows)
        
        return generator
    
    @staticmethod
    def create_data_report(
        title: str,
        data_series: List[Dict],
        metadata: Dict = None,
        format_type: str = "html",
    ) -> ReportGenerator:
        """
        创建数据报告
        
        Args:
            title: 报告标题
            data_series: 数据系列 [{"name": "", "values": [...]}]
            metadata: 元数据
            format_type: 报告格式
        """
        generator = ReportBuilder.create(format_type)
        generator.set_title(title)
        
        if metadata:
            generator.add_key_value("数据信息", metadata)
        
        for series in data_series:
            series_name = series.get("name", "数据")
            values = series.get("values", [])
            
            # 统计信息
            if values:
                stats = {
                    "数据点数": len(values),
                    "最小值": min(values),
                    "最大值": max(values),
                    "平均值": sum(values) / len(values),
                }
                generator.add_key_value(f"{series_name} 统计", stats)
        
        return generator


def quick_report(
    title: str,
    content: Dict[str, Any],
    output_path: str,
    format_type: str = "html",
) -> bool:
    """
    快速生成报告
    
    Args:
        title: 报告标题
        content: 报告内容 {"section_name": content, ...}
        output_path: 输出路径
        format_type: 报告格式
    """
    generator = ReportBuilder.create(format_type)
    generator.set_title(title)
    
    for section_name, section_content in content.items():
        if isinstance(section_content, str):
            generator.add_text(section_name, section_content)
        elif isinstance(section_content, dict):
            generator.add_key_value(section_name, section_content)
        elif isinstance(section_content, list):
            if section_content and isinstance(section_content[0], list):
                # 假设是表格数据
                headers = section_content[0]
                rows = section_content[1:]
                generator.add_table(section_name, headers, rows)
            else:
                generator.add_text(section_name, str(section_content))
    
    return generator.generate(output_path)
