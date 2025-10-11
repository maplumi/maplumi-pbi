import { describe, it, expect } from '@jest/globals';
import { CircleLayerOptionsBuilder, ChoroplethLayerOptionsBuilder } from '../../../src/services/LayerOptionBuilders';

// Light d3 selection stub
function makeSelection(): any { return { dummy: true } as any; }

function makeCommon() {
  return {
    svg: makeSelection(),
    svgContainer: { id: 'c' } as any,
    selectionManager: { select: () => Promise.resolve([]) } as any,
    tooltipServiceWrapper: { addTooltip: () => {} } as any
  };
}

describe('LayerOptionBuilders', () => {
  it('builds circle layer options', () => {
    const b = new CircleLayerOptionsBuilder(makeCommon());
    const opts = b.build({
      longitudes: [1], latitudes: [2], circleOptions: { strokeWidth:1 } as any,
      combinedCircleSizeValues: [10], minCircleSizeValue: 10, maxCircleSizeValue: 10,
      circleScale: 1, dataPoints: [{ id:1 }], circle1SizeValues:[10], circle2SizeValues:[5]
    });
    expect(opts.longitudes[0]).toBe(1);
    expect(opts.zIndex).toBe(5);
  });
  it('builds choropleth layer options', () => {
    const b = new ChoroplethLayerOptionsBuilder(makeCommon());
    const opts = b.build({
      geojson: { type:'FeatureCollection', features: [] }, strokeColor:'#000', strokeWidth:1,
      fillOpacity:0.5, colorScale: (v:any)=>'#fff', dataKey:'id', categoryValues:['a'], measureValues:[1], dataPoints:[{id:1}], simplificationStrength:0.2
    });
    expect(opts.strokeColor).toBe('#000');
    expect(opts.zIndex).toBe(5);
  });
});
