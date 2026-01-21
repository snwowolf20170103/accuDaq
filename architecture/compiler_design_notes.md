# Logic to Code Compilation Design

This document details how the Visual Logic Graph (Nodes & Wires) in the `.daq` file is translated into an executable Python script for the MVP.

## 1. Execution Model
The DAQ engine will run as a standalone process. The generated script will follow a **Setup -> Loop** pattern.

### 1.1 Python Project Structure
The generated code assumes the existence of a `daq_core` SDK (to be built).
```python
import time
import daq_core
from daq_core import modbus, logic, system

# ... Setup ...
# ... Main Loop ...
```

## 2. Compilation Strategy (Topological Sort)
Since data flows from Source to Sink, we need to order the execution of nodes.s
1.  **Parse**: Load `.daq` JSON.
2.  **Graph Construction**: Build an internal graph of Nodes and Edges.
3.  **Sort**: Perform a Topological Sort to determine execution order.
    *   *Note*: The MVP only supports DAGs (Directed Acyclic Graphs) inside the loop for now. Feedback loops (Memory) are out of scope for the first iteration or treated as "previous iteration value".
4.  **Codegen**: Iterate through sorted nodes and emit corresponding Python code.

## 3. "Golden Target" Python Code
This is the Python code we ideally want to generate from `architecture/samples/mvp_temperature_monitor.json`.

```python
"""
GENERATED CODE by DAQ IDE
Project: MVP Temperature Monitor
Date: 2026-01-13
"""
import time
import sys
# Assuming daq_core is the runtime library we will build
from daq_core.devices import MockDevice
from daq_core.nodes import LogicNodes, MathNodes, SystemNodes

def main():
    # --- 1. Device Setup ---
    # Device ID: dev_mock_01
    dev_mock_01 = MockDevice(config={
        "function": "sine_wave", 
        "min": 20, 
        "max": 40, 
        "period_sec": 10
    })
    dev_mock_01.connect()
    print("[System] Devices Connected.")

    # --- 2. Runtime State ---
    # Variables to hold node outputs
    wire_1_val = 0.0 # read -> cmp (A)
    wire_2_val = 30.0 # const -> cmp (B)
    wire_3_val = 0.0 # read -> debug
    # Computed results
    node_cmp_01_out = False
    
    # --- 3. Main Loop ---
    try:
        while True:
            cycle_start = time.time()

            # --- Node: node_const_01 (Threshold) ---
            # Optimization: Constants could be defined outside loop, 
            # but aiming for simplicity first.
            wire_2_val = 30.0

            # --- Node: node_read_01 (Read Temp) ---
            # deviceId: dev_mock_01
            wire_1_val = dev_mock_01.read_float()
            # Fan-out: wire_1 feeds cmp, wire_3 (same val) feeds debug
            # Actually, in code, one output variable triggers multiple usages.
            node_read_01_out = wire_1_val 

            # --- Node: node_cmp_01 (Is Overheating?) ---
            # Inputs: A=node_read_01_out, B=30.0
            node_cmp_01_out = LogicNodes.greater_than(node_read_01_out, 30.0)

            # --- Node: node_debug_01 (Log) ---
            SystemNodes.debug_print(node_read_01_out)

            # --- 4. UI Update / Telemetry (IPC) ---
            # Send critical data back to VSCode / Frontend
            # Format: JSON-lines over Stdout or simple prints for MVP
            print(f"TELEMETRY::node_read_01:out:{node_read_01_out}")
            print(f"TELEMETRY::node_cmp_01:out:{node_cmp_01_out}")
            sys.stdout.flush()

            # --- 5. Timing Control ---
            # Simple 100ms loop for MVP
            time.sleep(0.1)

    except KeyboardInterrupt:
        print("[System] Stopping...")
    finally:
        dev_mock_01.disconnect()

if __name__ == "__main__":
    main()
```

## 4. Key Decisions
1.  **One Variable per Output Port**: Each node output port becomes a Python variable (e.g., `node_{id}_{port}`).
2.  **Stateless Functions**: Most nodes (Math, Logic) are stateless pure functions.
3.  **Stateful Drivers**: Device nodes call methods on initialized Device objects.
4.  **Telemetry Format**: The generated code must include `print` statements prefixed with `TELEMETRY::` (or similar) to push data to the UI.

