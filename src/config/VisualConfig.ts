
export const VisualConfig = {
    NETWORK: {
        FETCH_TIMEOUT_MS: 25000
    },
    CACHE: {
        EXPIRY_MS: 3600000, // 1 hour default for large resources
        METADATA_EXPIRY_MS: 1800000, // 30 minutes for metadata
        MAX_ENTRIES: 100
    },
    MAP: {
        DEFAULT_CENTER: [0, 0],
        DEFAULT_ZOOM: 2,
        POSTRENDER_DEBOUNCE_MS: 300,
        FIT_OPTIONS: {
            padding: [20, 10, 20, 10],// top, right, bottom, left
            duration: 0 // No animation
            // easing: easeOut, // Animation removed
        }
    },
    COLORS: {
        DEFAULT_STROKE: '#009edb',
        DEFAULT_FILL: '#ffffff',
        DEFAULT_BACKGROUND: '#f3f3f3'
    },
    COLORRAMPS: {
        BLUE: ["#e1eef9", "#c7e1f5", "#64beeb", "#009edb", "#0074b7", "#00529c", "#002e6e"],
        RED: ["#fcdee0", "#f9c0c7", "#f3859b", "#ed1846", "#a71f36", "#780b20", "#520000"],
        GREEN: ["#e5f1d4", "#d1e39b", "#72bf44", "#338c46", "#006e4f", "#004d35", "#003425"],
        ORANGE: ["#ffead5", "#fedcbd", "#f9a870", "#f58220", "#c15025", "#90371c", "#70200c"],
        PURPLE: ["#e5d7ea", "#d3b6d7", "#bd8cbf", "#a066aa", "#763f98", "#582a8a", "#3e125b"],
        YELLOW: ["#fff4bf", "#ffeb6c", "#ffde2f", "#ffcb05", "#cf9220", "#b06e2a", "#815017"],
        SLATEGREY: ["#edeae8", "#dddad7", "#c5bfba", "#a99f96", "#71665e", "#493f38", "#1b1b1a"],
        NEUTRALGREY: ["#f2f2f2", "#e6e6e6", "#bfbfbf", "#999999", "#737373", "#4d4d4d", "#262626"],
        AZURECASCADE: ["#e6f5fb", "#99d8f1", "#4dbbe6", "#009edb", "#006f99", "#003f58"],
        IPC: ["#cdfacd", "#fae61e", "#e67800", "#c80000", "#640000"],
        SDGRED: ["#fce9eb", "#f5a7b1", "#ed6676", "#e5243b", "#a01929", "#5c0e18"],
        SDGYELLOW: ["#fff9e7", "#fee79d", "#fdd554", "#fcc30b", "#b08908", "#654e04"],
        SDGORANGE: ["#fff0e9", "#fec3a8", "#fe9666", "#fd6925", "#b14a1a", "#652a0f"],
        SDGGREEN: ["#eef9ea", "#bbe6aa", "#89d36b", "#56c02b", "#3c861e", "#224d11"],
        SDGDARKGREEN: ["#ecf2ec", "#b2cbb4", "#79a57c", "#3f7e44", "#2c5830", "#19321b"],
        SDGNAVYBLUE: ["#e8edf0", "#a3b6c3", "#5e7f97", "#19486a", "#12324a", "#0a1d2a"]

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
    GEOBOUNDARIES: {
        BASE_URL: "https://www.geoboundaries.org/api/current",
        // Manifest of available countries and admin levels for the lightweight catalog
        MANIFEST_URL: "https://cdn.jsdelivr.net/gh/maplumi/geoboundaries-lite@v2025-11/data/index.json",
        ALL_COUNTRIES_URL: "https://cdn.jsdelivr.net/gh/maplumi/geoboundaries-lite@v2025-11/data/ALL/geoBoundariesCGAZ_ADM0.topojson",
        // Minimal fallback list used only if manifest fetch has not populated catalog yet.
        // The dynamic manifest will replace this with the full country list.
        COUNTRIES: [
            { value: "ALL", displayName: "All Countries" }
        ],
        // Source field options for different boundary data sources
        SOURCE_FIELD_OPTIONS: {
            geoboundaries: [
                { value: "shapeISO", displayName: "shapeISO (ISO Code)" },
                { value: "shapeName", displayName: "shapeName (Name)" },
                { value: "shapeID", displayName: "shapeID (Unique ID)" },
                { value: "shapeGroup", displayName: "shapeGroup (Country)" }
            ],
            custom: [
                { value: "custom", displayName: "Custom" }
            ]
        }
    },
    MAP_BASE_URL: {
        MAPBOX: "https://api.mapbox.com/styles/v1",
        MAPTILER: "https://api.maptiler.com/maps",
        OPENSTREETMAP: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
};