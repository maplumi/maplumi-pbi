// Moved from root: colorRampHelper.test.ts
import { ColorRampHelper } from '../../../src/services/ColorRampHelper';

describe('ColorRampHelper', () => {
  it('returns predefined ramp', () => { const res = ColorRampHelper.selectColorRamp('viridis',''); expect(res.length).toBeGreaterThan(2); });
  it('parses valid custom ramp', () => { const res = ColorRampHelper.selectColorRamp('custom','#ff0000,#00ff00,#0000ff'); expect(res).toEqual(['#ff0000','#00ff00','#0000ff']); });
  it('falls back on invalid custom ramp', () => { const res = ColorRampHelper.selectColorRamp('custom','not-a-color'); expect(res.length).toBeGreaterThan(0); });
});
import { describe, it, expect } from '@jest/globals';
import { ColorRampHelper } from '../../../src/services/ColorRampHelper';
import { MessageService } from '../../../src/services/MessageService';

class MockMessages extends MessageService { constructor(){super({} as any);} invalidOrEmptyCustomColorRamp=jest.fn(); }

describe('ColorRampHelper.selectColorRamp', () => {
  it('predefined ramp', () => { const r=ColorRampHelper.selectColorRamp('blue',''); expect(r.length).toBeGreaterThan(0);});
  it('custom valid', () => { const r=ColorRampHelper.selectColorRamp('custom','#ff0000,#00ff00,#000'); expect(r).toEqual(['#ff0000','#00ff00','#000']);});
  it('invalid custom warns', () => { const m=new MockMessages(); const r=ColorRampHelper.selectColorRamp('custom','bad,val',m); expect(m.invalidOrEmptyCustomColorRamp).toHaveBeenCalled(); expect(r.length).toBeGreaterThan(0);});
});