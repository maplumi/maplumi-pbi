import Control from 'ol/control/Control';


export class MaplyticsAttributionControl extends Control {

  constructor(options) {

    const element = document.createElement('div');
    element.className = 'custom-attribution-control';

    // Style the element as desired. This is just an example.
    element.style.cssText = 'position: absolute; bottom: 0; right: 0; padding: 5px; background: rgba(255,255,255,0.7); font-size: 12px;';
    super({
      element: element,
      target: options.target,
    });
    
    this.setAttribution(options.attribution);
  }
  
  setAttribution(attribution) {
    this.element.textContent = attribution;
  }
}
