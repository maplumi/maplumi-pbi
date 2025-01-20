import VisualTooltipDataItem = powerbi.extensibility.VisualTooltipDataItem;

export class Tooltips{

    private toottipServiceWrapper: any;

    constructor(){

    }

    // private showTooltip(svgElement: any, tooltipdata: VisualTooltipDataItem) {


    //     this.tooltipServiceWrapper.addTooltip(
    //         svgElement, // Pass the SVG overlay as the container for the tooltip
    //         () => [{
    //             displayName: 'Property Name', // Example of property name from feature
    //             value: 'sample text'
    //         }],
    //         () => null // Identity can be passed here if needed (or null)
    //     );

    // }


    private static getTooltipData(value: any): VisualTooltipDataItem[] {
        return [
            {
                displayName: value.category,
                value: value.value.toString(),
                color: value.color,
                header: value.header,
                opacity: value.opacity
            },
        ];
    }
}