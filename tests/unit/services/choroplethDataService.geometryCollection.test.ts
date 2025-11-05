import { describe, it, expect } from '@jest/globals';
import { ChoroplethDataService } from '../../../src/services/ChoroplethDataService';

const dummyColorRampManager: any = {};
const dummyHost: any = { displayWarningIcon: jest.fn() };

const square = [[[0,0],[1,0],[1,1],[0,1],[0,0]]];
const triangle = [[[0,0],[2,0],[1,2],[0,0]]];

describe('ChoroplethDataService geometry normalization', () => {
  it('flattens geometry collections to polygonal geometry and drops non-surface members', () => {
    const svc = new ChoroplethDataService(dummyColorRampManager, dummyHost);
    const data = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { shapeID: 'A' },
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [10, 10] },
              { type: 'Polygon', coordinates: square }
            ]
          }
        },
        {
          type: 'Feature',
          properties: { shapeID: 'B' },
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Polygon', coordinates: triangle },
              { type: 'MultiPolygon', coordinates: [square] }
            ]
          }
        },
        {
          type: 'Feature',
          properties: { shapeID: 'C' },
          geometry: {
            type: 'GeometryCollection',
            geometries: [
              { type: 'Point', coordinates: [0, 0] },
              { type: 'LineString', coordinates: [[0,0],[1,1]] }
            ]
          }
        }
      ]
    } as any;

    const res = svc.processGeoData(data, 'shapeID', ['A','B','C']);

    expect(res.originalGeojson.features).toHaveLength(2);
    const ids = res.originalGeojson.features.map((f: any) => f.properties.shapeID);
    expect(ids).toEqual(['A','B']);

  const firstGeom: any = res.originalGeojson.features[0].geometry;
  const secondGeom: any = res.originalGeojson.features[1].geometry;

    expect(firstGeom.type).toBe('Polygon');
    expect(secondGeom.type).toBe('MultiPolygon');
    expect(secondGeom.coordinates).toHaveLength(2);
  });
});
