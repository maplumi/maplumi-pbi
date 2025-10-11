import { describe, it, expect } from '@jest/globals';
import { ZoomControlManager } from '../../../src/services/ZoomControlManager';

// Minimal OpenLayers Zoom + Map stubs
class ZoomStub {}
class MapStub {
  controls: any[] = [];
  addControl(c:any){ this.controls.push(c); }
  removeControl(c:any){ this.controls = this.controls.filter(x=>x!==c); }
}

describe('ZoomControlManager', () => {
  it('adds control when set visible true first time', () => {
    const map:any = new MapStub();
    const mgr = new ZoomControlManager(map);
    mgr.setZoomControlVisible(true);
    expect(map.controls.length).toBe(1);
    mgr.setZoomControlVisible(true); // no duplicate
    expect(map.controls.length).toBe(1);
  });
  it('removes control when toggled false', () => {
    const map:any = new MapStub();
    const mgr = new ZoomControlManager(map);
    mgr.setZoomControlVisible(true);
    mgr.setZoomControlVisible(false);
    expect(map.controls.length).toBe(0);
  });
});
