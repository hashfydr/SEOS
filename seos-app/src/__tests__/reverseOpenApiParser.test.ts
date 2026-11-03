import { describe, it, expect } from 'vitest';
import { parseOpenApiToModel } from '../lib/reverseOpenApiParser';
import type { UMLNode, UMLEdge } from '../types';

describe('Reverse OpenAPI-to-Model Parser', () => {
  it('handles empty or invalid inputs gracefully', () => {
    const emptyRes = parseOpenApiToModel('');
    expect(emptyRes.success).toBe(false);
    expect(emptyRes.error).toBeDefined();

    const badYaml = 'openapi: 3.1.0\npaths: [unclosed';
    const badRes = parseOpenApiToModel(badYaml);
    expect(badRes.success).toBe(false);
    expect(badRes.error).toContain('YAML');
  });

  it('fails if no components.schemas or definitions are found', () => {
    const yaml = `
openapi: 3.1.0
info:
  title: Test API
  version: 1.0.0
paths:
  /ping:
    get:
      summary: Health check
`;
    const res = parseOpenApiToModel(yaml);
    expect(res.success).toBe(false);
    expect(res.error).toContain('No components.schemas found');
  });

  it('parses schemas into UMLNodes with typed fields, PKs, and FKs', () => {
    const yaml = `
openapi: 3.1.0
info:
  title: FoodDash API
  version: 1.0.0
paths:
  /api/v1/restaurants:
    get:
      summary: List all restaurants
      operationId: listRestaurants
components:
  schemas:
    Restaurant:
      type: object
      required:
        - id
        - name
      properties:
        id:
          type: string
          format: uuid
        name:
          type: string
        rating:
          type: number
        isOpen:
          type: boolean
    MenuItem:
      type: object
      properties:
        id:
          type: string
        restaurantId:
          type: string
        price:
          type: number
`;
    const res = parseOpenApiToModel(yaml);
    expect(res.success).toBe(true);
    expect(res.nodes.length).toBe(2);

    const restaurant = res.nodes.find((n) => n.name === 'Restaurant');
    expect(restaurant).toBeDefined();
    expect(restaurant?.fields.find((f) => f.name === 'id')?.pk).toBe(true);
    expect(restaurant?.fields.find((f) => f.name === 'rating')?.type).toBe('DECIMAL');
    expect(restaurant?.fields.find((f) => f.name === 'isOpen')?.type).toBe('BOOLEAN');
    // Attached method check
    expect(restaurant?.methods).toContain('listRestaurants()');

    const menuItem = res.nodes.find((n) => n.name === 'MenuItem');
    expect(menuItem).toBeDefined();
    const fkField = menuItem?.fields.find((f) => f.name === 'restaurantId');
    expect(fkField?.fk).toBe(true);
  });

  it('infers relationship edges between schemas via FK and $ref', () => {
    const yaml = `
openapi: 3.1.0
info:
  title: E-Commerce
  version: 1.0.0
components:
  schemas:
    Customer:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
    Order:
      type: object
      properties:
        id:
          type: string
        customerId:
          type: string
        items:
          type: array
          items:
            $ref: '#/components/schemas/OrderItem'
    OrderItem:
      type: object
      properties:
        id:
          type: string
        quantity:
          type: integer
`;
    const res = parseOpenApiToModel(yaml);
    expect(res.success).toBe(true);
    expect(res.nodes.length).toBe(3);

    // Customer should have 'actor' type inferred
    const customer = res.nodes.find((n) => n.name === 'Customer');
    expect(customer?.type).toBe('actor');

    // Relationships: Order -> Customer (FK), Order -> OrderItem (ref)
    expect(res.edges.length).toBeGreaterThanOrEqual(2);
    const orderToCust = res.edges.find((e) => e.from === 'node-order' && e.to === 'node-customer');
    expect(orderToCust).toBeDefined();
    expect(orderToCust?.label).toBe('references');

    const orderToItem = res.edges.find((e) => e.from === 'node-order' && e.to === 'node-orderitem');
    expect(orderToItem).toBeDefined();
    expect(orderToItem?.label).toBe('contains');
  });

  it('preserves existing node positions and custom edge labels when resyncing', () => {
    const existingNodes: UMLNode[] = [
      {
        id: 'node-custom-user',
        name: 'User',
        type: 'actor',
        x: 450,
        y: 280,
        fields: [{ name: 'id', type: 'UUID', pk: true }],
      },
    ];

    const existingEdges: UMLEdge[] = [
      {
        id: 'edge-custom',
        from: 'node-order',
        to: 'node-custom-user',
        label: 'places_order',
      },
    ];

    const yaml = `
openapi: 3.1.0
info:
  title: Store
  version: 1.0.0
components:
  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
    Order:
      type: object
      properties:
        id:
          type: string
        userId:
          type: string
`;
    const res = parseOpenApiToModel(yaml, existingNodes, existingEdges);
    expect(res.success).toBe(true);

    const userNode = res.nodes.find((n) => n.name === 'User');
    expect(userNode?.id).toBe('node-custom-user');
    expect(userNode?.x).toBe(450);
    expect(userNode?.y).toBe(280);

    const edge = res.edges.find((e) => e.from === 'node-order' && e.to === 'node-custom-user');
    expect(edge?.label).toBe('places_order');
    expect(res.stats.nodesUpdated).toBe(1);
    expect(res.stats.nodesCreated).toBe(1);
  });
});
