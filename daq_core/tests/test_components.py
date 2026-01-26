"""
DAQ Component Unit Tests
Tests for core components: Timer, Counter, MockDevice, etc.
"""

import pytest
import time
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from components.timer import TimerComponent, CounterComponent
from components.base import ComponentBase


class TestTimerComponent:
    """Tests for TimerComponent"""

    def test_timer_creation(self):
        """Test timer component can be created"""
        timer = TimerComponent("test_timer")
        assert timer.instance_id == "test_timer"
        assert timer.component_name == "Timer"

    def test_timer_configure(self):
        """Test timer configuration via config dict"""
        timer = TimerComponent("test_timer")
        # Use the base class configure method which accepts a dict
        timer.configure({
            "interval_ms": 500,
            "auto_start": False
        })
        assert timer.interval_ms == 500
        assert timer.auto_start == False

    def test_timer_start_stop(self):
        """Test timer start and stop"""
        timer = TimerComponent("test_timer")
        timer.configure({"interval_ms": 100, "auto_start": False})

        timer.start()
        assert timer._is_running == True

        timer.stop()
        assert timer._is_running == False

    def test_timer_output_ports(self):
        """Test timer has correct output ports"""
        timer = TimerComponent("test_timer")

        # Should have trigger, elapsed_ms, tick_count outputs
        assert "trigger" in timer.output_ports
        assert "elapsed_ms" in timer.output_ports
        assert "tick_count" in timer.output_ports


class TestCounterComponent:
    """Tests for CounterComponent"""

    def test_counter_creation(self):
        """Test counter component can be created"""
        counter = CounterComponent("test_counter")
        assert counter.instance_id == "test_counter"
        assert counter.component_name == "Counter"

    def test_counter_configure(self):
        """Test counter configuration"""
        counter = CounterComponent("test_counter")
        counter.configure({
            "initial_value": 10,
            "step": 2,
            "min_value": 0,
            "max_value": 100
        })

        assert counter.initial_value == 10
        assert counter.step == 2
        assert counter.min_value == 0
        assert counter.max_value == 100

    def test_counter_increment(self):
        """Test counter increment"""
        counter = CounterComponent("test_counter")
        counter.configure({
            "initial_value": 0,
            "step": 1,
            "min_value": 0,
            "max_value": 10
        })
        counter.start()

        # Set increment input to trigger counting
        counter.input_ports["increment"].set_value(True)
        counter.process()

        assert counter.output_ports["value"].get_value() == 1

    def test_counter_wrap_around(self):
        """Test counter reaching max value"""
        counter = CounterComponent("test_counter")
        counter.configure({
            "initial_value": 9,
            "step": 1,
            "min_value": 0,
            "max_value": 10
        })
        counter.start()
        counter._value = 10  # Set to max

        # Should be at max
        counter.process()
        assert counter.output_ports["at_max"].get_value() == True

    def test_counter_output_ports(self):
        """Test counter has correct output ports"""
        counter = CounterComponent("test_counter")

        assert "value" in counter.output_ports
        assert "at_min" in counter.output_ports
        assert "at_max" in counter.output_ports


class TestComponentRegistry:
    """Tests for component registration"""
    
    def test_timer_registered(self):
        """Test Timer is registered"""
        from components import Timer
        assert Timer is not None
    
    def test_counter_registered(self):
        """Test Counter is registered"""
        from components import Counter
        assert Counter is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
