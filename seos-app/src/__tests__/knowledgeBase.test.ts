import { describe, it, expect } from 'vitest';
import {
  SE_KNOWLEDGE_BASE,
  retrieveRelevantKnowledge,
  getArchitectureCitations,
} from '../lib/knowledgeBase';

describe('Software Engineering Knowledge Base & Retrieval (RAG)', () => {
  it('contains curated literature chunks across key SE topics', () => {
    expect(SE_KNOWLEDGE_BASE.length).toBeGreaterThanOrEqual(8);
    const topics = new Set(SE_KNOWLEDGE_BASE.map((c) => c.topic));
    expect(topics.has('architecture')).toBe(true);
    expect(topics.has('requirements')).toBe(true);
    expect(topics.has('modeling')).toBe(true);
    expect(topics.has('api')).toBe(true);
    expect(topics.has('testing')).toBe(true);
  });

  it('retrieves relevant microservice literature for microservice inquiries', () => {
    const results = retrieveRelevantKnowledge('event-driven microservices with kafka', 2);
    expect(results.length).toBe(2);
    const titles = results.map((r) => r.title);
    const hasNewmanOrKleppmann = titles.some(
      (t) => t.includes('Microservices') || t.includes('Data-Intensive')
    );
    expect(hasNewmanOrKleppmann).toBe(true);
  });

  it('retrieves requirements literature for requirements inquiries', () => {
    const results = retrieveRelevantKnowledge('functional and non-functional requirements IEEE 830', 1);
    expect(results.length).toBe(1);
    expect(results[0].author).toBe('Ian Sommerville');
  });

  it('retrieves domain modeling and DDD literature', () => {
    const results = retrieveRelevantKnowledge('domain-driven design aggregates and entities', 1);
    expect(results.length).toBe(1);
    expect(results[0].author).toBe('Eric Evans');
  });

  it('generates structured citations for architectural patterns', () => {
    const citations = getArchitectureCitations('Event-Driven Microservices');
    expect(citations.length).toBeGreaterThanOrEqual(1);
    expect(citations[0]).toHaveProperty('title');
    expect(citations[0]).toHaveProperty('source');
  });
});
