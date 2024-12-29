
"use strict";

import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import { MapboxVectorLayer } from 'ol-mapbox-style';
import { WMTS } from "ol/tilegrid";
import TileGrid from "ol/tilegrid/TileGrid";
import VectorTile from "ol/layer/VectorTile";
import VectorTileSource from "ol/source/VectorTile";
import MVT from "ol/format/MVT";
import { createXYZ } from "ol/tilegrid";


export class Basemap {

    constructor() {
        //console.log('Basemap constructor');
    }

    getDefaultBasemap(): TileLayer {

        return new TileLayer({
            source: new OSM() // Default basemap source
        })
    }

    getMapboxBasemap(mapboxStyleUrl: string, mapboxAccessToken: string, declutter: boolean): MapboxVectorLayer {
        

        const mapboxLayer = new MapboxVectorLayer({
            styleUrl: mapboxStyleUrl,
            accessToken: mapboxAccessToken,
            declutter: declutter
        })

        return mapboxLayer;

    }

    getBasemap(basemapOptions: any): TileLayer {

        switch (basemapOptions.selectedBasemap) {

            case "openstreetmap":

                return this.getDefaultBasemap();

            case "mapbox":

                const mapboxBaseUrl = basemapOptions.mapboxBaseUrl; //"https://api.mapbox.com";
                const mapboxAccessToken = basemapOptions.mapboxAccessToken;
                const mapboxStyleUrl = basemapOptions.mapboxStyleUrl; // mapbox://styles/ocha-rosea-1/cm2lidma900jq01r27rkxflo6

                const parts = mapboxStyleUrl.split('/');

                if (parts.length < 2 || parts[0] !== 'mapbox:' || parts[1] > 5) {
                    //console.log('Invalid Mapbox style URL');
                    return this.getDefaultBasemap(); // fallback to default basemap
                }

                const mapboxStyleId = parts[parts.length - 1];
                const mapboxStyleUser = parts[parts.length - 2];

                const mapboxIntegrationUrl = `${mapboxBaseUrl}/styles/v1/${mapboxStyleUser}/${mapboxStyleId}/tiles/256/{z}/{x}/{y}@2x?access_token=${mapboxAccessToken}`;
                console.log('Integration URL: ', mapboxIntegrationUrl);

                return new TileLayer({
                    source: new XYZ({
                        url: mapboxIntegrationUrl,//"https://api.mapbox.com/styles/v1/ocha-rosea-1/cm2lidma900jq01r27rkxflo6/tiles/256/{z}/{x}/{y}@2x?access_token=xxxxxxx", // Replace with your Mapbox URL
                        attributions: '© <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>',
                    })
                });

            case "esri":

                return new TileLayer({
                    source: new XYZ({
                        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", // Esri World Imagery URL
                        attributions: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
                    })
                });

            default:
                return this.getDefaultBasemap(); // fallback to default basemap
        }

    }

    destroy() {
        //console.log('Basemap destroy');
    }

}