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
      // Poloniex

      window.setTimeout(() => {
        let subscription;

        // subscription = this.$.polo.subscribeTrades('ETH', 'EUR');
        // subscription.on('data', data => {
        //   data.forEach(trade => {
        //     this.$.poloetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
        //   });
        // });
        // subscription = this.$.kraken.subscribeTrades('ETH', 'EUR');
        // subscription.on('data', data => {
        //   data.forEach(trade => {
        //     this.$.krakenetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
        //   });
        // });
        // subscription = this.$.okcoin.subscribeTrades('ETH', 'EUR');
        // subscription.on('data', data => {
        //   data.forEach(trade => {
        //     this.$.okcoinetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
        //   });
        // });

        subscription = this.$.polo.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.polobcheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        subscription = this.$.kraken.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.krakenbcheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        subscription = this.$.kraken.subscribeTrades('ETH', 'USD');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.krakenbchusd.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        subscription = this.$.bithumb.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.bithumbbcheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.polo.subscribeTrades('ETH', 'BTC');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.polobchbtc.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });
        subscription = this.$.kraken.subscribeTrades('ETH', 'BTC');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.krakenbchbtc.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        // subscription = this.$.bithumb.subscribeTrades('BTC', 'EUR');
        // subscription.on('data', data => {
        //   data.forEach(trade => {
        //     console.log(`TRADE ${trade.type === BUY ? 'BUY' : 'SELL'} ${trade.price} ${trade.amount} ${trade.timestamp.toISOString()}`);
        //   });
        // });

        // subscription = this.$.okcoin.subscribeTrades('BTC', 'CNY');
        // subscription.on('data', data => {
        //   data.forEach(trade => {
        //     console.log(`TRADE ${trade.type === BUY ? 'BUY' : 'SELL'} ${trade.price} ${trade.amount}`);
        //   });
        // });
        //
        // subscription = this.$.okcoin.subscribeOrderBook('BTC', 'CNY');
        // subscription.on('data', data => {
        //   data.forEach(order => {
        //     console.log(`${order.type === BUY ? 'BUY' : 'SELL'} ${order.price}: ${order.amount >= 0 ? '+' + order.amount : order.amount}`);
        //   });
        // });
      }, 1000);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
