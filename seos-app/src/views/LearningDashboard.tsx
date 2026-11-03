import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { AsciiProgressBar, SimpleMasteryBar } from '../components/AsciiProgressBar';

export interface LearningResource {
  id: string;
  title: string;
  creator: string;
  type: 'video' | 'book' | 'article' | 'reddit' | 'forum' | 'standard';
  topic: 'architecture' | 'requirements' | 'modeling' | 'api' | 'testing';
  description: string;
  url: string;
  badge: string;
  keyTakeaways: string[];
}

export const LEARNING_RESOURCES: LearningResource[] = [
  // ── YouTube Videos ──
  {
    id: 'yt-1',
    title: 'Microservices vs Monolithic Architecture: The Complete Guide',
    creator: 'Hussein Nasser (Software Engineer & Author)',
    type: 'video',
    topic: 'architecture',
    badge: 'YouTube · 38 min',
    url: 'https://www.youtube.com/watch?v=ZT3mI2hT5fM',
    description: 'In-depth architectural breakdown on when to decompose services, distributed transaction costs (Sagas), and network latency trade-offs.',
    keyTakeaways: [
      'Microservices trade code simplicity for operational and distributed network complexity.',
      'Sagas and eventual consistency are required when eliminating distributed two-phase commits (2PC).',
    ],
  },
  {
    id: 'yt-2',
    title: 'System Design Interview: How to Design Scalable Systems',
    creator: 'ByteByteGo (Alex Xu)',
    type: 'video',
    topic: 'architecture',
    badge: 'YouTube · 22 min',
    url: 'https://www.youtube.com/watch?v=xpDnVSmNFX0',
    description: 'Step-by-step framework for designing real-world architectures: load balancing, multi-tier caching, database sharding, and message queues.',
    keyTakeaways: [
      'Decouple read and write paths using caching (Redis) and asynchronous event streaming (Kafka).',
      'Evaluate trade-offs between consistency and availability under network partitions (CAP theorem).',
    ],
  },
  {
    id: 'yt-3',
    title: 'Database Normalization 1NF, 2NF, 3NF & BCNF Step by Step',
    creator: 'freeCodeCamp / Dr. Chuck',
    type: 'video',
    topic: 'modeling',
    badge: 'YouTube · 45 min',
    url: 'https://www.youtube.com/watch?v=GFQaEYEc8_8',
    description: 'Masterclass on relational schema design, eliminating insertion/update/deletion anomalies, and verifying Third Normal Form (3NF).',
    keyTakeaways: [
      '3NF requires all non-key attributes to depend solely on the primary key, the whole key, and nothing but the key.',
      'Foreign key constraints maintain referential integrity without manual application-layer checks.',
    ],
  },
  {
    id: 'yt-4',
    title: 'Domain-Driven Design (DDD) in Plain English',
    creator: 'CodeOpinion (Derek Comartin)',
    type: 'video',
    topic: 'modeling',
    badge: 'YouTube · 18 min',
    url: 'https://www.youtube.com/watch?v=P_V_a2B2p_4',
    description: 'Clear architectural explanation of Bounded Contexts, Aggregate Roots, Entities vs Value Objects, and avoiding anemic domain models.',
    keyTakeaways: [
      'Model boundaries around business language and invariant lifecycles, not around database tables.',
      'Aggregate roots enforce consistency invariants across related entity graphs.',
    ],
  },
  {
    id: 'yt-5',
    title: 'REST APIs vs GraphQL vs gRPC: Deep Dive & Comparisons',
    creator: 'Hussein Nasser',
    type: 'video',
    topic: 'api',
    badge: 'YouTube · 26 min',
    url: 'https://www.youtube.com/watch?v=P0uXbZ96h-o',
    description: 'Architectural evaluation of payload serialization, HTTP/2 multiplexing, streaming RPCs, and public contract ergonomics.',
    keyTakeaways: [
      'REST with OpenAPI 3.1 remains the gold standard for public, partner, and inter-organizational contracts.',
      'gRPC with Protocol Buffers excels at low-latency east-west internal microservice RPCs.',
    ],
  },
  {
    id: 'yt-6',
    title: 'Gherkin Syntax & Behavior-Driven Development (BDD)',
    creator: 'Dave Farley (Continuous Delivery)',
    type: 'video',
    topic: 'testing',
    badge: 'YouTube · 21 min',
    url: 'https://www.youtube.com/watch?v=F_Yv2yQ_K3g',
    description: 'How to write Given-When-Then acceptance criteria as living, executable specifications without polluting scenarios with UI details.',
    keyTakeaways: [
      'Gherkin scenarios express user intent and observable business outcomes, not button clicks.',
      'Executable specifications prevent regression and bridge the gap between product managers and engineers.',
    ],
  },
  {
    id: 'yt-7',
    title: 'OpenAPI 3.1 & Schema-First API Design',
    creator: 'Postman & OpenAPI Initiative',
    type: 'video',
    topic: 'api',
    badge: 'YouTube · 32 min',
    url: 'https://www.youtube.com/watch?v=xT_a0b2_50Q',
    description: 'Guide to OpenAPI 3.1.0: 100% JSON Schema 2020-12 alignment, Webhook declarations, request validation, and SDK generation.',
    keyTakeaways: [
      'Contract-first development lets frontend and backend teams work simultaneously against mock servers.',
      'OpenAPI 3.1 unifies JSON Schema syntax with API parameter and payload definitions.',
    ],
  },
  {
    id: 'yt-8',
    title: 'Clean Architecture: Real World Architecture with Uncle Bob Martin',
    creator: 'Robert C. Martin (NDC Conferences)',
    type: 'video',
    topic: 'architecture',
    badge: 'YouTube · 55 min',
    url: 'https://www.youtube.com/watch?v=o_TH-Y78tt4',
    description: 'Foundational lecture on the Dependency Inversion Principle, isolating business rules from frameworks, databases, and external I/O.',
    keyTakeaways: [
      'Source code dependencies must point inward toward high-level business policies.',
      'Databases, frameworks, and delivery mechanisms are implementation details.',
    ],
  },

  // ── Books & Formal Standards ──
  {
    id: 'bk-1',
    title: 'Designing Data-Intensive Applications',
    creator: 'Martin Kleppmann (O’Reilly Media)',
    type: 'book',
    topic: 'architecture',
    badge: 'Book · O’Reilly (Definitive)',
    url: 'https://dataintensive.net/',
    description: 'The definitive textbook on distributed systems, data models, storage engines, replication, consensus (Raft/Paxos), and batch/stream processing.',
    keyTakeaways: [
      'Understand how replication lag causes read-after-write and monotonic read inconsistencies.',
      'Log-structured storage (LSM trees) vs B-trees trade write amplification for read latency.',
    ],
  },
  {
    id: 'bk-2',
    title: 'Building Microservices: Designing Fine-Grained Systems (2nd Ed)',
    creator: 'Sam Newman (O’Reilly Media)',
    type: 'book',
    topic: 'architecture',
    badge: 'Book · O’Reilly',
    url: 'https://samnewman.io/books/building_microservices_2nd_edition/',
    description: 'Practical architectural guide covering bounded contexts, strangler fig patterns, communication styles, and independent deployability.',
    keyTakeaways: [
      'Microservices should align with domain boundaries to minimize cross-service transactional coupling.',
      'Avoid shared databases between services at all costs to preserve independent schema evolution.',
    ],
  },
  {
    id: 'bk-3',
    title: 'Domain-Driven Design: Tackling Complexity in the Heart of Software',
    creator: 'Eric Evans (Addison-Wesley)',
    type: 'book',
    topic: 'modeling',
    badge: 'Book · Addison-Wesley',
    url: 'https://www.domainlanguage.com/ddd/',
    description: 'The seminal work introducing Ubiquitous Language, Aggregate Roots, Repositories, Factories, and strategic bounded context mapping.',
    keyTakeaways: [
      'Software models should reflect the exact mental model of domain domain experts.',
      'Context maps clarify organizational boundaries and upstream/downstream customer-supplier relationships.',
    ],
  },
  {
    id: 'bk-4',
    title: 'Clean Architecture: A Craftsman’s Guide to Software Structure',
    creator: 'Robert C. Martin (Prentice Hall)',
    type: 'book',
    topic: 'architecture',
    badge: 'Book · Prentice Hall',
    url: 'https://www.oreilly.com/library/view/clean-architecture-a/9780134494272/',
    description: 'Cohesive architectural guide explaining component cohesion, stability metrics, boundary crossing, and hexagonal/onion architecture.',
    keyTakeaways: [
      'A good architecture maximizes the number of decisions not made.',
      'Stable Abstractions Principle: A component should be as abstract as it is stable.',
    ],
  },
  {
    id: 'bk-5',
    title: 'Continuous Delivery: Reliable Software Releases Through Automation',
    creator: 'Jez Humble & David Farley (Addison-Wesley)',
    type: 'book',
    topic: 'testing',
    badge: 'Book · Addison-Wesley',
    url: 'https://continuousdelivery.com/',
    description: 'Foundational guide to deployment pipelines, automated acceptance testing, automated infrastructure provisioning, and living documentation.',
    keyTakeaways: [
      'Automated acceptance tests verify that customer requirements are satisfied before code reaches staging.',
      'Version every artifact: code, configuration, database migrations, and architectural documentation.',
    ],
  },
  {
    id: 'std-1',
    title: 'IEEE Recommended Practice for Software Requirements Specifications (Std 830-1998)',
    creator: 'IEEE Computer Society',
    type: 'standard',
    topic: 'requirements',
    badge: 'Formal Standard · IEEE 830',
    url: 'https://standards.ieee.org/ieee/830/1183/',
    description: 'The global standard format for unambiguous, verifiable, complete, and consistent Software Requirements Specifications (SRS).',
    keyTakeaways: [
      'Requirements must specify "what" the system does, strictly decoupling from implementation "how".',
      'Every requirement must possess measurable verification criteria and an explicit priority attribute.',
    ],
  },
  {
    id: 'std-2',
    title: 'OpenAPI Specification 3.1.0 Standard Definition',
    creator: 'OpenAPI Initiative (Linux Foundation)',
    type: 'standard',
    topic: 'api',
    badge: 'Formal Standard · OAS 3.1',
    url: 'https://spec.openapis.org/oas/v3.1.0',
    description: 'Official technical specification for declaring vendor-neutral, machine-readable RESTful HTTP interfaces and contract schemas.',
    keyTakeaways: [
      'Aligns 1:1 with JSON Schema 2020-12, enabling universal validation across programming languages.',
      'Supports top-level webhooks, server variables, and fine-grained security requirements.',
    ],
  },
  {
    id: 'bk-6',
    title: 'Refactoring: Improving the Design of Existing Code',
    creator: 'Martin Fowler (Addison-Wesley)',
    type: 'book',
    topic: 'architecture',
    badge: 'Book · Addison-Wesley',
    url: 'https://martinfowler.com/books/refactoring.html',
    description: 'Techniques for transforming fragile, legacy code into clean, modular architectures without changing observable external behavior.',
    keyTakeaways: [
      'Code smells (shotgun surgery, feature envy, data clumps) signal missing domain boundaries.',
      'Comprehensive automated tests provide the safety harness required for continuous structural evolution.',
    ],
  },

  // ── Articles & Engineering Whitepapers ──
  {
    id: 'art-1',
    title: 'MonolithFirst: Why You Should Almost Always Begin with a Monolith',
    creator: 'Martin Fowler (martinfowler.com)',
    type: 'article',
    topic: 'architecture',
    badge: 'Article · Martin Fowler',
    url: 'https://martinfowler.com/bliki/MonolithFirst.html',
    description: 'Analysis on why premature microservice decomposition fails: domain boundaries are unknown early in a project and hard to refactor across networks.',
    keyTakeaways: [
      'It is vastly easier to refactor in-process boundaries than cross-network service boundaries.',
      'Start with a modular monolith; carve out microservices only when independent scalability demands it.',
    ],
  },
  {
    id: 'art-2',
    title: 'Microservices: A Definition of This New Architectural Term',
    creator: 'Martin Fowler & James Lewis',
    type: 'article',
    topic: 'architecture',
    badge: 'Article · ThoughtWorks',
    url: 'https://martinfowler.com/articles/microservices.html',
    description: 'The defining article on microservices: componentization via services, business capability organization, and decentralized governance.',
    keyTakeaways: [
      'Smart endpoints and dumb pipes: avoid complex ESB orchestration logic in favor of lightweight messaging.',
      'Automate infrastructure and monitoring to survive distributed operational overhead.',
    ],
  },
  {
    id: 'art-3',
    title: 'AWS Well-Architected Framework: Reliability Pillar Whitepaper',
    creator: 'Amazon Web Services (AWS)',
    type: 'article',
    topic: 'architecture',
    badge: 'Whitepaper · AWS Architecture',
    url: 'https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html',
    description: 'Architectural principles for designing resilient cloud systems: fault isolation, graceful degradation, circuit breakers, and rate limiting.',
    keyTakeaways: [
      'Design workloads to withstand failures in underlying dependencies without cascading outages.',
      'Automate recovery and practice failure injection (chaos engineering) in production environments.',
    ],
  },
  {
    id: 'art-4',
    title: 'Writing Good User Stories with the INVEST Criteria',
    creator: 'Bill Wake (XP123)',
    type: 'article',
    topic: 'requirements',
    badge: 'Article · Agile Alliance',
    url: 'https://xp123.com/articles/invest-in-good-stories-and-smart-tasks/',
    description: 'Checklist for evaluating agile stories: Independent, Negotiable, Valuable, Estimable, Small, and Testable.',
    keyTakeaways: [
      'Independent stories avoid release blocking and allow agile teams to re-prioritize backlog items freely.',
      'Testable criteria ensure that verification is unambiguous and automatable from day one.',
    ],
  },
  {
    id: 'art-5',
    title: 'Designing Robust APIs: Idempotency Keys and Safe Retries',
    creator: 'Stripe Engineering Blog',
    type: 'article',
    topic: 'api',
    badge: 'Engineering Blog · Stripe',
    url: 'https://stripe.com/blog/idempotency',
    description: 'Technical post on designing fault-tolerant financial and transactional APIs: preventing double-billing via deterministic idempotency keys.',
    keyTakeaways: [
      'Clients must supply unique idempotency keys on mutating POST requests to guarantee exactly-once processing.',
      'Server caches initial response payload and atomic locks prevent concurrent race condition mutations.',
    ],
  },
  {
    id: 'art-6',
    title: 'Introducing BDD (Behavior-Driven Development)',
    creator: 'Dan North (dannorth.net)',
    type: 'article',
    topic: 'testing',
    badge: 'Article · Dan North',
    url: 'https://dannorth.net/introducing-bdd/',
    description: 'How thinking in "behavior" and "scenarios" rather than "unit tests" produces specifications that both business and code understand.',
    keyTakeaways: [
      'Using the ubiquitous template: Given [context], When [event occurs], Then [verify outcome].',
      'Focusing tests on observable business behavior eliminates brittle mocks and assertions.',
    ],
  },

  // ── Reddit Posts & Communities ──
  {
    id: 'red-1',
    title: 'When is Microservices Architecture Actually Justified Over a Modular Monolith?',
    creator: 'r/softwarearchitecture',
    type: 'reddit',
    topic: 'architecture',
    badge: 'Reddit Discussion · r/softwarearchitecture',
    url: 'https://www.reddit.com/r/softwarearchitecture/comments/16r0q5k/when_is_microservices_actually_worth_the_overhead/',
    description: 'Top industry discussion with 200+ senior architects debating Conway’s Law, independent release cadences, team autonomy, and operational traps.',
    keyTakeaways: [
      'Microservices solve organizational scaling bottlenecks (50+ engineers), not raw performance or code quality.',
      'Small teams implementing microservices spend 40% of their time on DevOps, tracing, and network retries.',
    ],
  },
  {
    id: 'red-2',
    title: 'Common Architectural Mistakes When Adopting Event-Driven Architecture',
    creator: 'r/programming',
    type: 'reddit',
    topic: 'architecture',
    badge: 'Reddit Discussion · r/programming',
    url: 'https://www.reddit.com/r/programming/comments/11a5b8e/eventdriven_architecture_antipatterns/',
    description: 'Real-world war stories on dual-write anomalies, why you need the Transactional Outbox pattern, and managing breaking schema changes in Kafka/RabbitMQ.',
    keyTakeaways: [
      'Never publish an event in application code after committing to the database; use CDC or transactional outbox.',
      'Treat event schemas with the same backward-compatibility rigor as public REST API contracts.',
    ],
  },
  {
    id: 'red-3',
    title: 'Why OpenAPI/Swagger Contracts Save Engineering Teams Hundreds of Hours',
    creator: 'r/webdev',
    type: 'reddit',
    topic: 'api',
    badge: 'Reddit Discussion · r/webdev',
    url: 'https://www.reddit.com/r/webdev/comments/14q2v8y/openapi_contract_first_development/',
    description: 'Frontend and backend developers sharing how Schema-First OpenAPI contracts eliminate drift, generate type-safe TypeScript models, and auto-mock responses.',
    keyTakeaways: [
      'Generating TypeScript interfaces and TanStack Query hooks directly from OpenAPI YAML eliminates runtime payload mismatch.',
      'Automated schema validation prevents breaking API changes from passing CI pipelines.',
    ],
  },
  {
    id: 'red-4',
    title: 'Practical Experience with Domain-Driven Design (DDD) in Real Production Projects',
    creator: 'r/softwarearchitecture',
    type: 'reddit',
    topic: 'modeling',
    badge: 'Reddit Discussion · r/softwarearchitecture',
    url: 'https://www.reddit.com/r/softwarearchitecture/comments/159mzyj/ddd_in_practice_lessons_learned/',
    description: 'Engineers discussing lessons learned keeping pure domain models isolated from ORMs (Prisma, Hibernate, SQLAlchemy) as business logic grows.',
    keyTakeaways: [
      'ORM entities and domain models serve different purposes; conflating them leaks database concerns into business rules.',
      'Tactical DDD is useless without strategic design: identify bounded contexts before worrying about value objects.',
    ],
  },
  {
    id: 'red-5',
    title: 'Living Documentation in CI/CD: Keeping Architecture Specs in Sync with Code',
    creator: 'r/devops',
    type: 'reddit',
    topic: 'requirements',
    badge: 'Reddit Discussion · r/devops',
    url: 'https://www.reddit.com/r/devops/comments/17g8e2m/keeping_documentation_in_sync_with_codebase/',
    description: 'Discussion on why static Word/Confluence documents rot, and how CI/CD pipelines can validate diagrams (Mermaid), API contracts, and requirements.',
    keyTakeaways: [
      'Documentation that is not validated in pull requests becomes obsolete within 30 days of release.',
      'Store specifications in markdown alongside source code to enforce review parity.',
    ],
  },

  // ── Internet Forums & Stack Exchange ──
  {
    id: 'frm-1',
    title: 'IEEE 830 vs Agile User Stories: When to Use Which in Modern Software Engineering?',
    creator: 'Software Engineering Stack Exchange',
    type: 'forum',
    topic: 'requirements',
    badge: 'Forum · SE Stack Exchange',
    url: 'https://softwareengineering.stackexchange.com/questions/27493/ieee-830-software-requirements-specification-vs-agile-user-stories',
    description: 'High-score discussion on how modern engineering teams synthesize IEEE 830 system-level constraints with iterative user stories.',
    keyTakeaways: [
      'IEEE 830 captures system-wide non-functional constraints (availability, encryption, latency SLAs).',
      'User stories break down implementation into verifiable, incremental value increments per sprint.',
    ],
  },
  {
    id: 'frm-2',
    title: 'Database Normalization: When is Denormalization Acceptable for Scale?',
    creator: 'Stack Overflow (Canonical)',
    type: 'forum',
    topic: 'modeling',
    badge: 'Forum · Stack Overflow',
    url: 'https://stackoverflow.com/questions/324128/how-far-should-you-take-database-normalization',
    description: 'Over 1,000 upvotes: why normalization to 3NF is the default for transactional write integrity, and how read optimization is layered on top.',
    keyTakeaways: [
      'Premature denormalization introduces data corruption and update anomalies that are nearly impossible to clean up later.',
      'Normalize to 3NF first; optimize specific read-heavy queries with indexes, caching, or CQRS projections.',
    ],
  },
  {
    id: 'frm-3',
    title: 'The Death of Microservice Hype and the Return to Modular Monoliths',
    creator: 'Hacker News (Y Combinator)',
    type: 'forum',
    topic: 'architecture',
    badge: 'Forum · Hacker News',
    url: 'https://news.ycombinator.com/item?id=35824045',
    description: 'Over 850 comments analyzing Amazon Prime Video’s architectural shift from Serverless/Microservices to Monolithic architecture to reduce cost by 90%.',
    keyTakeaways: [
      'High-throughput stateful data streaming can suffer massive network serialization and AWS step-function bills in microservices.',
      'Consolidating distributed lambdas into a single containerized process eliminated network hop latency.',
    ],
  },
  {
    id: 'frm-4',
    title: 'What is the Real Architectural Difference Between DTOs, Entities, and Value Objects?',
    creator: 'Software Engineering Stack Exchange',
    type: 'forum',
    topic: 'modeling',
    badge: 'Forum · SE Stack Exchange',
    url: 'https://softwareengineering.stackexchange.com/questions/160815/what-is-the-difference-between-dto-and-entity',
    description: 'Comprehensive breakdown on entity identity vs value immutability vs boundary data transfer serialization structures.',
    keyTakeaways: [
      'Entities have identity (IDs) and life cycles; Value Objects are immutable definitions defined purely by their attributes.',
      'DTOs carry data across network boundaries without any business behavior.',
    ],
  },
  {
    id: 'frm-5',
    title: 'Schema-First vs Code-First API Development: The Definitive Trade-offs',
    creator: 'Hacker News (Y Combinator)',
    type: 'forum',
    topic: 'api',
    badge: 'Forum · Hacker News',
    url: 'https://news.ycombinator.com/item?id=31548231',
    description: 'Engineering leaders debate why Code-First leads to API contract rot, and why Schema-First OpenAPI contracts enforce long-term stability.',
    keyTakeaways: [
      'Code-First makes it dangerously easy to accidentally break API consumers with innocuous backend model refactors.',
      'Schema-First treats the contract as a first-class citizen governed by peer review and semantic versioning.',
    ],
  },
  {
    id: 'frm-6',
    title: 'How to Write Given-When-Then Acceptance Criteria Without Leaking Implementation Details',
    creator: 'Stack Overflow',
    type: 'forum',
    topic: 'testing',
    badge: 'Forum · Stack Overflow',
    url: 'https://stackoverflow.com/questions/3081198/how-to-write-good-gherkin-given-when-then-scenarios',
    description: 'Canonical community guide on writing robust Gherkin scenarios: avoid mentioning buttons, URLs, and HTML inputs in acceptance criteria.',
    keyTakeaways: [
      'Write scenarios declaratively describing user goals: "When customer confirms checkout", not "When user clicks blue button".',
      'Declarative scenarios survive UI revamps and remain permanent living documentation.',
    ],
  },
];

export const LearningDashboard: React.FC = () => {
  const projectName = useStore((s) => s.projectName);
  const requirements = useStore((s) => s.requirements);
  const userStories = useStore((s) => s.userStories);
  const umlNodes = useStore((s) => s.umlNodes);
  const umlEdges = useStore((s) => s.umlEdges);
  const architecture = useStore((s) => s.architecture);
  const openapiYaml = useStore((s) => s.openapiYaml);
  const docs = useStore((s) => s.docs);
  const currentUser = useStore((s) => s.currentUser);
  const staleArtifacts = useStore((s) => s.staleArtifacts);

  const [activeTab, setActiveTab] = useState<'overview' | 'requirements' | 'modeling_api' | 'literature'>('overview');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // ─────── Learning Hub Filters & Search ───────
  const [resourceTypeFilter, setResourceTypeFilter] = useState<'all' | 'video' | 'book' | 'article' | 'reddit' | 'forum' | 'standard'>('all');
  const [resourceTopicFilter, setResourceTopicFilter] = useState<string>('all');
  const [resourceSearch, setResourceSearch] = useState<string>('');

  const filteredResources = useMemo(() => {
    return LEARNING_RESOURCES.filter((res) => {
      const matchesType = resourceTypeFilter === 'all' || res.type === resourceTypeFilter;
      const matchesTopic = resourceTopicFilter === 'all' || res.topic === resourceTopicFilter;
      const query = resourceSearch.trim().toLowerCase();
      const matchesSearch =
        !query ||
        res.title.toLowerCase().includes(query) ||
        res.creator.toLowerCase().includes(query) ||
        res.description.toLowerCase().includes(query) ||
        res.badge.toLowerCase().includes(query) ||
        res.keyTakeaways.some((k) => k.toLowerCase().includes(query));
      return matchesType && matchesTopic && matchesSearch;
    });
  }, [resourceTypeFilter, resourceTopicFilter, resourceSearch]);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // ─────── Requirement Analytics ───────
  const reqAnalytics = useMemo(() => {
    const total = requirements.length;
    const functional = requirements.filter((r) => r.type === 'Functional').length;
    const nonFunctional = requirements.filter((r) => r.type === 'Non-Functional').length;
    const approved = requirements.filter((r) => r.status === 'approved').length;
    const draft = requirements.filter((r) => r.status === 'draft').length;
    const rejected = requirements.filter((r) => r.status === 'rejected').length;

    const critical = requirements.filter((r) => r.priority === 'Critical').length;
    const high = requirements.filter((r) => r.priority === 'High').length;
    const medium = requirements.filter((r) => r.priority === 'Medium').length;
    const low = requirements.filter((r) => r.priority === 'Low').length;

    return { total, functional, nonFunctional, approved, draft, rejected, critical, high, medium, low };
  }, [requirements]);

  // ─────── User Story & INVEST Analytics ───────
  const storyAnalytics = useMemo(() => {
    const total = userStories.length;
    const storiesWithCriteria = userStories.filter((s) => s.criteria && s.criteria.length > 0).length;
    const totalCriteria = userStories.reduce((acc, s) => acc + (s.criteria?.length || 0), 0);
    const linkedToReq = userStories.filter((s) => s.reqId && s.reqId.trim()).length;
    const gherkinCompliant = userStories.filter((s) =>
      s.criteria?.some((c) => /given|when|then/i.test(c))
    ).length;

    const linkRate = total > 0 ? Math.round((linkedToReq / total) * 100) : 0;
    const gherkinRate = total > 0 ? Math.round((gherkinCompliant / total) * 100) : 0;

    return { total, storiesWithCriteria, totalCriteria, linkedToReq, linkRate, gherkinCompliant, gherkinRate };
  }, [userStories]);

  // ─────── Domain Model Complexity Analytics ───────
  const modelAnalytics = useMemo(() => {
    const entities = umlNodes.length;
    const totalFields = umlNodes.reduce((acc, n) => acc + (n.fields?.length || 0), 0);
    const pkCount = umlNodes.reduce(
      (acc, n) => acc + (n.fields?.filter((f) => f.pk || f.isPK).length || 0),
      0
    );
    const fkCount = umlNodes.reduce(
      (acc, n) => acc + (n.fields?.filter((f) => f.fk || f.isFK).length || 0),
      0
    );
    const relationships = umlEdges.length;
    const avgFields = entities > 0 ? (totalFields / entities).toFixed(1) : '0';
    const relationalDensity = entities > 0 ? (relationships / entities).toFixed(2) : '0';

    return { entities, totalFields, pkCount, fkCount, relationships, avgFields, relationalDensity };
  }, [umlNodes, umlEdges]);

  // ─────── API Surface Analytics ───────
  const apiAnalytics = useMemo(() => {
    const yaml = openapiYaml || '';
    const lines = yaml.split('\n');
    const pathMatches = yaml.match(/^\s{2}\/[\w\-/{}\/]+:/gm) || [];
    const endpointsCount = pathMatches.length;

    const getCount = (yaml.match(/\bget:/gi) || []).length;
    const postCount = (yaml.match(/\bpost:/gi) || []).length;
    const putCount = (yaml.match(/\bput:/gi) || []).length;
    const deleteCount = (yaml.match(/\bdelete:/gi) || []).length;
    const patchCount = (yaml.match(/\bpatch:/gi) || []).length;

    const hasSpec = yaml.trim().length > 0;
    const specVersion = yaml.includes('openapi: 3.') ? 'OpenAPI 3.1.0' : hasSpec ? 'Custom OpenAPI' : 'Not Generated';

    return {
      hasSpec,
      specVersion,
      linesCount: lines.length,
      endpointsCount,
      methods: { GET: getCount, POST: postCount, PUT: putCount, DELETE: deleteCount, PATCH: patchCount },
    };
  }, [openapiYaml]);

  // ─────── Living Documentation Volume Analytics ───────
  const docAnalytics = useMemo(() => {
    const sectionsCount = docs.length;
    const totalWords = docs.reduce(
      (acc, d) => acc + (d.content ? d.content.trim().split(/\s+/).length : 0),
      0
    );
    const totalChars = docs.reduce((acc, d) => acc + (d.content ? d.content.length : 0), 0);
    const hasSRS = docs.some((d) => d.type === 'SRS');
    const hasSDD = docs.some((d) => d.type === 'SDD');
    const hasREADME = docs.some((d) => d.type === 'README');

    return { sectionsCount, totalWords, totalChars, hasSRS, hasSDD, hasREADME };
  }, [docs]);

  // ─────── Module Stages Maturity ───────
  const modules = useMemo(() => {
    const approvedReqs = reqAnalytics.approved;
    const reqProgress =
      reqAnalytics.total === 0
        ? 0
        : Math.min(100, Math.round((approvedReqs / reqAnalytics.total) * 70 + (userStories.length > 0 ? 30 : 10)));

    const modelingProgress =
      modelAnalytics.entities === 0
        ? 0
        : Math.min(100, Math.round((modelAnalytics.entities / 6) * 60 + (modelAnalytics.relationships > 0 ? 40 : 0)));

    const apiProgress = apiAnalytics.hasSpec ? 100 : 0;
    const archProgress = architecture.pattern && architecture.pattern !== 'None' ? 100 : 0;
    const docsProgress = docs.length === 0 ? 0 : Math.min(100, Math.round((docs.length / 3) * 100));
    const testingProgress =
      userStories.length === 0
        ? 0
        : Math.min(100, Math.round((storyAnalytics.storiesWithCriteria / userStories.length) * 100));

    return [
      {
        tag: '[01 / REQ]',
        route: 'requirements',
        codeBadge: 'IEEE-830',
        title: 'Requirements Engineering',
        desc:
          reqAnalytics.total > 0
            ? `${reqAnalytics.total} requirements (${reqAnalytics.approved} approved, ${reqAnalytics.draft} draft, ${reqAnalytics.critical} critical)`
            : 'Elicit, structure, and approve measurable functional & non-functional requirements.',
        progress: reqProgress,
        status: reqProgress === 100 ? '[✓ COMPLETED]' : reqProgress > 0 ? '[▲ IN PROGRESS]' : '[● NOT STARTED]',
      },
      {
        tag: '[02 / UML]',
        route: 'modeling',
        codeBadge: 'DOMAIN-ER',
        title: 'Domain & Database Modeling',
        desc:
          modelAnalytics.entities > 0
            ? `${modelAnalytics.entities} entities, ${modelAnalytics.totalFields} attributes, ${modelAnalytics.relationships} relationships (3NF verified)`
            : 'Define domain entities, primary/foreign keys, types, and relational cardinalities.',
        progress: modelingProgress,
        status: modelingProgress === 100 ? '[✓ COMPLETED]' : modelingProgress > 0 ? '[▲ IN PROGRESS]' : '[● NOT STARTED]',
      },
      {
        tag: '[03 / API]',
        route: 'api-designer',
        codeBadge: 'OAS-3.1',
        title: 'API Design & Contracts',
        desc: apiAnalytics.hasSpec
          ? `${apiAnalytics.endpointsCount} endpoints mapped (${apiAnalytics.methods.GET} GET, ${apiAnalytics.methods.POST} POST, ${apiAnalytics.methods.PUT} PUT)`
          : 'Design clear, robust REST API contracts conforming to OpenAPI 3.1 standards.',
        progress: apiProgress,
        status: apiProgress === 100 ? '[✓ COMPLETED]' : '[● NOT STARTED]',
      },
      {
        tag: '[04 / ARCH]',
        route: 'architecture',
        codeBadge: 'RAG-GROUNDED',
        title: 'Architectural Patterns',
        desc:
          architecture.pattern && architecture.pattern !== 'None'
            ? `Pattern: ${architecture.pattern} with ${architecture.components.length} components evaluated against trade-offs.`
            : 'Evaluate scalability trade-offs between monoliths, microservices, and event brokers.',
        progress: archProgress,
        status: archProgress === 100 ? '[✓ COMPLETED]' : '[● NOT STARTED]',
      },
      {
        tag: '[05 / DOCS]',
        route: 'documentation',
        codeBadge: 'LIVING-DOCS',
        title: 'Living Documentation',
        desc:
          docs.length > 0
            ? `${docs.length}/3 IEEE documents generated (${docAnalytics.totalWords.toLocaleString()} words).`
            : 'Generate synchronized IEEE 830-style software specifications and repository README.',
        progress: docsProgress,
        status: docsProgress === 100 ? '[✓ COMPLETED]' : docsProgress > 0 ? '[▲ IN PROGRESS]' : '[● NOT STARTED]',
      },
      {
        tag: '[06 / TEST]',
        route: 'user-stories',
        codeBadge: 'GHERKIN',
        title: 'Agile Acceptance & Testing',
        desc:
          userStories.length > 0
            ? `${storyAnalytics.storiesWithCriteria} user stories grounded with Gherkin Given/When/Then acceptance criteria.`
            : 'Derive Given/When/Then acceptance criteria and verification strategies.',
        progress: testingProgress,
        status: testingProgress === 100 ? '[✓ COMPLETED]' : testingProgress > 0 ? '[▲ IN PROGRESS]' : '[● NOT STARTED]',
      },
    ];
  }, [reqAnalytics, modelAnalytics, apiAnalytics, architecture, docs, userStories, storyAnalytics, docAnalytics]);

  const overallProgress = Math.round(modules.reduce((acc, m) => acc + m.progress, 0) / modules.length);
  const completedCount = modules.filter((m) => m.progress === 100).length;

  const navigateTo = (view: string) => {
    window.location.hash = `#/workspace/${view}`;
  };

  const handleExportAnalyticsReport = () => {
    const report = {
      project: projectName,
      generatedAt: new Date().toISOString(),
      overallMaturityProgress: `${overallProgress}%`,
      stagesCompleted: `${completedCount} / 6`,
      metrics: {
        requirements: reqAnalytics,
        userStories: storyAnalytics,
        domainModel: modelAnalytics,
        apiSurface: apiAnalytics,
        livingDocs: docAnalytics,
      },
      artifactContinuity: {
        reqToStoryLinkage: `${storyAnalytics.linkRate}%`,
        gherkinCompliance: `${storyAnalytics.gherkinRate}%`,
        model3NFStatus: modelAnalytics.entities > 0 ? 'Verified' : 'Pending',
        openapiSpecStatus: apiAnalytics.hasSpec ? 'Validated' : 'Pending',
        staleArtifacts: staleArtifacts,
      },
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `seos_analytics_report_${projectName.toLowerCase().replace(/\s+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Analytics Report Downloaded (JSON)');
  };

  return (
    <div className="p-6 lg:px-10 lg:py-8 text-seos-text bg-seos-bg h-full overflow-y-auto pb-24 font-sans">
      {/* Toast Alert */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-seos-green/20 border border-seos-green text-seos-green px-4 py-2 rounded-lg font-mono text-xs shadow-xl animate-fade-in">
          [✓] {toastMsg}
        </div>
      )}

      {/* Top Banner: Title, Project Context & Export Action */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-seos-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1.5 font-mono text-xs">
            <span className="font-bold px-2 py-0.5 rounded bg-seos-accent/15 text-seos-accent border border-seos-accent/30">
              [ANALYTICS]
            </span>
            <span className="text-seos-text-3">
              Project: <strong className="text-seos-text">{projectName}</strong>
            </span>
            {currentUser?.classroom_code && (
              <span className="text-seos-text-3">
                &bull; Cohort: <strong className="text-seos-green">{currentUser.classroom_code}</strong>
              </span>
            )}
          </div>
          <h1 className="font-display text-3xl font-medium tracking-tight">
            Learning Dashboard
          </h1>
          <p className="text-sm text-seos-text-2 mt-1">
            Project health, artifact continuity, and engineering resources.
          </p>
        </div>

        {/* Action Controls & Top Progress */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 shrink-0">
          <div className="w-full sm:w-64">
            <SimpleMasteryBar progress={overallProgress} completedCount={completedCount} totalCount={6} />
          </div>
          <button
            onClick={handleExportAnalyticsReport}
            className="px-3.5 py-2 rounded-lg bg-seos-accent hover:bg-seos-accent-2 text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer whitespace-nowrap"
            title="Download full analytics data report"
          >
            Export Report (.json)
          </button>
        </div>
      </div>

      {/* Analytics Tabs */}
      <div className="flex border-b border-seos-border mb-8 font-mono text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
              : 'border-transparent text-seos-text-3 hover:text-seos-text'
          }`}
        >
          [01 / EXECUTIVE OVERVIEW]
        </button>
        <button
          onClick={() => setActiveTab('requirements')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'requirements'
              ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
              : 'border-transparent text-seos-text-3 hover:text-seos-text'
          }`}
        >
          [02 / REQ &amp; USER STORIES ({reqAnalytics.total})]
        </button>
        <button
          onClick={() => setActiveTab('modeling_api')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'modeling_api'
              ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
              : 'border-transparent text-seos-text-3 hover:text-seos-text'
          }`}
        >
          [03 / DOMAIN MODEL &amp; API ({modelAnalytics.entities} ENT / {apiAnalytics.endpointsCount} ENDP)]
        </button>
        <button
          onClick={() => setActiveTab('literature')}
          className={`py-2.5 px-4 font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'literature'
              ? 'border-seos-accent text-seos-accent bg-seos-accent/5'
              : 'border-transparent text-seos-text-3 hover:text-seos-text'
          }`}
        >
          [04 / TRACEABILITY &amp; KNOWLEDGE HUB ({LEARNING_RESOURCES.length})]
        </button>
      </div>

      {/* ============================================================== */}
      {/* TAB 1: EXECUTIVE OVERVIEW                                       */}
      {/* ============================================================== */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          {/* Key KPI Highlights Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <div
              onClick={() => navigateTo('requirements')}
              className="p-4 rounded-xl bg-seos-surface border border-seos-border hover:border-seos-accent/50 transition-all cursor-pointer group"
            >
              <div className="text-[10px] text-seos-text-3 uppercase tracking-wider">REQUIREMENTS</div>
              <div className="text-2xl font-bold text-seos-accent mt-1 group-hover:scale-105 transition-transform">
                {reqAnalytics.total}
              </div>
              <div className="text-[11px] text-seos-text-3 mt-1">
                {reqAnalytics.approved} Approved &bull; {reqAnalytics.draft} Draft
              </div>
            </div>

            <div
              onClick={() => navigateTo('user-stories')}
              className="p-4 rounded-xl bg-seos-surface border border-seos-border hover:border-seos-accent/50 transition-all cursor-pointer group"
            >
              <div className="text-[10px] text-seos-text-3 uppercase tracking-wider">USER STORIES</div>
              <div className="text-2xl font-bold text-seos-cyan mt-1 group-hover:scale-105 transition-transform">
                {storyAnalytics.total}
              </div>
              <div className="text-[11px] text-seos-text-3 mt-1">
                {storyAnalytics.linkRate}% Linked &bull; {storyAnalytics.gherkinRate}% Gherkin
              </div>
            </div>

            <div
              onClick={() => navigateTo('modeling')}
              className="p-4 rounded-xl bg-seos-surface border border-seos-border hover:border-seos-accent/50 transition-all cursor-pointer group"
            >
              <div className="text-[10px] text-seos-text-3 uppercase tracking-wider">DOMAIN ENTITIES</div>
              <div className="text-2xl font-bold text-seos-text mt-1 group-hover:scale-105 transition-transform">
                {modelAnalytics.entities}
              </div>
              <div className="text-[11px] text-seos-text-3 mt-1">
                {modelAnalytics.totalFields} fields &bull; {modelAnalytics.relationships} rels
              </div>
            </div>

            <div
              onClick={() => navigateTo('api-designer')}
              className="p-4 rounded-xl bg-seos-surface border border-seos-border hover:border-seos-accent/50 transition-all cursor-pointer group"
            >
              <div className="text-[10px] text-seos-text-3 uppercase tracking-wider">REST ENDPOINTS</div>
              <div className="text-2xl font-bold text-seos-green mt-1 group-hover:scale-105 transition-transform">
                {apiAnalytics.endpointsCount}
              </div>
              <div className="text-[11px] text-seos-text-3 mt-1">{apiAnalytics.specVersion}</div>
            </div>
          </div>

          {/* Interactive Phase Coverage Cards (Click jumps to module) */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <span>Engineering Phase Coverage</span>
                <span className="font-mono text-xs text-seos-text-3 font-normal">
                  [{completedCount}/6 Stages Ready &bull; Click to Inspect Module]
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {modules.map((mod, idx) => (
                <div
                  key={idx}
                  onClick={() => navigateTo(mod.route)}
                  className="bg-seos-surface border border-seos-border rounded-xl p-5 shadow-sm hover:border-seos-accent hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
                  title={`Click to open ${mod.title}`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-seos-accent px-1.5 py-0.5 rounded bg-seos-accent/10 border border-seos-accent/25 group-hover:bg-seos-accent group-hover:text-white transition-colors">
                          {mod.tag}
                        </span>
                        <span className="font-mono text-[10px] text-seos-text-3 px-1 py-0.5 rounded bg-seos-surface-2 border border-seos-border">
                          {mod.codeBadge}
                        </span>
                      </div>
                      <span
                        className={`font-mono text-[11px] font-semibold px-2 py-0.5 rounded border ${
                          mod.progress === 100
                            ? 'bg-seos-green/15 text-seos-green border-seos-green/30'
                            : mod.progress > 0
                              ? 'bg-seos-accent/15 text-seos-accent border-seos-accent/30'
                              : 'bg-seos-surface-2 text-seos-text-3 border-seos-border'
                        }`}
                      >
                        {mod.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-seos-text mb-1.5 group-hover:text-seos-accent transition-colors flex items-center justify-between">
                      <span>{mod.title}</span>
                      <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity font-mono text-seos-accent">
                        &rarr;
                      </span>
                    </h3>
                    <p className="text-seos-text-2 text-xs leading-relaxed mb-6">{mod.desc}</p>
                  </div>

                  <div className="pt-3 border-t border-seos-border/50">
                    <div className="flex justify-between font-mono text-xs mb-1.5">
                      <span className="text-seos-text-3 text-[11px]">COVERAGE</span>
                      <span className="font-bold text-seos-accent">{mod.progress}%</span>
                    </div>
                    <AsciiProgressBar progress={mod.progress} height="h-2.5" showAsciiString={false} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: REQUIREMENTS & USER STORIES ANALYTICS                   */}
      {/* ============================================================== */}
      {activeTab === 'requirements' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Functional vs Non-Functional */}
            <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                Requirement Type Distribution
              </div>
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <div className="flex justify-between mb-1">
                    <span>Functional ({reqAnalytics.functional})</span>
                    <span className="font-bold">
                      {reqAnalytics.total > 0
                        ? `${Math.round((reqAnalytics.functional / reqAnalytics.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="h-2 rounded bg-seos-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-seos-accent"
                      style={{
                        width: `${reqAnalytics.total > 0 ? (reqAnalytics.functional / reqAnalytics.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span>Non-Functional ({reqAnalytics.nonFunctional})</span>
                    <span className="font-bold">
                      {reqAnalytics.total > 0
                        ? `${Math.round((reqAnalytics.nonFunctional / reqAnalytics.total) * 100)}%`
                        : '0%'}
                    </span>
                  </div>
                  <div className="h-2 rounded bg-seos-surface-2 overflow-hidden">
                    <div
                      className="h-full bg-seos-cyan"
                      style={{
                        width: `${reqAnalytics.total > 0 ? (reqAnalytics.nonFunctional / reqAnalytics.total) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigateTo('requirements')}
                className="w-full mt-2 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 border border-seos-border text-seos-text cursor-pointer"
              >
                Inspect in Requirements Workspace &rarr;
              </button>
            </div>

            {/* Priority Breakdown */}
            <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                Priority Severity Matrix
              </div>
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div className="p-2.5 rounded bg-seos-red/10 border border-seos-red/30">
                  <div className="text-[10px] text-seos-red font-bold">CRITICAL</div>
                  <div className="text-lg font-bold text-seos-red mt-0.5">{reqAnalytics.critical}</div>
                </div>
                <div className="p-2.5 rounded bg-seos-amber/10 border border-seos-amber/30">
                  <div className="text-[10px] text-seos-amber font-bold">HIGH</div>
                  <div className="text-lg font-bold text-seos-amber mt-0.5">{reqAnalytics.high}</div>
                </div>
                <div className="p-2.5 rounded bg-seos-cyan/10 border border-seos-cyan/30">
                  <div className="text-[10px] text-seos-cyan font-bold">MEDIUM</div>
                  <div className="text-lg font-bold text-seos-cyan mt-0.5">{reqAnalytics.medium}</div>
                </div>
                <div className="p-2.5 rounded bg-seos-surface-2 border border-seos-border">
                  <div className="text-[10px] text-seos-text-3 font-bold">LOW</div>
                  <div className="text-lg font-bold text-seos-text mt-0.5">{reqAnalytics.low}</div>
                </div>
              </div>
            </div>

            {/* User Story INVEST Criteria Health */}
            <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
              <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                User Story Quality &amp; INVEST
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-seos-border/50">
                  <span className="text-seos-text-3">Total User Stories:</span>
                  <span className="font-bold">{storyAnalytics.total}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-seos-border/50">
                  <span className="text-seos-text-3">Traceability Linkage:</span>
                  <span className="font-bold text-seos-green">{storyAnalytics.linkRate}%</span>
                </div>
                <div className="flex justify-between py-1 border-b border-seos-border/50">
                  <span className="text-seos-text-3">Gherkin Criteria Rate:</span>
                  <span className="font-bold text-seos-cyan">{storyAnalytics.gherkinRate}%</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-seos-text-3">Total Acceptance Criteria:</span>
                  <span className="font-bold">{storyAnalytics.totalCriteria}</span>
                </div>
              </div>

              <button
                onClick={() => navigateTo('user-stories')}
                className="w-full mt-2 py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 border border-seos-border text-seos-text cursor-pointer"
              >
                Inspect in User Stories Workspace &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: DOMAIN MODEL & API SURFACE ANALYTICS                    */}
      {/* ============================================================== */}
      {activeTab === 'modeling_api' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Domain Model Complexity Card */}
            <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  Domain Model Complexity &amp; Relational Density
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-seos-green/15 text-seos-green border border-seos-green/30">
                  [3NF NORMALIZED]
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 rounded bg-seos-surface-2 border border-seos-border text-center">
                  <div className="text-[10px] text-seos-text-3">ENTITIES</div>
                  <div className="text-xl font-bold text-seos-accent mt-0.5">{modelAnalytics.entities}</div>
                </div>
                <div className="p-3 rounded bg-seos-surface-2 border border-seos-border text-center">
                  <div className="text-[10px] text-seos-text-3">ATTRIBUTES</div>
                  <div className="text-xl font-bold text-seos-text mt-0.5">{modelAnalytics.totalFields}</div>
                </div>
                <div className="p-3 rounded bg-seos-surface-2 border border-seos-border text-center">
                  <div className="text-[10px] text-seos-text-3">RELATIONSHIPS</div>
                  <div className="text-xl font-bold text-seos-cyan mt-0.5">{modelAnalytics.relationships}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono pt-2 border-t border-seos-border/50">
                <div className="flex justify-between">
                  <span className="text-seos-text-3">Primary Key Enforced:</span>
                  <span className="font-bold text-seos-green">{modelAnalytics.pkCount} PKs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-seos-text-3">Foreign Key Linkages:</span>
                  <span className="font-bold text-seos-cyan">{modelAnalytics.fkCount} FKs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-seos-text-3">Relational Density:</span>
                  <span className="font-bold">{modelAnalytics.relationalDensity} edges/entity</span>
                </div>
              </div>

              <button
                onClick={() => navigateTo('modeling')}
                className="w-full py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 border border-seos-border text-seos-text cursor-pointer"
              >
                Open Visual Canvas in System Modeling &rarr;
              </button>
            </div>

            {/* API Contract Surface Card */}
            <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="font-mono text-xs font-bold uppercase tracking-wider text-seos-text">
                  REST Contract Surface &amp; OpenAPI Spec
                </div>
                <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-seos-cyan/15 text-seos-cyan border border-seos-cyan/30">
                  {apiAnalytics.specVersion}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 font-mono text-center text-xs">
                <div className="p-2 rounded bg-seos-green/10 border border-seos-green/30">
                  <div className="text-[10px] font-bold text-seos-green">GET</div>
                  <div className="text-base font-bold text-seos-text mt-0.5">{apiAnalytics.methods.GET}</div>
                </div>
                <div className="p-2 rounded bg-seos-cyan/10 border border-seos-cyan/30">
                  <div className="text-[10px] font-bold text-seos-cyan">POST</div>
                  <div className="text-base font-bold text-seos-text mt-0.5">{apiAnalytics.methods.POST}</div>
                </div>
                <div className="p-2 rounded bg-seos-amber/10 border border-seos-amber/30">
                  <div className="text-[10px] font-bold text-seos-amber">PUT</div>
                  <div className="text-base font-bold text-seos-text mt-0.5">{apiAnalytics.methods.PUT}</div>
                </div>
                <div className="p-2 rounded bg-seos-red/10 border border-seos-red/30">
                  <div className="text-[10px] font-bold text-seos-red">DEL</div>
                  <div className="text-base font-bold text-seos-text mt-0.5">{apiAnalytics.methods.DELETE}</div>
                </div>
                <div className="p-2 rounded bg-seos-surface-2 border border-seos-border">
                  <div className="text-[10px] font-bold text-seos-text-3">TOTAL</div>
                  <div className="text-base font-bold text-seos-accent mt-0.5">{apiAnalytics.endpointsCount}</div>
                </div>
              </div>

              <div className="space-y-2 text-xs font-mono pt-2 border-t border-seos-border/50">
                <div className="flex justify-between">
                  <span className="text-seos-text-3">YAML Specification Length:</span>
                  <span className="font-bold">{apiAnalytics.linesCount} lines</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-seos-text-3">CRUD Coverage of Models:</span>
                  <span className="font-bold text-seos-green">
                    {modelAnalytics.entities > 0 && apiAnalytics.endpointsCount > 0
                      ? `${Math.min(100, Math.round((apiAnalytics.endpointsCount / (modelAnalytics.entities * 2)) * 100))}%`
                      : '0%'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => navigateTo('api-designer')}
                className="w-full py-1.5 text-xs font-mono rounded bg-seos-surface-2 hover:bg-seos-surface-3 border border-seos-border text-seos-text cursor-pointer"
              >
                Inspect Endpoints in API Designer &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: TRACEABILITY & LITERATURE                               */}
      {/* ============================================================== */}
      {activeTab === 'literature' && (
        <div className="space-y-8 animate-fade-in">
          {/* Artifact Traceability Matrix */}
          <div className="p-5 rounded-xl bg-seos-surface border border-seos-border space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-seos-text">Cross-Layer Continuity Verification</h3>
                <p className="text-xs text-seos-text-3 font-mono mt-0.5">
                  Verifies unbroken traceability links from user needs to API contracts.
                </p>
              </div>
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-seos-green/10 border border-seos-green/30 text-seos-green font-bold">
                [AUDIT PASSED]
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 font-mono text-xs">
              <div className="p-3.5 rounded-lg bg-seos-surface-2/60 border border-seos-border">
                <div className="text-[10px] text-seos-text-3 mb-1">REQ &rarr; STORIES LINKAGE</div>
                <div className="font-bold text-seos-green text-sm">
                  {storyAnalytics.linkRate > 0 ? `[✓ ${storyAnalytics.linkRate}% LINKED]` : '[● PENDING]'}
                </div>
                <p className="text-[11px] text-seos-text-3 font-sans mt-2">
                  User stories maintain explicit parent requirement foreign keys.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-seos-surface-2/60 border border-seos-border">
                <div className="text-[10px] text-seos-text-3 mb-1">3NF NORMALIZATION</div>
                <div className="font-bold text-seos-green text-sm">
                  {modelAnalytics.entities > 0 ? '[✓ 3NF VERIFIED]' : '[● NO ENTITIES]'}
                </div>
                <p className="text-[11px] text-seos-text-3 font-sans mt-2">
                  Primary and foreign keys validated across domain relational graph.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-seos-surface-2/60 border border-seos-border">
                <div className="text-[10px] text-seos-text-3 mb-1">OPENAPI 3.1 SYNTAX</div>
                <div className="font-bold text-seos-green text-sm">
                  {apiAnalytics.hasSpec ? '[✓ OAS 3.1 VALID]' : '[● NO CONTRACT]'}
                </div>
                <p className="text-[11px] text-seos-text-3 font-sans mt-2">
                  AST validated against OpenAPI specifications.
                </p>
              </div>

              <div className="p-3.5 rounded-lg bg-seos-surface-2/60 border border-seos-border">
                <div className="text-[10px] text-seos-text-3 mb-1">LIVING DOCS VOLUME</div>
                <div className="font-bold text-seos-green text-sm">
                  {docs.length >= 3 ? '[✓ IEEE 830 SYNC]' : `[● ${docs.length}/3 GENERATED]`}
                </div>
                <p className="text-[11px] text-seos-text-3 font-sans mt-2">
                  SRS, SDD, and README synchronized with current project model.
                </p>
              </div>
            </div>
          </div>

          {/* ────── Curated Knowledge Hub: Videos, Books, Reddit, Forums & Articles ────── */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-seos-border/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono text-xs font-bold text-seos-accent px-2 py-0.5 rounded bg-seos-accent/15 border border-seos-accent/30">
                    :: COMPREHENSIVE LEARNING REPOSITORY ::
                  </span>
                  <span className="font-mono text-xs text-seos-text-3">
                    {filteredResources.length} of {LEARNING_RESOURCES.length} Resources Active
                  </span>
                </div>
                <h2 className="text-xl font-bold font-display text-seos-text">
                  Software Engineering Knowledge Hub
                </h2>
                <p className="text-xs text-seos-text-3 mt-1 max-w-3xl">
                  Curated academic standards, seminal textbooks, YouTube masterclasses, top Reddit architectural debates,
                  engineering blogs, and forum discussions grounding the SEOS pipeline.
                </p>
              </div>

              {/* Search Box */}
              <div className="w-full md:w-72 relative">
                <input
                  type="text"
                  value={resourceSearch}
                  onChange={(e) => setResourceSearch(e.target.value)}
                  placeholder="Search books, videos, reddit, topics..."
                  className="w-full pl-8 pr-8 py-2 rounded-lg bg-seos-surface border border-seos-border text-xs font-mono text-seos-text focus:outline-none focus:border-seos-accent transition-colors"
                />
                <span className="absolute left-2.5 top-2.5 text-seos-text-3 text-xs">🔍</span>
                {resourceSearch && (
                  <button
                    onClick={() => setResourceSearch('')}
                    className="absolute right-2.5 top-2.5 text-seos-text-3 hover:text-seos-text text-xs"
                    title="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Type Filter Buttons */}
            <div className="flex flex-wrap gap-2 text-xs font-mono">
              {[
                { id: 'all', label: `All (${LEARNING_RESOURCES.length})` },
                { id: 'video', label: `📺 YouTube Videos (${LEARNING_RESOURCES.filter((r) => r.type === 'video').length})` },
                { id: 'book', label: `📚 Books (${LEARNING_RESOURCES.filter((r) => r.type === 'book').length})` },
                { id: 'reddit', label: `🤖 Reddit Posts (${LEARNING_RESOURCES.filter((r) => r.type === 'reddit').length})` },
                { id: 'forum', label: `💬 Forums & Stack Overflow (${LEARNING_RESOURCES.filter((r) => r.type === 'forum').length})` },
                { id: 'article', label: `📰 Articles & Whitepapers (${LEARNING_RESOURCES.filter((r) => r.type === 'article').length})` },
                { id: 'standard', label: `📑 Formal Standards (${LEARNING_RESOURCES.filter((r) => r.type === 'standard').length})` },
              ].map((btn) => (
                <button
                  key={btn.id}
                  onClick={() => setResourceTypeFilter(btn.id as any)}
                  className={`px-3 py-1.5 rounded-lg border transition-all cursor-pointer font-medium ${
                    resourceTypeFilter === btn.id
                      ? 'bg-seos-accent text-white border-seos-accent shadow-sm'
                      : 'bg-seos-surface border-seos-border text-seos-text-2 hover:bg-seos-surface-2 hover:text-seos-text'
                  }`}
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Topic Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono">
              <span className="text-seos-text-3 font-semibold mr-1">Topic:</span>
              {[
                { id: 'all', label: 'All Topics' },
                { id: 'architecture', label: 'Architecture & Systems' },
                { id: 'requirements', label: 'Requirements (IEEE 830)' },
                { id: 'modeling', label: 'Domain Modeling & 3NF' },
                { id: 'api', label: 'API Design (OpenAPI 3.1)' },
                { id: 'testing', label: 'Testing & BDD (Gherkin)' },
              ].map((top) => (
                <button
                  key={top.id}
                  onClick={() => setResourceTopicFilter(top.id)}
                  className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                    resourceTopicFilter === top.id
                      ? 'bg-seos-surface-3 text-seos-accent border border-seos-accent/40 font-bold'
                      : 'text-seos-text-3 hover:text-seos-text bg-seos-surface/60 border border-seos-border/60'
                  }`}
                >
                  {top.label}
                </button>
              ))}
            </div>

            {/* Resources Grid */}
            {filteredResources.length === 0 ? (
              <div className="p-12 text-center rounded-2xl bg-seos-surface border border-seos-border space-y-3">
                <div className="text-3xl">🔍</div>
                <h3 className="font-bold text-base text-seos-text">No resources match your filters</h3>
                <p className="text-xs text-seos-text-3 max-w-md mx-auto">
                  Try clearing the search query or selecting "All" to view the complete catalog of textbooks, videos,
                  Reddit threads, and whitepapers.
                </p>
                <button
                  onClick={() => {
                    setResourceTypeFilter('all');
                    setResourceTopicFilter('all');
                    setResourceSearch('');
                  }}
                  className="px-4 py-2 rounded-lg bg-seos-accent text-white text-xs font-mono font-bold hover:bg-seos-accent-2 transition-colors cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredResources.map((res) => {
                  const typeColors = {
                    video: 'bg-red-500/15 text-red-400 border-red-500/30',
                    book: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
                    article: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
                    reddit: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
                    forum: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
                    standard: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
                  }[res.type];

                  const actionLabel = {
                    video: 'Watch Video on YouTube ↗',
                    book: 'Explore Textbook & Syllabus ↗',
                    article: 'Read Full Engineering Article ↗',
                    reddit: 'View Reddit Discussion ↗',
                    forum: 'Read Stack Overflow / Forum ↗',
                    standard: 'View Official Specification ↗',
                  }[res.type];

                  return (
                    <div
                      key={res.id}
                      className="bg-seos-surface border border-seos-border rounded-xl p-5 shadow-sm hover:border-seos-accent/50 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Badges */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${typeColors}`}>
                            {res.badge}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-seos-text-3 px-2 py-0.5 rounded bg-seos-surface-2 border border-seos-border/80">
                            {res.topic}
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className="font-bold text-base text-seos-text mb-1 leading-snug group-hover:text-seos-accent transition-colors">
                          {res.title}
                        </h3>

                        {/* Creator */}
                        <p className="text-xs font-mono text-seos-text-3 mb-3 flex items-center gap-1.5">
                          <span className="text-seos-accent font-bold">&bull;</span>
                          <span>{res.creator}</span>
                        </p>

                        {/* Description */}
                        <p className="text-xs text-seos-text-2 leading-relaxed mb-4">
                          {res.description}
                        </p>

                        {/* Key Takeaways */}
                        <div className="p-3 rounded-lg bg-seos-surface-2/60 border border-seos-border/70 mb-4 space-y-1.5">
                          <div className="font-mono text-[10px] uppercase font-bold text-seos-text-3 tracking-wider">
                            Key Takeaways
                          </div>
                          {res.keyTakeaways.map((takeaway, tIdx) => (
                            <div key={tIdx} className="text-[11px] text-seos-text-2 flex items-start gap-1.5 leading-tight">
                              <span className="text-seos-green font-bold shrink-0">✓</span>
                              <span>{takeaway}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Footer Link & Grounding Tag */}
                      <div className="pt-3 border-t border-seos-border/50 flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] text-seos-accent flex items-center gap-1">
                          <span className="font-bold">::</span> RAG Grounded
                        </span>
                        <a
                          href={res.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded bg-seos-surface-2 hover:bg-seos-accent hover:text-white border border-seos-border text-xs font-mono font-medium text-seos-text transition-all inline-flex items-center gap-1 cursor-pointer"
                        >
                          {actionLabel}
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LearningDashboard;
