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
        let subscription = this.$.polo.subscribeTrades('ETH', 'BTC');
        subscription.on('data', data => {
          data.forEach(trade => {
            console.log(trade);
            this.$.ETHBTC.addTransaction(trade.type, trade.timestamp, trade.amount)
          });
        });
        /*this.$.bithumb.subscribeTrades('ETH', 'USD');*/

        subscription = this.$.polo.subscribeOrderBook('BTC', 'ETH');
        subscription.on('data', data => {
          data.forEach(order => {
            if (order.type === BUY)
              console.log("BUY");
            else
              console.log("SELL");
            console.log("Amount (BTC): " + order.amount);
            console.log("Price (ETH): " + order.price);
          });
        });
      }, 0);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
