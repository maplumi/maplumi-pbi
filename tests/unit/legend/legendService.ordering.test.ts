import { LegendService } from "../../../src/services/LegendService";
import {
    ClassificationMethods,
    LegendLabelPositions,
    LegendOrientations,
} from "../../../src/constants/strings";

describe("LegendService createChoroplethLegend ordering", () => {
    let container: HTMLElement;
    let service: LegendService;

    const baseOptions = {
        legendTitle: "Legend",
        legendTitleColor: "#222222",
        legendLabelsColor: "#111111",
        legendItemMargin: 4,
        legendOrientation: LegendOrientations.Vertical,
        legendLabelPosition: LegendLabelPositions.Right,
        layerOpacity: 1,
        classes: 7,
    } as any;

    beforeEach(() => {
        container = document.createElement("div");
        document.body.appendChild(container);
        service = new LegendService(container);
    });

    afterEach(() => {
        container.remove();
    });

    function extractLegendItems(): HTMLElement[] {
        const legendRoot = service.getChoroplethLegendContainer();
        expect(legendRoot).toBeTruthy();
        const itemsWrapper = legendRoot!.children[0] as HTMLElement;
        const itemsContainer = itemsWrapper.children[1] as HTMLElement;
        return Array.from(itemsContainer.children) as HTMLElement[];
    }

    it("sorts numeric unique categories ascending and preserves colors", () => {
        const options = {
            ...baseOptions,
            classificationMethod: ClassificationMethods.Unique,
        };

        service.createChoroplethLegend(
            [3, 1, 2],
            [3, 1, 2],
            ["#ff0000", "#00ff00", "#0000ff"],
            options,
        );

        const items = extractLegendItems();
        const labels = items.map((item) => item.getAttribute("data-legend-label"));
        expect(labels).toEqual(["1", "2", "3"]);

        const backgrounds = items.map((item) => {
            const swatch = item.children[0] as HTMLElement;
            return swatch.style.backgroundColor;
        });
        expect(backgrounds).toEqual([
            "rgb(0, 255, 0)",
            "rgb(0, 0, 255)",
            "rgb(255, 0, 0)",
        ]);
    });

    it("sorts textual unique categories case-insensitively and keeps assigned colors", () => {
        const options = {
            ...baseOptions,
            classificationMethod: ClassificationMethods.Unique,
        };

        service.createChoroplethLegend(
            [1, 2, 3, 4],
            ["delta", "Alpha", "charlie", "bravo"] as any,
            ["#111111", "#222222", "#333333", "#444444"],
            options,
        );

        const items = extractLegendItems();
        const labels = items.map((item) => item.getAttribute("data-legend-label"));
        expect(labels).toEqual(["Alpha", "bravo", "charlie", "delta"]);

        const backgrounds = items.map((item) => {
            const swatch = item.children[0] as HTMLElement;
            return swatch.style.backgroundColor;
        });
        expect(backgrounds).toEqual([
            "rgb(34, 34, 34)",
            "rgb(68, 68, 68)",
            "rgb(51, 51, 51)",
            "rgb(17, 17, 17)",
        ]);
    });
});
