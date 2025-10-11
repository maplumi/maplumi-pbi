import { MapService } from "../../../src/services/MapService";
import { BasemapNames } from "../../../src/constants/strings";

// Create a light-weight mock for OpenLayers Map methods used by MapService
jest.mock("ol/Map", () => {
	return jest.fn().mockImplementation(() => ({
		setTarget: jest.fn(),
		addControl: jest.fn(),
		removeControl: jest.fn(),
		getLayers: jest.fn(() => ({
			setAt: jest.fn(),
		})),
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

// Mock layers and sources used by getBasemap
jest.mock("ol/layer/Tile", () => {
	return jest.fn().mockImplementation(() => ({
		getSource: jest.fn(() => ({ setAttributions: jest.fn() })),
	}));
});

jest.mock("ol/source/OSM", () => jest.fn());

jest.mock("ol-mapbox-style", () => ({
	MapboxVectorLayer: jest.fn().mockImplementation((opts) => ({ opts })),
}));

jest.mock("ol/source/TileJSON", () => jest.fn());

jest.mock("ol/layer/Tile", () => {
	return jest.fn().mockImplementation(() => ({
		getSource: jest.fn(() => ({ setAttributions: jest.fn() })),
	}));
});

jest.mock("../../../src/utils/attribution", () => ({
	MaplyticsAttributionControl: jest.fn().mockImplementation(() => ({ })),
}));

jest.mock("../../../src/services/ZoomControlManager", () => ({
	ZoomControlManager: jest.fn().mockImplementation(() => ({
		setZoomControlVisible: jest.fn(),
	})),
}));

// Tests

describe("MapService helpers", () => {
	let container: HTMLElement;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
	});

	afterEach(() => {
		container.remove();
		jest.clearAllMocks();
	});

	it("initializes and exposes map/view/state", () => {
		const svc = new MapService(container, true);
		expect(svc.getMap()).toBeDefined();
		expect(svc.getView()).toBeDefined();
		const state = svc.getState();
		expect(state.basemapType).toBe("");
	});

	it("updates basemap and attribution; None yields invisible layer placeholder", () => {
		const svc = new MapService(container, true);
		const options: any = {
			selectedBasemap: BasemapNames.None,
			customMapAttribution: "Custom",
			mapboxStyle: "mapbox://styles/mapbox/light-v10",
			maptilerStyle: "dataviz",
		};

		// First update
		svc.updateBasemap(options);
		const state1 = svc.getState();
		expect(state1.basemapType).toBe(BasemapNames.None);
		expect(state1.attribution).toContain("Custom");

		// No-op update with same options should short-circuit
		const before = svc.getState();
		svc.updateBasemap(options);
		const after = svc.getState();
		expect(after).toEqual(before);
	});

	it("lockExtent sets min/max zoom and state", () => {
		const svc = new MapService(container, true);
		const extent: any = [0, 0, 10, 10];
		svc.lockExtent(extent as any, [5, 5] as any, 4);

		const st = svc.getState();
		expect(st.extent).toEqual(extent);
		expect(st.zoom).toBe(4);
	});
});
