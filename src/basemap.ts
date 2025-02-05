
"use strict";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import { MapboxVectorLayer } from 'ol-mapbox-style';
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

        if(basemapOptions.mapboxStyle === 'custom' && basemapOptions.mapboxCustomStyleUrl.startsWith('mapbox://')){

            console.log('Custom Mapbox Style URL: ', basemapOptions.mapboxCustomStyleUrl);

            return new MapboxVectorLayer({
                styleUrl: basemapOptions.mapboxCustomStyleUrl,
                accessToken: basemapOptions.mapboxAccessToken,
                declutter: basemapOptions.declutterLabels
            });

        }else{

            return new MapboxVectorLayer({
                styleUrl: basemapOptions.mapboxStyle,
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