
import { Layer } from 'ol/layer.js';
import { FrameState } from 'ol/Map';
import { State } from 'ol/source/Source';
import { toLonLat, transformExtent } from 'ol/proj.js';
import { Extent } from 'ol/extent.js';
import { geoMercator} from 'd3-geo';
import { CircleLayerOptions, GeoJSONFeature } from './types';

export class CircleLayer extends Layer {

    private svg: any;
    private features: GeoJSONFeature[];
    public options: CircleLayerOptions;
    private selectedIds: powerbi.visuals.ISelectionId[] = []; // Track selected IDs
    private isActive: boolean = true;

    constructor(options: CircleLayerOptions) {
        super({ ...options, zIndex: options.zIndex || 10 });

        this.svg = options.svg;
        this.options = options;

        this.features = options.dataPoints?.map((d, index) => ({
            type: 'Feature',
            geometry: {
                type: 'Point',
                coordinates: [d.longitude, d.latitude],
            },
            properties: {
                tooltip: d.tooltip,
                selectionId: d.selectionId, // Store selection ID
            },
        })) || [];

        this.changed(); // Trigger re-render

    }

    getSourceState(): State {
        return 'ready';
    }

    setActive(active: boolean) {
        this.isActive = active;
        this.changed(); // Trigger re-render
    }

    render(frameState: FrameState) {
        if (!this.isActive) return;

        const width = frameState.size[0];
        const height = frameState.size[1];
        const resolution = frameState.viewState.resolution;
        const center = toLonLat(frameState.viewState.center, frameState.viewState.projection) as [number, number];

        this.svg.select('#circles-group').remove();
        this.svg.attr('width', width).attr('height', height);

        const scale = 6378137 / resolution;
        const d3Projection = geoMercator().scale(scale).center(center).translate([width / 2, height / 2]);

        const { circleSizeValues = [], circleOptions } = this.options;
        const { minRadius, color, layerOpacity, strokeColor, strokeWidth } = circleOptions;

        const minSize = Math.min(...circleSizeValues);
        const maxSize = Math.max(...circleSizeValues);
        const circleScale = (value: number) => minRadius +
            ((value - minSize) / (maxSize - minSize)) * (circleOptions.maxRadius - minRadius);

        const circlesGroup = this.svg.append('g').attr('id', 'circles-group');

        // Clickable background to clear selection
        const clickableRect = this.svg.selectAll('#clickable-bg').data([null]);
        clickableRect.enter()
            .append('rect')
            .attr('id', 'clickable-bg')
            .attr('width', '100%')
            .attr('height', '100%')
            .style('fill', 'transparent')
            .style('pointer-events', 'all')
            .on('click', (event: MouseEvent) => {
                this.options.selectionManager.clear().then(() => {
                    this.selectedIds = []; // Clear stored selections
                    this.changed(); // Trigger re-render to update opacity
                });
                //event.stopPropagation();
            });

        this.features.forEach((feature: GeoJSONFeature, i: number) => {
            if (!feature.geometry || feature.geometry.type !== 'Point') return;

            const [lon, lat] = feature.geometry.coordinates;
            const projected = d3Projection([lon, lat]);

            if (projected) {
                const [x, y] = projected;
                const radius = circleSizeValues[i] !== undefined ? circleScale(circleSizeValues[i]) : minRadius;

                const circle = circlesGroup.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radius)
                    .attr('fill', color)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth)
                    .datum(feature.properties.selectionId)
                    .style('cursor', 'pointer')
                    .style('pointer-events', 'all')
                    .attr('fill-opacity', (d: any) => { // Set opacity based on selection
                        if (this.selectedIds.length === 0) {
                            return layerOpacity;
                        } else {
                            return this.selectedIds.some(selectedId => selectedId.equals(d)) ? layerOpacity : layerOpacity/2; // Dim unselected circles
                        }
                    });

                if (feature.properties.tooltip) {
                    this.options.tooltipServiceWrapper.addTooltip(
                        circle,
                        () => feature.properties.tooltip,
                        () => feature.properties.selectionId,
                        true
                    );
                }

                circle.on('click', (event: MouseEvent) => {
                    const selectionId = feature.properties.selectionId;
                    const nativeEvent = event;

                    this.options.selectionManager.select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                        .then((selectedIds:powerbi.visuals.ISelectionId[]) => {
                            this.selectedIds = selectedIds; // Update selected IDs
                            console.log('Selected IDs:', this.selectedIds);
                            this.changed(); // Trigger re-render to apply new opacity
                        });
                    //event.stopPropagation();
                });
            }
        });

        // Reorder groups if necessary
        const choroplethGroupNode = this.svg.select('#choropleth-group').node();
        const circlesGroupNode = circlesGroup.node();
        if (choroplethGroupNode && circlesGroupNode) {
            choroplethGroupNode.parentNode.appendChild(circlesGroupNode);
        }

        this.options.svgContainer.appendChild(this.svg.node());
        return this.options.svgContainer;
    }
    

    // Expose SVG for external handlers
    getSvg() {
        return this.svg;
    }

    // Get the spatial extent of the features (circle or choropleth)
    getFeaturesExtent(): Extent {

        // Calculate extent for circle features
        const options = this.options as CircleLayerOptions;
        return this.calculateCirclesExtent(options.longitudes, options.latitudes);

    }

    // Calculate extent for circle features
    private calculateCirclesExtent(longitudes: number[], latitudes: number[]): Extent {
        if (longitudes.length === 0 || latitudes.length === 0) {
            console.warn('Longitude and latitude arrays must not be empty.');
        }

        if (longitudes.length !== latitudes.length) {
            console.warn('Longitude and latitude arrays must have the same length.');
        }

        const minX = Math.min(...longitudes);
        const maxX = Math.max(...longitudes);
        const minY = Math.min(...latitudes);
        const maxY = Math.max(...latitudes);

        const extent = [minX, minY, maxX, maxY];
        return transformExtent(extent, 'EPSG:4326', 'EPSG:3857'); // Transform to map projection
    }

}