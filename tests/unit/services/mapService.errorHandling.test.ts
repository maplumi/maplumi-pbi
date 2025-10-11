import { describe, it, expect, jest, beforeAll } from '@jest/globals';
jest.mock('ol-mapbox-style', () => ({ MapboxVectorLayer: jest.fn(() => ({ getSource: () => ({ setAttributions: () => {} }) })) }));
import { MapService } from '../../../src/services/MapService';

// Minimal host stub
const host: any = { displayWarningIcon: jest.fn() };

// Provide a container
function makeContainer() {
  const div = document.createElement('div');
  div.style.width = '400px';
  div.style.height = '300px';
  document.body.appendChild(div);
  return div;
}

describe('MapService error handling', () => {
  it('updateBasemap survives invalid style name', () => {
    const svc = new MapService(makeContainer(), true, host);
    // @ts-ignore force invalid
    svc.updateBasemap({ style: 'nonexistent-style', showAttribution: true });
    expect(host.displayWarningIcon).not.toHaveBeenCalled(); // implementation may silently ignore
  });

  it('setZoomControlVisible toggle does not throw repeatedly', () => {
    const svc = new MapService(makeContainer(), true, host);
    svc.setZoomControlVisible(true);
    svc.setZoomControlVisible(true);
    svc.setZoomControlVisible(false);
    svc.setZoomControlVisible(false);
    expect(true).toBe(true); // reached here without exception
  });
});
