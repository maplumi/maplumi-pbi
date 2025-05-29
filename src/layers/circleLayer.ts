import { Layer } from 'ol/layer.js';
import { FrameState } from 'ol/Map';
import { State } from 'ol/source/Source';
import { toLonLat, transformExtent } from 'ol/proj.js';
import { Extent } from 'ol/extent.js';
import { geoMercator } from 'd3-geo';
import { CircleLayerOptions, GeoJSONFeature } from '../types/index';

export class CircleLayer extends Layer {

    private svg: any;
    private features: GeoJSONFeature[];
    public options: CircleLayerOptions;
    private selectedIds: powerbi.extensibility.ISelectionId[] = [];
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
                selectionId: d.selectionId
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

        this.svg.select('#circles-group-1').remove();
        this.svg.select('#circles-group-2').remove();
        this.svg.attr('width', width).attr('height', height);

        const scale = 6378137 / resolution;
        const d3Projection = geoMercator().scale(scale).center(center).translate([width / 2, height / 2]);

        const { combinedCircleSizeValues = [], circle1SizeValues = [], circle2SizeValues = [], circleOptions } = this.options;
        const { minRadius, color1, color2, layer1Opacity, layer2Opacity, strokeColor, strokeWidth } = circleOptions;

        const minSize = Math.min(...combinedCircleSizeValues);
        const maxSize = Math.max(...combinedCircleSizeValues);
        const circleScale = (value: number) => minRadius +
            ((value - minSize) / (maxSize - minSize)) * (circleOptions.maxRadius - minRadius);

        const circles1Group = this.svg.append('g').attr('id', 'circles-group-1');
        const circles2Group = this.svg.append('g').attr('id', 'circles-group-2');

        this.features.forEach((feature: GeoJSONFeature, i: number) => {
            if (!feature.geometry || feature.geometry.type !== 'Point') return;

            const [lon, lat] = feature.geometry.coordinates;
            const projected = d3Projection([lon, lat]);

            if (projected) {
                const [x, y] = projected;
                const radius1 = circle1SizeValues[i] !== undefined ? circleScale(circle1SizeValues[i]) : minRadius;
                const radius2 = circle2SizeValues[i] !== undefined ? circleScale(circle2SizeValues[i]) : minRadius;

                // Draw circles in circles1Group
                const circle1 = circles1Group.append('circle')
                    .attr('cx', x)
                    .attr('cy', y)
                    .attr('r', radius1)
                    .attr('fill', color1)
                    .attr('stroke', strokeColor)
                    .attr('stroke-width', strokeWidth)
                    .datum(feature.properties.selectionId)
                    .style('cursor', 'pointer')
                    .style('pointer-events', 'all')
                    .attr('fill-opacity', (d: any) => { // Set opacity based on selection
                        if (this.selectedIds.length === 0) {
                            return layer1Opacity;
                        } else {
                            return this.selectedIds.some(selectedId => 
                                selectedId === d) ? layer1Opacity : layer1Opacity / 2; // Dim unselected circles
                        }
                    });


                if (feature.properties.tooltip) {
                    this.options.tooltipServiceWrapper.addTooltip(
                        circle1,
                        () => feature.properties.tooltip,
                        () => feature.properties.selectionId,
                        true
                    );

                }

                circle1.on('click', (event: MouseEvent) => {
                    const selectionId = feature.properties.selectionId;
                    const nativeEvent = event;

                    this.options.selectionManager.select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                        .then((selectedIds: powerbi.extensibility.ISelectionId[]) => {
                            this.selectedIds = selectedIds; // Update selected IDs
                            console.log('Selected IDs:', this.selectedIds);
                            this.changed(); // Trigger re-render to apply new opacity
                        });
                    //event.stopPropagation();
                });

                if (circle2SizeValues.length > 0) {

                    // Draw circles in circles2Group
                    const circle2 = circles2Group.append('circle')
                        .attr('cx', x)
                        .attr('cy', y)
                        .attr('r', radius2)
                        .attr('fill', color2)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth)
                        .datum(feature.properties.selectionId)
                        .style('cursor', 'pointer')
                        .style('pointer-events', 'all')
                        .attr('fill-opacity', (d: any) => { // Set opacity based on selection
                            if (this.selectedIds.length === 0) {
                                return layer2Opacity;
                            } else {
                                return this.selectedIds.some(selectedId => 
                                    selectedId === d) ? layer2Opacity : layer2Opacity / 2; // Dim unselected circles
                            }
                        });


                    if (feature.properties.tooltip) {


                        this.options.tooltipServiceWrapper.addTooltip(
                            circle2,
                            () => feature.properties.tooltip,
                            () => feature.properties.selectionId,
                            true
                        );
                    }


                    circle2.on('click', (event: MouseEvent) => {
                        const selectionId = feature.properties.selectionId;
                        const nativeEvent = event;

                        this.options.selectionManager.select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                            .then((selectedIds: powerbi.extensibility.ISelectionId[]) => {
                                this.selectedIds = selectedIds; // Update selected IDs
                                console.log('Selected IDs:', this.selectedIds);
                                this.changed(); // Trigger re-render to apply new opacity
                            });
                        //event.stopPropagation();
                    });

                }


            }
        });

        // Reorder groups to ensure circles are above choropleth
        const choroplethGroupNode = this.svg.select('#choropleth-group').node();
        const circles1GroupNode = circles1Group.node();
        const circles2GroupNode = circles2Group.node();

        if (choroplethGroupNode && circles1GroupNode && circles2GroupNode) {
            choroplethGroupNode.parentNode.appendChild(circles1GroupNode);
            choroplethGroupNode.parentNode.appendChild(circles2GroupNode);
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

    setSelectedIds(selectionIds: powerbi.extensibility.ISelectionId[]) {
        this.selectedIds = selectionIds;
    }

}