import type { NavItem, Requirement, UserStory, UMLNode, UMLEdge, AIMessage, DocSection } from './types';

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Project Overview', icon: '◎' },
  { id: 'requirements', label: 'Requirements Engineer', icon: '◆' },
  { id: 'user-stories', label: 'User Stories', icon: '▦' },
  { id: 'modeling', label: 'System Modeling', icon: '⬡' },
  { id: 'architecture', label: 'Architecture', icon: '⧉' },
  { id: 'api-designer', label: 'API Designer', icon: '⟡' },
  { id: 'documentation', label: 'Documentation', icon: '▤' },
  { id: 'learning', label: 'Learning Dashboard', icon: '◈' },
];

export const MOCK_REQUIREMENTS: Requirement[] = [
  { id: 'REQ-001', type: 'Functional', priority: 'Critical', description: 'The system shall allow users to create and manage restaurant listings with menu items, pricing, and availability schedules.', status: 'approved' },
  { id: 'REQ-002', type: 'Functional', priority: 'Critical', description: 'The system shall provide real-time order tracking with status updates pushed via WebSocket connections to both customers and restaurant operators.', status: 'approved' },
  { id: 'REQ-003', type: 'Functional', priority: 'High', description: 'The system shall implement a recommendation engine that suggests restaurants and dishes based on user order history, preferences, and location.', status: 'draft' },
  { id: 'REQ-004', type: 'Non-Functional', priority: 'Critical', description: 'The system shall maintain 99.9% uptime and handle up to 10,000 concurrent orders during peak hours with response times under 200ms.', status: 'draft' },
  { id: 'REQ-005', type: 'Non-Functional', priority: 'High', description: 'All payment data shall be encrypted using AES-256 and transmitted via TLS 1.3. The system shall comply with PCI DSS Level 1 requirements.', status: 'draft' },
  { id: 'REQ-006', type: 'Functional', priority: 'Medium', description: 'The system shall support multi-language interfaces (English, Spanish, French) with automatic locale detection based on user browser settings.', status: 'draft' },
];

export const MOCK_USER_STORIES: UserStory[] = [
  { id: 'US-001', role: 'Customer', action: 'browse nearby restaurants on a map', benefit: 'I can discover new dining options based on my current location', criteria: ['Map shows restaurants within configurable radius', 'Filters for cuisine, rating, delivery time', 'Real-time availability indicators'], status: 'approved', reqId: 'REQ-001' },
  { id: 'US-002', role: 'Restaurant Owner', action: 'update my menu and item availability in real-time', benefit: 'customers always see accurate offerings and prices', criteria: ['Instant publish of menu changes', 'Bulk item enable/disable toggle', 'Price scheduling for happy hours'], status: 'approved', reqId: 'REQ-001' },
  { id: 'US-003', role: 'Customer', action: 'track my order on a live map from kitchen to doorstep', benefit: 'I know exactly when to expect my delivery', criteria: ['GPS-based driver tracking', 'ETA updates every 30 seconds', 'Push notification on status changes'], status: 'draft', reqId: 'REQ-002' },
  { id: 'US-004', role: 'System Admin', action: 'view real-time dashboards of active orders and system health', benefit: 'I can proactively identify and resolve bottlenecks', criteria: ['Orders-per-minute chart', 'Average response time gauge', 'Alert on SLA breach'], status: 'draft', reqId: 'REQ-004' },
];

export const MOCK_UML_NODES: UMLNode[] = [
  {
    id: 'user', name: 'User', type: 'entity', x: 60, y: 50,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'email', type: 'VARCHAR' },
      { name: 'role', type: 'ENUM' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
    methods: ['authenticate()', 'updateProfile()'],
  },
  {
    id: 'order', name: 'Order', type: 'entity', x: 380, y: 50,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'user_id', type: 'UUID', fk: true },
      { name: 'restaurant_id', type: 'UUID', fk: true },
      { name: 'status', type: 'ENUM' },
      { name: 'total', type: 'DECIMAL' },
      { name: 'placed_at', type: 'TIMESTAMP' },
    ],
    methods: ['calculateTotal()', 'updateStatus()'],
  },
  {
    id: 'restaurant', name: 'Restaurant', type: 'entity', x: 700, y: 50,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'cuisine', type: 'VARCHAR' },
      { name: 'rating', type: 'FLOAT' },
      { name: 'is_active', type: 'BOOLEAN' },
    ],
    methods: ['updateMenu()', 'toggleAvailability()'],
  },
  {
    id: 'menu-item', name: 'MenuItem', type: 'entity', x: 700, y: 340,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'restaurant_id', type: 'UUID', fk: true },
      { name: 'name', type: 'VARCHAR' },
      { name: 'price', type: 'DECIMAL' },
      { name: 'available', type: 'BOOLEAN' },
    ],
    methods: ['updatePrice()'],
  },
  {
    id: 'delivery', name: 'Delivery', type: 'entity', x: 380, y: 340,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'order_id', type: 'UUID', fk: true },
      { name: 'driver_id', type: 'UUID', fk: true },
      { name: 'status', type: 'ENUM' },
      { name: 'eta', type: 'TIMESTAMP' },
      { name: 'gps_lat', type: 'FLOAT' },
      { name: 'gps_lng', type: 'FLOAT' },
    ],
    methods: ['updateLocation()', 'completeDelivery()'],
  },
  {
    id: 'payment', name: 'Payment', type: 'entity', x: 60, y: 340,
    fields: [
      { name: 'id', type: 'UUID', pk: true },
      { name: 'order_id', type: 'UUID', fk: true },
      { name: 'amount', type: 'DECIMAL' },
      { name: 'method', type: 'ENUM' },
      { name: 'status', type: 'ENUM' },
    ],
    methods: ['processPayment()', 'refund()'],
  },
];

export const MOCK_UML_EDGES: UMLEdge[] = [
  { from: 'user', to: 'order', label: 'places', cardinalityFrom: '1', cardinalityTo: '*' },
  { from: 'order', to: 'restaurant', label: 'ordered from', cardinalityFrom: '*', cardinalityTo: '1' },
  { from: 'restaurant', to: 'menu-item', label: 'has', cardinalityFrom: '1', cardinalityTo: '*' },
  { from: 'order', to: 'delivery', label: 'fulfilled by', cardinalityFrom: '1', cardinalityTo: '1' },
  { from: 'order', to: 'payment', label: 'paid via', cardinalityFrom: '1', cardinalityTo: '1' },
];

export const MOCK_AI_MESSAGES: AIMessage[] = [
  {
    id: 'ai-1', role: 'system', content: 'SEOS AI Engineering Assistant initialized. Ready to assist with your food delivery platform project.',
    timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    id: 'ai-2', role: 'assistant',
    content: 'Based on your requirements for real-time order tracking (REQ-002), I recommend an **Event-Driven Microservices Architecture** using Apache Kafka for message brokering. This pattern decouples the order lifecycle from delivery tracking, enabling independent scaling.\n\nThe pattern is well-suited for systems requiring low-latency status propagation across multiple consumers (customer app, restaurant dashboard, driver app, admin panel).',
    timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
    citations: [
      { source: 'Designing Data-Intensive Applications — M. Kleppmann', page: 'Ch. 11: Stream Processing' },
      { source: 'Building Microservices, 2nd Ed. — S. Newman', page: 'Ch. 4: Communication Styles' },
    ],
  },
  {
    id: 'ai-3', role: 'user', content: 'Why event-driven over a simple REST polling approach?',
    timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
  },
  {
    id: 'ai-4', role: 'assistant',
    content: 'REST polling introduces **O(n) load** on the server proportional to the number of active orders, because each client repeatedly asks "has anything changed?" even when nothing has. With 10,000 concurrent orders (per REQ-004), this creates a polling storm of ~200k req/min assuming 30-second intervals.\n\nEvent-driven push via WebSocket + Kafka is **O(1) per event** — the server only sends data when state actually changes. This reduces server CPU by ~85% in our load model and brings latency from 30s (poll interval) to <500ms (push).\n\nFor your 99.9% uptime SLA, Kafka also provides durability and replay guarantees that REST polling lacks.',
    timestamp: new Date().toISOString(),
    citations: [
      { source: 'Designing Data-Intensive Applications — M. Kleppmann', page: 'Ch. 1: Reliability, Scalability, Maintainability' },
      { source: 'System Design Interview Vol. 2 — A. Xu', page: 'Ch. 10: Real-Time Gaming Leaderboard' },
    ],
  },
];

export const MOCK_DOCS: DocSection[] = [
  {
    id: 'srs', title: 'Software Requirements Specification', type: 'SRS',
    content: `# Software Requirements Specification (SRS)
## FoodDash — On-Demand Food Delivery Platform
**Version:** 1.0 · **Status:** Draft · **Generated:** ${new Date().toLocaleDateString()}

---

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for FoodDash, a cloud-native on-demand food delivery platform connecting customers, restaurants, and delivery drivers through a unified digital experience.

### 1.2 Scope
FoodDash shall provide end-to-end food delivery capabilities including restaurant discovery, menu browsing, order placement, real-time delivery tracking, and integrated payment processing. The system targets urban markets with 100+ restaurant partners per city.

### 1.3 Definitions & Acronyms
| Term | Definition |
|------|-----------|
| ETA | Estimated Time of Arrival |
| SLA | Service Level Agreement |
| PCI DSS | Payment Card Industry Data Security Standard |
| WebSocket | Full-duplex communication protocol |

---

## 2. Functional Requirements

### 2.1 Restaurant Management (REQ-001)
- **FR-1.1:** Restaurant owners shall create and manage listings with name, cuisine type, location, operating hours, and delivery radius.
- **FR-1.2:** Menu items shall support name, description, price, category, dietary tags, and real-time availability toggles.
- **FR-1.3:** Pricing schedules shall allow time-based overrides (e.g., happy hour discounts, surge pricing).

### 2.2 Real-Time Order Tracking (REQ-002)
- **FR-2.1:** Order status shall transition through: \`PLACED → CONFIRMED → PREPARING → READY → PICKED_UP → EN_ROUTE → DELIVERED\`.
- **FR-2.2:** WebSocket connections shall push status updates to all subscribed clients within 500ms of state change.
- **FR-2.3:** GPS coordinates shall update every 10 seconds during active delivery.

### 2.3 Recommendation Engine (REQ-003)
- **FR-3.1:** The engine shall use collaborative filtering on order history (last 90 days) to generate personalized restaurant suggestions.
- **FR-3.2:** Location-weighted scoring shall prioritize restaurants within 30-minute delivery ETA.

---

## 3. Non-Functional Requirements

### 3.1 Performance (REQ-004)
- **NFR-1:** API response time ≤ 200ms at p95 for read operations under 10,000 concurrent users.
- **NFR-2:** Order placement throughput ≥ 500 orders/minute.
- **NFR-3:** System uptime ≥ 99.9% (≤ 8.76 hours downtime/year).

### 3.2 Security (REQ-005)
- **NFR-4:** All PII encrypted at rest (AES-256) and in transit (TLS 1.3).
- **NFR-5:** Payment processing compliant with PCI DSS Level 1.
- **NFR-6:** JWT tokens with 15-minute access / 7-day refresh rotation.`,
  },
  {
    id: 'sdd', title: 'Software Design Document', type: 'SDD',
    content: `# Software Design Document (SDD)
## FoodDash — System Architecture & Design
**Version:** 1.0 · **Status:** Draft · **Generated:** ${new Date().toLocaleDateString()}

---

## 1. Architectural Overview

FoodDash adopts an **Event-Driven Microservices Architecture** deployed on Kubernetes (AWS EKS). Services communicate asynchronously via Apache Kafka, with synchronous REST/GraphQL APIs exposed through an API Gateway (Kong).

### 1.1 Service Decomposition
| Service | Responsibility | Tech Stack |
|---------|---------------|------------|
| \`user-service\` | Auth, profiles, preferences | Node.js, PostgreSQL |
| \`restaurant-service\` | Listings, menus, availability | Python/FastAPI, PostgreSQL |
| \`order-service\` | Order lifecycle, state machine | Go, PostgreSQL, Redis |
| \`delivery-service\` | Driver assignment, GPS tracking | Go, Redis, PostGIS |
| \`payment-service\` | Stripe integration, ledger | Node.js, PostgreSQL |
| \`notification-service\` | Push, SMS, email dispatch | Python, RabbitMQ |
| \`recommendation-service\` | ML-based suggestions | Python, TensorFlow Serving |

### 1.2 Data Flow
\`\`\`
Customer App → API Gateway → order-service → Kafka
                                                 ├→ restaurant-service (confirm)
                                                 ├→ delivery-service (assign driver)
                                                 ├→ payment-service (charge)
                                                 └→ notification-service (alerts)
\`\`\`

---

## 2. Database Design
Each service owns its database (Database-per-Service pattern). Cross-service queries use eventual consistency via Kafka change data capture.

## 3. API Design
RESTful APIs follow OpenAPI 3.1 specification. All endpoints require JWT Bearer authentication except \`/auth/login\` and \`/auth/register\`.`,
  },
  {
    id: 'readme', title: 'README', type: 'README',
    content: `# 🍕 FoodDash

> An on-demand food delivery platform connecting customers, restaurants, and drivers.

## Quick Start

\`\`\`bash
# Clone the repository
git clone https://github.com/fooddash/platform.git
cd platform

# Start all services with Docker Compose
docker compose up -d

# Run database migrations
make migrate-all

# Seed development data
make seed-dev
\`\`\`

## Architecture
- **Frontend:** React 18 + TypeScript + Tailwind CSS
- **Backend:** Microservices (Go, Python, Node.js)
- **Message Broker:** Apache Kafka
- **Databases:** PostgreSQL, Redis, PostGIS
- **Infrastructure:** Kubernetes (AWS EKS), Terraform

## Project Structure
\`\`\`
platform/
├── services/
│   ├── user-service/
│   ├── restaurant-service/
│   ├── order-service/
│   ├── delivery-service/
│   ├── payment-service/
│   └── notification-service/
├── gateway/
├── frontend/
├── infra/
└── docs/
\`\`\`

## Contributing
See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License
MIT © FoodDash Team`,
  },
];

export const MOCK_OPENAPI_YAML = `openapi: "3.1.0"
info:
  title: FoodDash API
  version: 1.0.0
  description: RESTful API for the FoodDash food delivery platform.

servers:
  - url: https://api.fooddash.dev/v1
    description: Development

paths:
  /restaurants:
    get:
      summary: List nearby restaurants
      operationId: listRestaurants
      parameters:
        - name: lat
          in: query
          required: true
          schema: { type: number }
        - name: lng
          in: query
          required: true
          schema: { type: number }
        - name: radius_km
          in: query
          schema: { type: number, default: 5 }
        - name: cuisine
          in: query
          schema: { type: string }
      responses:
        "200":
          description: Array of restaurants
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Restaurant"
    post:
      summary: Create a new restaurant
      operationId: createRestaurant
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateRestaurantRequest"
      responses:
        "201":
          description: Restaurant created

  /orders:
    post:
      summary: Place a new order
      operationId: createOrder
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateOrderRequest"
      responses:
        "201":
          description: Order placed

  /orders/{orderId}:
    get:
      summary: Get order details and status
      operationId: getOrder
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Order details
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Order"

  /orders/{orderId}/track:
    get:
      summary: Get real-time delivery tracking info
      operationId: trackOrder
      parameters:
        - name: orderId
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        "200":
          description: Live tracking data

components:
  schemas:
    Restaurant:
      type: object
      properties:
        id: { type: string, format: uuid }
        name: { type: string }
        cuisine: { type: string }
        rating: { type: number }
        is_active: { type: boolean }

    Order:
      type: object
      properties:
        id: { type: string, format: uuid }
        status:
          type: string
          enum: [PLACED, CONFIRMED, PREPARING, READY, PICKED_UP, EN_ROUTE, DELIVERED]
        total: { type: number }
        items: { type: array }

    CreateRestaurantRequest:
      type: object
      required: [name, cuisine]
      properties:
        name: { type: string }
        cuisine: { type: string }
        address: { type: string }

    CreateOrderRequest:
      type: object
      required: [restaurant_id, items]
      properties:
        restaurant_id: { type: string, format: uuid }
        items:
          type: array
          items:
            type: object
            properties:
              menu_item_id: { type: string }
              quantity: { type: integer }`;

export const MOCK_ARCH_RECOMMENDATION = {
  pattern: 'Event-Driven Microservices',
  rationale: 'Your system requires real-time updates across multiple consumers (customer app, restaurant dashboard, driver app), independent scaling of order processing vs. delivery tracking, and fault isolation between payment processing and notification services. An event-driven architecture with Apache Kafka as the message backbone satisfies all three constraints while maintaining eventual consistency across service boundaries.',
  components: [
    { name: 'API Gateway', tech: 'Kong', purpose: 'Route requests, rate limit, authenticate' },
    { name: 'User Service', tech: 'Node.js + PostgreSQL', purpose: 'Auth, profiles, JWT management' },
    { name: 'Order Service', tech: 'Go + PostgreSQL + Redis', purpose: 'Order state machine, saga orchestrator' },
    { name: 'Restaurant Service', tech: 'Python/FastAPI + PostgreSQL', purpose: 'Menu CRUD, availability management' },
    { name: 'Delivery Service', tech: 'Go + Redis + PostGIS', purpose: 'Driver matching, GPS tracking' },
    { name: 'Payment Service', tech: 'Node.js + Stripe', purpose: 'PCI-compliant payment processing' },
    { name: 'Notification Service', tech: 'Python + RabbitMQ', purpose: 'Push, SMS, email dispatch' },
    { name: 'Message Broker', tech: 'Apache Kafka', purpose: 'Async event streaming, decoupling' },
  ],
  tradeoffs: [
    { pro: 'Independent deployability and scaling per service', con: 'Higher operational complexity (K8s, observability)' },
    { pro: 'Fault isolation — payment failure doesn\'t block tracking', con: 'Eventual consistency requires careful saga design' },
    { pro: 'Technology diversity — best tool per domain', con: 'Steeper learning curve for polyglot teams' },
  ],
};
