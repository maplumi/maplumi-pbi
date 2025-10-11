import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as d3 from 'd3';
// @ts-ignore internal imports
import { ChoroplethOrchestrator } from '../../../src/orchestration/ChoroplethOrchestrator';
// @ts-ignore internal imports
import { CacheService } from '../../../src/services/CacheService';
// @ts-ignore internal imports
import * as requestHelpers from '../../../src/utils/requestHelpers';
// @ts-ignore internal import
import { MessageService } from '../../../src/services/MessageService';

function makeHost(){ return { displayWarningIcon: jest.fn(), createSelectionIdBuilder: () => ({ withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({}) }) }) }) } as any; }
const mapStub:any={removeLayer:jest.fn(),addLayer:jest.fn()}; const legendStub:any={ hideLegend:jest.fn(), showLegend:jest.fn(), createChoroplethLegend:jest.fn(), getChoroplethLegendContainer:()=>({setAttribute:()=>{}})}; const selMgr:any={ select:()=>Promise.resolve([])}; const tooltipStub:any={addTooltip:()=>{}};
const dataServiceStub:any={ getClassBreaks:()=>[0,1,2], getColorScale:()=>['#000'], extractTooltips:()=>[], processGeoData:()=>({ filteredByOriginal:{features:[]}, filteredByBest:{features:[]}})};

function makeOrch(){ const svgEl=document.createElementNS('http://www.w3.org/2000/svg','svg'); const g=document.createElementNS('http://www.w3.org/2000/svg','g'); g.setAttribute('id','choroplethGroup'); svgEl.appendChild(g); const svg=d3.select(svgEl as any); const host=makeHost(); const cache=new CacheService(); const orch=new ChoroplethOrchestrator({svg, svgOverlay:svgEl as any, svgContainer:document.createElement('div'), legendService:legendStub, host, map:mapStub, selectionManager:selMgr, tooltipServiceWrapper:tooltipStub, cacheService:cache}) as any; return {orch}; }
const baseOpts=(o:any={})=>({ boundaryDataSource:'custom', topoJSON_geoJSON_FileUrl:o.url||'', geoBoundariesReleaseType:'gbOpen', geoBoundariesCountry:'KEN', geoBoundariesAdminLevel:'ADM1', layerControl:true, classificationMethod:'Quantile', showLegend:false, locationPcodeNameId:'pcode'});
const dummyCat:any={}, dummyMeasure:any={ source:{queryName:'m'}, values:[1]}, cv=[1], cb=[0,1], cs=['#000'], pk='pcode', dps=[{pcode:'A',value:1,tooltip:[],selectionId:{}}], valid=['A'], mapTools={renderEngine:'svg'} as any;

describe('ChoroplethOrchestrator network', () => {
  beforeEach(()=>jest.restoreAllMocks());
  it('invalid URL triggers invalidGeoTopoUrl warning', async () => {
    jest.spyOn(requestHelpers,'appendClientIdQuery').mockImplementation(u=>u);
    // Provide syntactically valid URL so open redirect check passes and we reach isValidURL branch
    const testUrl = 'https://example.com/data.geojson';
    jest.spyOn(requestHelpers,'hasOpenRedirect').mockReturnValue(false);
    jest.spyOn(requestHelpers,'isValidURL').mockReturnValue(false);
    const spy = jest.spyOn(MessageService.prototype,'invalidGeoTopoUrl').mockImplementation(()=>{});
    const {orch}=makeOrch();
    await orch.fetchAndRenderChoroplethLayer(baseOpts({url:testUrl}),dummyCat,dummyMeasure,cv,cb,cs,pk,dps,valid,dataServiceStub,mapTools);
    expect(spy).toHaveBeenCalled();
  });
});