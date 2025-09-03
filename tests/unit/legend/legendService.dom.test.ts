import { LegendService } from "../../../src/services/LegendService";
import { LegendOrientations, LegendLabelPositions } from "../../../src/constants/strings";

describe("LegendService (DOM + helpers)", () => {
	let container: HTMLElement;
	let service: LegendService;

	beforeEach(() => {
		container = document.createElement("div");
		document.body.appendChild(container);
		service = new LegendService(container);
	});

	afterEach(() => {
		container.remove();
	});

	describe("hexToRgba", () => {
		it("converts hex to rgba string with provided opacity", () => {
			expect(service.hexToRgba("#ff0000", 0.5)).toBe("rgba(255,0,0,0.5)");
			expect(service.hexToRgba("#00ff00", 1)).toBe("rgba(0,255,0,1)");
			expect(service.hexToRgba("#0000ff", 0)).toBe("rgba(0,0,255,0)");
		});
	});

	describe("createChoroplethLegendItem via createChoroplethLegend", () => {
		const classBreaks = [0, 10, 20, 40]; // yields 3 legend items
		const colors = ["#111111", "#222222", "#333333"]; // array form expected by implementation

		const baseOptions = {
			layerOpacity: 0.8,
			legendTitle: "Legend",
			legendTitleColor: "#000000",
			legendLabelsColor: "#444444",
			legendItemMargin: 4,
		} as any;

		function getFirstLegendItem(service: LegendService) {
			const legendEl = service.getChoroplethLegendContainer()!;
			// structure: choroplethLegendContainer -> choroplethItemsContainer
			const itemsWrapper = legendEl.children[0] as HTMLElement; // items container parent
			const itemsContainer = itemsWrapper.children[1] as HTMLElement; // actual items list
			const firstItem = itemsContainer.children[0] as HTMLElement;
			return firstItem;
		}

		it("horizontal + Top places label above color box (column-reverse)", () => {
			service.createChoroplethLegend(
				[1, 2, 3],
				classBreaks,
				colors,
				{
					...baseOptions,
					legendOrientation: LegendOrientations.Horizontal,
					legendLabelPosition: LegendLabelPositions.Top,
					layerOpacity: 0.8,
				}
			);

			const firstItem = getFirstLegendItem(service);
			expect(firstItem.style.flexDirection).toBe("column-reverse");
			// child[0] is label, child[1] is color box
			const firstChild = firstItem.children[0] as HTMLElement;
			const secondChild = firstItem.children[1] as HTMLElement;
			// label has textContent
			expect(firstChild.textContent).toContain("0 - 10");
			// color box has background
			expect(secondChild.style.backgroundColor).toBe("rgba(17, 17, 17, 0.8)");
		});

		it("horizontal + Center places label inside color box centered", () => {
			service.createChoroplethLegend(
				[1, 2, 3],
				classBreaks,
				colors,
				{
					...baseOptions,
					legendOrientation: LegendOrientations.Horizontal,
					legendLabelPosition: LegendLabelPositions.Center,
					layerOpacity: 0.6,
				}
			);

			const firstItem = getFirstLegendItem(service);
			// row/column choice does not matter; label should be a child of the color box
			const colorBox = firstItem.children[0] as HTMLElement;
			const innerLabel = colorBox.querySelector("div");
			expect(innerLabel?.textContent).toContain("0 - 10");
			expect(colorBox.style.display).toBe("flex");
			expect(colorBox.style.justifyContent).toBe("center");
			// opacity applied
			expect(colorBox.style.backgroundColor).toBe("rgba(17, 17, 17, 0.6)");
		});

		it("vertical + Left uses row-reverse and label placed before color box", () => {
			service.createChoroplethLegend(
				[1, 2, 3],
				classBreaks,
				colors,
				{
					...baseOptions,
					legendOrientation: LegendOrientations.Vertical,
					legendLabelPosition: LegendLabelPositions.Left,
					layerOpacity: 1,
				}
			);

			const firstItem = getFirstLegendItem(service);
			expect(firstItem.style.flexDirection).toBe("row-reverse");
			const firstChild = firstItem.children[0] as HTMLElement;
			const secondChild = firstItem.children[1] as HTMLElement;
			expect(firstChild.textContent).toContain("0 - 10");
			expect(secondChild.style.backgroundColor).toBe("rgb(17, 17, 17)"); // opacity 1 normalizes to rgb
		});
	});

	describe("proportional circle legend - label width influences svg width", () => {
		it("computes svg width using max label width + padding", () => {
			// Simulate measured label widths in JSDOM
			const offsetSpy = jest
				.spyOn(HTMLElement.prototype, "offsetWidth", "get")
				.mockImplementation(() => 80); // fixed width per label measurement

			const sizeValues = [100, 400, 900];
			const radii = [10, 20, 30]; // maxRadius = 30
			const options: any = {
				legendTitle: "Sizes",
				legendTitleColor: "#000",
				legendItemStrokeColor: "#000",
				legendItemStrokeWidth: 1,
				labelTextColor: "#000",
				xPadding: 10,
				yPadding: 5,
				labelSpacing: 15,
				color1: "#ff0000",
	leaderLineColor: "#000",
	leaderLineStrokeWidth: 1,
				layer1Opacity: 1,
			};

			// invoke
			service.createProportionalCircleLegend(sizeValues, radii, 1, options);

			const circleContainer = service.getCircleLegendContainer()!;
			const svg = circleContainer.querySelector("svg") as SVGElement;
			expect(svg).toBeTruthy();

			// Expected width: minLeftPadding(2) + maxRadius(30) + maxLabelWidth(80) + xPadding(10) = 122px
			const widthAttr = svg.getAttribute("width");
			expect(widthAttr).toBe("122px");

			// Cleanup spy
			offsetSpy.mockRestore();
		});
	});
});
