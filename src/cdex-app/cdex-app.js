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
        let subscription = this.$.polo.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.poloetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.polo.subscribeTrades('BTC', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.polobtceur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.kraken.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.krakenetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.kraken.subscribeTrades('BTC', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.krakenbtceur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.okcoin.subscribeTrades('ETH', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.okcoinetheur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        subscription = this.$.okcoin.subscribeTrades('BTC', 'EUR');
        subscription.on('data', data => {
          data.forEach(trade => {
            this.$.okcoinbtceur.addTransaction(trade.type, trade.timestamp, trade.amount);
          });
        });

        // subscription = this.$.polo.subscribeOrderBook('ETH', 'BTC');
        // subscription.on('data', data => {
        //   data.forEach(order => {
        //     console.log(`${order.type === BUY ? 'BUY' : 'SELL'} ${order.price}: ${order.amount >= 0 ? ('+' + order.amount) : order.amount}`)
        //   });
        // });

        // subscription = this.$.polo.getOrderBook('ETH', 'BTC');
        // subscription.on('data', data => {
        //   console.log('Order book ETH-BTC');
        //   let sellOrders = data[0];
        //   let buyOrders = data[1];
        //   console.log('Sell orders:');
        //   console.log(sellOrders);
        //   console.log('Buy orders:');
        //   console.log(buyOrders);
        // });

        // Yunbi

        /*subscription = this.$.yunbi.subscribeTrades('BTC', 'CNY');
        subscription.on('data', data => {
          console.log(data);
        });*/

        // OKCoin

        // subscription = this.$.okcoin.subscribeTrades("CNY", "BTC");
        // subscription.on("data", data => {
        //   console.log(data);
        // });
        //
        // subscription = this.$.okcoin.subscribeOrderBook("CNY", "BTC");
        // subscription.on("data", data => {
        //   data.forEach(order => {
        //     console.log(
        //       `${order.type === BUY
        //         ? "BUY"
        //         : "SELL"} ${order.price}: ${order.amount >= 0
        //         ? "+" + order.amount
        //         : order.amount}`
        //     );
        //   });
        // });
      }, 1000);
    }
  }

  customElements.define(CDexApp.is, CDexApp);
}
