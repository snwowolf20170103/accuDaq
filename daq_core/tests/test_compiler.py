"""
DAQ Compiler Unit Tests
Tests for the compilation pipeline
"""

import pytest
import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from compiler.compiler import DAQCompiler


class TestDAQCompiler:
    """Tests for DAQCompiler"""
    
    @pytest.fixture
    def simple_project(self):
        """Simple project with mock device and debug print"""
        return {
            "meta": {
                "name": "Test Project",
                "version": "1.0.0",
                "schemaVersion": "2.0.0"
            },
            "devices": [],
            "logic": {
                "nodes": [
                    {
                        "id": "node_1",
                        "type": "daq:mock_device",
                        "label": "Mock Sensor",
                        "position": {"x": 100, "y": 100},
                        "properties": {
                            "wave_type": "sine",
                            "amplitude": 10,
                            "offset": 25
                        }
                    },
                    {
                        "id": "node_2",
                        "type": "daq:debug_print",
                        "label": "Debug Output",
                        "position": {"x": 300, "y": 100},
                        "properties": {
                            "prefix": "[DEBUG]"
                        }
                    }
                ],
                "wires": [
                    {
                        "id": "wire_1",
                        "source": {"nodeId": "node_1", "portId": "value"},
                        "target": {"nodeId": "node_2", "portId": "data"}
                    }
                ]
            },
            "ui": {"widgets": []}
        }
    
    @pytest.fixture
    def temperature_project(self):
        """Temperature monitoring project for MVP validation"""
        return {
            "meta": {
                "name": "Temperature Monitor",
                "version": "1.0.0",
                "schemaVersion": "2.0.0"
            },
            "devices": [],
            "logic": {
                "nodes": [
                    {
                        "id": "sensor",
                        "type": "daq:mock_device",
                        "label": "Temperature Sensor",
                        "properties": {
                            "wave_type": "sine",
                            "amplitude": 15,
                            "offset": 25
                        }
                    },
                    {
                        "id": "compare",
                        "type": "daq:compare",
                        "label": "Threshold Check",
                        "properties": {
                            "operator": ">",
                            "threshold": 30
                        }
                    },
                    {
                        "id": "alarm",
                        "type": "daq:threshold_alarm",
                        "label": "Alarm",
                        "properties": {
                            "threshold": 30,
                            "message": "Temperature exceeded!"
                        }
                    },
                    {
                        "id": "csv",
                        "type": "daq:csv_storage",
                        "label": "Data Logger",
                        "properties": {
                            "file_path": "data/temperature.csv",
                            "columns": "timestamp,temperature"
                        }
                    }
                ],
                "wires": [
                    {
                        "id": "w1",
                        "source": {"nodeId": "sensor", "portId": "value"},
                        "target": {"nodeId": "compare", "portId": "input1"}
                    },
                    {
                        "id": "w2",
                        "source": {"nodeId": "sensor", "portId": "value"},
                        "target": {"nodeId": "alarm", "portId": "value"}
                    },
                    {
                        "id": "w3",
                        "source": {"nodeId": "sensor", "portId": "value"},
                        "target": {"nodeId": "csv", "portId": "data"}
                    }
                ]
            },
            "ui": {
                "widgets": [
                    {
                        "id": "gauge_1",
                        "type": "gauge",
                        "config": {"label": "Temperature", "min": 0, "max": 50}
                    },
                    {
                        "id": "led_1",
                        "type": "led",
                        "config": {"label": "Alarm", "onColor": "#e74c3c"}
                    }
                ]
            }
        }
    
    def test_compiler_creation(self, simple_project):
        """Test compiler can be created"""
        compiler = DAQCompiler()
        assert compiler is not None

    def test_compile_simple_project(self, simple_project):
        """Test compiling a simple project"""
        import json
        compiler = DAQCompiler()
        success, code = compiler.compile_string(json.dumps(simple_project))

        assert success, f"Compilation failed: {code}"
        assert code is not None
        assert len(code) > 0
        assert "mock_device" in code.lower() or "MockDevice" in code

    def test_compile_temperature_project(self, temperature_project):
        """Test compiling temperature monitoring project"""
        import json
        compiler = DAQCompiler()
        success, code = compiler.compile_string(json.dumps(temperature_project))

        assert success, f"Compilation failed: {code}"
        assert code is not None
        assert "compare" in code.lower() or "Compare" in code
        assert "csv" in code.lower() or "CSV" in code

    def test_generated_code_is_valid_python(self, simple_project):
        """Test that generated code is valid Python syntax"""
        import json
        compiler = DAQCompiler()
        success, code = compiler.compile_string(json.dumps(simple_project))

        assert success, f"Compilation failed: {code}"

        # This should not raise SyntaxError
        try:
            compile(code, '<string>', 'exec')
            syntax_valid = True
        except SyntaxError:
            syntax_valid = False

        assert syntax_valid, "Generated code has syntax errors"


class TestProjectSchema:
    """Tests for project schema validation"""
    
    def test_valid_project_structure(self):
        """Test valid project has required fields"""
        project = {
            "meta": {"name": "Test", "version": "1.0.0", "schemaVersion": "2.0.0"},
            "devices": [],
            "logic": {"nodes": [], "wires": []},
            "ui": {"widgets": []}
        }
        
        assert "meta" in project
        assert "logic" in project
        assert "nodes" in project["logic"]
        assert "wires" in project["logic"]
    
    def test_node_structure(self):
        """Test node has required fields"""
        node = {
            "id": "test_node",
            "type": "daq:mock_device",
            "label": "Test",
            "position": {"x": 0, "y": 0},
            "properties": {}
        }
        
        assert "id" in node
        assert "type" in node
        assert node["type"].startswith("daq:")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
