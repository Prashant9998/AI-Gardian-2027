"""
Asynchronous background telemetry dispatcher for the AI Cyber Guardian Python SDK.
Enables non-blocking security auditing with < 2ms latency penalty on client requests.
"""

import logging
import queue
import threading
import time
from typing import Any, Dict, Optional
import httpx

logger = logging.getLogger("cyber_guardian.telemetry")


class TelemetryDispatcher:
    """
    Background worker thread that drains security telemetry events and dispatches
    them asynchronously to the Guardian Control Plane.
    """

    def __init__(
        self,
        endpoint_url: str,
        api_key: str,
        max_queue_size: int = 5000,
        batch_size: int = 10,
        flush_interval: float = 1.0,
        client: Optional[httpx.Client] = None,
    ):
        self.endpoint_url = endpoint_url
        self.api_key = api_key
        self.batch_size = batch_size
        self.flush_interval = flush_interval
        self._queue: queue.Queue = queue.Queue(maxsize=max_queue_size)
        self._client = client or httpx.Client(timeout=2.0)
        self._owns_client = client is None
        self._running = False
        self._worker_thread: Optional[threading.Thread] = None

    def start(self) -> None:
        """
        Start the background dispatcher thread.
        """
        if self._running:
            return
        self._running = True
        self._worker_thread = threading.Thread(
            target=self._run_loop,
            name="CyberGuardianTelemetryWorker",
            daemon=True,
        )
        self._worker_thread.start()

    def enqueue(self, event: Dict[str, Any]) -> bool:
        """
        Enqueue an event non-blockingly. Returns True if enqueued, False if dropped.
        """
        if not self._running:
            return False
        try:
            self._queue.put_nowait(event)
            return True
        except queue.Full:
            logger.warning("Cyber Guardian telemetry queue full; dropping event.")
            return False

    def _run_loop(self) -> None:
        """
        Worker loop: drains events and dispatches via HTTP.
        """
        batch = []
        last_flush = time.time()

        while self._running or not self._queue.empty():
            try:
                # Wait briefly for new events
                timeout = max(0.1, self.flush_interval - (time.time() - last_flush))
                event = self._queue.get(timeout=timeout)
                batch.append(event)
                self._queue.task_done()
            except queue.Empty:
                pass

            # Flush condition: batch size reached or flush interval elapsed
            now = time.time()
            if batch and (len(batch) >= self.batch_size or (now - last_flush) >= self.flush_interval):
                self._dispatch_batch(batch)
                batch = []
                last_flush = now

        # Flush any remaining items before exiting
        if batch:
            self._dispatch_batch(batch)

    def _dispatch_batch(self, batch: list) -> None:
        """
        Send a batch of events to the control plane.
        """
        try:
            headers = {
                "X-API-Key": self.api_key,
                "Content-Type": "application/json",
            }
            # For simplicity, dispatch each or batch endpoint if available
            for event in batch:
                try:
                    self._client.post(
                        self.endpoint_url,
                        json=event,
                        headers=headers,
                    )
                except Exception as e:
                    logger.debug("Telemetry dispatch error: %s", e)
        except Exception as exc:
            logger.debug("Telemetry batch failure: %s", exc)

    def stop(self, timeout: float = 2.0) -> None:
        """
        Gracefully signal the worker thread to finish.
        """
        self._running = False
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=timeout)
        if self._owns_client:
            try:
                self._client.close()
            except Exception:
                pass
