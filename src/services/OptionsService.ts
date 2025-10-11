"use strict";

import { MaplumiVisualFormattingSettingsModel } from "../settings";
import { BasemapOptions, ChoroplethOptions, CircleOptions, MapToolsOptions } from "../types";

export class OptionsService {
    private static toString(value: unknown, trim: boolean = false): string {
        if (value === null || value === undefined) {
            return "";
        }
        const asString = typeof value === "string" ? value : String(value);
        return trim ? asString.trim() : asString;
    }

    private static preferCredential(overrideValue: unknown, fallbackValue: unknown): string {
        const override = this.toString(overrideValue, true);
        if (override.length > 0) {
            return override;
        }
        return this.toString(fallbackValue, true);
    }

    static getBasemapOptions(
        model: MaplumiVisualFormattingSettingsModel,
        overrides?: Partial<Pick<BasemapOptions, "mapboxAccessToken" | "maptilerApiKey">>
    ): BasemapOptions {
        const basemapSettings = model.BasemapVisualCardSettings;
        return {
            selectedBasemap: this.toString(basemapSettings.basemapSelectSettingsGroup.selectedBasemap.value?.value, true),
            customMapAttribution: this.toString(basemapSettings.basemapSelectSettingsGroup.customMapAttribution.value, true),
            mapboxCustomStyleUrl: this.toString(basemapSettings.mapBoxSettingsGroup.mapboxCustomStyleUrl.value, true),
            mapboxStyle: this.toString(basemapSettings.mapBoxSettingsGroup.mapboxStyle.value?.value, true),
            mapboxAccessToken: this.preferCredential(overrides?.mapboxAccessToken, basemapSettings.mapBoxSettingsGroup.mapboxAccessToken.value),
            declutterLabels: !!basemapSettings.mapBoxSettingsGroup.declutterLabels.value,
            maptilerApiKey: this.preferCredential(overrides?.maptilerApiKey, basemapSettings.maptilerSettingsGroup.maptilerApiKey.value),
            maptilerStyle: this.toString(basemapSettings.maptilerSettingsGroup.maptilerStyle.value?.value, true)
        };
    }

    static getMapToolsOptions(model: MaplumiVisualFormattingSettingsModel): MapToolsOptions {
        const maptoolsSettings = model.mapControlsVisualCardSettings;
        return {
            renderEngine: maptoolsSettings.mapToolsSettingsGroup.renderEngine.value.value as any,
            lockMapExtent: maptoolsSettings.mapToolsSettingsGroup.lockMapExtent.value,
            showZoomControl: maptoolsSettings.mapToolsSettingsGroup.showZoomControl.value,
            lockedMapExtent: maptoolsSettings.mapToolsSettingsGroup.lockedMapExtent.value,
            lockedMapZoom: maptoolsSettings.mapToolsSettingsGroup.lockedMapZoom.value,
            legendPosition: maptoolsSettings.legendContainerSettingsGroup.legendPosition.value.value.toString(),
            legendBorderWidth: maptoolsSettings.legendContainerSettingsGroup.legendBorderWidth.value,
            legendBorderColor: maptoolsSettings.legendContainerSettingsGroup.legendBorderColor.value.value,
            legendBackgroundColor: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundColor.value.value,
            legendBackgroundOpacity: maptoolsSettings.legendContainerSettingsGroup.legendBackgroundOpacity.value / 100,
            legendBorderRadius: maptoolsSettings.legendContainerSettingsGroup.legendBorderRadius.value,
            legendBottomMargin: maptoolsSettings.legendContainerSettingsGroup.legendBottomMargin.value,
            legendTopMargin: maptoolsSettings.legendContainerSettingsGroup.legendTopMargin.value,
            legendLeftMargin: maptoolsSettings.legendContainerSettingsGroup.legendLeftMargin.value,
            legendRightMargin: maptoolsSettings.legendContainerSettingsGroup.legendRightMargin.value
        };
    }

    static getCircleOptions(model: MaplumiVisualFormattingSettingsModel): CircleOptions {
        const circleSettings = model.ProportionalCirclesVisualCardSettings;
        return {
            layerControl: circleSettings.topLevelSlice.value,
            color1: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles1Color.value.value,
            color2: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles2Color.value.value,
            minRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMinimumRadius.value,
            maxRadius: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMaximumRadius.value,
            strokeColor: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeColor.value.value,
            strokeWidth: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesStrokeWidth.value,
            layer1Opacity: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles1LayerOpacity.value / 100,
            layer2Opacity: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCircles2LayerOpacity.value / 100,
            showLegend: circleSettings.proportionalCircleLegendSettingsGroup.showLegend.value,
            legendTitle: circleSettings.proportionalCircleLegendSettingsGroup.legendTitle.value,
            legendTitleColor: circleSettings.proportionalCircleLegendSettingsGroup.legendTitleColor.value.value,
            legendItemStrokeColor: circleSettings.proportionalCircleLegendSettingsGroup.legendItemStrokeColor.value.value,
            legendItemStrokeWidth: circleSettings.proportionalCircleLegendSettingsGroup.legendItemStrokeWidth.value,
            leaderLineStrokeWidth: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineStrokeWidth.value,
            leaderLineColor: circleSettings.proportionalCircleLegendSettingsGroup.leaderLineColor.value.value,
            labelTextColor: circleSettings.proportionalCircleLegendSettingsGroup.labelTextColor.value.value,
            roundOffLegendValues: circleSettings.proportionalCircleLegendSettingsGroup.roundOffLegendValues.value,
            hideMinIfBelowThreshold: circleSettings.proportionalCircleLegendSettingsGroup.hideMinIfBelowThreshold.value,
            minValueThreshold: circleSettings.proportionalCircleLegendSettingsGroup.minValueThreshold.value,
            minRadiusThreshold: circleSettings.proportalCirclesDisplaySettingsGroup.proportionalCirclesMinimumRadius.value,
            labelSpacing: circleSettings.proportionalCircleLegendSettingsGroup.labelSpacing.value,
            yPadding: circleSettings.proportionalCircleLegendSettingsGroup.yPadding.value,
            xPadding: circleSettings.proportionalCircleLegendSettingsGroup.xPadding.value,
            chartType: circleSettings.proportalCirclesDisplaySettingsGroup.chartType.value.value.toString(),
            scalingMethod: 'square-root'
        };
    }

    static getChoroplethOptions(model: MaplumiVisualFormattingSettingsModel): ChoroplethOptions {
        const choroplethSettings = model.ChoroplethVisualCardSettings;
        const choroplethDisplaySettings = choroplethSettings.choroplethDisplaySettingsGroup;
        const choroplethLocationSettings = choroplethSettings.choroplethLocationBoundarySettingsGroup;
        const choroplethClassificationSettings = choroplethSettings.choroplethClassificationSettingsGroup;
        const choroplethLegendSettings = choroplethSettings.choroplethLegendSettingsGroup;

        return {
            layerControl: choroplethSettings.topLevelSlice.value,
            boundaryDataSource: choroplethLocationSettings.boundaryDataSource.value.value.toString(),
            geoBoundariesReleaseType: choroplethLocationSettings.geoBoundariesReleaseType.value.value.toString(),
            geoBoundariesCountry: choroplethLocationSettings.geoBoundariesCountry.value.value.toString(),
            geoBoundariesSourceTag: choroplethLocationSettings.geoBoundariesSourceTag.value.value.toString(),
            geoBoundariesAdminLevel: choroplethLocationSettings.geoBoundariesAdminLevel.value.value.toString(),
            sourceFieldID: choroplethLocationSettings.boundaryDataSource.value.value === "custom"
                ? choroplethLocationSettings.customBoundaryIdField.value
                : choroplethLocationSettings.boundaryIdField.value.value.toString(),
            locationPcodeNameId: choroplethLocationSettings.boundaryDataSource.value.value === "custom"
                ? choroplethLocationSettings.customBoundaryIdField.value
                : choroplethLocationSettings.boundaryIdField.value.value.toString(),
            topoJSON_geoJSON_FileUrl: choroplethLocationSettings.topoJSON_geoJSON_FileUrl.value,
            invertColorRamp: choroplethDisplaySettings.invertColorRamp.value,
            colorMode: choroplethDisplaySettings.colorMode.value.value.toString(),
            colorRamp: choroplethDisplaySettings.colorRamp.value.value.toString(),
            customColorRamp: choroplethDisplaySettings.customColorRamp.value,
            classes: choroplethClassificationSettings.numClasses.value,
            classificationMethod: choroplethClassificationSettings.classificationMethod.value.value as import("../types").ClassificationMethod,
            strokeColor: choroplethDisplaySettings.strokeColor.value.value,
            strokeWidth: choroplethDisplaySettings.strokeWidth.value,
            layerOpacity: choroplethDisplaySettings.layerOpacity.value / 100,
            simplificationStrength: choroplethDisplaySettings.simplificationStrength.value,
            showLegend: choroplethLegendSettings.showLegend.value,
            legendTitle: choroplethLegendSettings.legendTitle.value,
            legendTitleAlignment: choroplethLegendSettings.legendTitleAlignment.value.value.toString(),
            legendOrientation: choroplethLegendSettings.legendOrientation.value.value as import("../types").LegendOrientation,
            legendLabelPosition: choroplethLegendSettings.legendLabelPosition.value.value as import("../types").LegendLabelPosition,
            legendTitleColor: choroplethLegendSettings.legendTitleColor.value.value,
            legendLabelsColor: choroplethLegendSettings.legendLabelsColor.value.value,
            legendItemMargin: choroplethLegendSettings.legendItemMargin.value,
        };
    }
}
