import { Layer } from 'ol/layer.js';
import { FrameState } from 'ol/Map';
import { State } from 'ol/source/Source';
import { transformExtent } from 'ol/proj.js';
import { Extent } from 'ol/extent.js';
import { arc as d3Arc } from 'd3-shape';
import { CircleLayerOptions, GeoJSONFeature } from '../types/index';
import { DomIds } from "../constants/strings";
import { createWebMercatorProjection } from "../utils/map";
import { reorderForCirclesAboveChoropleth, selectionOpacity, setSvgSize } from "../utils/graphics";

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

    this.svg.select(`#${DomIds.CirclesGroup1}`).remove();
    this.svg.select(`#${DomIds.CirclesGroup2}`).remove();
    setSvgSize(this.svg, width, height);

    const d3Projection = createWebMercatorProjection(frameState, width, height);

        const { combinedCircleSizeValues = [], circle1SizeValues = [], circle2SizeValues = [], circleOptions, minCircleSizeValue = 0, maxCircleSizeValue = 100, circleScale: scaleFactor = 1 } = this.options;
        const { minRadius, color1, color2, layer1Opacity, layer2Opacity, strokeColor, strokeWidth, chartType } = circleOptions;

        // For donut/pie charts, we need to include the totals in our scaling calculations
        const allRelevantValues = [...combinedCircleSizeValues];
        if (chartType === 'donut-chart' || chartType === 'pie-chart') {
            // Add the totals of both values for each data point to our scaling context
            for (let i = 0; i < Math.min(circle1SizeValues.length, circle2SizeValues.length); i++) {
                if (circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
                    allRelevantValues.push(circle1SizeValues[i] + circle2SizeValues[i]);
                }
            }
        }

        const circleScale = (value: number) => {
            // Use adaptive scaling logic consistent with visual.ts, but with all relevant values
            return this.applyAdaptiveScaling(value, minCircleSizeValue, maxCircleSizeValue, scaleFactor, circleOptions, allRelevantValues);
        };

    const circles1Group = this.svg.append('g').attr('id', DomIds.CirclesGroup1);
    const circles2Group = this.svg.append('g').attr('id', DomIds.CirclesGroup2);

        this.features.forEach((feature: GeoJSONFeature, i: number) => {
            if (!feature.geometry || feature.geometry.type !== 'Point') return;

            const [lon, lat] = feature.geometry.coordinates;
            const projected = d3Projection([lon, lat]);

            if (projected) {
                const [x, y] = projected;
                const radius1 = circle1SizeValues[i] !== undefined ? circleScale(circle1SizeValues[i]) : minRadius;
                const radius2 = circle2SizeValues[i] !== undefined ? circleScale(circle2SizeValues[i]) : minRadius;

                // Chart rendering options
                if (chartType === 'donut-chart' && circle2SizeValues.length > 0 && circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
                    // Draw donut chart at (x, y)
                    const value1 = circle1SizeValues[i];
                    const value2 = circle2SizeValues[i];
                    const total = value1 + value2;
                    // Use the total of both values to determine the outer radius
                    const outerRadius = circleScale(total);
                    const innerRadius = Math.max(outerRadius * 0.6, 1); // 60% of outer radius, min 1px
                    const arcGen = d3Arc();

                    // First arc (value1)
                    const arc1 = circles2Group.append('path')
                        .attr('d', arcGen({
                            innerRadius,
                            outerRadius,
                            startAngle: 0,
                            endAngle: (value1 / total) * 2 * Math.PI
                        }))
                        .attr('fill', color1)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth)
                        .attr('transform', `translate(${x},${y})`)
                        .datum(feature.properties.selectionId)
                        .style('cursor', 'pointer')
                        .style('pointer-events', 'all')
                        .attr('fill-opacity', (d: any) => selectionOpacity(this.selectedIds, d, layer1Opacity));

                    // Second arc (value2)
                    const arc2 = circles2Group.append('path')
                        .attr('d', arcGen({
                            innerRadius,
                            outerRadius,
                            startAngle: (value1 / total) * 2 * Math.PI,
                            endAngle: 2 * Math.PI
                        }))
                        .attr('fill', color2)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth)
                        .attr('transform', `translate(${x},${y})`)
                        .datum(feature.properties.selectionId)
                        .style('cursor', 'pointer')
                        .style('pointer-events', 'all')
                        .attr('fill-opacity', (d: any) => selectionOpacity(this.selectedIds, d, layer2Opacity));

                    // Tooltip for donut
                    if (feature.properties.tooltip) {
                        this.options.tooltipServiceWrapper.addTooltip(
                            arc1,
                            () => feature.properties.tooltip,
                            () => feature.properties.selectionId,
                            true
                        );
                        this.options.tooltipServiceWrapper.addTooltip(
                            arc2,
                            () => feature.properties.tooltip,
                            () => feature.properties.selectionId,
                            true
                        );
                    }

                    // Click for donut arcs
                    [arc1, arc2].forEach(arcElem => {
                        arcElem.on('click', (event: MouseEvent) => {
                            const selectionId = feature.properties.selectionId;
                            const nativeEvent = event;
                            this.options.selectionManager.select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                                .then((selectedIds: powerbi.extensibility.ISelectionId[]) => {
                                    this.selectedIds = selectedIds;
                                    // Selection updated; trigger re-render
                                    this.changed();
                                });
                        });
                    });
                } else if (chartType === 'pie-chart' && circle2SizeValues.length > 0 && circle1SizeValues[i] !== undefined && circle2SizeValues[i] !== undefined) {
                    // Draw pie chart at (x, y)
                    const value1 = circle1SizeValues[i];
                    const value2 = circle2SizeValues[i];
                    const total = value1 + value2;
                    // Use the total of both values to determine the outer radius
                    const outerRadius = circleScale(total);
                    const innerRadius = 0; // Pie chart is a full disk
                    const arcGen = d3Arc();

                    // First arc (value1)
                    const arc1 = circles2Group.append('path')
                        .attr('d', arcGen({
                            innerRadius,
                            outerRadius,
                            startAngle: 0,
                            endAngle: (value1 / total) * 2 * Math.PI
                        }))
                        .attr('fill', color1)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth)
                        .attr('transform', `translate(${x},${y})`)
                        .datum(feature.properties.selectionId)
                        .style('cursor', 'pointer')
                        .style('pointer-events', 'all')
                        .attr('fill-opacity', (d: any) => {
                            if (this.selectedIds.length === 0) {
                                return layer1Opacity;
                            } else {
                                return this.selectedIds.some(selectedId => selectedId === d) ? layer1Opacity : layer1Opacity / 2;
                            }
                        });

                    // Second arc (value2)
                    const arc2 = circles2Group.append('path')
                        .attr('d', arcGen({
                            innerRadius,
                            outerRadius,
                            startAngle: (value1 / total) * 2 * Math.PI,
                            endAngle: 2 * Math.PI
                        }))
                        .attr('fill', color2)
                        .attr('stroke', strokeColor)
                        .attr('stroke-width', strokeWidth)
                        .attr('transform', `translate(${x},${y})`)
                        .datum(feature.properties.selectionId)
                        .style('cursor', 'pointer')
                        .style('pointer-events', 'all')
                        .attr('fill-opacity', (d: any) => {
                            if (this.selectedIds.length === 0) {
                                return layer2Opacity;
                            } else {
                                return this.selectedIds.some(selectedId => selectedId === d) ? layer2Opacity : layer2Opacity / 2;
                            }
                        });

                    // Tooltip for pie
                    if (feature.properties.tooltip) {
                        this.options.tooltipServiceWrapper.addTooltip(
                            arc1,
                            () => feature.properties.tooltip,
                            () => feature.properties.selectionId,
                            true
                        );
                        this.options.tooltipServiceWrapper.addTooltip(
                            arc2,
                            () => feature.properties.tooltip,
                            () => feature.properties.selectionId,
                            true
                        );
                    }

                    // Click for pie arcs
                    [arc1, arc2].forEach(arcElem => {
                        arcElem.on('click', (event: MouseEvent) => {
                            const selectionId = feature.properties.selectionId;
                            const nativeEvent = event;
                            this.options.selectionManager.select(selectionId, nativeEvent.ctrlKey || nativeEvent.metaKey)
                                .then((selectedIds: powerbi.extensibility.ISelectionId[]) => {
                                    this.selectedIds = selectedIds;
                                    // Selection updated; trigger re-render
                                    this.changed();
                                });
                        });
                    });
                } else {                   
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
                        .attr('fill-opacity', (d: any) => selectionOpacity(this.selectedIds, d, layer1Opacity));

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
                                // Selection updated; trigger re-render
                                this.changed(); // Trigger re-render to apply new opacity
                            });
                    });

                    if (circle2SizeValues.length > 0) {
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
                            .attr('fill-opacity', (d: any) => selectionOpacity(this.selectedIds, d, layer2Opacity));

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
                                    // Selection updated; trigger re-render
                                    this.changed(); // Trigger re-render to apply new opacity
                                });
                        });
                    }
                }
            }
        });

        // Reorder groups to ensure circles are above choropleth
    reorderForCirclesAboveChoropleth(this.svg);

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

    // Adaptive scaling method that matches the logic in visual.ts
    private applyAdaptiveScaling(value: number, minValue: number, maxValue: number, scaleFactor: number, circleOptions: any, allDataValues: number[]): number {
        // Handle adaptive scaling for outliers - same logic as visual.ts
        // When adaptive scaling is active, maxValue represents the 95th percentile
        // Values beyond this should get additional radius scaling
        
        if (value > maxValue && allDataValues && allDataValues.length > 0) {
            const actualMax = Math.max(...allDataValues);
            
            if (actualMax > maxValue) {
                // We're in adaptive scaling mode - apply outlier scaling for values beyond 95th percentile
                const outlierRange = actualMax - maxValue;
                
                if (outlierRange > 0) {
                    const outlierPosition = Math.min((value - maxValue) / outlierRange, 1); // 0-1 position in outlier range
                    
                    // Calculate radius at the 95th percentile (maxValue)
                    const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
                    const p95Radius = Math.sqrt(minRadiusSquared + (maxValue - minValue) * scaleFactor);
                    
                    // Apply compressed outlier scaling beyond 95th percentile
                    // Use 80% of remaining radius space for outliers (increased from 60%)
                    const remainingRadiusSpace = circleOptions.maxRadius - p95Radius;
                    const maxOutlierBonus = remainingRadiusSpace * 0.8;
                    const outlierRadiusBonus = maxOutlierBonus * outlierPosition;
                    
                    const finalRadius = Math.min(p95Radius + outlierRadiusBonus, circleOptions.maxRadius);
                    
                    // Debug logging for outlier scaling
                    // Outlier scaling applied
                    
                    return finalRadius;
                }
            }
        }
        
        // Standard scaling for values within normal range (5th percentile to 95th percentile)
        const clampedValue = Math.max(minValue, Math.min(value, maxValue));
        
        // Use square-root scaling (area scales linearly with data values)
        const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
        const scaledAreaSquared = minRadiusSquared + (clampedValue - minValue) * scaleFactor;
        return Math.sqrt(scaledAreaSquared);
    }

}