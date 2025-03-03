import Map from "ol/Map";
import { CircleLayer } from "../circleLayer";
import { ChoroplethLayer } from "../choroplethLayer";
import { CircleLayerOptions, ChoroplethLayerOptions } from "../types/index";
import { LegendService } from "./LegendService";
import { MapConfig } from "../config/MapConfig";

export class LayerService {
    private map: Map;
    private circleLayer: CircleLayer | null;
    private choroplethLayer: ChoroplethLayer | null;
    private legendService: LegendService;
    private mapExtent: number[] | null;

    constructor(map: Map, legendService: LegendService) {
        this.map = map;
        this.legendService = legendService;
        this.circleLayer = null;
        this.choroplethLayer = null;
        this.mapExtent = null;
    }

    public updateCircleLayer(options: CircleLayerOptions): void {
        this.cleanupLayer('circle');

        if (!options) return;

        this.circleLayer = new CircleLayer(options);
        this.map.addLayer(this.circleLayer);

        if (!this.choroplethLayer) {
            this.mapExtent = this.circleLayer.getFeaturesExtent();
            this.fitMapToExtent();
        }

        if (options.circleOptions.showLegend) {
            this.updateCircleLegend(options);
        }
    }

    public updateChoroplethLayer(options: ChoroplethLayerOptions): void {
        this.cleanupLayer('choropleth');

        if (!options) return;

        this.choroplethLayer = new ChoroplethLayer(options);
        this.map.addLayer(this.choroplethLayer);

        this.mapExtent = this.choroplethLayer.getFeaturesExtent();
        this.fitMapToExtent();

        // Update legend if needed
        // Implementation needed based on your choropleth legend logic
    }

    private updateCircleLegend(options: CircleLayerOptions): void {
        const { combinedCircleSizeValues, circleScale, circleOptions } = options;
        
        if (combinedCircleSizeValues?.length > 0 && circleScale) {
            const radii = combinedCircleSizeValues.map(
                value => circleOptions.minRadius + (value - Math.min(...combinedCircleSizeValues)) * circleScale
            );

            this.legendService.createProportionalCircleLegend(
                combinedCircleSizeValues,
                radii,
                2, // Number of circle layers
                circleOptions
            );

            this.legendService.showLegend('circle');
        }
    }

    private fitMapToExtent(): void {
        if (this.mapExtent) {
            this.map.getView().fit(this.mapExtent, {
                padding: [20, 20, 20, 20],
                duration: 1000
            });
        }
    }

    public cleanup(): void {
        this.cleanupLayer('circle');
        this.cleanupLayer('choropleth');
        this.mapExtent = null;
    }

    private cleanupLayer(layerType: 'circle' | 'choropleth'): void {
        if (layerType === 'circle' && this.circleLayer) {
            this.legendService.clearContainer(this.legendService.getCircleLegendContainer());
            this.map.removeLayer(this.circleLayer);
            this.circleLayer.setActive(false);
            this.circleLayer = null;
        } else if (layerType === 'choropleth' && this.choroplethLayer) {
            this.legendService.clearContainer(this.legendService.getChoroplethLegendContainer());
            this.map.removeLayer(this.choroplethLayer);
            this.choroplethLayer.setActive(false);
            this.choroplethLayer = null;
        }
    }

    public getMapExtent(): number[] | null {
        return this.mapExtent;
    }
} 