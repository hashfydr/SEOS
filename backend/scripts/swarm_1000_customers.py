#!/usr/bin/env python3
"""
MiroFish-Inspired Swarm Intelligence Simulation for SEOS:
Simulates 1,000 distinct synthetic customer personas interacting with
SEOS, creating diverse software projects, and stress-testing the platform.
"""

import asyncio
import time
import random
import json
import statistics
import os
import sys
from datetime import datetime
from typing import Dict, List, Any

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.main import app
import httpx

# ─── 10 Industry Domains & Personas (MiroFish Entity Profiling) ───

COHORTS = [
    {
        "industry": "HealthTech / Clinical",
        "roles": ["Chief Medical Informatics Officer", "Clinical Trial Coordinator", "Healthcare Data Architect"],
        "ideas": [
            ("MedChain Telemetry", "Decentralized cold-chain logistics platform tracking investigational medicinal products with IoT temperature alerts, blinding protocols, and courier scheduling.", "microservices"),
            ("OncoGen Diagnostics", "Precision oncology genomic variant annotation service integrating ClinVar, gnomAD, and FASTQ sequencing pipelines.", "clean_architecture"),
            ("TeleCare EHR Gateway", "HIPAA-compliant telehealth consultation portal with real-time WebRTC audio/video and HL7 FHIR record synchronization.", "modular_monolith"),
        ]
    },
    {
        "industry": "FinTech & Banking",
        "roles": ["VP of Quantitative Engineering", "Fraud Prevention Lead", "Algorithmic Trading Architect"],
        "ideas": [
            ("Apex Ledger", "High-frequency double-entry immutable ledger engine with sub-millisecond reconciliation and Kafka event streaming.", "event_driven"),
            ("Sentinel Fraud Shield", "Real-time payment fraud detection service scoring credit card authorizations using streaming graph embeddings.", "microservices"),
            ("OpenBank CrossBorder", "ISO 20022 compliant automated cross-border FX settlement network with multi-currency escrow accounts.", "clean_architecture"),
        ]
    },
    {
        "industry": "E-Commerce & Supply Chain",
        "roles": ["Head of Omnichannel Logistics", "E-Commerce Platform Architect", "Inventory Systems Manager"],
        "ideas": [
            ("OmniDrop Fulfillment", "Distributed micro-fulfillment routing optimizer coordinating autonomous warehouse robots and last-mile couriers.", "event_driven"),
            ("GlobalCart Multi-Tenant", "High-concurrency flash-sale checkout engine with optimistic locking and distributed Redis inventory reservations.", "modular_monolith"),
            ("EcoRoute Logistics", "Dynamic freight route scheduling platform calculating carbon-optimized transportation legs across multimodal carriers.", "microservices"),
        ]
    },
    {
        "industry": "LegalTech & Governance",
        "roles": ["Senior Legal Counsel", "Court Operations Director", "Compliance & Risk Auditor"],
        "ideas": [
            ("JurisDict Courtflow", "Judicial case management and automated docket scheduling system eliminating attorney calendar conflicts.", "modular_monolith"),
            ("LexAudit Contract RAG", "Automated regulatory compliance engine analyzing master service agreements against GDPR and CCPA statutes.", "clean_architecture"),
            ("TrustNotary Ledger", "Tamper-evident legal evidence vault with cryptographic timestamping and chain-of-custody verification.", "microservices"),
        ]
    },
    {
        "industry": "IoT & Smart Cities",
        "roles": ["Smart Grid Operations Engineer", "Fleet Telematics Director", "Urban Infrastructure Architect"],
        "ideas": [
            ("GridPulse Energy", "Decentralized microgrid telemetry aggregator balancing solar battery storage against real-time municipal demand tariffs.", "event_driven"),
            ("VoltFleet Dispatch", "Commercial EV fleet charging scheduling platform optimizing depot transformer constraints and vehicle departures.", "microservices"),
            ("AeroSense Sensor Mesh", "Municipal air quality and particulate sensor mesh network delivering hyper-local asthma risk heatmaps.", "event_driven"),
        ]
    },
    {
        "industry": "EdTech & Academic OS",
        "roles": ["Dean of Computer Science", "Curriculum Technologist", "Course Instructor"],
        "ideas": [
            ("SEOS Campus Roster", "Software engineering operating system tracking milestone rubric audits and automated code artifact reviews.", "modular_monolith"),
            ("SkillMatrix LMS", "Adaptive competency mastery platform matching peer programming pairs based on algorithmic diagnostic test gaps.", "clean_architecture"),
            ("VirtualLab Sandbox", "Browser-based ephemeral container sandbox allowing students to compile native C++ and Rust code safely.", "microservices"),
        ]
    },
    {
        "industry": "CyberSecurity & DevSecOps",
        "roles": ["Chief Information Security Officer", "Cloud Security Architect", "SecOps Incident Commander"],
        "ideas": [
            ("TraceLock SBOM", "Automated software supply chain vulnerability scanner validating package checksums against SLSA Level 4 provenance.", "clean_architecture"),
            ("ZeroTrust Mesh", "Identity-aware service mesh enforcing mTLS encryption and ephemeral SPIFFE JWT tokens between microservices.", "microservices"),
            ("ThreatStream SIEM", "Distributed log aggregation and threat intelligence parser correlating anomalous SSH and cloud trail events.", "event_driven"),
        ]
    },
    {
        "industry": "Developer Tooling & Cloud Infra",
        "roles": ["Principal Platform Engineer", "DevOps Infrastructure Lead", "Site Reliability Engineer"],
        "ideas": [
            ("KubeDeploy Canary", "Automated blue-green canary deployment orchestrator monitoring Prometheus error budget burn rates.", "event_driven"),
            ("SchemaSync DB", "Zero-downtime database schema migration engine executing backward-compatible expand-and-contract table alterations.", "modular_monolith"),
            ("MeshGateway API", "Dynamic OpenAPI-driven reverse proxy with distributed rate limiting and token bucket throttles.", "microservices"),
        ]
    },
    {
        "industry": "AgriTech & Food Logistics",
        "roles": ["Precision Agriculture Lead", "Cold Chain Logistics Director", "Supply Chain Sustainability Manager"],
        "ideas": [
            ("AgriSensor Hydro", "Autonomous vertical farming nutrient dosing system analyzing soil moisture and leaf canopy multispectral imagery.", "event_driven"),
            ("Farm2Fork Fresh", "Perishable produce provenance tracking platform logging farm harvesting, refrigerated transit, and grocery arrival.", "clean_architecture"),
            ("GrainVault Commodity", "Bulk grain storage silo telemetry tracking moisture, aeration, and commodity futures contracts.", "modular_monolith"),
        ]
    },
    {
        "industry": "Media, Entertainment & Social",
        "roles": ["Head of Streaming Infrastructure", "Content Moderation Lead", "Gaming Backend Architect"],
        "ideas": [
            ("StreamCast CDN", "Ultra-low-latency HLS/DASH video transcoding pipeline slicing 4K streams into distributed edge caching servers.", "event_driven"),
            ("PlayMatch Matchmaker", "Skill-based competitive matchmaking engine using TrueSkill rating calculations and regional latency zoning.", "microservices"),
            ("VoicePod Live", "Spatial audio conferencing server managing WebRTC audio mixing and voice chat rooms with 1,000+ listeners.", "modular_monolith"),
        ]
    }
]

def generate_1000_customer_personas() -> List[Dict[str, Any]]:
    customers = []
    first_names = [
        "Elena", "Marcus", "Aria", "Devon", "Siddharth", "Zoe", "Kenji", "Fatima",
        "Lucas", "Chloe", "Tariq", "Amara", "Vikram", "Mei", "Liam", "Sophia",
        "Chen", "Ananya", "Nikolai", "Gabriela", "Mateo", "Ingrid", "Kofi", "Yuki"
    ]
    last_names = [
        "Vance", "Kovacs", "Patel", "Sterling", "O'Connor", "Takahashi", "Al-Mansoor",
        "Nakamura", "Dubois", "Mercer", "Lindqvist", "Zhang", "Adeyemi", "Morales",
        "Novak", "Kaufman", "Sinclair", "Gomez", "Sharma", "Bauer", "Rostova", "Kim"
    ]

    for i in range(1, 1001):
        cohort = COHORTS[(i - 1) % len(COHORTS)]
        role = random.choice(cohort["roles"])
        idea_title, idea_desc, arch_pattern = random.choice(cohort["ideas"])
        name = f"{random.choice(first_names)} {random.choice(last_names)}"
        email = f"customer_{i:04d}_{name.lower().replace(' ', '.')}@example.com"
        password = f"P@ssw0rd_Swarm_{i:04d}!"

        # Generate realistic requirements based on industry
        req_count = random.randint(6, 10)
        reqs = []
        for r_idx in range(1, req_count + 1):
            is_functional = r_idx <= (req_count * 2 // 3)
            reqs.append({
                "id": f"REQ-{i:03d}-{r_idx:02d}",
                "title": f"{'Feature' if is_functional else 'Constraint'} {r_idx} for {idea_title}",
                "description": f"The system shall {'provide automated capability for' if is_functional else 'enforce latency under 150ms and 99.9% uptime for'} {idea_title.lower()} sub-service {r_idx}.",
                "type": "Functional" if is_functional else "Non-Functional",
                "priority": random.choice(["Critical", "High", "Medium", "Low"]),
                "status": "approved" if random.random() > 0.3 else "draft"
            })

        customers.append({
            "customer_id": f"CUST-{i:04d}",
            "name": name,
            "email": email,
            "password": password,
            "role_title": role,
            "industry": cohort["industry"],
            "project_name": f"{idea_title} (Cohort {cohort['industry'][:6]})",
            "project_desc": idea_desc,
            "architecture_pattern": arch_pattern,
            "requirements": reqs
        })
    return customers

# ─── Swarm Simulation Runner ───

async def simulate_customer_lifecycle(client: httpx.AsyncClient, customer: Dict[str, Any], results: List[Dict[str, Any]], semaphore: asyncio.Semaphore):
    async with semaphore:
        t0 = time.perf_counter()
        cust_id = customer["customer_id"]
        stages_passed = 0
        error_msg = None
        latencies = []

        try:
            # 1. Register Account
            s_start = time.perf_counter()
            reg_resp = await client.post(
                "/api/v1/auth/register",
                json={
                    "name": customer["name"],
                    "email": customer["email"],
                    "password": customer["password"],
                    "role": "solo_dev"
                }
            )
            latencies.append(("register", (time.perf_counter() - s_start) * 1000))
            if reg_resp.status_code not in (201, 400):
                raise RuntimeError(f"Register failed with status {reg_resp.status_code}: {reg_resp.text}")
            stages_passed += 1

            # 2. Login to receive JWT Token
            s_start = time.perf_counter()
            login_resp = await client.post(
                "/api/v1/auth/login",
                json={
                    "email": customer["email"],
                    "password": customer["password"]
                }
            )
            latencies.append(("login", (time.perf_counter() - s_start) * 1000))
            if login_resp.status_code != 200:
                raise RuntimeError(f"Login failed: {login_resp.status_code}")
            token = login_resp.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            stages_passed += 1

            # 3. Create Project
            s_start = time.perf_counter()
            proj_resp = await client.post(
                "/api/v1/projects",
                headers=headers,
                json={
                    "title": customer["project_name"],
                    "idea": customer["project_desc"]
                }
            )
            latencies.append(("create_project", (time.perf_counter() - s_start) * 1000))
            if proj_resp.status_code != 201:
                raise RuntimeError(f"Create project failed: {proj_resp.status_code}")
            project_id = proj_resp.json().get("id")
            stages_passed += 1

            # 4. Synchronize Full Project Strata (Requirements + Architecture)
            s_start = time.perf_counter()
            sync_payload = {
                "title": customer["project_name"],
                "idea": customer["project_desc"],
                "base_version": 1,
                "requirements": [
                    {
                        "req_code": r["id"],
                        "req_type": r["type"],
                        "priority": r["priority"],
                        "description": r["description"],
                        "status": r["status"]
                    }
                    for r in customer["requirements"]
                ],
                "user_stories": [
                    {
                        "req_id": customer["requirements"][0]["id"],
                        "role": customer["role_title"],
                        "action": f"utilize {customer['project_name']}",
                        "benefit": "operational goals are achieved",
                        "criteria": ["Given system is ready, When transaction executes, Then success status is logged."],
                        "status": "draft"
                    }
                ],
                "nodes_data": [
                    {"id": "node_1", "name": "CoreService", "type": "entity", "fields": [{"name": "id", "type": "string", "pk": True}]},
                    {"id": "node_2", "name": "TelemetrySink", "type": "entity", "fields": [{"name": "record_id", "type": "uuid", "pk": True}]}
                ],
                "edges_data": [
                    {"from": "node_1", "to": "node_2", "label": "dispatches_to"}
                ],
                "architecture_pattern": customer["architecture_pattern"],
                "architecture_rationale": f"Selected {customer['architecture_pattern']} to balance high-concurrency throughput with modular maintainability.",
                "architecture_components": [
                    {"name": "Gateway", "tech": "FastAPI", "purpose": "Request routing and authentication"},
                    {"name": "ProcessingEngine", "tech": "Python / AsyncIO", "purpose": "Core business domain logic"}
                ],
                "architecture_tradeoffs": [
                    {"decision": "Async Worker Queues", "tradeoff": "Increased message latency vs resilient load spikes"}
                ],
                "openapi_yaml": "openapi: 3.1.0\ninfo:\n  title: Automated Swarm API\n  version: 1.0.0\npaths:\n  /api/v1/health:\n    get:\n      responses:\n        '200':\n          description: OK\n",
                "documents": [
                    {
                        "doc_type": "SRS",
                        "title": "Software Requirements Specification",
                        "content": f"# Software Requirements Specification (SRS)\n\n## 1. Project Title\n{customer['project_name']}\n\n## 2. Executive Scope\n{customer['project_desc']}\n"
                    }
                ]
            }

            sync_resp = await client.put(
                f"/api/v1/projects/{project_id}/sync-full",
                headers=headers,
                json=sync_payload
            )
            latencies.append(("sync_strata", (time.perf_counter() - s_start) * 1000))
            if sync_resp.status_code != 200:
                raise RuntimeError(f"Sync failed with status {sync_resp.status_code}: {sync_resp.text}")
            stages_passed += 1

            # 5. Fetch Traceability Graph
            s_start = time.perf_counter()
            trace_resp = await client.get(
                f"/api/v1/projects/{project_id}/traceability",
                headers=headers
            )
            latencies.append(("traceability", (time.perf_counter() - s_start) * 1000))
            if trace_resp.status_code != 200:
                raise RuntimeError(f"Traceability check failed: {trace_resp.status_code}")
            stages_passed += 1

        except Exception as e:
            error_msg = str(e)

        total_time_ms = (time.perf_counter() - t0) * 1000
        results.append({
            "customer_id": cust_id,
            "industry": customer["industry"],
            "success": stages_passed == 5,
            "stages_passed": stages_passed,
            "error": error_msg,
            "total_ms": total_time_ms,
            "stage_latencies": dict(latencies)
        })

async def main():
    print("=" * 70)
    print("🚀 MIROFISH SWARM INTELLIGENCE ENGINE: 1,000 CUSTOMER SEOS SIMULATION")
    print("=" * 70)

    # Initialize tables if running on local SQLite
    from app.database import engine, Base
    Base.metadata.create_all(bind=engine)

    print("\n[Phase 1] Synthesizing 1,000 Diverse Customer Personas...")
    customers = generate_1000_customer_personas()
    print(f"✓ Generated {len(customers)} unique customer identities across {len(COHORTS)} industries.")

    print("\n[Phase 2] Spawning Concurrent Multi-Agent Swarm (Concurrency = 30)...")
    results = []
    semaphore = asyncio.Semaphore(30)
    t_swarm_start = time.perf_counter()

    # Use ASGITransport to test app with zero network port overhead
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver", timeout=45.0) as client:
        tasks = [
            simulate_customer_lifecycle(client, cust, results, semaphore)
            for cust in customers
        ]
        
        # Periodic progress updates
        total_tasks = len(tasks)
        for f in asyncio.as_completed(tasks):
            await f
            done_count = len(results)
            if done_count % 100 == 0 or done_count == total_tasks:
                elapsed = time.perf_counter() - t_swarm_start
                rate = done_count / elapsed if elapsed > 0 else 0
                print(f" -> Completed {done_count}/{total_tasks} customer journeys ({rate:.1f} cust/sec, elapsed: {elapsed:.1f}s)")

    swarm_elapsed = time.perf_counter() - t_swarm_start

    # ─── Analysis & Metrics Compilation ───
    print("\n[Phase 3] Compiling Swarm Intelligence & Resilience Report...")
    successes = [r for r in results if r["success"]]
    failures = [r for r in results if not r["success"]]
    all_latencies = [r["total_ms"] for r in results]
    success_rate = (len(successes) / len(results)) * 100

    p50 = statistics.median(all_latencies)
    p90 = statistics.quantiles(all_latencies, n=10)[8] if len(all_latencies) >= 10 else p50
    p95 = statistics.quantiles(all_latencies, n=20)[18] if len(all_latencies) >= 20 else p90
    p99 = statistics.quantiles(all_latencies, n=100)[98] if len(all_latencies) >= 100 else p95

    # Industry-level breakdown
    industry_metrics = {}
    for r in results:
        ind = r["industry"]
        if ind not in industry_metrics:
            industry_metrics[ind] = {"total": 0, "success": 0, "latencies": []}
        industry_metrics[ind]["total"] += 1
        if r["success"]:
            industry_metrics[ind]["success"] += 1
        industry_metrics[ind]["latencies"].append(r["total_ms"])

    report = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "swarm_size": len(customers),
        "concurrency_limit": 30,
        "total_runtime_seconds": round(swarm_elapsed, 2),
        "effective_throughput_customers_per_sec": round(len(customers) / swarm_elapsed, 2),
        "total_http_requests_dispatched": len(customers) * 5,
        "success_rate_percent": round(success_rate, 2),
        "successful_customers": len(successes),
        "failed_customers": len(failures),
        "latency_percentiles_ms": {
            "p50_median": round(p50, 2),
            "p90": round(p90, 2),
            "p95": round(p95, 2),
            "p99": round(p99, 2),
            "min": round(min(all_latencies), 2),
            "max": round(max(all_latencies), 2),
            "mean": round(statistics.mean(all_latencies), 2)
        },
        "industry_cohort_performance": {
            ind: {
                "total_customers": data["total"],
                "success_rate": round((data["success"] / data["total"]) * 100, 1),
                "avg_latency_ms": round(statistics.mean(data["latencies"]), 1)
            }
            for ind, data in industry_metrics.items()
        }
    }

    report_path = "/home/hash/.gemini/antigravity/brain/9b54ceb1-34c5-481c-a765-2d629a4c9055/MIROFISH_SWARM_1000_CUSTOMERS_SIMULATION_REPORT.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print("\n" + "=" * 70)
    print("🏆 SWARM SIMULATION SUMMARY RESULTS")
    print("=" * 70)
    print(f"Total Virtual Customers:     {report['swarm_size']}")
    print(f"Total Requests Executed:     {report['total_http_requests_dispatched']}")
    print(f"Total Execution Time:        {report['total_runtime_seconds']}s")
    print(f"Throughput:                  {report['effective_throughput_customers_per_sec']} customers/sec")
    print(f"Overall Success Rate:        {report['success_rate_percent']}% ({len(successes)}/1000)")
    print(f"Latency P50 (Median):        {report['latency_percentiles_ms']['p50_median']} ms")
    print(f"Latency P95:                 {report['latency_percentiles_ms']['p95']} ms")
    print(f"Latency P99:                 {report['latency_percentiles_ms']['p99']} ms")
    print(f"Report Output Saved to:      {report_path}")
    print("=" * 70)

if __name__ == "__main__":
    asyncio.run(main())
