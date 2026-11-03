import { useStore } from '../store';
import type { Requirement, UserStory, UMLNode, UMLEdge, DocSection } from '../types';
import type { ArchRecommendation } from '../store';
import {
  MOCK_REQUIREMENTS,
  MOCK_USER_STORIES,
  MOCK_UML_NODES,
  MOCK_UML_EDGES,
  MOCK_ARCH_RECOMMENDATION,
  MOCK_OPENAPI_YAML,
  MOCK_DOCS,
} from '../mockData';
import { getArchitectureCitations } from './knowledgeBase';

export interface ProjectBundle {
  version: '1.0';
  exportedAt: string;
  projectName: string;
  productIdea: string;
  requirements: Requirement[];
  userStories: UserStory[];
  umlNodes: UMLNode[];
  umlEdges: UMLEdge[];
  architecture: ArchRecommendation;
  openapiYaml: string;
  docs: DocSection[];
}

export function exportProjectAsJSON(): void {
  const s = useStore.getState();
  const bundle: ProjectBundle = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    projectName: s.projectName,
    productIdea: s.productIdea,
    requirements: s.requirements,
    userStories: s.userStories,
    umlNodes: s.umlNodes,
    umlEdges: s.umlEdges,
    architecture: s.architecture,
    openapiYaml: s.openapiYaml,
    docs: s.docs,
  };

  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const filename = `${s.projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'seos-project'}.json`;
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function importProjectFromJSON(jsonString: string): { success: boolean; error?: string } {
  try {
    const data = JSON.parse(jsonString) as Partial<ProjectBundle>;

    if (!data.projectName && !data.requirements && !data.productIdea) {
      return { success: false, error: 'Invalid SEOS project JSON file: missing core project fields.' };
    }

    const s = useStore.getState();
    s.setProjectName(data.projectName || 'Imported Project');
    s.setProductIdea(data.productIdea || '');
    s.setRequirements(Array.isArray(data.requirements) ? data.requirements : []);
    s.setUserStories(Array.isArray(data.userStories) ? data.userStories : []);
    s.setUMLNodes(Array.isArray(data.umlNodes) ? data.umlNodes : []);
    s.setUMLEdges(Array.isArray(data.umlEdges) ? data.umlEdges : []);
    s.setArchitecture(
      data.architecture || {
        pattern: 'None',
        rationale: '',
        components: [],
        tradeoffs: [],
      }
    );
    s.setOpenapiYaml(data.openapiYaml || '');
    s.setDocs(Array.isArray(data.docs) ? data.docs : []);
    s.clearStaleArtifacts();

    s.addMessage({
      id: `import-${Date.now()}`,
      role: 'assistant',
      content: `[PROJECT] **Loaded project:** "${data.projectName || 'Imported Project'}" successfully from JSON backup.`,
      timestamp: new Date().toISOString(),
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: `Failed to parse project JSON: ${err.message || String(err)}` };
  }
}

/** Predefined reference case studies from the academic specification report (§3.1) */
export interface CaseStudyPreset {
  id: string;
  title: string;
  tagline: string;
  load: () => void;
}

export const PRESET_CASE_STUDIES: CaseStudyPreset[] = [
  {
    id: 'fooddash',
    title: 'FoodDash (Running Case Study)',
    tagline: 'On-demand food delivery platform with real-time order tracking and dispatch.',
    load: () => {
      const s = useStore.getState();
      s.setProjectName('FoodDash');
      s.setProductIdea(
        'An on-demand food delivery platform connecting customers, restaurants, and drivers with real-time tracking, live menus, automated dispatch, and secure payments.'
      );
      s.setRequirements(MOCK_REQUIREMENTS);
      s.setUserStories(MOCK_USER_STORIES);
      s.setUMLNodes(MOCK_UML_NODES);
      s.setUMLEdges(MOCK_UML_EDGES);
      s.setArchitecture({
        ...MOCK_ARCH_RECOMMENDATION,
        citations: getArchitectureCitations(MOCK_ARCH_RECOMMENDATION.pattern),
      });
      s.setOpenapiYaml(MOCK_OPENAPI_YAML);
      s.setDocs(MOCK_DOCS);
      s.clearStaleArtifacts();

      s.addMessage({
        id: `preset-${Date.now()}`,
        role: 'assistant',
        content: `[CASE STUDY] **Loaded reference case study:** **FoodDash** with 6 requirements, 4 user stories, 6 domain entities, Event-Driven Microservices architecture, and OpenAPI contract.`,
        timestamp: new Date().toISOString(),
      });
    },
  },
  {
    id: 'carepulse',
    title: 'CarePulse (Healthcare System)',
    tagline: 'HIPAA-compliant patient record, doctor appointment scheduling, and EHR management.',
    load: () => {
      const s = useStore.getState();
      s.setProjectName('CarePulse');
      s.setProductIdea(
        'A clinical healthcare system for patient triage, doctor appointment scheduling, electronic health records (EHR), and lab result notifications.'
      );

      const reqs: Requirement[] = [
        { id: 'REQ-101', type: 'Functional', priority: 'Critical', description: 'The system shall allow patients to book, reschedule, and cancel appointments with primary physicians.', status: 'approved' },
        { id: 'REQ-102', type: 'Functional', priority: 'Critical', description: 'The system shall maintain encrypted electronic health records accessible only by authorized medical staff.', status: 'approved' },
        { id: 'REQ-103', type: 'Non-Functional', priority: 'Critical', description: 'All stored and in-transit patient health data shall comply with HIPAA encryption and access audit logging.', status: 'approved' },
        { id: 'REQ-104', type: 'Functional', priority: 'High', description: 'The system shall notify patients of upcoming appointments via SMS and email 24 hours prior.', status: 'draft' },
        { id: 'REQ-105', type: 'Non-Functional', priority: 'High', description: 'Electronic health record queries shall return medical history in under 300ms during clinic hours.', status: 'draft' },
      ];

      const stories: UserStory[] = [
        { id: 'US-101', reqId: 'REQ-101', role: 'Patient', action: 'book a consultation slot with my doctor', benefit: 'I can receive medical guidance without calling clinic reception', criteria: ['Available slots shown in real-time', 'Immediate calendar confirmation', 'Cancellation permitted up to 2 hours prior'], status: 'approved' },
        { id: 'US-102', reqId: 'REQ-102', role: 'Doctor', action: 'review patient medical history and lab reports', benefit: 'I can make accurate diagnosis during appointments', criteria: ['Displays allergies and prior prescriptions', 'Audit record logged on every view', 'Restricted to patient consent window'], status: 'approved' },
      ];

      const nodes: UMLNode[] = [
        { id: 'node-patient', name: 'Patient', type: 'entity', x: 80, y: 50, fields: [{ name: 'id', type: 'UUID', pk: true }, { name: 'name', type: 'VARCHAR' }, { name: 'dob', type: 'DATE' }, { name: 'bloodGroup', type: 'VARCHAR' }] },
        { id: 'node-doctor', name: 'Doctor', type: 'entity', x: 420, y: 50, fields: [{ name: 'id', type: 'UUID', pk: true }, { name: 'name', type: 'VARCHAR' }, { name: 'specialty', type: 'VARCHAR' }] },
        { id: 'node-appointment', name: 'Appointment', type: 'entity', x: 250, y: 300, fields: [{ name: 'id', type: 'UUID', pk: true }, { name: 'patientId', type: 'UUID', fk: true }, { name: 'doctorId', type: 'UUID', fk: true }, { name: 'scheduledAt', type: 'TIMESTAMP' }, { name: 'status', type: 'VARCHAR' }] },
      ];

      const edges: UMLEdge[] = [
        { id: 'e1', from: 'node-patient', to: 'node-appointment', label: 'schedules', cardinalityFrom: '1', cardinalityTo: '0..*' },
        { id: 'e2', from: 'node-doctor', to: 'node-appointment', label: 'attends', cardinalityFrom: '1', cardinalityTo: '0..*' },
      ];

      s.setRequirements(reqs);
      s.setUserStories(stories);
      s.setUMLNodes(nodes);
      s.setUMLEdges(edges);
      s.setArchitecture({
        pattern: 'Modular Monolith with Audit Logging',
        rationale: 'A modular monolith guarantees strong transactional consistency across appointments and health records while keeping HIPAA audit boundaries strictly verifiable.',
        components: [
          { name: 'Patient Portal', tech: 'React / Next.js', purpose: 'Patient scheduling and record viewing' },
          { name: 'Clinical EHR Engine', tech: 'FastAPI / Python', purpose: 'Secure medical record manipulation' },
          { name: 'Audit & Compliance Logger', tech: 'PostgreSQL Append-Only', purpose: 'Immutable HIPAA access logs' },
        ],
        tradeoffs: [
          { pro: 'Strong relational consistency for patient records', con: 'Requires vertical scaling for high database load' },
          { pro: 'Simplified compliance audit boundary', con: 'Single deployment pipeline for clinical modules' },
        ],
        citations: getArchitectureCitations('Modular Monolith'),
      });

      s.setOpenapiYaml(`openapi: 3.1.0
info:
  title: CarePulse Clinical API
  version: 1.0.0
  description: HIPAA compliant healthcare management endpoints
paths:
  /api/v1/patients:
    get:
      summary: List registered patients
      responses:
        '200':
          description: Patient list
    post:
      summary: Register new patient
      responses:
        '201':
          description: Created
  /api/v1/appointments:
    post:
      summary: Book consultation appointment
      responses:
        '201':
          description: Appointment confirmed
components:
  schemas:
    Patient:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
`);

      s.setDocs([
        { id: 'srs', title: 'Software Requirements Specification', type: 'SRS', content: '# CarePulse SRS\n\n## 1. Introduction\nCarePulse is an enterprise healthcare management system for outpatient clinics.\n\n## 2. Functional Requirements\n- **[REQ-101]** Appointment scheduling with slot conflict prevention.\n- **[REQ-102]** Role-based access control for patient health records.' },
        { id: 'readme', title: 'README', type: 'README', content: '# CarePulse\n\nHIPAA-compliant clinical management platform.\n\n## Features\n- Direct doctor appointment booking\n- Encrypted medical records\n- Audit logging\n' }
      ]);

      s.clearStaleArtifacts();

      s.addMessage({
        id: `preset-${Date.now()}`,
        role: 'assistant',
        content: `[CASE STUDY] **Loaded reference case study:** **CarePulse** with clinical requirements, HIPAA constraints, and Modular Monolith architecture.`,
        timestamp: new Date().toISOString(),
      });
    },
  },
];
