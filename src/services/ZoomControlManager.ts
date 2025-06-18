import Zoom from "ol/control/Zoom";
import Map from "ol/Map";

export class ZoomControlManager {
    private zoomControl: Zoom | null = null;
    private map: Map;

    constructor(map: Map) {
        this.map = map;
    }

    public setZoomControlVisible(visible: boolean) {
        if (visible) {
            if (!this.zoomControl) {
                this.zoomControl = new Zoom();
                this.map.addControl(this.zoomControl);
            }
        } else {
            if (this.zoomControl) {
                this.map.removeControl(this.zoomControl);
                this.zoomControl = null;
            }
        }
    }
}
