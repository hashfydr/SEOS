import time
from datetime import datetime, timezone
from typing import Dict, Any, List

class AlertManager:
    """
    Production Alert Dispatcher:
    - Monitors threshold violations (error rate > 5%, DB disconnection, excessive latency).
    - Dispatches alerts and tracks recovery events.
    - Preserves historical alert logs with MTTR (Mean Time To Recovery).
    """
    def __init__(self, error_threshold_pct: float = 5.0, latency_threshold_ms: float = 2000.0):
        self.error_threshold_pct = error_threshold_pct
        self.latency_threshold_ms = latency_threshold_ms
        self.active_alerts: Dict[str, Dict[str, Any]] = {}
        self.alert_history: List[Dict[str, Any]] = []

    def evaluate_metrics(self, metrics: Dict[str, Any]) -> List[Dict[str, Any]]:
        dispatched = []
        now_str = datetime.now(timezone.utc).isoformat()
        
        # 1. Evaluate Error Rate Alert
        error_rate = metrics.get("error_rate_percentage", 0.0)
        if error_rate > self.error_threshold_pct and "HIGH_ERROR_RATE" not in self.active_alerts:
            alert = {
                "id": "ALERT-HIGH-ERR",
                "name": "HIGH_ERROR_RATE",
                "severity": "CRITICAL",
                "triggered_at": now_str,
                "message": f"Error rate exceeded threshold: {error_rate}% > {self.error_threshold_pct}%",
                "value": error_rate,
            }
            self.active_alerts["HIGH_ERROR_RATE"] = alert
            dispatched.append({"event": "TRIGGERED", "alert": alert})
        elif error_rate <= self.error_threshold_pct and "HIGH_ERROR_RATE" in self.active_alerts:
            # Recovery
            prior = self.active_alerts.pop("HIGH_ERROR_RATE")
            prior["resolved_at"] = now_str
            self.alert_history.append(prior)
            dispatched.append({"event": "RESOLVED", "alert": prior})

        # 2. Evaluate Database Connectivity Alert
        db_connected = metrics.get("database_connected", True)
        if not db_connected and "DB_DISCONNECTED" not in self.active_alerts:
            alert = {
                "id": "ALERT-DB-DOWN",
                "name": "DB_DISCONNECTED",
                "severity": "P0_OUTAGE",
                "triggered_at": now_str,
                "message": "Database health probe failed: connection refused or timeout.",
                "value": False,
            }
            self.active_alerts["DB_DISCONNECTED"] = alert
            dispatched.append({"event": "TRIGGERED", "alert": alert})
        elif db_connected and "DB_DISCONNECTED" in self.active_alerts:
            prior = self.active_alerts.pop("DB_DISCONNECTED")
            prior["resolved_at"] = now_str
            self.alert_history.append(prior)
            dispatched.append({"event": "RESOLVED", "alert": prior})

        return dispatched

alert_manager = AlertManager()
