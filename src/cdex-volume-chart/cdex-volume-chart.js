{
  const _source = document.currentScript;

  const TIMESPAN_DEFAULT = 3600; // Total seconds in monitoring window
  const INTERVALS_DEFAULT = 360; // Number of intervals in that window to track
  const WINDOW_DEFAULT = 12; // Number of intervals in the sliding window (2 mins)
  const SCALE_DEFAULT = 1;
  const MILLISECS = 1000;
  const BUY = Symbol.for('buy');

  class CDexVolumeChart extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() { return 'cdex-volume-chart' }

    constructor() {
      super();
      this._buyVolumes = [];
      this._buyList = [];
      this._sellVolumes = [];
      this._sellList = [];
      this.scale = SCALE_DEFAULT;
      this.timespan = TIMESPAN_DEFAULT;
      this.intervals = INTERVALS_DEFAULT;
      this.window = WINDOW_DEFAULT;
      this.loop = setInterval(() => { this.__update() }, this.timespan / this.intervals * MILLISECS)
    }

    static get observedAttributes() {
      return ['timespan', 'intervals', 'window', 'scale'];
    }

    attributeChangedCallback(attribute, oldValue, newValue) {
      if (newValue != this[attribute].toString()) {
        this[attribute] = newValue;
      }
    }

    addTransaction(type, timestamp, volume) {
      if (type === BUY) {
        this._buyVolumes[0] += volume;
        this._buyList[0].push([timestamp, volume]);
      } else { // Sell
        this._sellVolumes[0] += amount;
        this._sellList[0].push([timestamp, volume]);
      }
    }

    set timespan(value) {
      this._timespan = parseInt(value) || console.error(`Invalid timespan: ${value}`) || TIMESPAN_DEFAULT;
    }
    get timespan() {
      return this._timespan;
    }

    set intervals(value) {
      let old_intervals = this.intervals || 0;
      this._intervals = parseInt(value) || console.error(`Invalid intervals: ${value}`) || INTERVALS_DEFAULT;


      if (old_intervals < this.intervals) {
        Array.from(Array(this.intervals - old_intervals)).forEach(() => {
          this._buyVolumes.push(0);
          this._buyList.push([]);
          this._sellVolumes.push(0);
          this._sellList.push([]);

          let bar = document.createElement('div');
          bar.classList.add('bar');
          this.$.moments.appendChild(bar);
          bar = document.createElement('div');
          bar.classList.add('bar');
          this.$.averages.appendChild(bar);
        });
      } else {
        this._buyVolumes.pop();
        this._buyList.pop();
        this._sellVolumes.pop();
        this._sellList.pop();
        Array.from(Array(old_intervals - this.intervals)).forEach(() => {
          this.$.moments.removeChild(this.$.moments.lastChild)
          this.$.averages.removeChild(this.$.averages.lastChild)
        });
      }
    }
    get intervals() {
      return this._intervals;
    }

    set window(value) {
      this._window = parseInt(value) || console.error(`Invalid window: ${value}`) || WINDOW_DEFAULT;
    }
    get window() {
      return this._window;
    }


    set scale(value) {
      this._scale = parseFloat(value) || console.error(`Invalid scale: ${value}`) || SCALE_DEFAULT;
      this.__render();
    }
    get scale() {
      return this._scale;
    }

    __update() {
      let now = new Date();
      let edge;
      Array.from(Array(this.intervals).keys()).forEach((n) => {
        let testDate =  new Date(now.getTime() - (n + 1) * this.timespan / this.intervals * MILLISECS);
        while (true) {
          edge = this._buyList[n].shift();
          if (edge && edge[0] < testDate) {
            this._buyVolumes[n] -= edge[1];
            if (this._buyList[n + 1]) {
              this._buyVolumes[n + 1] += edge[1];
              this._buyList[n + 1].push(edge);
            }
          } else {
            if (edge) {
              this._buyList[n].unshift(edge);
            }
            break;
          }
        }
        while (true) {
          edge = this._sellList[n].shift();
          if (edge && edge[0] < testDate) {
            this._sellVolumes[n] -= edge[1];
            if (this._sellList[n + 1]) {
              this._sellVolumes[n + 1] += edge[1]
              this._sellList[n + 1].push(edge);
            }
          } else {
            if (edge) {
              this._sellList[n].unshift(edge);
            }
            break;
          }
        }
      })

      this.__render();


    }
    __render() {
      if (!this.intervals || !this.window) {
        console.warn("Rendering without valid intervals or window");
        return;
      }
      let movement = 0;
      let volume = 0;
      Array.from(Array(this.intervals + this.window).keys()).forEach((n) => {
        movement += (this._buyVolumes[n] - this._sellVolumes[n])
        volume += (this._buyVolumes[n] + this._sellVolumes[n])


        if (n - this.window >= 0) {
          movement -= (this._buyVolumes[n - this.window] - this._sellVolumes[n - this.window])
          volume -= (this._buyVolumes[n - this.window] + this._sellVolumes[n - this.window])

          let movementPercent = Math.abs(movement) * this.scale;
          let volumePercent = Math.abs(volume) * this.scale;

          if (movement > 0) {
            this.$.averages.children[n - this.window].style.background = `linear-gradient(to bottom, white, white ${50 - volumePercent}%, #C1C5C7 ${50 - volumePercent}%, #C1C5C7 ${50 - movementPercent}%, #639F4D ${50 - movementPercent}%, #639F4D 50%, #C1C5C7 50%, #C1C5C7 ${50 + volumePercent}%, white ${50 + volumePercent}%, white)`;
          } else {
            this.$.averages.children[n - this.window].style.background = `linear-gradient(to bottom, white, white ${50 - volumePercent}%, #C1C5C7 ${50 - volumePercent}%, #C1C5C7 50%, #AD092E 50%, #AD092E ${50 + movementPercent}%, #C1C5C7 ${50 + movementPercent}%, #C1C5C7 ${50 + volumePercent}%, white ${50 + volumePercent}%, white)`;
          }
        }

        if (n < this.intervals) {
          let movementPercent =  Math.abs(this._buyVolumes[n] + this._sellVolumes[n]) * this.scale;
          let volumePercent = (this._buyVolumes[n] + this._sellVolumes[n]) * this.scale;
          if (this._buyVolumes[n] - this._sellVolumes[n] >= 0) {
            this.$.moments.children[n].style.background = `linear-gradient(to bottom, white, white ${50 - volumePercent}%, #C1C5C7 ${50 - volumePercent}%, #C1C5C7 ${50 - movementPercent}%, #639F4D ${50 - movementPercent}%, #639F4D 50%, #C1C5C7 50%, #C1C5C7 ${50 + volumePercent}%, white ${50 + volumePercent}%, white)`;
          } else {
            this.$.moments.children[n].style.background = `linear-gradient(to bottom, white, white ${50 - volumePercent}%, #C1C5C7 ${50 - volumePercent}%, #C1C5C7 50%, #AD092E 50%, #AD092E ${50 + movementPercent}%, #C1C5C7 ${50 + movementPercent}%, #C1C5C7 ${50 + volumePercent}%, white ${50 + volumePercent}%, white)`;
          }
        }
      })
    }
  }

  customElements.define(CDexVolumeChart.is, CDexVolumeChart)
}
