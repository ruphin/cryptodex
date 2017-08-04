{
  const _source = document.currentScript;

  class CDexApp extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() { return 'cdex-app' }

    connectedCallback() {
        console.log(`Connecting ${this.constructor.is}`)
      console.log(this.$.polo.is);
      this.$.polo.connect();
      let subscription = this.$.polo.subscribe({first: 'ETH', second: 'BTC'}, 'trades');
      subscription.on('data', data => {
        console.log(data.amount);
      });
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
