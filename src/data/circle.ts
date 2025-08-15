"use strict";

export interface CircleParseResult {
    longitudes?: number[];
    latitudes?: number[];
    circleSizeValuesObjects: any[];
    hasLon?: boolean;
    hasLat?: boolean;
}

export function parseCircleCategorical(categorical: any): CircleParseResult {
    const lonCategory = categorical?.categories?.find((c: any) => c.source?.roles?.Longitude);
    const latCategory = categorical?.categories?.find((c: any) => c.source?.roles?.Latitude);
    const circleSizeValuesObjects = categorical?.values?.filter((c: any) => c.source?.roles?.Size) || [];

    return {
        longitudes: lonCategory?.values as number[] | undefined,
        latitudes: latCategory?.values as number[] | undefined,
        circleSizeValuesObjects,
        hasLon: !!lonCategory,
        hasLat: !!latCategory,
    };
}
