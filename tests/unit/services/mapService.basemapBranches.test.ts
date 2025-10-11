import { MapService } from "../../../src/services/MapService";
import { BasemapNames } from "../../../src/constants/strings";

// Minimal mocks for OL classes used within getBasemap()
jest.mock("ol/Map", () => {
	return jest.fn().mockImplementation(() => ({
		setTarget: jest.fn(),
		addControl: jest.fn(),
		removeControl: jest.fn(),
		getLayers: jest.fn(() => ({ setAt: jest.fn() })),
		getSize: jest.fn(() => [800, 600]),
	}));
});

jest.mock("ol/View", () => {
	return jest.fn().mockImplementation(() => ({
		getZoom: jest.fn(() => 2),
		setZoom: jest.fn(),
		setMinZoom: jest.fn(),
		setMaxZoom: jest.fn(),
		setCenter: jest.fn(),
		getResolutionForExtent: jest.fn(() => 1),
		getZoomForResolution: jest.fn(() => 3),
	}));
});

jest.mock("ol/proj", () => ({ fromLonLat: (xy: [number, number]) => xy }));

jest.mock("ol/control", () => ({
	defaults: jest.fn(() => ({
		extend: jest.fn(),
	})),
}));

jest.mock("ol/layer/Tile", () => {
	return jest.fn().mockImplementation((opts) => ({
		...opts,
		getSource: jest.fn(() => ({ setAttributions: jest.fn() })),
	}));
});

jest.mock("ol/source/OSM", () => jest.fn());

jest.mock("ol-mapbox-style", () => ({
	MapboxVectorLayer: jest.fn().mockImplementation((opts) => ({
		type: "mapbox",
		opts,
		getSource: jest.fn(() => ({ setAttributions: jest.fn() })),
	})),
}));

jest.mock("ol/source/TileJSON", () => jest.fn().mockImplementation((opts) => ({ ...opts })));

jest.mock("../../../src/utils/attribution", () => ({
	MaplyticsAttributionControl: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("../../../src/services/ZoomControlManager", () => ({
	ZoomControlManager: jest.fn().mockImplementation(() => ({
		setZoomControlVisible: jest.fn(),
	})),
}));

describe("MapService.getBasemap branches", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		jest.clearAllMocks();
	});

	afterEach(() => {
		container.remove();
	});

	it("returns OSM Tile layer for OpenStreetMap", () => {
		const svc = new MapService(container, false);
		svc.updateBasemap({
			selectedBasemap: BasemapNames.OpenStreetMap,
			customMapAttribution: "",
			mapboxStyle: "",
			maptilerStyle: "",
		} as any);

	// Update sets layer at index 0 using Tile with OSM source
	const OSM = require("ol/source/OSM");
	expect(OSM).toHaveBeenCalled();
	});

	it("returns MapboxVectorLayer for Mapbox with custom style", () => {
		const svc = new MapService(container, false);
		svc.updateBasemap({
			selectedBasemap: BasemapNames.Mapbox,
			customMapAttribution: "",
			mapboxStyle: "custom", // triggers custom branch
			mapboxCustomStyleUrl: "mapbox://styles/me/custom-style",
			mapboxAccessToken: "token",
			declutterLabels: true,
			maptilerStyle: "",
		} as any);

	const { MapboxVectorLayer } = require("ol-mapbox-style");
	expect(MapboxVectorLayer).toHaveBeenCalledWith(
			expect.objectContaining({
				styleUrl: "mapbox://styles/me/custom-style",
				accessToken: "token",
				declutter: true,
			})
		);
	});

	it("returns TileJSON layer for MapTiler", () => {
		const svc = new MapService(container, false);
		svc.updateBasemap({
			selectedBasemap: BasemapNames.MapTiler,
			customMapAttribution: "",
			maptilerStyle: "dataviz",
			maptilerApiKey: "abc123",
			mapboxStyle: "",
		} as any);

	const TileJSON = require("ol/source/TileJSON");
	expect(TileJSON).toHaveBeenCalledWith(
			expect.objectContaining({ url: expect.stringContaining("/dataviz/tiles.json?key=abc123") })
		);
	});
});
