import { easeOut } from "ol/easing";

export const VisualConfig = {
    CACHE: {
        EXPIRY_MS: 3600000, // 1 hour
        MAX_ENTRIES: 100
    },
    MAP: {
        DEFAULT_CENTER: [0, 0],
        DEFAULT_ZOOM: 2,
        FIT_OPTIONS: {
            padding: [40, 40, 40, 40],
            duration: 1000,
            easing: easeOut,
        }
    },
    COLORS: {
        DEFAULT_STROKE: '#009edb',
        DEFAULT_FILL: '#ffffff',
        DEFAULT_BACKGROUND: '#f3f3f3'
    },
    LEGEND: {
        DEFAULT_POSITION: 'bottom-left',
        DEFAULT_BORDER_WIDTH: 1,
        DEFAULT_BORDER_RADIUS: 4,
        DEFAULT_MARGIN: 10
    },
    BASEMAP: {
        DEFAULT_ATTRIBUTION: {
            mapbox: "© Mapbox © OpenStreetMap",
            openstreetmap: "© OpenStreetMap",
            maptiler: "© MapTiler",
            none: ""
        }
    },
    MAP_BASE_URL: {
        MAPBOX: "https://api.mapbox.com/styles/v1",
        MAPTILER: "https://api.maptiler.com/maps",
        OPENSTREETMAP: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
}; 