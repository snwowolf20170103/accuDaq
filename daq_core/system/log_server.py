import asyncio
import websockets
import json
import logging
import threading
import time
from queue import Queue

# Global queue to bridge synchronous logging and asynchronous websockets
log_queue = Queue()
# Store all active connections
connected_clients = set()

async def handler(websocket):
    """Register a connection and keep it open."""
    connected_clients.add(websocket)
    try:
        await websocket.wait_closed()
    finally:
        connected_clients.remove(websocket)

async def log_publisher():
    """Consume logs from queue and broadcast to all connected clients."""
    while True:
        try:
            # Process all pending logs
            while not log_queue.empty():
                record = log_queue.get_nowait()
                if connected_clients:
                    message = json.dumps(record)
                    # Broadcast to all connected clients
                    websockets.broadcast(connected_clients, message)
            
            # Small sleep to yield control
            await asyncio.sleep(0.1)
        except Exception as e:
            print(f"Log publisher error: {e}")
            await asyncio.sleep(1)

async def main_server():
    """Start the WebSocket server."""
    try:
        async with websockets.serve(handler, "localhost", 8765):
            # print("Log WebSocket server started on ws://localhost:8765")
            await log_publisher()
    except OSError as e:
        print(f"Failed to start Log Server (port 8765 might be busy): {e}")

def start_log_server():
    """Helper to start the server in a separate thread."""
    def run():
        # Create a new event loop for this thread
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(main_server())
        finally:
            loop.close()

    t = threading.Thread(target=run, daemon=True, name="LogServerThread")
    t.start()

class WebSocketLogHandler(logging.Handler):
    """Custom logging handler that pushes logs to the WebSocket queue."""
    def emit(self, record):
        try:
            # Format log entry matching frontend interface
            msg = self.format(record)
            log_entry = {
                "timestamp": record.created,
                "datetime": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(record.created)),
                "level": record.levelname,
                "source": record.name,
                "message": msg,
                # Optional: grab 'data' attribute if passed via extra
                "data": getattr(record, 'data', None)
            }
            log_queue.put(log_entry)
        except Exception:
            self.handleError(record)
