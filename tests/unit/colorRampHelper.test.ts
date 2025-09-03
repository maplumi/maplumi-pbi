import { ColorRampHelper } from "../../src/services/ColorRampHelper";
import { MessageService } from "../../src/services/MessageService";

class MockMessages extends MessageService {
  constructor() { super({} as any); }
  invalidOrEmptyCustomColorRamp = jest.fn();
}

describe("ColorRampHelper.selectColorRamp", () => {
  it("returns predefined ramp (case-insensitive)", () => {
    const ramp = ColorRampHelper.selectColorRamp("blue", "");
    expect(Array.isArray(ramp)).toBe(true);
    expect(ramp.length).toBeGreaterThan(0);
  });

  it("validates custom ramp and returns parsed colors", () => {
    const colors = "#ff0000, #00ff00,#000";
    const ramp = ColorRampHelper.selectColorRamp("custom", colors);
    expect(ramp).toEqual(["#ff0000", "#00ff00", "#000"]);
  });

  it("falls back and warns on invalid custom ramp", () => {
    const msgs = new MockMessages();
    const ramp = ColorRampHelper.selectColorRamp("custom", "invalid,colors", msgs);
    expect(msgs.invalidOrEmptyCustomColorRamp).toHaveBeenCalled();
    expect(Array.isArray(ramp)).toBe(true);
    expect(ramp.length).toBeGreaterThan(0);
  });

  it("falls back and warns on empty custom ramp", () => {
    const msgs = new MockMessages();
    const ramp = ColorRampHelper.selectColorRamp("custom", "   ", msgs);
    expect(msgs.invalidOrEmptyCustomColorRamp).toHaveBeenCalled();
    expect(ramp.length).toBeGreaterThan(0);
  });

  it("returns only valid colors when custom list has mixed validity", () => {
    const ramp = ColorRampHelper.selectColorRamp("custom", "#fff,notacolor,#123456,#bad,#abc", undefined);
    // #bad is valid 3 hex (#bad) so included; notacolor excluded
    expect(ramp).toEqual(["#fff", "#123456", "#bad", "#abc"]);
  });
});
