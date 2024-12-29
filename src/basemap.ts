
"use strict";

import TileLayer from "ol/layer/Tile";
import TileArcGISRest from 'ol/source/TileArcGISRest';
import ImageTile from 'ol/source/ImageTile.js';
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { MapboxVectorLayer } from 'ol-mapbox-style';
import { WMTS } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import VectorTile from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { createXYZ } from "ol/tilegrid";
import { BasemapOptions } from "./types";


export class Basemap {

    constructor() {
        //console.log('Basemap constructor');
    }

    getDefaultBasemap(): TileLayer {

        return new TileLayer({
            source: new OSM() // Default basemap source
        })
    }

    getMapboxBasemap(basemapOptions:BasemapOptions): MapboxVectorLayer {

        if(basemapOptions.mapboxStye === 'custom' && basemapOptions.mapboxCustomStyleUrl.startsWith('mapbox://')){

            console.log('Custom Mapbox Style URL: ', basemapOptions.mapboxCustomStyleUrl);

            return new MapboxVectorLayer({
                styleUrl: basemapOptions.mapboxCustomStyleUrl,
                accessToken: basemapOptions.mapboxAccessToken,
                declutter: basemapOptions.declutterLabels
            });

        }else{

            return new MapboxVectorLayer({
                styleUrl: basemapOptions.mapboxStye,
                accessToken: basemapOptions.mapboxAccessToken,
                declutter: basemapOptions.declutterLabels
            });
        }
    }

    getBasemap(basemapOptions: BasemapOptions): TileLayer {

        switch (basemapOptions.selectedBasemap) {

            case "openstreetmap":

                return this.getDefaultBasemap();

            // TODO: Add more basemaps here

            default:
                return this.getDefaultBasemap(); // fallback to default basemap
        }

    }

    destroy() {
        //console.log('Basemap destroy');
    }

}