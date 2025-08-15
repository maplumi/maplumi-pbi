"use strict";

import type powerbi from "powerbi-visuals-api";

export class DataRoleService {
    static hasNonEmptyValue(v: any): boolean {
        if (v === null || v === undefined) return false;
        if (typeof v === "string") return v.trim().length > 0;
        if (typeof v === "number") return !isNaN(v);
        return true;
    }

    static hasRoleWithValues(categorical: powerbi.DataViewCategorical, roleName: string): boolean {
        const cat = categorical.categories?.find(c => c.source?.roles && (c.source.roles as any)[roleName]);
        return !!(cat && Array.isArray(cat.values) && cat.values.length > 0 && cat.values.some(this.hasNonEmptyValue));
    }

    /**
     * Computes auto-toggle states for layers based on standard role names.
     * Returns { circle, choropleth } booleans where:
     *  - circle => Latitude AND Longitude present with values
     *  - choropleth => AdminPCodeNameID present with values
     */
    static computeAutoToggles(categorical: powerbi.DataViewCategorical): { circle: boolean; choropleth: boolean } {
        const hasLat = this.hasRoleWithValues(categorical, "Latitude");
        const hasLon = this.hasRoleWithValues(categorical, "Longitude");
        const hasBoundary = this.hasRoleWithValues(categorical, "AdminPCodeNameID");
        return { circle: hasLat && hasLon, choropleth: hasBoundary };
    }
}
