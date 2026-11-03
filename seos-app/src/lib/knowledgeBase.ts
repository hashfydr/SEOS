import type { Citation } from '../types';

export interface KnowledgeChunk {
  id: string;
  title: string;
  author: string;
  source: string;
  chapter: string;
  page?: string;
  url: string;
  topic: 'requirements' | 'architecture' | 'modeling' | 'api' | 'testing' | 'database';
  keywords: string[];
  principles: string[];
  summary: string;
  citation: Citation;
}

export const SE_KNOWLEDGE_BASE: KnowledgeChunk[] = [
  {
    id: 'kb-microservices-newman',
    title: 'Building Microservices: Designing Fine-Grained Systems',
    author: 'Sam Newman',
    source: "Building Microservices (2nd Edition), O'Reilly Media",
    chapter: 'Chapter 4: Integration & Decomposition',
    page: 'pp. 84–112',
    url: 'https://samnewman.io/books/building_microservices_2nd_edition/',
    topic: 'architecture',
    keywords: ['microservice', 'microservices', 'service', 'decoupling', 'independent', 'deployable', 'gateway', 'event-driven'],
    principles: [
      'Model services around business domain boundaries (Bounded Contexts).',
      'Prefer asynchronous event collaboration to avoid temporal coupling.',
      'Hide internal data representations behind explicit API contracts.',
    ],
    summary: 'Microservices allow teams to independently build, deploy, and scale units of functionality. Coupling must be minimized using asynchronous events and domain boundaries.',
    citation: {
      id: 'newman-microservices-ch4',
      title: 'Building Microservices: Integration Patterns',
      source: 'Sam Newman (2021), Building Microservices 2nd Ed.',
      page: 'Chapter 4, pp. 84-112',
      url: 'https://samnewman.io/books/building_microservices_2nd_edition/',
    },
  },
  {
    id: 'kb-event-sourcing-kleppmann',
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    source: "Designing Data-Intensive Applications, O'Reilly Media",
    chapter: 'Chapter 11: Stream Processing & Event Brokers',
    page: 'pp. 439–478',
    url: 'https://dataintensive.net/',
    topic: 'architecture',
    keywords: ['kafka', 'event', 'events', 'stream', 'broker', 'pubsub', 'cqrs', 'asynchronous', 'messaging', 'event-driven'],
    principles: [
      'Treat changes as an immutable append-only event stream (Event Sourcing).',
      'Partition event logs (e.g. Apache Kafka) to achieve scalable order-preserving streams.',
      'Separate write models from read-optimized query views (CQRS).',
    ],
    summary: 'In event-driven architectures, state is represented as a log of immutable events. Message brokers decouple producers from multiple downstream consumer subsystems.',
    citation: {
      id: 'kleppmann-ddia-ch11',
      title: 'Designing Data-Intensive Applications: Stream Processing',
      source: 'Martin Kleppmann (2017), DDIA',
      page: 'Chapter 11, pp. 439-478',
      url: 'https://dataintensive.net/',
    },
  },
  {
    id: 'kb-modular-monolith-fowler',
    title: 'Patterns of Enterprise Application Architecture',
    author: 'Martin Fowler',
    source: 'Addison-Wesley Professional',
    chapter: 'Chapter 2: Organizing Domain Logic',
    page: 'pp. 23–38',
    url: 'https://martinfowler.com/books/eaa.html',
    topic: 'architecture',
    keywords: ['monolith', 'modular', 'modular monolith', 'single deployment', 'simple', 'cohesive'],
    principles: [
      'Start with a well-structured modular monolith unless scaling requirements force distributed boundaries.',
      'Keep domain logic pure and decouple layers using dependency boundaries.',
      'Avoid premature distribution costs (network latency, distributed transactions).',
    ],
    summary: 'A modular monolith offers strong internal module encapsulation without the operational complexity and network latency of distributed microservices.',
    citation: {
      id: 'fowler-poeaa-ch2',
      title: 'Patterns of Enterprise Application Architecture: Domain Logic',
      source: 'Martin Fowler (2002), PoEAA',
      page: 'Chapter 2, pp. 23-38',
      url: 'https://martinfowler.com/books/eaa.html',
    },
  },
  {
    id: 'kb-domain-driven-design-evans',
    title: 'Domain-Driven Design: Tackling Complexity in the Heart of Software',
    author: 'Eric Evans',
    source: 'Addison-Wesley Professional',
    chapter: 'Chapter 5: A Model-Driven Design',
    page: 'pp. 105–142',
    url: 'https://www.domainlanguage.com/ddd/',
    topic: 'modeling',
    keywords: ['ddd', 'domain', 'entity', 'entities', 'aggregate', 'value object', 'repository', 'ubiquitous language'],
    principles: [
      'Distinguish Entities (identity-tracked) from Value Objects (attribute-defined).',
      'Cluster entities into Aggregates with strict boundary invariants.',
      'Maintain an explicit Ubiquitous Language shared between developers and domain experts.',
    ],
    summary: 'Domain-Driven Design structures software systems around clear core business entities, aggregate roots, and bounded contexts.',
    citation: {
      id: 'evans-ddd-ch5',
      title: 'Domain-Driven Design: Model-Driven Design Patterns',
      source: 'Eric Evans (2003), Domain-Driven Design',
      page: 'Chapter 5, pp. 105-142',
      url: 'https://www.domainlanguage.com/ddd/',
    },
  },
  {
    id: 'kb-requirements-sommerville',
    title: 'Software Engineering (10th Edition)',
    author: 'Ian Sommerville',
    source: 'Pearson Higher Education',
    chapter: 'Chapter 4: Requirements Engineering',
    page: 'pp. 101–134',
    url: 'https://iansommerville.com/software-engineering-book/',
    topic: 'requirements',
    keywords: ['requirement', 'requirements', 'functional', 'non-functional', 'nfr', 'srs', 'ieee', 'ieee 830', 'priority'],
    principles: [
      'Functional requirements describe what the system must do; non-functional requirements constrain system quality attributes.',
      'Non-functional requirements must be quantifiably measurable (response time, throughput, uptime).',
      'Maintain unambiguous trace links from business concepts to requirements.',
    ],
    summary: 'Requirements engineering covers elicitation, specification, and validation. Statements must be testable, verifiable, and structured into unambiguous specifications.',
    citation: {
      id: 'sommerville-se10-ch4',
      title: 'Software Engineering: Requirements Engineering',
      source: 'Ian Sommerville (2015), Software Engineering 10th Ed.',
      page: 'Chapter 4, pp. 101-134',
      url: 'https://iansommerville.com/software-engineering-book/',
    },
  },
  {
    id: 'kb-agile-user-stories-pressman',
    title: "Software Engineering: A Practitioner's Approach",
    author: 'Roger S. Pressman & Bruce R. Maxim',
    source: 'McGraw-Hill Education (9th Edition)',
    chapter: 'Chapter 3: Agility and Agile Process Models',
    page: 'pp. 58–89',
    url: 'https://www.mheducation.com/highered/product/software-engineering-practitioner-s-approach-pressman-maxim/M9781259872976.html',
    topic: 'testing',
    keywords: ['user story', 'user stories', 'agile', 'acceptance criteria', 'given when then', 'gherkin', 'role action benefit'],
    principles: [
      'Format stories as: As a <role>, I want to <action>, so that <benefit>.',
      'Every story must include testable Acceptance Criteria specifying boundary conditions.',
      'Estimate and prioritize stories based on direct business value to actors.',
    ],
    summary: 'User stories bridge requirements and implementation by capturing intent from the end-user perspective, backed by executable acceptance criteria.',
    citation: {
      id: 'pressman-se9-ch3',
      title: "Software Engineering: Agile Process Models & Stories",
      source: 'Roger Pressman & Bruce Maxim (2019), SE: A Practitioner\'s Approach 9th Ed.',
      page: 'Chapter 3, pp. 58-89',
      url: 'https://www.mheducation.com/highered/product/M9781259872976.html',
    },
  },
  {
    id: 'kb-rest-api-fielding',
    title: 'Architectural Styles and the Design of Network-based Software Architectures',
    author: 'Roy Thomas Fielding',
    source: 'University of California, Irvine (Doctoral Dissertation)',
    chapter: 'Chapter 5: Representational State Transfer (REST)',
    page: 'pp. 76–104',
    url: 'https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm',
    topic: 'api',
    keywords: ['rest', 'api', 'openapi', 'http', 'crud', 'endpoint', 'resource', 'idempotent', 'stateless'],
    principles: [
      'Stateless communication: every client request contains all necessary context for execution.',
      'Uniform Interface: manipulate resources through standard HTTP verbs (GET, POST, PUT, DELETE).',
      'Idempotency: repeating GET, PUT, and DELETE operations must yield identical system state.',
    ],
    summary: 'REST defines architectural constraints for scalable network applications through stateless interactions, cacheability, and uniform resource identifiers.',
    citation: {
      id: 'fielding-rest-ch5',
      title: 'Architectural Styles: Representational State Transfer (REST)',
      source: 'Roy T. Fielding (2000), Doctoral Dissertation, UC Irvine',
      page: 'Chapter 5, pp. 76-104',
      url: 'https://www.ics.uci.edu/~fielding/pubs/dissertation/rest_arch_style.htm',
    },
  },
  {
    id: 'kb-clean-arch-martin',
    title: 'Clean Architecture: A Craftsman’s Guide to Software Structure and Design',
    author: 'Robert C. Martin ("Uncle Bob")',
    source: 'Prentice Hall',
    chapter: 'Chapter 22: The Clean Architecture & SOLID',
    page: 'pp. 203–228',
    url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
    topic: 'architecture',
    keywords: ['clean', 'clean architecture', 'solid', 'dependency inversion', 'layered', 'use cases', 'framework independent'],
    principles: [
      'The Dependency Rule: Source code dependencies must point inward toward higher-level policies.',
      'Entities and Use Cases remain independent of UI, database, and frameworks.',
      'Apply SOLID principles to ensure classes are open for extension but closed for modification.',
    ],
    summary: 'Clean Architecture arranges systems into concentric rings where domain rules sit at the center, insulated from databases, UI, and external drivers.',
    citation: {
      id: 'martin-clean-arch-ch22',
      title: 'Clean Architecture: Dependency Inversion and Core Rules',
      source: 'Robert C. Martin (2017), Clean Architecture',
      page: 'Chapter 22, pp. 203-228',
      url: 'https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html',
    },
  },
];

/**
 * Performs semantic keyword and topic matching against the curated SE knowledge base.
 * Returns the highest scoring knowledge chunks and formatted citations.
 */
export function retrieveRelevantKnowledge(query: string, maxResults = 3): KnowledgeChunk[] {
  if (!query || !query.trim()) {
    return SE_KNOWLEDGE_BASE.slice(0, maxResults);
  }

  const normalized = query.toLowerCase();
  const tokens = normalized
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const scored = SE_KNOWLEDGE_BASE.map((chunk) => {
    let score = 0;

    // Check direct keyword match
    for (const kw of chunk.keywords) {
      if (normalized.includes(kw)) {
        score += 8;
      }
      for (const token of tokens) {
        if (token === kw || kw.includes(token)) {
          score += 4;
        }
      }
    }

    // Check topic match
    if (normalized.includes(chunk.topic)) {
      score += 6;
    }

    // Check author/title match
    if (normalized.includes(chunk.author.toLowerCase())) {
      score += 10;
    }
    if (normalized.includes(chunk.title.toLowerCase())) {
      score += 10;
    }

    // Check summary match
    for (const token of tokens) {
      if (chunk.summary.toLowerCase().includes(token)) {
        score += 1;
      }
    }

    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // Return items with score > 0, or fallback to relevant top chunks
  const positive = scored.filter((s) => s.score > 0).map((s) => s.chunk);
  if (positive.length > 0) {
    return positive.slice(0, maxResults);
  }

  return SE_KNOWLEDGE_BASE.slice(0, maxResults);
}

/**
 * Retrieves citations for an architectural pattern.
 */
export function getArchitectureCitations(pattern: string): Citation[] {
  const chunks = retrieveRelevantKnowledge(pattern || 'architecture', 2);
  return chunks.map((c) => c.citation);
}
