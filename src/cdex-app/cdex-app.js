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
            this.$.ETHBTC.addTransaction(trade.type, trade.timestamp, trade.amount)
          });
        });

        subscription = this.$.polo.subscribe({first: 'ETH', second: 'USDT'}, 'trades');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.ETHUSDT.addTransaction(trade.type, trade.timestamp, trade.amount)
          });
        });

        subscription = this.$.polo.subscribe({first: 'BTC', second: 'USDT'}, 'trades');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.BTCUSDT.addTransaction(trade.type, trade.timestamp, trade.amount)
          });
        });
        console.log(this.$.bithumb)
        this.$.bithumb.subscribeTrades('ETH', 'USD');
      }, 0);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
