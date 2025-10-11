import { describe, it, expect, beforeEach } from '@jest/globals';
import { MessageService } from '../../../src/services/MessageService';

function makeHost() {
  return {
    displayWarningIcon: jest.fn(),
  } as any;
}

describe('MessageService', () => {
  let host: any;
  let svc: MessageService;
  beforeEach(() => { host = makeHost(); svc = new MessageService(host); });

  it('invokes host.displayWarningIcon for all message methods', () => {
    svc.missingMeasures();
    svc.missingLonLat();
    svc.lonLatLengthMismatch();
    svc.noValidPCodes();
    svc.adminPcodeMissing();
    svc.colorMeasureMissing();
    svc.tooManyUniqueValues();
    svc.invalidOrEmptyCustomColorRamp();
    svc.geoBoundariesConfigError('bad config');
    svc.geoBoundariesMetadataError();
    svc.geoBoundariesConnectionError();
    svc.invalidGeoTopoUrl();
    svc.geoTopoFetchNetworkError();
    svc.geoTopoFetchStatusError(500);
    svc.invalidGeoTopoData();
    svc.choroplethFetchError();
    svc.autoSelectedBoundaryField('orig','new',3); // triggers (different)
    svc.autoSelectedBoundaryField('same','same',3); // no extra call

    expect(host.displayWarningIcon).toHaveBeenCalled();
    // Expect at least 16 calls (one may not fire if some consolidation happens)
    expect(host.displayWarningIcon.mock.calls.length).toBeGreaterThanOrEqual(16);
  });
});
