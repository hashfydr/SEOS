import time
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import pytest
from app.main import app

def simulate_user_session(user_idx: int, base_client) -> dict:
    """
    Simulates a full realistic user session:
    1. Register
    2. Login
    3. Create project
    4. Query knowledge base
    5. Sync project with base_version=1
    """
    start_session = time.time()
    latencies = []
    
    email = f"scale_user_{user_idx}_{int(time.time()*1000)}@seos.io"
    password = "ScalePassword123"
    
    # 1. Register
    t0 = time.time()
    reg = base_client.post("/api/v1/auth/register", json={
        "name": f"Scale User {user_idx}",
        "email": email,
        "password": password,
        "role": "solo_dev"
    })
    latencies.append(time.time() - t0)
    if reg.status_code != 201:
        return {"success": False, "step": "register", "status": reg.status_code, "latencies": latencies}
        
    # 2. Login
    t0 = time.time()
    login = base_client.post("/api/v1/auth/login", json={"email": email, "password": password})
    latencies.append(time.time() - t0)
    if login.status_code != 200:
        return {"success": False, "step": "login", "status": login.status_code, "latencies": latencies}
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 3. Create Project
    t0 = time.time()
    proj = base_client.post("/api/v1/projects", json={
        "title": f"Scale Project {user_idx}",
        "idea": "High throughput scaling benchmark"
    }, headers=headers)
    latencies.append(time.time() - t0)
    if proj.status_code != 201:
        return {"success": False, "step": "create_project", "status": proj.status_code, "latencies": latencies}
    proj_id = proj.json()["id"]
    
    # 4. Search Knowledge
    t0 = time.time()
    search = base_client.get("/api/v1/knowledge/search?q=Architecture", headers=headers)
    latencies.append(time.time() - t0)
    if search.status_code != 200:
        return {"success": False, "step": "search", "status": search.status_code, "latencies": latencies}
        
    # 5. Full Sync
    t0 = time.time()
    sync = base_client.put(f"/api/v1/projects/{proj_id}/sync-full", json={
        "title": f"Scale Project {user_idx} Synchronized",
        "idea": "Benchmarked",
        "base_version": 1,
        "requirements": [
            {"req_code": f"REQ-{user_idx}", "req_type": "Functional", "priority": "High", "description": "Scaling", "status": "approved"}
        ]
    }, headers=headers)
    latencies.append(time.time() - t0)
    if sync.status_code != 200:
        return {"success": False, "step": "sync", "status": sync.status_code, "latencies": sync.status_code}
        
    total_duration = time.time() - start_session
    return {"success": True, "duration": total_duration, "latencies": latencies}

def test_high_concurrency_scaling_benchmark(client):
    """
    Executes a high-concurrency stress test with 50 concurrent simulated users
    performing 250 transactional requests against the FastAPI backend and SQLite DB.
    """
    NUM_USERS = 50
    start_bench = time.time()
    
    results = []
    all_latencies = []
    
    with ThreadPoolExecutor(max_workers=NUM_USERS) as executor:
        futures = [executor.submit(simulate_user_session, i, client) for i in range(NUM_USERS)]
        for f in as_completed(futures):
            res = f.result()
            results.append(res)
            if res["success"]:
                all_latencies.extend(res["latencies"])
                
    total_elapsed = time.time() - start_bench
    successful_sessions = sum(1 for r in results if r["success"])
    total_requests = len(results) * 5
    throughput_rps = round(total_requests / total_elapsed, 2)
    
    assert successful_sessions == NUM_USERS, f"Expected {NUM_USERS} successful sessions, got {successful_sessions}"
    assert len(all_latencies) == total_requests
    
    sorted_latencies = sorted(all_latencies)
    p50 = statistics.median(sorted_latencies) * 1000
    p90 = sorted_latencies[int(len(sorted_latencies) * 0.90)] * 1000
    p95 = sorted_latencies[int(len(sorted_latencies) * 0.95)] * 1000
    p99 = sorted_latencies[int(len(sorted_latencies) * 0.99)] * 1000
    
    print("\n" + "="*70)
    print("SEOS HIGH-CONCURRENCY SCALING BENCHMARK (50 WORKERS)")
    print("="*70)
    print(f"Concurrent Users      : {NUM_USERS}")
    print(f"Total API Operations  : {total_requests}")
    print(f"Total Duration        : {round(total_elapsed, 2)}s")
    print(f"Throughput            : {throughput_rps} Requests / Second")
    print(f"Latency Percentiles   :")
    print(f"  - p50 (Median)      : {round(p50, 2)} ms")
    print(f"  - p90               : {round(p90, 2)} ms")
    print(f"  - p95               : {round(p95, 2)} ms")
    print(f"  - p99               : {round(p99, 2)} ms")
    print(f"Error Rate            : 0.0% ({successful_sessions}/{NUM_USERS} OK)")
    print("="*70)
    
    # Assert SLA targets under load: throughput > 15 RPS, zero errors
    assert throughput_rps > 15.0
    assert successful_sessions == NUM_USERS
