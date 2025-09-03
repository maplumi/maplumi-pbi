import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as d3 from 'd3';
// @ts-ignore internal imports
import { ChoroplethOrchestrator } from '../../src/orchestration/ChoroplethOrchestrator';
// @ts-ignore internal imports
import { CacheService } from '../../src/services/CacheService';
// @ts-ignore internal imports
import * as requestHelpers from '../../src/utils/requestHelpers';

function makeHost() {
  return {
    displayWarningIcon: jest.fn(),
    createSelectionIdBuilder: () => ({ withCategory: () => ({ withMeasure: () => ({ createSelectionId: () => ({}) }) }) })
  } as any;
}

function baseChoroOptions(overrides: any = {}) {
  return {
    boundaryDataSource: 'custom',
    topoJSON_geoJSON_FileUrl: overrides.url || overrides.topoJSON_geoJSON_FileUrl || '',
    topojsonObjectName: '',
    geoBoundariesReleaseType: 'gbOpen',
    geoBoundariesCountry: 'KEN',
    geoBoundariesAdminLevel: 'ADM1',
    layerControl: true,
    classificationMethod: 'Quantile',
    showLegend: false,
    locationPcodeNameId: 'pcode',
    ...overrides,
  };
}

function minimalCategorical() {
  return { } as any; // Not used by fetchAndRenderChoroplethLayer for early network exits
}

const mapStub: any = { removeLayer: jest.fn(), addLayer: jest.fn() };
const legendStub: any = { hideLegend: jest.fn(), showLegend: jest.fn(), createChoroplethLegend: jest.fn(), getChoroplethLegendContainer: () => ({ setAttribute: () => {} }) };
const selectionManagerStub: any = { select: () => Promise.resolve([]) };
const tooltipStub: any = { addTooltip: () => {} };

// Data service stub (not reached in early error paths)
const dataServiceStub: any = {
  getClassBreaks: () => [0,1,2],
  getColorScale: () => ['#000'],
  extractTooltips: () => [],
  processGeoData: () => ({ filteredByOriginal: { features: [] }, filteredByBest: { features: [] } })
};

function makeOrchestrator() {
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svgEl.setAttribute('id','rootSvg');
  const group = document.createElementNS('http://www.w3.org/2000/svg','g');
  group.setAttribute('id','choroplethGroup');
  svgEl.appendChild(group);
  const svg = d3.select(svgEl as any);
  const host = makeHost();
  const cacheService = new CacheService();
  const orch = new ChoroplethOrchestrator({
    svg,
    svgOverlay: svgEl as any,
    svgContainer: document.createElement('div'),
    legendService: legendStub,
    host,
    map: mapStub,
    selectionManager: selectionManagerStub,
    tooltipServiceWrapper: tooltipStub,
    cacheService,
  }) as any;
  // Replace messages with spies for targeted methods
  orch.messages = {
    invalidGeoTopoUrl: jest.fn(),
    geoTopoFetchNetworkError: jest.fn(),
    geoTopoFetchStatusError: jest.fn(),
    invalidGeoTopoData: jest.fn(),
    tooManyUniqueValues: jest.fn(),
  };
  return { orch, host, cacheService };
}

// Common params passed after URL logic stage
const dummyAdminCat: any = {}; const dummyMeasure: any = { source: { queryName: 'm' }, values: [1] };
const dummyColorValues: number[] = [1];
const dummyBreaks: any = [0,1];
const dummyScale: any = ['#000'];
const dummyPcodeKey = 'pcode';
const dummyDataPoints: any[] = [{ pcode: 'A', value: 1, tooltip: [], selectionId: {} }];
const dummyValidPCodes: string[] = ['A'];
const dummyMapTools = { renderEngine: 'svg' } as any;

describe('ChoroplethOrchestrator.fetchAndRenderChoroplethLayer network edge cases', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  it('triggers invalidGeoTopoUrl when URL fails validation check', async () => {
    jest.spyOn(requestHelpers, 'appendClientIdQuery').mockImplementation(u => u);
    // Provide a syntactically valid URL so open-redirect guard does not short-circuit
    jest.spyOn(requestHelpers, 'stripQueryParams').mockReturnValue('https://example.com/data.geojson');
  jest.spyOn(requestHelpers, 'isValidURL').mockImplementation(() => false);
  jest.spyOn(requestHelpers, 'enforceHttps').mockImplementation(() => false); // should not matter
    const { orch } = makeOrchestrator();
    const opts = baseChoroOptions({ topoJSON_geoJSON_FileUrl: 'https://example.com/data.geojson' });
    await orch.fetchAndRenderChoroplethLayer(
      opts, dummyAdminCat, dummyMeasure, dummyColorValues, dummyBreaks, dummyScale,
      dummyPcodeKey, dummyDataPoints, dummyValidPCodes, dataServiceStub, dummyMapTools
    );
    expect(orch.messages.invalidGeoTopoUrl).toHaveBeenCalled();
  });

  it('triggers geoTopoFetchNetworkError when enforceHttps fails', async () => {
    jest.spyOn(requestHelpers, 'appendClientIdQuery').mockImplementation(u => u);
    jest.spyOn(requestHelpers, 'stripQueryParams').mockReturnValue('https://example.com/a.geojson');
  jest.spyOn(requestHelpers, 'isValidURL').mockImplementation(() => true);
    jest.spyOn(requestHelpers, 'enforceHttps').mockReturnValue(false);
    const { orch } = makeOrchestrator();
    const opts = baseChoroOptions({ topoJSON_geoJSON_FileUrl: 'https://example.com/a.geojson' });
    await orch.fetchAndRenderChoroplethLayer(
      opts, dummyAdminCat, dummyMeasure, dummyColorValues, dummyBreaks, dummyScale,
      dummyPcodeKey, dummyDataPoints, dummyValidPCodes, dataServiceStub, dummyMapTools
    );
    expect(orch.messages.geoTopoFetchNetworkError).toHaveBeenCalled();
  });

  it('triggers geoTopoFetchStatusError for HTTP error status', async () => {
    jest.spyOn(requestHelpers, 'appendClientIdQuery').mockImplementation(u => u);
    jest.spyOn(requestHelpers, 'stripQueryParams').mockReturnValue('https://example.com');
    jest.spyOn(requestHelpers, 'isValidURL').mockReturnValue(true);
    jest.spyOn(requestHelpers, 'enforceHttps').mockReturnValue(true);
    const resp404: any = { ok: false, status: 404, headers: { get: () => null } };
    jest.spyOn(requestHelpers, 'fetchWithTimeout').mockResolvedValue(resp404);
    const { orch } = makeOrchestrator();
    const opts = baseChoroOptions({ topoJSON_geoJSON_FileUrl: 'https://example.com/a.geojson' });
    await orch.fetchAndRenderChoroplethLayer(
      opts, dummyAdminCat, dummyMeasure, dummyColorValues, dummyBreaks, dummyScale,
      dummyPcodeKey, dummyDataPoints, dummyValidPCodes, dataServiceStub, dummyMapTools
    );
    expect(orch.messages.geoTopoFetchStatusError).toHaveBeenCalledWith(404);
  });

  it('triggers invalidGeoTopoData when JSON invalid', async () => {
    jest.spyOn(requestHelpers, 'appendClientIdQuery').mockImplementation(u => u);
    jest.spyOn(requestHelpers, 'stripQueryParams').mockReturnValue('https://example.com');
    jest.spyOn(requestHelpers, 'isValidURL').mockReturnValue(true);
    jest.spyOn(requestHelpers, 'enforceHttps').mockReturnValue(true);
    const respOk: any = { ok: true, status: 200, json: async () => ({ bogus: true }), headers: { get: () => null } };
    jest.spyOn(requestHelpers, 'fetchWithTimeout').mockResolvedValue(respOk);
    jest.spyOn(requestHelpers, 'isValidJsonResponse').mockResolvedValue(false);
    const { orch } = makeOrchestrator();
    const opts = baseChoroOptions({ topoJSON_geoJSON_FileUrl: 'https://example.com/a.geojson' });
    await orch.fetchAndRenderChoroplethLayer(
      opts, dummyAdminCat, dummyMeasure, dummyColorValues, dummyBreaks, dummyScale,
      dummyPcodeKey, dummyDataPoints, dummyValidPCodes, dataServiceStub, dummyMapTools
    );
    expect(orch.messages.invalidGeoTopoData).toHaveBeenCalled();
  });
});
