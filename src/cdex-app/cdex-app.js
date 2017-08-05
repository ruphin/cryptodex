{
  const _source = document.currentScript;
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');

  class CDexApp extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() { return 'cdex-app' }

    connectedCallback() {
      window.setTimeout(() => {
        this.$.polo.connect();
        let subscription = this.$.polo.subscribe({first: 'ETH', second: 'BTC'}, 'trades');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.volumeChart.addTransaction(trade.type, trade.timestamp, trade.amount)
          });
        });
      }, 0);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
