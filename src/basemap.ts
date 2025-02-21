
"use strict";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import TileJSON from "ol/source/TileJSON";
import WMTS from "ol/source/WMTS";
import { MapboxVectorLayer } from 'ol-mapbox-style';
import { BasemapOptions } from './types';
import Tile from "ol/layer/Tile";
import VectorTileSource from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile";
import MVT from "ol/format/MVT";

const getBasemap = (basemapOptions: BasemapOptions): TileLayer | MapboxVectorLayer | VectorTileLayer => {
    switch (basemapOptions.selectedBasemap) {
        case 'openstreetmap':
            return getDefaultBasemap();
        case 'mapbox':
            return getMapboxBasemap(basemapOptions);
        case 'maptiler':
            return getMaptilerBasemap(basemapOptions);
        case 'none':
            return new TileLayer({
                source: null, // No source, so it remains empty
                visible: false
            });
        default:
            return getDefaultBasemap(); // fallback to default basemap
    }
};

const getDefaultBasemap = (): TileLayer => {
    return new TileLayer({
        source: new OSM() // Default basemap source
    })
};

const getMapboxBasemap = (basemapOptions: BasemapOptions): MapboxVectorLayer => {
    if (basemapOptions.mapboxStyle === 'custom' && basemapOptions.mapboxCustomStyleUrl.startsWith('mapbox://')) {
        console.log('Custom Mapbox Style URL: ', basemapOptions.mapboxCustomStyleUrl);
        return new MapboxVectorLayer({
            styleUrl: basemapOptions.mapboxCustomStyleUrl,
            accessToken: basemapOptions.mapboxAccessToken,
            declutter: basemapOptions.declutterLabels
        });
    } else {
        return new MapboxVectorLayer({
            styleUrl: basemapOptions.mapboxStyle,
            accessToken: basemapOptions.mapboxAccessToken,
            declutter: basemapOptions.declutterLabels
        });
    }
};

const getMaptilerBasemap = (basemapOptions: BasemapOptions): TileLayer | VectorTileLayer | MapboxVectorLayer => {

    const url = `https://api.maptiler.com/maps/${basemapOptions.maptilerStyle}/tiles.json?key=${basemapOptions.maptilerApiKey}`;

    return new Tile({
        source: new TileJSON({
            url: url,
            crossOrigin: "anonymous"
        })
    });

};


export { getBasemap };