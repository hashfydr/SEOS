# SEOS — Software Engineering Operating System
> An AI-Powered Connected Engineering Workspace keeping requirements, models, architecture, APIs, and documentation synchronized through a single connected project model.

---

## Overview

**SEOS** (Software Engineering Operating System) is an intelligent, unified workspace designed to eliminate disconnected software engineering artifacts. Rather than generating isolated deliverables in separate tools, SEOS maintains a **single source of truth** across all software engineering phases. 

When a user proposes a single app/website concept the **AI Brain** autonomously derives and synchronizes every connected artifact in real time:

```mermaid
flowchart TD
    A["Product Idea"] --> B["Requirements"]
    B --> C["User Stories"]
    C --> D["UML / ER Modeling"]
    D --> E["Architecture"]
    E --> F["OpenAPI 3.1"]
    F --> G["SRS / SDD / README"]
```
---

## Core Features & Modules

### 1. Requirements Engineer & Idea Engine
* **Natural Language Concept Input**: Enter a high-level software idea or feature request.
* **Editable Product Idea**: AI populates a detailed description that you can edit and refine at any time.
* **Structured Requirements**: Auto-generates Functional and Non-Functional requirements with priority tags (`Critical`, `High`, `Medium`, `Low`) and approval status tracking.

### 2. User Stories & Traceability
* **Agile User Stories**: Auto-derived from approved requirements using standard format (`As a <role>, I want to <action>, so that <benefit>`).
* **Acceptance Criteria**: Comprehensive acceptance rules for every story.
* **Requirement Linking**: Direct mapping between user stories and source requirement IDs (`REQ-101`).

### 3. System Modeling (UML & ER Diagrams)
* **Interactive Canvas**: Drag-and-drop entity relationship models and class diagrams.
* **Domain Entity Derivation**: Automatically creates domain entities, attributes, primary keys, foreign keys, and cardinalities tailored to your application.
* **Undo / Redo & History**: Full state history for visual diagram editing.

### 4. Architecture Recommender
* **Pattern Evaluation**: Evaluates scale and recommends patterns (e.g., *Event-Driven Microservices*, *Modular Monolith*).
* **Component & Tech Stack Mapping**: Recommends technologies for API Gateways, Microservices, Auth Engines, and Primary Databases.
* **Trade-off Analysis**: Clear pros and cons for every architectural decision.

### 5. API Designer (OpenAPI 3.1)
* **OpenAPI 3.1 Generation**: Derives production-ready YAML specifications from domain models.
* **RESTful Endpoint Mapping**: Generates full CRUD paths, request parameters, and HTTP responses.
* **Syntax Highlighting & Export**: Colored YAML syntax viewer with copy/export support.

### 6. Living Documentation (SRS / SDD / README)
* **Software Requirements Specification (SRS)**: Complete IEEE-standard specifications.
* **Software Design Document (SDD)**: High-level architectural and component designs.
* **Project README**: Professional setup guide and repository README.

### 7. RAG Learning Dashboard & Knowledge Base
* **Educational Grounding**: Interactive concept graph covering software engineering principles (REST API, SOLID, Microservices, Event Sourcing, DDD, TDD).
* **Curated Reading List**: Recommendations grounded in software engineering literature.

---

## Technology Stack

* **Frontend Framework**: React 18, TypeScript, Vite
* **Styling & UI**: Tailwind CSS v4 (Custom dark/light mode design system)
* **State Management**: Zustand with `persist` middleware (Full local storage synchronization)
* **AI Orchestration**: Browser-direct multi-provider integration (Google Gemini 1.5/2.0 Flash/Pro, OpenAI GPT-4o, Anthropic Claude 3.5 Sonnet) with dynamic model auto-discovery and function tool-calling.

---

## Quick Start & Local Setup

### Prerequisites
* **Node.js**: `v18.0.0` or higher
* **npm**: `v9.0.0` or higher

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone https://github.com/hgarg1be24/SEOS.git
   cd SEOS/seos-app
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the Local Development Server**
   ```bash
   npm run dev
   ```

4. **Open in Browser**
   Navigate to `http://localhost:5173/` in your browser.

5. **Configure Free Gemini API Key**
   * Get a free API Key from [Google AI Studio](https://aistudio.google.com/app/apikey).
   * Open SEOS → Click Model Selector (bottom-left of AI Chat) → **"Manage API Keys..."**.
   * Paste your Gemini API key and click **Save Keys**.

---

## License

Distributed under the MIT License. See `LICENSE` for more information.
