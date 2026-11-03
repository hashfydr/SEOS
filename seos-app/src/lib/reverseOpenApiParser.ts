import YAML from 'yaml';
import type { UMLNode, UMLEdge } from '../types';

export interface ReverseParseResult {
  success: boolean;
  nodes: UMLNode[];
  edges: UMLEdge[];
  error?: string;
  stats: {
    schemasFound: number;
    nodesCreated: number;
    nodesUpdated: number;
    edgesInferred: number;
  };
}

const TYPE_MAP: Record<string, string> = {
  string: 'VARCHAR',
  integer: 'INTEGER',
  number: 'DECIMAL',
  boolean: 'BOOLEAN',
  uuid: 'UUID',
  date: 'DATE',
  'date-time': 'TIMESTAMP',
  email: 'VARCHAR(255)',
  binary: 'BLOB',
  array: 'JSONB',
  object: 'JSONB',
};

function formatType(propDef: any): string {
  if (!propDef || typeof propDef !== 'object') return 'VARCHAR';
  if (propDef.format && TYPE_MAP[propDef.format.toLowerCase()]) {
    return TYPE_MAP[propDef.format.toLowerCase()];
  }
  if (propDef.type) {
    if (propDef.type === 'array') {
      if (propDef.items?.$ref) {
        const refName = propDef.items.$ref.split('/').pop();
        return `${refName}[]`;
      }
      const itemType = propDef.items?.type || 'item';
      return `${formatType({ type: itemType })}[]`;
    }
    return TYPE_MAP[propDef.type.toLowerCase()] || propDef.type.toUpperCase();
  }
  if (propDef.$ref) {
    return propDef.$ref.split('/').pop() || 'OBJECT';
  }
  return 'VARCHAR';
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Parses an OpenAPI 3.x specification YAML string and reverse-engineers
 * UML domain model nodes and relationship edges for bidirectional canvas synchronization.
 */
export function parseOpenApiToModel(
  yamlContent: string,
  currentNodes: UMLNode[] = [],
  currentEdges: UMLEdge[] = []
): ReverseParseResult {
  if (!yamlContent || !yamlContent.trim()) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: 'Empty OpenAPI specification.',
      stats: { schemasFound: 0, nodesCreated: 0, nodesUpdated: 0, edgesInferred: 0 },
    };
  }

  let doc: any = null;
  try {
    const yamlDoc = YAML.parseDocument(yamlContent);
    if (yamlDoc.errors && yamlDoc.errors.length > 0) {
      return {
        success: false,
        nodes: [],
        edges: [],
        error: `YAML syntax error: ${yamlDoc.errors[0].message}`,
        stats: { schemasFound: 0, nodesCreated: 0, nodesUpdated: 0, edgesInferred: 0 },
      };
    }
    doc = yamlDoc.toJSON();
  } catch (err: any) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: `YAML parse failed: ${err.message || String(err)}`,
      stats: { schemasFound: 0, nodesCreated: 0, nodesUpdated: 0, edgesInferred: 0 },
    };
  }

  if (!doc || typeof doc !== 'object') {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: 'Invalid OpenAPI document structure.',
      stats: { schemasFound: 0, nodesCreated: 0, nodesUpdated: 0, edgesInferred: 0 },
    };
  }

  // Find schemas from components.schemas or definitions (OAS 2 fallback)
  const schemas: Record<string, any> =
    doc.components?.schemas || doc.definitions || {};

  const schemaKeys = Object.keys(schemas);
  if (schemaKeys.length === 0) {
    return {
      success: false,
      nodes: [],
      edges: [],
      error: 'No components.schemas found in the OpenAPI document to derive entities from.',
      stats: { schemasFound: 0, nodesCreated: 0, nodesUpdated: 0, edgesInferred: 0 },
    };
  }

  const existingNodeMap = new Map<string, UMLNode>();
  for (const node of currentNodes) {
    existingNodeMap.set(normalizeName(node.name), node);
    existingNodeMap.set(node.id, node);
  }

  const newNodes: UMLNode[] = [];
  let nodesCreated = 0;
  let nodesUpdated = 0;

  // Extract operations by path to attach as entity methods
  const entityMethodsMap: Record<string, string[]> = {};
  if (doc.paths && typeof doc.paths === 'object') {
    for (const [pathStr, pathItem] of Object.entries(doc.paths)) {
      if (!pathItem || typeof pathItem !== 'object') continue;
      for (const [method, op] of Object.entries(pathItem as Record<string, any>)) {
        if (['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
          const pathSegments = pathStr.split('/').filter(Boolean);
          // Match path segment to schema name (e.g. /restaurants -> Restaurant)
          for (const sName of schemaKeys) {
            const singularSName = sName.toLowerCase().replace(/s$/, '');
            const matchesPath = pathSegments.some((seg) => {
              const cleanSeg = seg.toLowerCase().replace(/s$/, '').replace(/[^a-z0-9]/g, '');
              return cleanSeg === singularSName;
            });
            const matchesTags = Array.isArray(op.tags) && op.tags.some((t: string) => t.toLowerCase() === sName.toLowerCase());

            if (matchesPath || matchesTags) {
              if (!entityMethodsMap[sName]) entityMethodsMap[sName] = [];
              const methodSig = op.operationId ? `${op.operationId}()` : `${method.toLowerCase()}${sName}()`;
              if (!entityMethodsMap[sName].includes(methodSig) && entityMethodsMap[sName].length < 5) {
                entityMethodsMap[sName].push(methodSig);
              }
            }
          }
        }
      }
    }
  }

  schemaKeys.forEach((schemaName, index) => {
    const rawSchema = schemas[schemaName];
    const schemaObj = (rawSchema && typeof rawSchema === 'object') ? rawSchema : {};
    const norm = normalizeName(schemaName);
    const existing = existingNodeMap.get(norm);

    const nodeId = existing ? existing.id : `node-${schemaName.toLowerCase().replace(/[^a-z0-9_-]/g, '-')}`;

    // Layout positioning: preserve existing position, or arrange in grid
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = existing ? existing.x : 60 + col * 320;
    const y = existing ? existing.y : 50 + row * 260;

    // Determine node type
    let nodeType: 'entity' | 'actor' | 'service' = 'entity';
    const lowerName = schemaName.toLowerCase();
    if (['user', 'customer', 'driver', 'patient', 'doctor', 'admin', 'actor'].some((a) => lowerName.includes(a))) {
      nodeType = 'actor';
    } else if (['service', 'manager', 'engine', 'gateway', 'handler'].some((s) => lowerName.endsWith(s))) {
      nodeType = 'service';
    }

    // Extract fields
    const properties = schemaObj.properties || {};
    const requiredList = Array.isArray(schemaObj.required) ? schemaObj.required : [];
    const fields: UMLNode['fields'] = [];

    // Ensure primary key exists
    let hasPK = false;

    for (const [propName, rawPropDef] of Object.entries(properties)) {
      const propDef = rawPropDef as any;
      const lowerProp = propName.toLowerCase();
      const isPkField =
        lowerProp === 'id' ||
        lowerProp === `${lowerName}id` ||
        (requiredList.includes(propName) && lowerProp.includes('id'));
      
      const isFkField =
        !isPkField &&
        (lowerProp.endsWith('id') ||
          lowerProp.endsWith('_id') ||
          (typeof propDef === 'object' && propDef && ('$ref' in propDef || (propDef.description && String(propDef.description).toLowerCase().includes('foreign key')))));

      if (isPkField) hasPK = true;

      fields.push({
        name: propName,
        type: formatType(propDef),
        pk: isPkField,
        isPK: isPkField,
        fk: isFkField,
        isFK: isFkField,
      });
    }

    // If no PK was found, synthesize a standard primary key
    if (!hasPK && fields.length > 0) {
      fields.unshift({
        name: 'id',
        type: 'UUID',
        pk: true,
        isPK: true,
      });
    }

    const methods = entityMethodsMap[schemaName] || existing?.methods || [];

    const node: UMLNode = {
      id: nodeId,
      name: schemaName,
      type: nodeType,
      x,
      y,
      fields,
      methods: methods.length > 0 ? methods : undefined,
    };

    if (existing) {
      nodesUpdated++;
    } else {
      nodesCreated++;
    }

    newNodes.push(node);
  });

  // Infer relationships (UMLEdge[])
  const newEdges: UMLEdge[] = [];
  const edgeKeySet = new Set<string>();

  // Helper to add unique edge
  const addEdge = (fromId: string, toId: string, label: string, cardFrom = '1', cardTo = '0..*') => {
    if (fromId === toId) return; // avoid self loops for now
    const key = `${fromId}->${toId}`;
    if (!edgeKeySet.has(key)) {
      edgeKeySet.add(key);
      // Check if existing edge had custom label
      const existing = currentEdges.find((e) => e.from === fromId && e.to === toId);
      newEdges.push({
        id: existing?.id || `e-${fromId}-${toId}`,
        from: fromId,
        to: toId,
        label: existing?.label || label,
        cardinalityFrom: existing?.cardinalityFrom || cardFrom,
        cardinalityTo: existing?.cardinalityTo || cardTo,
      });
    }
  };

  const nodeNameIndex = new Map<string, UMLNode>();
  for (const node of newNodes) {
    nodeNameIndex.set(normalizeName(node.name), node);
    // Also index singular name
    nodeNameIndex.set(normalizeName(node.name).replace(/s$/, ''), node);
  }

  // 1. Analyze properties for foreign keys and $ref
  for (const node of newNodes) {
    const rawSchema = schemas[node.name] || {};
    const properties = rawSchema.properties || {};

    for (const [propName, rawPropDef] of Object.entries(properties)) {
      if (!rawPropDef || typeof rawPropDef !== 'object') continue;
      const propDef = rawPropDef as any;

      // Handle Direct $ref
      if ('$ref' in propDef && typeof propDef.$ref === 'string') {
        const targetSchemaName = propDef.$ref.split('/').pop() || '';
        const targetNode = nodeNameIndex.get(normalizeName(targetSchemaName));
        if (targetNode) {
          addEdge(node.id, targetNode.id, 'has', '1', '1');
        }
      }

      // Handle Array of $ref
      if (propDef.type === 'array' && propDef.items?.$ref) {
        const targetSchemaName = propDef.items.$ref.split('/').pop() || '';
        const targetNode = nodeNameIndex.get(normalizeName(targetSchemaName));
        if (targetNode) {
          addEdge(node.id, targetNode.id, 'contains', '1', '0..*');
        }
      }

      // Handle foreign key conventions (e.g. userId, restaurant_id, orderId)
      const lowerProp = propName.toLowerCase();
      if ((lowerProp.endsWith('id') || lowerProp.endsWith('_id')) && lowerProp !== 'id') {
        const refCandidate = lowerProp.replace(/_?id$/, '');
        const targetNode = nodeNameIndex.get(normalizeName(refCandidate));
        if (targetNode && targetNode.id !== node.id) {
          addEdge(node.id, targetNode.id, 'references', '*', '1');
        }
      }
    }
  }

  // 2. Preserve any existing valid edges between nodes that still exist
  for (const edge of currentEdges) {
    const fromExists = newNodes.some((n) => n.id === edge.from);
    const toExists = newNodes.some((n) => n.id === edge.to);
    if (fromExists && toExists) {
      const key = `${edge.from}->${edge.to}`;
      if (!edgeKeySet.has(key)) {
        edgeKeySet.add(key);
        newEdges.push(edge);
      }
    }
  }

  return {
    success: true,
    nodes: newNodes,
    edges: newEdges,
    stats: {
      schemasFound: schemaKeys.length,
      nodesCreated,
      nodesUpdated,
      edgesInferred: newEdges.length,
    },
  };
}
