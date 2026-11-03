import time
import statistics
import concurrent.futures
from fastapi.testclient import TestClient
from app.main import app

def run_concurrent_user_simulation():
    client = TestClient(app)
    num_users = 25
    latencies = []
    errors = 0
    successes = 0

    def simulate_user(user_idx):
        nonlocal successes, errors
        user_latencies = []
        email = f"load_user_{user_idx}_{int(time.time()*1000)}@thapar.edu"
        password = "loadpassword123"

        # 1. Register
        t0 = time.time()
        reg_res = client.post("/api/v1/auth/register", json={
            "name": f"Load User {user_idx}",
            "email": email,
            "password": password,
            "role": "solo_dev"
        })
        user_latencies.append(time.time() - t0)
        if reg_res.status_code != 201:
            errors += 1
            return user_latencies

        # 2. Login
        t0 = time.time()
        login_res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        user_latencies.append(time.time() - t0)
        if login_res.status_code != 200:
            errors += 1
            return user_latencies
        
        token = login_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # 3. Create Project
        t0 = time.time()
        proj_res = client.post("/api/v1/projects", json={
            "title": f"Load Project {user_idx}",
            "idea": "High concurrency test project"
        }, headers=headers)
        user_latencies.append(time.time() - t0)
        if proj_res.status_code != 201:
            errors += 1
            return user_latencies

        proj_id = proj_res.json()["id"]

        # 4. Search RAG
        t0 = time.time()
        search_res = client.get("/api/v1/knowledge/search?q=Microservices", headers=headers)
        user_latencies.append(time.time() - t0)
        if search_res.status_code != 200:
            errors += 1
            return user_latencies

        # 5. Fetch Traceability
        t0 = time.time()
        trace_res = client.get(f"/api/v1/projects/{proj_id}/traceability", headers=headers)
        user_latencies.append(time.time() - t0)
        if trace_res.status_code != 200:
            errors += 1
            return user_latencies

        successes += 1
        return user_latencies

    start_total = time.time()
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_users) as executor:
        futures = [executor.submit(simulate_user, i) for i in range(num_users)]
        for f in concurrent.futures.as_completed(futures):
            latencies.extend(f.result())
    total_time = time.time() - start_total

    latencies_ms = [l * 1000 for l in latencies]
    latencies_ms.sort()

    metrics = {
        "concurrent_users": num_users,
        "total_operations": len(latencies),
        "successful_sessions": successes,
        "failed_sessions": errors,
        "total_duration_sec": round(total_time, 2),
        "throughput_rps": round(len(latencies) / total_time, 1),
        "latency_p50_ms": round(statistics.median(latencies_ms), 1),
        "latency_p95_ms": round(latencies_ms[int(len(latencies_ms) * 0.95)], 1),
        "latency_p99_ms": round(latencies_ms[int(len(latencies_ms) * 0.99)], 1),
        "latency_max_ms": round(max(latencies_ms), 1),
    }
    return metrics

def test_concurrent_user_load():
    """Execute simultaneous 25-user simulated load and verify 0 server failures."""
    metrics = run_concurrent_user_simulation()
    print("\n--- CONCURRENT LOAD BENCHMARK RESULTS ---")
    for k, v in metrics.items():
        print(f"  {k}: {v}")
    
    assert metrics["failed_sessions"] == 0
    assert metrics["successful_sessions"] == 25
    assert metrics["throughput_rps"] > 5.0

def test_simultaneous_write_contention():
    """Assert exactly one write succeeds and 9 receive HTTP 409 Conflict under simultaneous write contention."""
    client = TestClient(app)
    # Register user
    email = f"contention_{int(time.time()*1000)}@thapar.edu"
    client.post("/api/v1/auth/register", json={"name": "Contention User", "email": email, "password": "password123", "role": "solo_dev"})
    token = client.post("/api/v1/auth/login", json={"email": email, "password": "password123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    proj = client.post("/api/v1/projects", json={"title": "Shared Resource"}, headers=headers).json()
    proj_id = proj["id"]
    base_version = proj["version"] # 1

    # 10 workers simultaneously attempt to update with base_version = 1
    num_conflicts = 0
    num_successes = 0

    def attempt_sync(idx):
        nonlocal num_conflicts, num_successes
        res = client.put(f"/api/v1/projects/{proj_id}/sync-full", json={
            "title": f"Concurrent Edit {idx}",
            "base_version": base_version,
        }, headers=headers)
        if res.status_code == 200:
            num_successes += 1
        elif res.status_code == 409:
            num_conflicts += 1

    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(attempt_sync, i) for i in range(10)]
        concurrent.futures.wait(futures)

    # Exactly 1 thread must have succeeded, and other 9 must have been safely rejected with 409 Conflict
    assert num_successes == 1
    assert num_conflicts == 9
