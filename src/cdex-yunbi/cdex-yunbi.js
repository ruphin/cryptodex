{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  // TODO: list the accepted base coins
  const ACCEPTED_BASES = ['BTC', 'ETH', 'ETC'];
  const MILLISECS = 1000;

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
      if (orderBooks[requestKey] !== undefined) {
        this._sendOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      let [requestBase, requestCurrency] = this.__getCoinOrder(subscription.base, subscription.currency);
      // Currently the request currency has to be CNY.
      requestCurrency = 'CNY';
      let requestKey = `market-${requestBase.toLowerCase()}${requestCurrency.toLowerCase()}-global`;
      return [requestKey, requestBase, requestCurrency];
    }

    // PRIVATE

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
      this._orderBooks[requestKey] = undefined;
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
          this._sendData(trades, requestKey, TRADES);
          return;
        case 'update':
          // TODO: find difference between current and last orderbook and notify subscribers of the difference.
          if (this._orderBooks[requestKey] === undefined) {
            this._orderBooks[requestKey] = this.__processInitialOrderBook(data);
            this._sendOrderBook(requestKey);
          }
          return;
        default:
        // ignore
      }
    }

    __processInitialOrderBook(data) {
      let orderBook = {};
      let reduceFunc = (obj, value) => {
        obj[value[0]] = value[1];
        return obj;
      };
      orderBook[BUY] = data.bids.reduce(reduceFunc, {});
      orderBook[SELL] = data.asks.reduce(reduceFunc, {});
      return orderBook;
    }

    // Returns the coins in the order of importance according to this exchange.
    __getCoinOrder(coin1, coin2) {
      if (ACCEPTED_BASES.includes(coin1)) {
        return [coin1, coin2];
      }
      if (ACCEPTED_BASES.includes(coin2)) {
        return [coin2, coin1];
      }
      throw `No accepted base found in ${coin1}-${coin2}. Accepted are: ${ACCEPTED_BASES.join(', ')}`;
    }
  }

  customElements.define(CDexYunbi.is, CDexYunbi);
}
