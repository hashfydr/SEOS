import YAML from 'yaml';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
  path?: string;
  line?: number;
}

export interface ParsedOperation {
  method: string;
  path: string;
  summary: string;
  operationId?: string;
  tags?: string[];
  parametersCount: number;
  responses: string[];
}

export interface OpenApiValidationResult {
  isValid: boolean;
  version: string;
  title: string;
  pathCount: number;
  operationCount: number;
  schemaCount: number;
  operations: ParsedOperation[];
  schemas: string[];
  issues: ValidationIssue[];
}

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'options', 'head'] as const;

/**
 * Validates an OpenAPI 3.x specification YAML string.
 * Performs both YAML syntax validation and structural OpenAPI schema checks.
 */
export function validateOpenApi(yamlContent: string): OpenApiValidationResult {
  const issues: ValidationIssue[] = [];
  const operations: ParsedOperation[] = [];
  const schemas: string[] = [];

  if (!yamlContent || !yamlContent.trim()) {
    return {
      isValid: false,
      version: 'Unknown',
      title: 'Empty Specification',
      pathCount: 0,
      operationCount: 0,
      schemaCount: 0,
      operations: [],
      schemas: [],
      issues: [{ type: 'error', message: 'Specification content is empty.' }],
    };
  }

  let doc: any = null;

  // Step 1: Parse YAML syntax
  try {
    const yamlDoc = YAML.parseDocument(yamlContent);
    if (yamlDoc.errors && yamlDoc.errors.length > 0) {
      for (const err of yamlDoc.errors) {
        issues.push({
          type: 'error',
          message: `YAML syntax error: ${err.message}`,
          line: err.linePos ? err.linePos[0].line : undefined,
        });
      }
    }
    doc = yamlDoc.toJSON();
  } catch (err: any) {
    return {
      isValid: false,
      version: 'Unknown',
      title: 'Parse Failed',
      pathCount: 0,
      operationCount: 0,
      schemaCount: 0,
      operations: [],
      schemas: [],
      issues: [{ type: 'error', message: `YAML parse failed: ${err.message || String(err)}` }],
    };
  }

  if (!doc || typeof doc !== 'object') {
    return {
      isValid: false,
      version: 'Unknown',
      title: 'Invalid Root',
      pathCount: 0,
      operationCount: 0,
      schemaCount: 0,
      operations: [],
      schemas: [],
      issues: [{ type: 'error', message: 'OpenAPI root must be a YAML mapping (key-value dictionary).' }],
    };
  }

  // Step 2: Validate OpenAPI Version
  const rawVersion = doc.openapi ? String(doc.openapi) : '';
  if (!rawVersion) {
    issues.push({
      type: 'error',
      message: "Missing required 'openapi' root field (expected '3.1.0' or '3.0.x').",
    });
  } else if (!rawVersion.startsWith('3.')) {
    issues.push({
      type: 'error',
      message: `Unsupported OpenAPI version '${rawVersion}'. Expected OpenAPI 3.0.x or 3.1.x.`,
    });
  } else if (!rawVersion.startsWith('3.1')) {
    issues.push({
      type: 'info',
      message: `OpenAPI version is ${rawVersion}. Consider upgrading to OpenAPI 3.1.0 for modern JSON Schema dialect support.`,
    });
  }

  // Step 3: Validate Info Object
  const info = doc.info;
  let title = 'Untitled API';
  if (!info || typeof info !== 'object') {
    issues.push({
      type: 'error',
      message: "Missing required 'info' object with 'title' and 'version'.",
    });
  } else {
    if (!info.title || typeof info.title !== 'string') {
      issues.push({
        type: 'error',
        message: "The 'info' object must include a non-empty 'title' string.",
      });
    } else {
      title = info.title;
    }

    if (!info.version) {
      issues.push({
        type: 'warning',
        message: "Missing 'version' in 'info' object (e.g. '1.0.0').",
      });
    }
  }

  // Step 4: Validate Paths & Operations
  const paths = doc.paths;
  let pathCount = 0;

  if (!paths || typeof paths !== 'object') {
    issues.push({
      type: 'error',
      message: "Missing or invalid 'paths' object. The API must declare at least one endpoint.",
    });
  } else {
    const pathKeys = Object.keys(paths);
    pathCount = pathKeys.length;

    if (pathCount === 0) {
      issues.push({
        type: 'warning',
        message: "The 'paths' object contains no endpoint declarations.",
      });
    }

    for (const pathKey of pathKeys) {
      if (!pathKey.startsWith('/')) {
        issues.push({
          type: 'error',
          path: pathKey,
          message: `Path '${pathKey}' is invalid: endpoint paths must begin with a forward slash ('/').`,
        });
      }

      // Check path template variables, e.g. /users/{userId}
      const pathVarMatches = pathKey.match(/\{([^}]+)\}/g) || [];
      const pathVars = new Set(pathVarMatches.map((m) => m.slice(1, -1)));

      const pathItem = paths[pathKey];
      if (!pathItem || typeof pathItem !== 'object') {
        issues.push({
          type: 'warning',
          path: pathKey,
          message: `Path item for '${pathKey}' is empty or not an object.`,
        });
        continue;
      }

      for (const method of HTTP_METHODS) {
        const op = pathItem[method];
        if (!op) continue;

        if (typeof op !== 'object') {
          issues.push({
            type: 'error',
            path: `${method.toUpperCase()} ${pathKey}`,
            message: `Operation '${method.toUpperCase()} ${pathKey}' must be an object.`,
          });
          continue;
        }

        const responses = op.responses ? Object.keys(op.responses) : [];
        if (responses.length === 0) {
          issues.push({
            type: 'warning',
            path: `${method.toUpperCase()} ${pathKey}`,
            message: `Operation '${method.toUpperCase()} ${pathKey}' has no responses declared.`,
          });
        }

        const params = Array.isArray(op.parameters) ? op.parameters : [];
        // Verify path parameters
        for (const pv of pathVars) {
          const hasParam = params.some((p: any) => p && p.in === 'path' && p.name === pv);
          const hasPathItemParam = Array.isArray(pathItem.parameters) &&
            pathItem.parameters.some((p: any) => p && p.in === 'path' && p.name === pv);
          
          if (!hasParam && !hasPathItemParam) {
            issues.push({
              type: 'warning',
              path: `${method.toUpperCase()} ${pathKey}`,
              message: `Path parameter '{${pv}}' in '${pathKey}' is not explicitly defined in operation parameters.`,
            });
          }
        }

        operations.push({
          method,
          path: pathKey,
          summary: op.summary || '',
          operationId: op.operationId,
          tags: Array.isArray(op.tags) ? op.tags : undefined,
          parametersCount: params.length,
          responses,
        });
      }
    }
  }

  // Step 5: Check Components & Schemas
  if (doc.components && typeof doc.components === 'object') {
    if (doc.components.schemas && typeof doc.components.schemas === 'object') {
      schemas.push(...Object.keys(doc.components.schemas));
    }
  }

  if (schemas.length === 0) {
    issues.push({
      type: 'info',
      message: "No reusable entity schemas defined under 'components.schemas'.",
    });
  }

  const hasErrors = issues.some((i) => i.type === 'error');

  return {
    isValid: !hasErrors,
    version: rawVersion || '3.1.0',
    title,
    pathCount,
    operationCount: operations.length,
    schemaCount: schemas.length,
    operations,
    schemas,
    issues,
  };
}
