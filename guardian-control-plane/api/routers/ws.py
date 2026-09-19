"""
Real-Time Threat Streaming WebSocket Router
Provides sub-100ms real-time event broadcasting to connected SOC Dashboards.
"""

import json
import asyncio
import logging
from typing import Set, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger("guardian.ws")

router = APIRouter(tags=["Real-Time Streaming"])

class ConnectionManager:
    """Manages active WebSocket connections from SOC dashboards."""
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.add(websocket)
        logger.info(f"WebSocket client connected. Total active clients: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            self.active_connections.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total active clients: {len(self.active_connections)}")

    async def broadcast(self, message: Dict[str, Any]):
        """Broadcasts a JSON security event to all active dashboard connections."""
        if not self.active_connections:
            return

        payload_str = json.dumps(message)
        dead_connections = set()

        async with self._lock:
            connections = list(self.active_connections)

        for connection in connections:
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.warning(f"Error sending message to client: {e}. Marking for cleanup.")
                dead_connections.add(connection)

        if dead_connections:
            async with self._lock:
                for dead in dead_connections:
                    self.active_connections.discard(dead)
            logger.info(f"Cleaned up {len(dead_connections)} stale WebSocket connections.")

manager = ConnectionManager()

def broadcast_threat_event(event: Dict[str, Any]):
    """
    Thread-safe synchronous/asynchronous dispatcher for broadcasting threat events.
    Can be scheduled in FastAPI BackgroundTasks or invoked directly.
    """
    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(event))
    except RuntimeError:
        # If no loop is running in the current thread, run in a new loop or pass
        try:
            asyncio.run(manager.broadcast(event))
        except Exception as e:
            logger.error(f"Failed to broadcast threat event: {e}")

@router.websocket("/api/v1/ws/threats")
async def websocket_threat_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time threat intelligence events.
    Sends instant notification whenever an attack is evaluated by the WAF or Honeypot.
    """
    await manager.connect(websocket)
    try:
        # Handshake frame
        await websocket.send_text(json.dumps({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to AI Cyber Guardian Real-Time Threat Stream",
            "client_count": len(manager.active_connections)
        }))

        # Keep connection open and handle client pings
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text(json.dumps({"type": "PONG"}))
    except WebSocketDisconnect:
        await manager.disconnect(websocket)
    except Exception as e:
        logger.warning(f"WebSocket connection error: {e}")
        await manager.disconnect(websocket)
