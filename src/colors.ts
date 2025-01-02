import * as chroma from "chroma-js";

type ColorRamp = string[];

export class ColorRampGenerator {
  // Define the available color ramps
  private static colorRamps: { [key: string]: string[] } = {

    blue: [
      '#e1eef9', '#c7e1f5', '#64beeb', '#009edb', '#0074b7', '#00529c', '#002e6e'
    ],
    red: [
      '#fcdee0', '#f9c0c7', '#f3859b', '#ed1846', '#a71f36', '#780b20', '#520000'
    ],
    green: [
      '#e5f1d4', '#d1e39b', '#72bf44', '#338c46', '#006e4f', '#004d35', '#003425'
    ],
    orange: [
      '#ffead5', '#fedcbd', '#f9a870', '#f58220', '#c15025', '#90371c', '#70200c'
    ],
    purple: [
      '#e5d7ea', '#d3b6d7', '#bd8cbf', '#a066aa', '#763f98', '#582a8a', '#3e125b'
    ],
    yellow: [
      '#fff4bf', '#ffeb6c', '#ffde2f', '#ffcb05', '#cf9220', '#b06e2a', '#815017'
    ],
    slateGrey: [
      '#edeae8', '#dddad7', '#c5bfba', '#a99f96', '#71665e', '#493f38', '#1b1b1a'
    ],
    neutralGrey: [
      '#f2f2f2', '#e6e6e6', '#bfbfbf', '#999999', '#737373', '#4d4d4d', '#262626'
    ],

    // New Color Ramps
    unblue: [
      '#e6f5fb', '#99d8f1', '#4dbbe6', '#009edb', '#006f99', '#003f58'  
    ],
    sdgred:[
      '#fce9eb', '#f5a7b1', '#ed6676', '#e5243b', '#a01929', '#5c0e18'
    ],
    sdgyellow: [
      '#fff9e7', '#fee79d', '#fdd554', '#fcc30b', '#b08908', '#654e04'
    ],
    sdgorange: [
      '#fff0e9', '#fec3a8', '#fe9666', '#fd6925', '#b14a1a', '#652a0f'
    ],
    sdggreen:[
      '#eef9ea', '#bbe6aa', '#89d36b', '#56c02b', '#3c861e', '#224d11'
    ],
    sdgdarkgreen: [
      '#ecf2ec', '#b2cbb4', '#79a57c', '#3f7e44', '#2c5830', '#19321b'
    ],
    sdgnavyblue: [
      '#e8edf0', '#a3b6c3', '#5e7f97', '#19486a', '#12324a', '#0a1d2a'
    ],
    ipc: [
      '#cdfacd','#fae61e','#e67800','#c80000','#640000'
    ]
  };

  // Property to hold the current color ramp
  private currentRamp: ColorRamp;

  // Constructor accepts a color ramp name
  constructor(rampName: string) {
    // Default to blue ramp if invalid name is provided
    this.currentRamp = ColorRampGenerator.colorRamps[rampName] || ColorRampGenerator.colorRamps['blue'];
  }

  // Method to get the current color ramp
  public getColorRamp(): string[] {
    return this.currentRamp;
  }

  // Method to invert the color ramp
  public invertRamp(): void {
    this.currentRamp = this.currentRamp.reverse();
  }

  // Method to generate colors using Chroma.js with dynamic class breaks
  public generateColorRamp(n: number, classBreaks: number[]): string[] {
    // Use the classBreaks to define the domain of the color scale
    const scale = chroma.scale(this.currentRamp).mode('lab').domain(classBreaks);

    // Generate `n` colors and return them
    return scale.colors(n);
  }
}


// Usage Example
const colorRampGenerator = new ColorRampGenerator('blue');  // Choose 'blue' color ramp

// Define class breaks (example)
const classBreaks = [0, 50, 100, 150, 200];  // Define breaks for your data

// Generate a color ramp with 5 colors, applying the classBreaks to the scale
const colorRamp = colorRampGenerator.generateColorRamp(5, classBreaks);
console.log(colorRamp);


