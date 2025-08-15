"use strict";

import * as d3 from "d3";
import Map from "ol/Map";
import powerbi from "powerbi-visuals-api";
import { ITooltipServiceWrapper } from "powerbi-visuals-utils-tooltiputils";
import { LegendService } from "../services/LegendService";
import { VisualConfig } from "../config/VisualConfig";
import { MessageService } from "../services/MessageService";

import ISelectionManager = powerbi.extensibility.ISelectionManager;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;

export abstract class BaseOrchestrator {
    protected svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
    protected svgOverlay: SVGSVGElement;
    protected svgContainer: HTMLElement;
    protected legendService: LegendService;
    protected host: IVisualHost;
    protected map: Map;
    protected selectionManager: ISelectionManager;
    protected tooltipServiceWrapper: ITooltipServiceWrapper;
    protected messages: MessageService;

    constructor(args: {
        svg: d3.Selection<SVGElement, unknown, HTMLElement, any>;
        svgOverlay: SVGSVGElement;
        svgContainer: HTMLElement;
        legendService: LegendService;
        host: IVisualHost;
        map: Map;
        selectionManager: ISelectionManager;
        tooltipServiceWrapper: ITooltipServiceWrapper;
    }) {
        this.svg = args.svg;
        this.svgOverlay = args.svgOverlay;
        this.svgContainer = args.svgContainer;
        this.legendService = args.legendService;
        this.host = args.host;
        this.map = args.map;
        this.selectionManager = args.selectionManager;
        this.tooltipServiceWrapper = args.tooltipServiceWrapper;
        this.messages = new MessageService(this.host);
    }

    protected clearGroup(groupId: string) {
        const group = this.svg.select(groupId);
        group.selectAll("*").remove();
    }

    protected removeLayerIfPresent(layer: { dispose?: () => void } | undefined, remover: (layer: any) => void) {
        if (layer) {
            try { remover(layer); } catch {}
        }
    }

    protected fitExtentIfUnlocked(extent: number[] | undefined, lockMapExtent: boolean | undefined) {
        if (!lockMapExtent && extent) {
            this.map.getView().fit(extent, VisualConfig.MAP.FIT_OPTIONS);
        }
    }
}
