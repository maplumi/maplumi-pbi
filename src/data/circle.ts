"use strict";
import { RoleNames } from "../constants/roles";

export interface CircleParseResult {
    longitudes?: number[];
    latitudes?: number[];
    circleSizeValuesObjects: any[];
    hasLon?: boolean;
    hasLat?: boolean;
}

export function parseCircleCategorical(categorical: any): CircleParseResult {
    const lonCategory = categorical?.categories?.find((c: any) => c.source?.roles?.[RoleNames.Longitude]);
    const latCategory = categorical?.categories?.find((c: any) => c.source?.roles?.[RoleNames.Latitude]);
    const circleSizeValuesObjects = categorical?.values?.filter((c: any) => c.source?.roles?.[RoleNames.Size]) || [];

    return {
        longitudes: lonCategory?.values as number[] | undefined,
        latitudes: latCategory?.values as number[] | undefined,
        circleSizeValuesObjects,
        hasLon: !!lonCategory,
        hasLat: !!latCategory,
    };
}
