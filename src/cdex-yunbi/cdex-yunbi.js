{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  // TODO: list the accepted coins
  const ACCEPTED_BASES = [];
  const ACCEPTED_CURRENCIES = ['CNY'];

  const MILLISECS = 1000;

  const orderBooks = {};

  let sock;

  class CDexYunbi extends CDexExchange {
    static get is() {
      return 'cdex-yunbi';
    }

    _startSubscription(requestKey) {
      if (sock === undefined) {
        this.__connect();
      }
      if (sock.readyState === 1) {
        this.__subscribe(sock, requestKey);
      }
    }

    _cancelSubscription(requestKey) {
      if (sock !== undefined) {
        this.__unsubscribe(requestKey);
      }
    }

    _startRequest(requestKey) {
      // Fire a single request with the key and push the response to this._requests[requestKey]
      if (orderBooks[requestKey] !== undefined) {
        this.__sendInitialOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      return this.__getPairString(subscription.base, subscription.currency);
    }

    __connect() {
      console.info('Yunbi - connecting backend');
      sock = new WebSocket('wss://slanger.yunbi.com:18080/app/d2e734a0694b3cb3ed8cdcadcc6f346e?protocol=7&client=js&version=2.2.0&flash=false');

      sock.addEventListener('open', () => {
        console.info('Yunbi - connected');
        Object.keys(this._subscriptions).forEach(requestKey => {
          this.__subscribe(sock, requestKey);
        });
      });

      sock.addEventListener('close', () => {
        console.error('Yunbi - connection closed');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('error', () => {
        console.error('Yunbi - connection error');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('message', msg => {
        this.__handleTransaction(JSON.parse(msg.data));
      });
    }

    __subscribe(sock, requestKey) {
      console.info(`Yunbi - subscribing to ${requestKey}`);
      orderBooks[requestKey] = undefined;
      sock.send(`{"event": "pusher:subscribe", "data": {"channel": "${requestKey}"}}`);
    }

    __unsubscribe(requestKey) {
      console.info(`Yunbi - unsubscribing from ${requestKey}`);
      sock.send(`{event: "pusher:unsubscribe", data: {channel: "${requestKey}"}}`);
    }

    __handleTransaction(tx) {
      let requestKey = tx.channel;
      let data = JSON.parse(tx.data);

      switch (tx.event) {
        case 'trades':
          let trades = data.trades.map(trade => {
            return {
              price: Number(trade.price),
              amount: Number(trade.amount),
              type: trade.type === 'buy' ? BUY : SELL,
              timestamp: new Date(Number(trade.date) * MILLISECS)
            };
          });
          let subscriptions = this._subscriptions[requestKey].filter(subscription => {
            return subscription.type === TRADES;
          });
          subscriptions.forEach(subscription => {
            let result = this.__calculateCurrency(requestKey, subscription, trades);
            subscription.data(result);
          });
          return;
        case 'update':
          // TODO: find difference between current and last orderbook and notify subscribers of the difference.
          orderBooks[requestKey] = data;
          this.__sendInitialOrderBook(requestKey);
          return;
        default:
        // ignore
      }
    }

    // TODO: Shared with Poloniex
    __sendInitialOrderBook(requestKey) {
      if (this._requests[requestKey] !== undefined) {
        this._requests[requestKey].forEach(subscription => {
          subscription.data(orderBooks[requestKey]);
        });
      }
    }

    // TODO: shared with Poloniex
    __calculateCurrency(requestKey, subscription, list) {
      let convert = requestKey.startsWith(subscription.base);
      let convertedData = list.map(event => {
        let data = {
          type: event.type,
          amount: event.amount,
          price: event.price
        };
        if (event.timestamp) {
          data.timestamp = event.timestamp;
        }
        if (convert) {
          data.amount = event.amount * event.price;
          data.price = 1 / event.price;
        }
        return data;
      });

      return convertedData;
    }

    __getPairString(coin1, coin2) {
      return `market-${this.__getCoinOrder(coin1, coin2).join('').toLowerCase()}-global`;
    }

    // Returns the coins in the order of importance according to this exchange.
    __getCoinOrder(coin1, coin2) {
      if (ACCEPTED_CURRENCIES.includes(coin1)) {
        return [coin2, coin1];
      }
      if (ACCEPTED_CURRENCIES.includes(coin2)) {
        return [coin1, coin2];
      }
      // Else: currency conversion needed.
    }
  }

  customElements.define(CDexYunbi.is, CDexYunbi);
}
