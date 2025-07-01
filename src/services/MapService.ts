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
import { defaults as defaultInteractions } from 'ol/interaction';


export class MapService {
    private map: Map;
    private state: MapState;
    private container: HTMLElement;
    private attributionControl: MaplyticsAttributionControl;
    private showZoomControl: boolean;
    private zoomControlManager: ZoomControlManager;
    private host: any; // Add host property for debugging
    private view: View;

    constructor(container: HTMLElement, showZoomControl: boolean = true, host?: any) {

        this.container = container;
        this.showZoomControl = showZoomControl;
        this.host = host;
        this.view = new View({
            center: fromLonLat(VisualConfig.MAP.DEFAULT_CENTER),
            zoom: VisualConfig.MAP.DEFAULT_ZOOM
        });
        this.initializeMap();
        this.zoomControlManager = new ZoomControlManager(this.map);
        this.setZoomControlVisible(this.showZoomControl);
        
    }

    private initializeMap(): void {
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
            view: this.view,
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

    /**
     * Locks the map extent to the given bounding box and sets center/zoom, constraining zoom/pan within the extent.
     * @param extent [minX, minY, maxX, maxY] in map projection
     * @param center Center coordinate in map projection (optional)
     * @param zoom Zoom level (optional)
     */
    public lockExtent(extent: [number, number, number, number], center?: [number, number], zoom?: number) {
        if (this.view) {
            // Set extent
            //this.view.setProperties({ extent });
            // Calculate minZoom that fits the extent
            const size = this.map.getSize();
            if (size) {
                const resolution = this.view.getResolutionForExtent(extent, size);
                if (resolution) {
                    const minZoom = this.view.getZoomForResolution(resolution);
                    // Always set minZoom to the provided zoom if available
                    if (typeof zoom === 'number') {
                        this.view.setMinZoom(zoom);
                    } else {
                        this.view.setMinZoom(minZoom);
                    }
                }
            }
            // Set maxZoom to provided zoom or current
            if (typeof zoom === 'number') {
                this.view.setMaxZoom(zoom);
                this.view.setZoom(zoom);
            } else {
                this.view.setMaxZoom(this.view.getZoom());
            }
            // Set center if provided
            if (center) {
                this.view.setCenter(center);
            }

            this.setState({
            extent: extent,
            zoom: typeof zoom === 'number' ? zoom : this.view.getZoom()
        });
        }
    }

    /**
     * Unlocks the map extent and zoom, resetting the view to the default center and zoom level.
     */
    public unlockExtent() {
       
        this.view.setCenter(fromLonLat(VisualConfig.MAP.DEFAULT_CENTER));
        this.view.setZoom(VisualConfig.MAP.DEFAULT_ZOOM);
        this.view.setProperties({ minZoom: 0, maxZoom: 28 });
    }
}