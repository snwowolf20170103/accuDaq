"""
MVP Acceptance Tests
Validates the core MVP workflow as specified in MVP needs document v2.0

MVP Acceptance Criteria:
1. Create "Temperature Monitor" project
2. Add virtual temperature sensor
3. Drag "read" and "greater than" nodes (temperature > 30)
4. Add waveform chart and alarm LED to Dashboard
5. Run and see waveform moving, alarm LED turns red when > 30
6. Find saved CSV data after stopping
"""

import pytest
import json
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


class TestMVPWorkflow:
    """End-to-end MVP acceptance tests"""
    
    @pytest.fixture
    def mvp_project(self):
        """Standard MVP temperature monitoring project"""
        return {
            "meta": {
                "name": "Temperature Monitor",
                "version": "1.0.0",
                "schemaVersion": "2.0.0",
                "description": "MVP validation project"
            },
            "devices": [
                {
                    "id": "virtual_sensor",
                    "type": "mock",
                    "name": "Virtual Temperature Sensor",
                    "config": {
                        "wave_type": "sine",
                        "amplitude": 15,
                        "offset": 25,
                        "frequency": 0.1
                    }
                }
            ],
            "logic": {
                "nodes": [
                    {
                        "id": "sensor_read",
                        "type": "daq:mock_device",
                        "label": "Temperature Sensor",
                        "position": {"x": 100, "y": 150},
                        "properties": {
                            "wave_type": "sine",
                            "amplitude": 15,
                            "offset": 25
                        }
                    },
                    {
                        "id": "threshold_check",
                        "type": "daq:compare",
                        "label": "Temperature > 30",
                        "position": {"x": 350, "y": 100},
                        "properties": {
                            "operator": ">",
                            "threshold": 30
                        }
                    },
                    {
                        "id": "data_storage",
                        "type": "daq:csv_storage",
                        "label": "CSV Logger",
                        "position": {"x": 350, "y": 250},
                        "properties": {
                            "file_path": "data/temperature.csv",
                            "columns": "timestamp,temperature",
                            "append": True
                        }
                    }
                ],
                "wires": [
                    {
                        "id": "wire_sensor_to_compare",
                        "source": {"nodeId": "sensor_read", "portId": "value"},
                        "target": {"nodeId": "threshold_check", "portId": "input1"}
                    },
                    {
                        "id": "wire_sensor_to_csv",
                        "source": {"nodeId": "sensor_read", "portId": "value"},
                        "target": {"nodeId": "data_storage", "portId": "data"}
                    }
                ]
            },
            "ui": {
                "widgets": [
                    {
                        "id": "chart_temperature",
                        "type": "line_chart",
                        "title": "Temperature Trend",
                        "position": {"x": 0, "y": 0, "w": 6, "h": 4},
                        "config": {
                            "dataKey": "temperature",
                            "color": "#4a90d9",
                            "label": "Temperature (°C)"
                        },
                        "binding": {
                            "type": "node_output",
                            "path": "sensor_read.value"
                        }
                    },
                    {
                        "id": "led_alarm",
                        "type": "led",
                        "title": "Alarm",
                        "position": {"x": 6, "y": 0, "w": 2, "h": 2},
                        "config": {
                            "onColor": "#e74c3c",
                            "offColor": "#27ae60"
                        },
                        "binding": {
                            "type": "node_output",
                            "path": "threshold_check.result"
                        }
                    },
                    {
                        "id": "gauge_temp",
                        "type": "gauge",
                        "title": "Current Temperature",
                        "position": {"x": 8, "y": 0, "w": 4, "h": 4},
                        "config": {
                            "min": 0,
                            "max": 50,
                            "unit": "°C"
                        },
                        "binding": {
                            "type": "node_output",
                            "path": "sensor_read.value"
                        }
                    }
                ],
                "layout": "grid",
                "theme": "dark"
            }
        }
    
    def test_mvp_step1_project_creation(self, mvp_project):
        """Step 1: Create temperature monitoring project"""
        assert mvp_project["meta"]["name"] == "Temperature Monitor"
        assert "logic" in mvp_project
        assert "ui" in mvp_project
    
    def test_mvp_step2_virtual_sensor(self, mvp_project):
        """Step 2: Virtual temperature sensor exists"""
        nodes = mvp_project["logic"]["nodes"]
        sensor_nodes = [n for n in nodes if "mock_device" in n["type"]]
        
        assert len(sensor_nodes) >= 1
        sensor = sensor_nodes[0]
        assert sensor["properties"]["wave_type"] == "sine"
    
    def test_mvp_step3_logic_nodes(self, mvp_project):
        """Step 3: Read and compare nodes exist"""
        nodes = mvp_project["logic"]["nodes"]
        node_types = [n["type"] for n in nodes]
        
        # Should have mock_device (read) and compare (greater than)
        assert any("mock_device" in t for t in node_types)
        assert any("compare" in t for t in node_types)
        
        # Compare should check > 30
        compare_nodes = [n for n in nodes if "compare" in n["type"]]
        assert len(compare_nodes) >= 1
        assert compare_nodes[0]["properties"]["operator"] == ">"
        assert compare_nodes[0]["properties"]["threshold"] == 30
    
    def test_mvp_step4_dashboard_widgets(self, mvp_project):
        """Step 4: Dashboard has waveform chart and alarm LED"""
        widgets = mvp_project["ui"]["widgets"]
        widget_types = [w["type"] for w in widgets]
        
        assert "line_chart" in widget_types, "Missing waveform chart"
        assert "led" in widget_types, "Missing alarm LED"
    
    def test_mvp_step5_widget_bindings(self, mvp_project):
        """Step 5: Widgets are bound to node outputs"""
        widgets = mvp_project["ui"]["widgets"]
        
        for widget in widgets:
            if widget["type"] in ["line_chart", "led", "gauge"]:
                assert "binding" in widget, f"Widget {widget['id']} missing binding"
                assert widget["binding"]["type"] == "node_output"
    
    def test_mvp_step6_csv_storage(self, mvp_project):
        """Step 6: CSV storage node exists for data logging"""
        nodes = mvp_project["logic"]["nodes"]
        csv_nodes = [n for n in nodes if "csv_storage" in n["type"]]
        
        assert len(csv_nodes) >= 1
        csv = csv_nodes[0]
        assert "file_path" in csv["properties"]
        assert csv["properties"]["file_path"].endswith(".csv")
    
    def test_mvp_wiring_integrity(self, mvp_project):
        """Verify all wires connect valid nodes"""
        nodes = mvp_project["logic"]["nodes"]
        wires = mvp_project["logic"]["wires"]
        node_ids = {n["id"] for n in nodes}
        
        for wire in wires:
            assert wire["source"]["nodeId"] in node_ids, \
                f"Wire {wire['id']} source node not found"
            assert wire["target"]["nodeId"] in node_ids, \
                f"Wire {wire['id']} target node not found"
    
    def test_mvp_project_can_be_serialized(self, mvp_project):
        """Project can be saved as .daq JSON file"""
        json_str = json.dumps(mvp_project, indent=2)
        assert len(json_str) > 0
        
        # Can be read back
        loaded = json.loads(json_str)
        assert loaded["meta"]["name"] == mvp_project["meta"]["name"]
    
    def test_mvp_project_can_compile(self, mvp_project):
        """Project can be compiled to Python code"""
        from compiler.compiler import DAQCompiler
        import json

        compiler = DAQCompiler()
        success, code = compiler.compile_string(json.dumps(mvp_project))

        assert success, f"Compilation failed: {code}"
        assert code is not None
        assert len(code) > 100  # Should generate substantial code

        # Verify code is valid Python
        compile(code, '<mvp_test>', 'exec')


class TestMVPComponents:
    """Test individual MVP-required components"""
    
    def test_mock_device_exists(self):
        """MockDevice component is available"""
        from components import MockDevice
        assert MockDevice is not None
    
    def test_compare_component_exists(self):
        """Compare component is available"""
        from components import Compare
        assert Compare is not None
    
    def test_csv_storage_exists(self):
        """CSVStorage component is available"""
        from components import CSVStorage
        assert CSVStorage is not None
    
    def test_threshold_alarm_exists(self):
        """ThresholdAlarm component is available"""
        from components import ThresholdAlarm
        assert ThresholdAlarm is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
