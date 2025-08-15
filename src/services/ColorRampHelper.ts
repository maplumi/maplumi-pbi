"use strict";

import { VisualConfig } from "../config/VisualConfig";
import { MessageService } from "./MessageService";

export class ColorRampHelper {
    /**
     * Selects and validates a color ramp based on the chosen ramp name and optional custom ramp string.
     * - If name is a predefined ramp, returns that ramp (case-insensitive).
     * - If name is "custom", validates the comma-separated list of hex colors; falls back to default if invalid/empty.
     */
    static selectColorRamp(colorRampName: string, customRampCsv: string, messages?: MessageService): string[] {
        const fallback = VisualConfig.COLORRAMPS.AZURECASCADE;

        if (!colorRampName) {
            return fallback;
        }

        const name = colorRampName.toUpperCase();

        if (name !== "CUSTOM") {
            const ramp = (VisualConfig.COLORRAMPS as Record<string, string[]>)[name];
            return Array.isArray(ramp) && ramp.length > 0 ? ramp : fallback;
        }

        // Custom ramp path
        const validHex = /^#([0-9A-Fa-f]{3}){1,2}$/;
        const parsed = (customRampCsv || "")
            .split(",")
            .map(c => c.trim())
            .filter(c => validHex.test(c));

        if (parsed.length > 0) {
            return parsed;
        }

        // Invalid/empty custom ramp -> warn and fallback
        if (messages && typeof (messages as any).invalidOrEmptyCustomColorRamp === "function") {
            messages.invalidOrEmptyCustomColorRamp();
        }
        return fallback;
    }
}
