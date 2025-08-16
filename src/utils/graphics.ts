import { DomIds } from "../constants/strings";

// Set SVG viewport size
export function setSvgSize(svg: any, width: number, height: number) {
  svg.attr('width', width).attr('height', height);
}

// Compute opacity based on selection state (dim unselected)
export function selectionOpacity(selectedIds: any[], datumId: any, baseOpacity: number) {
  if (!selectedIds || selectedIds.length === 0) return baseOpacity;
  return selectedIds.some((s) => s === datumId) ? baseOpacity : baseOpacity / 2;
}

// Ensure circles groups render above choropleth paths
export function reorderForCirclesAboveChoropleth(svg: any) {
  const choroplethGroupNode = svg.select(`#${DomIds.ChoroplethGroup}`).node();
  const circles1GroupNode = svg.select(`#${DomIds.CirclesGroup1}`).node();
  const circles2GroupNode = svg.select(`#${DomIds.CirclesGroup2}`).node();
  if (choroplethGroupNode && circles1GroupNode && circles2GroupNode) {
    choroplethGroupNode.parentNode.appendChild(circles1GroupNode);
    choroplethGroupNode.parentNode.appendChild(circles2GroupNode);
  }
}
