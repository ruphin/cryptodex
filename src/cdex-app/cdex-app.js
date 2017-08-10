{
  const _source = document.currentScript;
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');

  class CDexApp extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() {
      return 'cdex-app';
    }

    connectedCallback() {
      window.setTimeout(() => {
        let subscription = this.$.polo.subscribeTrades('ETH', 'BTC');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.ETHBTC.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        subscription = this.$.polo.subscribeTrades('ETH', 'USDT');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.ETHUSDT.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        
        /*subscription = this.$.polo.getOrderBook('ETH', 'BTC');
        subscription.on('data', data => {
          console.log('Order book ETH-BTC');
          let sellOrders = data[0];
          let buyOrders = data[1];
          console.log('Sell orders:');
          console.log(sellOrders);
          console.log('Buy orders:');
          console.log(buyOrders);
        });*/

        /*subscription = this.$.yunbi.subscribeTrades('BTC', 'CNY');
        subscription.on('data', data => {
          console.log(data);
        });*/
      }, 0);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
