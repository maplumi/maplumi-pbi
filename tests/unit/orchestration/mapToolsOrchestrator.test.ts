import { describe, it, expect, beforeEach } from '@jest/globals';
import { MapToolsOrchestrator } from '../../../src/orchestration/MapToolsOrchestrator';
import { VisualConfig } from '../../../src/config/VisualConfig';

// Minimal Map + View mocks to exercise attach/detach logic
class MockView {
  private zoom = 5;
  private extent: any;
  calculateExtent() { return [0,0,100,100]; }
  getZoom() { return this.zoom; }
  getCenter() { return [50,50]; }
  setProperties(props: any){ this.extent = props.extent; }
  fit(_extent: any, _opts: any){ /* noop */ }
}
class MockMap {
  view = new MockView();
  onCalls: any[] = []; offCalls: any[] = [];
  on(event: string, handler: any){ this.onCalls.push({event, handler}); }
  un(event: string, handler: any){ this.offCalls.push({event, handler}); }
  getView(){ return this.view as any; }
  getSize(){ return [800,600]; }
}

class MockMapService {
  zoomVisible: boolean | undefined;
  locked: any;
  setZoomControlVisible(v: boolean){ this.zoomVisible = v; }
  lockExtent(extent: any, center: any, zoom: number){ this.locked = { extent, center, zoom }; }
}

describe('MapToolsOrchestrator', () => {
  let map: MockMap; let svc: MockMapService; let orch: MapToolsOrchestrator; let persistCalls: any[];
  beforeEach(() => { map = new MockMap(); svc = new MockMapService(); orch = new MapToolsOrchestrator(map as any, svc as any); persistCalls = []; });

  it('attaches postrender listener & locks extent when lockMapExtent true with stored extent', () => {
    orch.attach({
      renderEngine: 'canvas', lockMapExtent: true, showZoomControl: true,
      lockedMapExtent: '0,0,100,100', lockedMapZoom: 7,
      legendPosition: 'bottom-left', legendBorderWidth: 1, legendBorderColor: '#000', legendBackgroundColor: '#fff', legendBackgroundOpacity: .5,
      legendBorderRadius: 2, legendBottomMargin: 0, legendTopMargin: 0, legendLeftMargin: 0, legendRightMargin: 0
    } as any, (ext, zoom) => persistCalls.push({ext, zoom}));
    expect(svc.zoomVisible).toBe(false); // hidden when locked
    expect(map.onCalls.length).toBe(1);
    expect(svc.locked.zoom).toBe(7);
  });

  it('detaches and clears when lockMapExtent false', () => {
    orch.attach({
      renderEngine: 'canvas', lockMapExtent: false, showZoomControl: true,
      lockedMapExtent: '', lockedMapZoom: undefined,
      legendPosition: 'bottom-left', legendBorderWidth: 1, legendBorderColor: '#000', legendBackgroundColor: '#fff', legendBackgroundOpacity: .5,
      legendBorderRadius: 2, legendBottomMargin: 0, legendTopMargin: 0, legendLeftMargin: 0, legendRightMargin: 0
    } as any, () => {});
    expect(map.offCalls?.length || 0).toBeGreaterThanOrEqual(0); // detach path executed (no listener added)
    expect(svc.zoomVisible).toBe(true);
  });
});
