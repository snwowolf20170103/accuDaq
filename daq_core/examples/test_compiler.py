"""
编译器测试脚本
测试 .daq 文件编译功能
"""

import sys
import os

# 添加项目根目录到路径
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, project_root)

from daq_core.compiler import DAQCompiler


def test_compile_golden_sample():
    """编译黄金样例项目"""
    print("=" * 60)
    print("DAQ 编译器测试")
    print("=" * 60)

    compiler = DAQCompiler()

    # 编译黄金样例
    input_file = os.path.join(project_root, "examples", "golden_sample.daq")
    output_file = os.path.join(project_root, "examples", "golden_sample_generated.py")

    print(f"\n输入文件: {input_file}")
    print(f"输出文件: {output_file}")
    print("-" * 40)

    success, result = compiler.compile_file(input_file, output_file)

    if success:
        print("\n✅ 编译成功！")
        print(f"\n生成的代码预览（前 50 行）：")
        print("-" * 40)
        lines = result.split("\n")[:50]
        for i, line in enumerate(lines, 1):
            print(f"{i:3}: {line}")
        print("...")
        print("-" * 40)

        # 显示项目信息
        project = compiler.get_project()
        if project:
            print(f"\n项目名称: {project.meta.name}")
            print(f"节点数量: {len(project.nodes)}")
            print(f"连线数量: {len(project.wires)}")
            print(f"控件数量: {len(project.widgets)}")

        # 警告信息
        warnings = compiler.get_warnings()
        if warnings:
            print(f"\n⚠️ 警告:")
            for w in warnings:
                print(f"  - {w}")

    else:
        print("\n❌ 编译失败！")
        print(f"错误信息: {result}")

    return success


def test_compile_inline():
    """测试内联 JSON 编译"""
    print("\n" + "=" * 60)
    print("内联 JSON 编译测试")
    print("=" * 60)

    json_content = '''
    {
        "meta": {
            "name": "简单测试",
            "version": "1.0.0",
            "schemaVersion": "0.1.0"
        },
        "devices": [],
        "logic": {
            "nodes": [
                {
                    "id": "mock1",
                    "type": "daq:mock_device",
                    "position": {"x": 0, "y": 0},
                    "properties": {"topic": "test/data"}
                },
                {
                    "id": "csv1",
                    "type": "daq:csv_storage",
                    "position": {"x": 200, "y": 0},
                    "properties": {"file_path": "./test.csv"}
                }
            ],
            "wires": [
                {
                    "id": "w1",
                    "source": {"nodeId": "mock1", "portId": "value"},
                    "target": {"nodeId": "csv1", "portId": "value"}
                }
            ]
        },
        "ui": {"widgets": []}
    }
    '''

    compiler = DAQCompiler()
    success, result = compiler.compile_string(json_content)

    if success:
        print("✅ 内联编译成功！")
        print(f"生成代码长度: {len(result)} 字符")
    else:
        print(f"❌ 编译失败: {result}")

    return success


if __name__ == "__main__":
    test_compile_golden_sample()
    test_compile_inline()
