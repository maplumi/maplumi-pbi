// Helper function to validate GeoJSON data
export function isValidGeoJson(data: any): boolean {
    if (!data || typeof data !== "object" || !data.type) {
        return false;
    }

    const validGeoJsonTypes = [
        "Feature",
        "FeatureCollection",
        "Point",
        "LineString",
        "Polygon",
        "MultiPoint",
        "MultiLineString",
        "MultiPolygon",
    ];

    if (!validGeoJsonTypes.includes(data.type)) {
        return false;
    }

    // Additional checks for "Feature" and "FeatureCollection"
    if (
        data.type === "Feature" &&
        (!data.geometry || typeof data.geometry !== "object")
    ) {
        return false;
    }

    if (data.type === "FeatureCollection" && !Array.isArray(data.features)) {
        return false;
    }

    return true;
}

// Helper function to validate TopoJSON data
export function isValidTopoJson(data: any): boolean {
    if (!data || typeof data !== "object") {
        return false;
    }

    // TopoJSON must have a "type" property, which should be "Topology"
    if (data.type !== "Topology") {
        return false;
    }

    // TopoJSON must have an "objects" property, which should be an object
    if (!data.objects || typeof data.objects !== "object") {
        return false;
    }

    // Validate that "arcs" (if present) is an array
    if (data.arcs && !Array.isArray(data.arcs)) {
        return false;
    }

    // Validate that "transform" (if present) has scale and translate properties
    if (data.transform) {
        const { scale, translate } = data.transform;
        if (
            !Array.isArray(scale) ||
            scale.length !== 2 ||
            !Array.isArray(translate) ||
            translate.length !== 2
        ) {
            return false;
        }
    }

    // Validate each object in "objects"
    for (const key in data.objects) {
        const object = data.objects[key];
        if (
            !object ||
            typeof object !== "object" ||
            !["Point", "LineString", "Polygon", "MultiPoint", "MultiLineString", "MultiPolygon", "GeometryCollection"].includes(object.type)
        ) {
            return false;
        }

        // Additional validation for GeometryCollection
        if (object.type === "GeometryCollection" && !Array.isArray(object.geometries)) {
            return false;
        }
    }

    return true;
}