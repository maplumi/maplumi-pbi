import * as chroma from "chroma-js";

type ColorRamp = string[];

export class ColorRampManager {

  // Constructor accepts a color ramp name
  constructor(colorRamp: string[]) {
    this.currentRamp = colorRamp;
  }

  // Property to hold the current color ramp
  private currentRamp: ColorRamp;
  private isInverted: boolean = false;

  // Method to get the current color ramp
  public getColorRamp(): string[] {
    return this.isInverted ? [...this.currentRamp].reverse() : this.currentRamp;
  }

  // Method to invert the color ramp
  public invertRamp(): void {
    this.isInverted = !this.isInverted;
  }

  // Method to generate colors using Chroma.js with dynamic class breaks
  public generateColorRamp(classBreaks: number[], numberOfClasses: number, colorMode: string): string[] {
    // Get the current ramp (inverted or not)
    const ramp = this.getColorRamp();

    // Use the classBreaks to define the domain of the color scale
    const scale = chroma.scale(ramp).mode(colorMode).domain(classBreaks);

    // Generate `n` colors and return them
    return scale.colors(numberOfClasses);
  }
}


