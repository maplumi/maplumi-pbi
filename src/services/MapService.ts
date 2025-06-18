import Map from "ol/Map";
import View from "ol/View";
import { fromLonLat } from "ol/proj";
import { defaults as defaultControls } from "ol/control";
import { VisualConfig } from "../config/VisualConfig";
import { MapState } from "../types/index";
import { MaplyticsAttributionControl } from "../utils/attribution";
import TileLayer from "ol/layer/Tile";
import { MapboxVectorLayer } from "ol-mapbox-style";
import { BasemapOptions } from "../types/index";
import OSM from "ol/source/OSM";
import TileJSON from "ol/source/TileJSON";
import Tile from "ol/layer/Tile";
import VectorTileSource from "ol/source/VectorTile";
import VectorTileLayer from "ol/layer/VectorTile";
import Zoom from "ol/control/Zoom";
import { ZoomControlManager } from "./ZoomControlManager";


export class MapService {
    private map: Map;
    private state: MapState;
    private container: HTMLElement;
    private attributionControl: MaplyticsAttributionControl;
    private showZoomControl: boolean;
    private zoomControlManager: ZoomControlManager;
    private host: any; // Add host property for debugging

    constructor(container: HTMLElement, showZoomControl: boolean = true, host?: any) {
        this.container = container;
        this.showZoomControl = showZoomControl;
        this.host = host;
        this.initializeMap();
        this.zoomControlManager = new ZoomControlManager(this.map);
        this.setZoomControlVisible(this.showZoomControl);
        // if (this.host && this.host.displayWarningIcon) {
        //     this.host.displayWarningIcon("MapService", `MapService constructed. showZoomControl: ${showZoomControl}`);
        // }
    }

    private initializeMap(): void {
        const view = new View({
            center: fromLonLat(VisualConfig.MAP.DEFAULT_CENTER),
            zoom: VisualConfig.MAP.DEFAULT_ZOOM
        });

        const controls = defaultControls({
            zoom: false, // Disable default zoom control
            attribution: false,
            attributionOptions: {
                collapsible: false, // Keep the attribution always visible
            },
        });

        this.map = new Map({
            target: this.container,
            layers: [],
            view: view,
            controls: controls
        });

        this.state = {
            basemapType: "",
            attribution: "",
            mapboxStyle: "",
            maptilerStyle: "",
            view: null,
            extent: null,
            zoom: null,
            interactions: controls
        };
    }

    public updateBasemap(options: any): void {
        const { selectedBasemap, customMapAttribution } = options;

        // Get default attribution
        const defaultAttribution = VisualConfig.BASEMAP.DEFAULT_ATTRIBUTION[selectedBasemap] || "";

        // Compute effective attribution
        const newAttribution = customMapAttribution
            ? `${customMapAttribution} ${defaultAttribution}`
            : defaultAttribution;

        // Check if update is needed
        if (
            selectedBasemap === this.state.basemapType &&
            newAttribution === this.state.attribution &&
            options.mapboxStyle === this.state.mapboxStyle &&
            options.maptilerStyle === this.state.maptilerStyle
        ) {
            return;
        }

        // Update state
        this.state.basemapType = selectedBasemap;
        this.state.attribution = newAttribution;
        this.state.mapboxStyle = options.mapboxStyle;
        this.state.maptilerStyle = options.maptilerStyle;

        // Update attribution control
        if (this.attributionControl) {
            this.map.removeControl(this.attributionControl);
        }
        this.attributionControl = new MaplyticsAttributionControl({ attribution: newAttribution });
        this.map.addControl(this.attributionControl);

        // Update basemap layer
        // Note: Implementation of getBasemap would need to be added
        const newLayer = this.getBasemap(options);
        if (newLayer) {
            newLayer.getSource()?.setAttributions(newAttribution);
            this.map.getLayers().setAt(0, newLayer);
        }
    }

    public getMap(): Map {
        return this.map;
    }

    public getState(): MapState {
        return this.state;
    }

    public setState(newState: Partial<MapState>): void {
        this.state = { ...this.state, ...newState };
    }

    public destroy(): void {
        if (this.map) {
            this.map.setTarget(null);
        }
    }

    public setZoomControlVisible(visible: boolean) {
        if (this.host && this.host.displayWarningIcon) {
            this.host.displayWarningIcon("ZoomControl", `setZoomControlVisible called with: ${visible}`);
        }
        this.zoomControlManager.setZoomControlVisible(visible);
        this.showZoomControl = visible;
    }

    private getBasemap(basemapOptions: BasemapOptions): TileLayer | MapboxVectorLayer | VectorTileLayer {

        switch (basemapOptions.selectedBasemap) {
            case 'openstreetmap':
                return this.getDefaultBasemap();
            case 'mapbox':
                return this.getMapboxBasemap(basemapOptions);
            case 'maptiler':
                return this.getMaptilerBasemap(basemapOptions);
            case 'none':
                return new TileLayer({
                    source: null, // No source, so it remains empty
                    visible: false
                });
            default:
                return this.getDefaultBasemap(); // fallback to default basemap
        }

    }


    private getDefaultBasemap = (): TileLayer => {
        return new TileLayer({
            source: new OSM() // Default basemap source
        })
    };

    private getMapboxBasemap = (basemapOptions: BasemapOptions): MapboxVectorLayer => {
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

    private getMaptilerBasemap = (basemapOptions: BasemapOptions): TileLayer | VectorTileLayer | MapboxVectorLayer => {

        const url = `${VisualConfig.MAP_BASE_URL.MAPTILER}/${basemapOptions.maptilerStyle}/tiles.json?key=${basemapOptions.maptilerApiKey}`;

        return new Tile({
            source: new TileJSON({
                url: url,
                crossOrigin: "anonymous"
            })
        });

    };

}