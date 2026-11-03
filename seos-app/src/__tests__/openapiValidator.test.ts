import { describe, it, expect } from 'vitest';
import { validateOpenApi } from '../lib/openapiValidator';

describe('OpenAPI 3.1 Validator', () => {
  it('returns invalid for empty input', () => {
    const res = validateOpenApi('');
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.type === 'error')).toBe(true);
  });

  it('detects YAML syntax errors with line numbers', () => {
    const invalidYaml = `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /users:
    get:
      summary: "unclosed quote
      responses:
        '200':
          description: ok
`;
    const res = validateOpenApi(invalidYaml);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.message.includes('YAML syntax error'))).toBe(true);
  });

  it('validates a correct OpenAPI 3.1 specification', () => {
    const validYaml = `
openapi: 3.1.0
info:
  title: FoodDash API
  version: 1.0.0
paths:
  /api/v1/restaurants:
    get:
      summary: List all restaurants
      operationId: listRestaurants
      responses:
        '200':
          description: Successful retrieval
  /api/v1/restaurants/{id}:
    get:
      summary: Get restaurant by ID
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Found
components:
  schemas:
    Restaurant:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
`;
    const res = validateOpenApi(validYaml);
    expect(res.isValid).toBe(true);
    expect(res.pathCount).toBe(2);
    expect(res.operationCount).toBe(2);
    expect(res.schemaCount).toBe(1);
    expect(res.schemas).toContain('Restaurant');
    expect(res.issues.some((i) => i.type === 'error')).toBe(false);
  });

  it('warns when a path parameter is missing in parameters definition', () => {
    const yamlWithoutParamDef = `
openapi: 3.1.0
info:
  title: Orders API
  version: 1.0.0
paths:
  /orders/{orderId}:
    get:
      summary: Get order
      responses:
        '200':
          description: ok
`;
    const res = validateOpenApi(yamlWithoutParamDef);
    expect(res.isValid).toBe(true); // Warnings don't invalidate spec
    expect(res.issues.some((i) => i.type === 'warning' && i.message.includes('{orderId}'))).toBe(true);
  });

  it('flags paths not starting with forward slash', () => {
    const yamlBadPath = `
openapi: 3.1.0
info:
  title: Bad Path API
  version: 1.0.0
paths:
  api/v1/test:
    get:
      summary: test
      responses:
        '200':
          description: ok
`;
    const res = validateOpenApi(yamlBadPath);
    expect(res.isValid).toBe(false);
    expect(res.issues.some((i) => i.type === 'error' && i.message.includes("must begin with a forward slash"))).toBe(true);
  });
});
