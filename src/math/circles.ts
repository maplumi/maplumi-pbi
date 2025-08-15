"use strict";

import { CircleOptions } from "../types";

export interface CircleScaleResult {
    minCircleSizeValue: number;
    maxCircleSizeValue: number;
    circleScale: number;
    selectedScalingMethod: string;
}

export function calculateCircleScale(
    combinedCircleSizeValues: number[],
    circleOptions: CircleOptions
): CircleScaleResult {
    const validValues = combinedCircleSizeValues.filter(v => !isNaN(v) && isFinite(v));
    if (validValues.length === 0) {
        return { minCircleSizeValue: 0, maxCircleSizeValue: 0, circleScale: 1, selectedScalingMethod: 'square-root' };
    }

    const sortedValues = [...validValues].sort((a, b) => a - b);
    const n = sortedValues.length;
    const percentile5 = sortedValues[Math.floor(n * 0.05)];
    const percentile95 = sortedValues[Math.floor(n * 0.95)];
    const actualMin = Math.min(...validValues);
    const actualMax = Math.max(...validValues);

    const percentileRange = percentile95 - percentile5;
    const outlierGap = actualMax - percentile95;
    const outlierGapRatio = percentileRange > 0 ? outlierGap / percentileRange : 0;

    let minCircleSizeValue: number;
    let maxCircleSizeValue: number;
    if (outlierGapRatio > 0.2 && percentileRange > 0.001) {
        minCircleSizeValue = percentile5;
        maxCircleSizeValue = percentile95;
    } else {
        minCircleSizeValue = percentile95 - percentile5 < 0.001 ? actualMin : percentile5;
        maxCircleSizeValue = percentile95 - percentile5 < 0.001 ? actualMax : percentile95;
    }

    let selectedScalingMethod = 'square-root';

    let circleScale: number;
    const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
    const maxRadiusSquared = circleOptions.maxRadius * circleOptions.maxRadius;
    if (maxCircleSizeValue === minCircleSizeValue) {
        circleScale = 1;
    } else {
        const isAdaptive = outlierGapRatio > 0.2 && percentileRange > 0.001;
        if (isAdaptive) {
            const p95AreaFraction = 0.8;
            const effectiveMaxRadiusSquared = minRadiusSquared + (maxRadiusSquared - minRadiusSquared) * p95AreaFraction;
            circleScale = (effectiveMaxRadiusSquared - minRadiusSquared) / (maxCircleSizeValue - minCircleSizeValue);
        } else {
            circleScale = (maxRadiusSquared - minRadiusSquared) / (maxCircleSizeValue - minCircleSizeValue);
        }
    }

    return { minCircleSizeValue, maxCircleSizeValue, circleScale, selectedScalingMethod };
}

export function applyScaling(
    value: number,
    minValue: number,
    maxValue: number,
    scaleFactor: number,
    circleOptions: CircleOptions,
    allDataValues?: number[]
): number {
    if (value > maxValue && allDataValues && allDataValues.length > 0) {
        const actualMax = Math.max(...allDataValues);
        if (actualMax > maxValue) {
            const outlierRange = actualMax - maxValue;
            if (outlierRange > 0) {
                const outlierPosition = Math.min((value - maxValue) / outlierRange, 1);
                const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
                const p95Radius = Math.sqrt(minRadiusSquared + (maxValue - minValue) * scaleFactor);
                const remainingRadiusSpace = circleOptions.maxRadius - p95Radius;
                const maxOutlierBonus = remainingRadiusSpace * 0.8;
                const outlierRadiusBonus = maxOutlierBonus * outlierPosition;
                const finalRadius = Math.min(p95Radius + outlierRadiusBonus, circleOptions.maxRadius);
                return finalRadius;
            }
        }
    }
    const clampedValue = Math.max(minValue, Math.min(value, maxValue));
    const minRadiusSquared = circleOptions.minRadius * circleOptions.minRadius;
    const scaledAreaSquared = minRadiusSquared + (clampedValue - minValue) * scaleFactor;
    return Math.sqrt(scaledAreaSquared);
}

export function findClosestValue(sortedValues: number[], targetValue: number): number {
    let closest = sortedValues[0];
    let minDiff = Math.abs(targetValue - closest);
    for (const value of sortedValues) {
        const diff = Math.abs(targetValue - value);
        if (diff < minDiff) {
            minDiff = diff;
            closest = value;
        }
    }
    return closest;
}
