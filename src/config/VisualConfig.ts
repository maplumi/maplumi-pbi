
export const VisualConfig = {
    NETWORK: {
        FETCH_TIMEOUT_MS: 10000
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
    COLORRAMPS:{
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
        ALL_COUNTRIES_URL: "https://geodata-bi.datauga.com/geoBoundariesCGAZ_ADM0.json",
        COUNTRIES: [
            { value: "ALL", displayName: "All Countries" },
            { value: "AFG", displayName: "Afghanistan" },
            { value: "ARG", displayName: "Argentina" },
            { value: "ARM", displayName: "Armenia" },
            { value: "AUS", displayName: "Australia" },
            { value: "AUT", displayName: "Austria" },
            { value: "AZE", displayName: "Azerbaijan" },
            { value: "BGD", displayName: "Bangladesh" },
            { value: "BLR", displayName: "Belarus" },
            { value: "BEL", displayName: "Belgium" },
            { value: "BFA", displayName: "Burkina Faso" },
            { value: "BTN", displayName: "Bhutan" },
            { value: "BRA", displayName: "Brazil" },
            { value: "BRN", displayName: "Brunei" },
            { value: "BGR", displayName: "Bulgaria" },
            { value: "KHM", displayName: "Cambodia" },
            { value: "CMR", displayName: "Cameroon" },
            { value: "CAN", displayName: "Canada" },
            { value: "CAF", displayName: "Central African Republic" },
            { value: "TCD", displayName: "Chad" },
            { value: "CHL", displayName: "Chile" },
            { value: "CHN", displayName: "China" },
            { value: "COL", displayName: "Colombia" },
            { value: "HRV", displayName: "Croatia" },
            { value: "CYP", displayName: "Cyprus" },
            { value: "CZE", displayName: "Czech Republic" },
            { value: "COD", displayName: "Democratic Republic of Congo" },
            { value: "DNK", displayName: "Denmark" },
            { value: "EGY", displayName: "Egypt" },
            { value: "EST", displayName: "Estonia" },
            { value: "ETH", displayName: "Ethiopia" },
            { value: "FIN", displayName: "Finland" },
            { value: "FRA", displayName: "France" },
            { value: "GAB", displayName: "Gabon" },
            { value: "GEO", displayName: "Georgia" },
            { value: "DEU", displayName: "Germany" },
            { value: "GHA", displayName: "Ghana" },
            { value: "GRC", displayName: "Greece" },
            { value: "HUN", displayName: "Hungary" },
            { value: "IND", displayName: "India" },
            { value: "IDN", displayName: "Indonesia" },
            { value: "IRN", displayName: "Iran" },
            { value: "IRQ", displayName: "Iraq" },
            { value: "IRL", displayName: "Ireland" },
            { value: "ISR", displayName: "Israel" },
            { value: "ITA", displayName: "Italy" },
            { value: "JPN", displayName: "Japan" },
            { value: "JOR", displayName: "Jordan" },
            { value: "KAZ", displayName: "Kazakhstan" },
            { value: "KEN", displayName: "Kenya" },
            { value: "KGZ", displayName: "Kyrgyzstan" },
            { value: "LAO", displayName: "Laos" },
            { value: "LVA", displayName: "Latvia" },
            { value: "LBN", displayName: "Lebanon" },
            { value: "LTU", displayName: "Lithuania" },
            { value: "LUX", displayName: "Luxembourg" },
            { value: "MYS", displayName: "Malaysia" },
            { value: "MDV", displayName: "Maldives" },
            { value: "MLI", displayName: "Mali" },
            { value: "MLT", displayName: "Malta" },
            { value: "MEX", displayName: "Mexico" },
            { value: "MDA", displayName: "Moldova" },
            { value: "MNG", displayName: "Mongolia" },
            { value: "MAR", displayName: "Morocco" },
            { value: "MMR", displayName: "Myanmar" },
            { value: "NPL", displayName: "Nepal" },
            { value: "NLD", displayName: "Netherlands" },
            { value: "NZL", displayName: "New Zealand" },
            { value: "NER", displayName: "Niger" },
            { value: "NGA", displayName: "Nigeria" },
            { value: "NOR", displayName: "Norway" },
            { value: "PAK", displayName: "Pakistan" },
            { value: "PER", displayName: "Peru" },
            { value: "PHL", displayName: "Philippines" },
            { value: "POL", displayName: "Poland" },
            { value: "PRT", displayName: "Portugal" },
            { value: "COG", displayName: "Republic of Congo" },
            { value: "ROU", displayName: "Romania" },
            { value: "RUS", displayName: "Russia" },
            { value: "RWA", displayName: "Rwanda" },
            { value: "SAU", displayName: "Saudi Arabia" },
            { value: "SEN", displayName: "Senegal" },
            { value: "SGP", displayName: "Singapore" },
            { value: "SVK", displayName: "Slovakia" },
            { value: "SVN", displayName: "Slovenia" },
            { value: "ZAF", displayName: "South Africa" },
            { value: "KOR", displayName: "South Korea" },
            { value: "ESP", displayName: "Spain" },
            { value: "LKA", displayName: "Sri Lanka" },
            { value: "SWE", displayName: "Sweden" },
            { value: "CHE", displayName: "Switzerland" },
            { value: "SYR", displayName: "Syria" },
            { value: "TJK", displayName: "Tajikistan" },
            { value: "TZA", displayName: "Tanzania" },
            { value: "THA", displayName: "Thailand" },
            { value: "TKM", displayName: "Turkmenistan" },
            { value: "TUR", displayName: "Turkey" },
            { value: "UGA", displayName: "Uganda" },
            { value: "UKR", displayName: "Ukraine" },
            { value: "ARE", displayName: "United Arab Emirates" },
            { value: "GBR", displayName: "United Kingdom" },
            { value: "USA", displayName: "United States" },
            { value: "UZB", displayName: "Uzbekistan" },
            { value: "VEN", displayName: "Venezuela" },
            { value: "VNM", displayName: "Vietnam" }
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