{
  const _source = document.currentScript;

  class CDexApp extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() { return 'cdex-app' }

    connectedCallback() {
      console.log(`Connecting ${this.constructor.is}`);
      console.log(this.$.polo.is);
      window.setTimeout(() => {
        this.$.polo.connect();
        let subscription = this.$.polo.subscribe({first: 'BTC', second: 'ETH'}, 'trades');
        subscription.on('data', data => {
          data.forEach(trade => {
            console.log(`Amount (BTC): ${trade.amount}`);
            console.log(`Price (ETH):  ${trade.price}`);
          });
        });


        let subscription2 = this.$.polo.subscribe({first: 'ETH', second: 'BTC'}, 'trades');
        subscription2.on('data', data => {
          data.forEach(trade => {
            console.log("Amount (ETH): " + trade.amount);
            console.log("Price (BTC): " + trade.price);
          });
        });

      }, 500);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
