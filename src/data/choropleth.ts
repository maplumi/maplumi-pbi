"use strict";

import { ChoroplethData } from "../types";
import { RoleNames } from "../constants/roles";

export interface ValidationResult {
    ok: boolean;
    reason?: string;
}

export function validateChoroplethInput(categorical: any): ValidationResult {
    if (!categorical?.values || categorical.values.length === 0) {
        return { ok: false, reason: "Measures not found" };
    }
    return { ok: true };
}

export function parseChoroplethCategorical(categorical: any): ChoroplethData {
    const AdminPCodeNameIDCategory = categorical?.categories?.find((c: any) => c.source?.roles && c.source.roles[RoleNames.AdminPCodeNameID]);
    const colorMeasure = categorical?.values?.find((c: any) => c.source?.roles && c.source.roles[RoleNames.Color]);
    const pCodes = AdminPCodeNameIDCategory?.values as string[] | undefined;
    return { AdminPCodeNameIDCategory, colorMeasure, pCodes } as ChoroplethData;
}

export function filterValidPCodes(pCodes: string[] | undefined): string[] {
    if (!pCodes) return [];
    return pCodes.filter((p) => !!p);
}
