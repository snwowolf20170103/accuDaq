# IPC Design: VSCode Frontend <-> Python Engine

For the DAQ MVP, we need a reliable way for the UI (running in VSCode/WebView) to communicate with the Data Engine (running as a Python Process).

## 1. Requirements
1.  **Control**: Start/Stop the engine.
2.  **Telemetry**: High-frequency data stream (10Hz - 50Hz) from Engine to UI (Waveforms).
3.  **Commanding**: User clicking a button in UI to change a variable in the Engine (e.g., toggle Switch).

## 2. Option Selection: Stdout/Stdin vs WebSocket
| Feature | Stdout/JSON-RPC | WebSocket (Localhost) |
| :--- | :--- | :--- |
| **Complexity** | Low (Built-in) | Medium (Requires Server) |
| **Latency** | Low | Very Low |
| **Bidi Support** | Stdin is tricky on Windows | excellent |
| **Browsers** | No (Native VSC only) | Yes (WebView compatible) |

**Decision for MVP**: **WebSocket**.
Why?
1.  The UI is likely an HTML5 WebView (Project Requirement 3.4.1). WebViews inside VSCode cannot easily read the parent process's Stdout directly in real-time without message passing. A Localhost WebSocket is universally accessible from the WebView JS.
2.  Standard Output buffering on Windows can be a nightmare for real-time applications.
3.  We need robust bi-directional communication (Setting values from UI).

## 3. Proposed Architecture (WebSocket)
1.  **VSCode Ext (Main Process)**:
    *   Spawns the Python Script.
2.  **Python Script**:
    *   Starts a `websockets` server on an ephemeral port (or fixed 5050).
    *   Waits for a client connection.
    *   Enters the Data Acquisition Loop.
    *   Broadcasts `{ "type": "data", "payload": { ... } }` every cycle.
    *   Listens for `{ "type": "set", "target": "node_x", "value": 1 }`.
3.  **Frontend (React/HTML)**:
    *   Connects to `ws://localhost:5050`.
    *    parses JSON messages to update Redux/State.

## 4. Message Protocol (JSON)
### 4.1 Engine -> UI (Telemetry)
```json
{
  "t": "update",
  "d": {
    "node_temp_01": 24.5,
    "node_alarm_01": true
  },
  "ts": 1709123456789
}
```
*   `t`: Type
*   `d`: Data dictionary (Key = NodeID/PortID, Value = Value)
*   `ts`: Timestamp

### 4.2 UI -> Engine (Control)
```json
{
  "t": "set",
  "id": "node_threshold_01",
  "val": 45.0
}
```

## 5. Python Implementation Plan
The generated Python script (from `compiler_design_notes.md`) needs a slight adjustment. Instead of just printing, it needs a fast async websocket server.
*   *Adjustment*: The Code Generator needs to wrap the `While True` loop into an `asyncio` loop.

```python
import asyncio
import websockets
import json

# Global State
state = { "threshold": 30.0 }

async def main_loop(websocket):
    while True:
        # 1. Read Inputs
        val = read_sensor()
        
        # 2. Logic (using state)
        alarm = val > state["threshold"]
        
        # 3. Send Telemetry
        msg = { "t": "data", "d": { "val": val, "alarm": alarm } }
        await websocket.send(json.dumps(msg))
        
        await asyncio.sleep(0.1)

async def handler(websocket):
    # Start loop and listen for incoming messages
    consumer_task = asyncio.create_task(consumer_handler(websocket))
    producer_task = asyncio.create_task(main_loop(websocket))
    done, pending = await asyncio.wait(
        [consumer_task, producer_task],
        return_when=asyncio.FIRST_COMPLETED,
    )
    # ... cleanup ...
```
