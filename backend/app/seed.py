from sqlalchemy.orm import Session
from app.models import KnowledgeChunk

SE_KNOWLEDGE_ENTRIES = [
    {
        "topic": "Microservices",
        "source_book": "Building Microservices (2nd Edition) by Sam Newman",
        "chapter_or_page": "Chapter 4: Integration & Service Boundaries, pp. 85-112",
        "chunk_text": "Microservices model software as independently deployable services around bounded business domains. Key principles include loose coupling, high cohesion, database-per-service isolation, and avoiding shared database models across service boundaries.",
        "keywords": ["microservices", "bounded context", "service boundary", "loose coupling", "database-per-service"],
    },
    {
        "topic": "Data-Intensive Applications",
        "source_book": "Designing Data-Intensive Applications by Martin Kleppmann",
        "chapter_or_page": "Chapter 3 & 11: Storage & Stream Processing, pp. 69-90, 439-488",
        "chunk_text": "Data systems trade off between reliability, scalability, and maintainability. In event-driven systems, an append-only log with immutable event records enables eventual consistency, replayability, and decoupling of asynchronous consumers.",
        "keywords": ["event-driven", "kafka", "scalability", "eventual consistency", "append-only log", "stream processing"],
    },
    {
        "topic": "Modular Monolith",
        "source_book": "Patterns of Enterprise Application Architecture by Martin Fowler",
        "chapter_or_page": "Chapter 2: Organizing Domain Logic, pp. 25-42",
        "chunk_text": "A modular monolith organizes domain logic within cleanly encapsulated modules sharing a single relational database deployment. It provides ACID transactions, simple debugging, and rapid early iteration before distributed partitioning is warranted.",
        "keywords": ["modular monolith", "monolith", "domain logic", "acid", "transactional consistency"],
    },
    {
        "topic": "Domain-Driven Design",
        "source_book": "Domain-Driven Design: Tackling Complexity in the Heart of Software by Eric Evans",
        "chapter_or_page": "Part II: The Building Blocks of a Model-Driven Design, pp. 65-132",
        "chunk_text": "Entities possess a unique continuous identity regardless of attribute mutations. Value objects are immutable descriptors. Aggregates enforce invariant boundaries, with an Aggregate Root guarding all access.",
        "keywords": ["ddd", "entity", "value object", "aggregate root", "domain model", "bounded context"],
    },
    {
        "topic": "Software Requirements Specification",
        "source_book": "Software Engineering (10th Edition) by Ian Sommerville",
        "chapter_or_page": "Chapter 4: Requirements Engineering, pp. 101-134",
        "chunk_text": "Requirements engineering systematically elicits, analyzes, specifies, and validates system constraints. Functional requirements describe system reactions to inputs; non-functional requirements define measurable performance, security, and availability standards.",
        "keywords": ["requirements", "functional", "non-functional", "ieee 830", "srs", "verification"],
    },
    {
        "topic": "Agile User Stories & Acceptance",
        "source_book": "Software Engineering: A Practitioner's Approach (9th Edition) by Roger Pressman",
        "chapter_or_page": "Chapter 5: Agile Development, pp. 78-105",
        "chunk_text": "User stories capture value from the user perspective (As a, I want, So that). Verification relies on the INVEST criteria (Independent, Negotiable, Valuable, Estimable, Small, Testable) paired with concrete acceptance criteria.",
        "keywords": ["user stories", "agile", "acceptance criteria", "invest", "connextra"],
    },
    {
        "topic": "RESTful Web APIs",
        "source_book": "Architectural Styles and the Design of Network-based Software Architectures by Roy Fielding",
        "chapter_or_page": "Chapter 5: Representational State Transfer (REST), pp. 76-107",
        "chunk_text": "REST is governed by architectural constraints: client-server separation, stateless interactions, cacheability, layered system hierarchy, and a uniform interface with self-descriptive messages and standard HTTP semantics.",
        "keywords": ["rest", "openapi", "stateless", "http", "api", "crud"],
    },
    {
        "topic": "Clean Architecture & SOLID",
        "source_book": "Clean Architecture: A Craftsman's Guide to Software Structure by Robert C. Martin",
        "chapter_or_page": "Chapters 7-11 & 22: SOLID Principles & Clean Architecture, pp. 58-102, 197-210",
        "chunk_text": "The Dependency Inversion Principle mandates that high-level business policy must not depend on low-level implementation details; both must depend upon abstractions. In Clean Architecture, concentric circles enforce dependencies pointing strictly inward toward business entities.",
        "keywords": ["clean architecture", "solid", "dependency inversion", "hexagonal", "onion architecture"],
    },
]

def seed_knowledge_base(db: Session):
    existing_count = db.query(KnowledgeChunk).count()
    if existing_count > 0:
        return existing_count

    for item in SE_KNOWLEDGE_ENTRIES:
        chunk = KnowledgeChunk(
            topic=item["topic"],
            source_book=item["source_book"],
            chapter_or_page=item["chapter_or_page"],
            chunk_text=item["chunk_text"],
            keywords=item["keywords"],
        )
        db.add(chunk)
    db.commit()
    return len(SE_KNOWLEDGE_ENTRIES)
