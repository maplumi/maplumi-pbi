import Map from "ol/Map";
import { VisualConfig } from "../config/VisualConfig";
import { MapService } from "../services/MapService";
import { MapToolsOptions } from "../types/index";

export class MapToolsOrchestrator {
  private map: Map;
  private mapService: MapService;
  private mapToolsOptions: MapToolsOptions;
  private postRenderHandler?: (e: any) => void;
  private postRenderDebounce?: number;

  constructor(map: Map, mapService: MapService) {
    this.map = map;
    this.mapService = mapService;
  }

  public attach(options: MapToolsOptions, persist: (extent: string, zoom: number) => void) {
    this.mapToolsOptions = options;

    // Toggle zoom control
    this.mapService.setZoomControlVisible(this.mapToolsOptions.showZoomControl);

    if (this.mapToolsOptions.lockMapExtent) {
      if (!this.postRenderHandler) {
        this.postRenderHandler = () => {
          if (this.postRenderDebounce) {
            window.clearTimeout(this.postRenderDebounce);
          }
          this.postRenderDebounce = window.setTimeout(() => {
            const currentExtent = this.map.getView().calculateExtent(this.map.getSize());
            const currentExtentString = currentExtent.join(",");
            const currentZoom = this.map.getView().getZoom();
            if (
              currentExtentString !== this.mapToolsOptions.lockedMapExtent ||
              currentZoom !== this.mapToolsOptions.lockedMapZoom
            ) {
              persist(currentExtentString, currentZoom);
            }
          }, VisualConfig.MAP.POSTRENDER_DEBOUNCE_MS);
        };
        this.map.on("postrender", this.postRenderHandler);
      }

      let lockedExtent: [number, number, number, number] | undefined = undefined;
      if (
        typeof this.mapToolsOptions.lockedMapExtent === "string" &&
        this.mapToolsOptions.lockedMapExtent.trim() !== ""
      ) {
        lockedExtent = this.mapToolsOptions.lockedMapExtent
          .split(",")
          .map(Number) as [number, number, number, number];
      }
      if (this.mapToolsOptions.lockMapExtent === true && lockedExtent && lockedExtent.length === 4) {
        const center: [number, number] = [
          (lockedExtent[0] + lockedExtent[2]) / 2,
          (lockedExtent[1] + lockedExtent[3]) / 2,
        ];
        let zoom = this.map.getView().getZoom();
        if (
          typeof this.mapToolsOptions.lockedMapZoom === "number" &&
          !isNaN(this.mapToolsOptions.lockedMapZoom)
        ) {
          zoom = this.mapToolsOptions.lockedMapZoom;
        }
        this.mapService.lockExtent(lockedExtent, center, zoom);
        this.map.getView().fit(lockedExtent, VisualConfig.MAP.FIT_OPTIONS);
        this.mapService.setZoomControlVisible(false);
      }
    } else {
      this.detach();
      this.map.getView().setProperties({ extent: undefined, minZoom: 0, maxZoom: 28 });
    }
  }

  public detach() {
    if (this.postRenderHandler) {
      this.map.un("postrender", this.postRenderHandler);
      this.postRenderHandler = undefined;
      if (this.postRenderDebounce) {
        window.clearTimeout(this.postRenderDebounce);
        this.postRenderDebounce = undefined;
      }
    }
  }
}
