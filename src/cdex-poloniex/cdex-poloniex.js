{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  // TODO: list all accepted coin pairs
  const ACCEPTED_BASES = ['BTC', 'ETH', 'XMR', 'USD', 'EUR'];
  const ACCEPTED_CURRENCIES = ['EUR', 'USD', 'KRW'];

  const MILLISECS = 1000;

  const pairIds = {};
  const orderBooks = {};

  let sock;

  class CDexPoloniex extends CDexExchange {
    static get is() {
      return 'cdex-poloniex';
    }

    _startSubscription(requestKey) {
      if (sock === undefined) {
        this.__connect();
      }
      if (sock.readyState === 1) {
        this.__subscribe(requestKey);
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
      console.info('Poloniex - connecting backend');
      sock = new WebSocket('wss://api2.poloniex.com');

      sock.addEventListener('open', () => {
        console.info('Poloniex - connected');
        Object.keys(this._subscriptions).forEach(requestKey => {
          this.__subscribe(requestKey);
        });
      });

      sock.addEventListener('close', () => {
        console.error('Poloniex - connection closed');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('error', () => {
        console.error('Poloniex - connection error');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('message', msg => {
        this.__handleTransaction(JSON.parse(msg.data));
      });
    }

    __subscribe(requestKey) {
      console.info(`Poloniex - subscribing to ${requestKey}`);
      orderBooks[requestKey] = undefined;
      sock.send(`{"command":"subscribe","channel":"${requestKey}"}`);
    }

    __unsubscribe(requestKey) {
      console.info(`Poloniex - unsubscribing from ${requestKey}`);
      sock.send(`{"command":"unsubscribe","channel":"${requestKey}"}`);
    }

    __handleTransaction(tx) {
      if (tx[0] > 1000) {
        return;
      }
      if (tx[2] && tx[2][0][0] === 'i') {
        pairIds[tx[0]] = tx[2][0][1].currencyPair;
        let requestKey = pairIds[tx[0]];
        let orderBook = tx[2][0][1].orderBook;
        orderBooks[requestKey] = orderBook;
        this.__sendInitialOrderBook(requestKey);
        return;
      }
      let requestKey = pairIds[tx[0]];
      if (requestKey === undefined) {
        console.error(`Poloniex - message for undefined currency pair: ${tx[0]}`);
        return;
      }

      let events = {};
      events[ORDERS] = [];
      events[TRADES] = [];
      let type, price, amount;
      tx[2].forEach(event => {
        switch (event[0]) {
          case 't': // Trade event
            price = Number(event[3]);
            amount = Number(event[4]);
            if (event[2] === 1) {
              type = BUY;
            } else {
              type = SELL;
            }
            let timestamp = new Date(Number(event[5]) * MILLISECS);

            events[TRADES].push({ type, timestamp, amount, price });
            break;

          case 'o': // Order book event
            price = Number(event[2]);
            amount = Number(event[3]);
            if (event[1] === 1) {
              type = BUY;
            } else {
              type = SELL;
            }
            events[ORDERS].push({ type, amount, price });
            break;
        }
      });

      let cache = {};
      this._subscriptions[requestKey].forEach(subscription => {
        let list = events[subscription.type];
        if (list !== undefined && list.length > 0) {
          let key = `${subscription.base}_${subscription.currency}`;
          let result = cache[key];
          if (result === undefined) {
            result = this.__calculateCurrency(requestKey, subscription, list);
            cache[key] = result;
          }
          subscription.data(result);
        }
      });
    }

    __sendInitialOrderBook(requestKey) {
      if (this._requests[requestKey] !== undefined) {
        this._requests[requestKey].forEach(subscription => {
          subscription.data(orderBooks[requestKey]);
        });
      }
    }

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
      return this.__getCoinOrder(coin1, coin2).join('_');
    }

    // Returns the coins in the order of importance according to this exchange.
    __getCoinOrder(coin1, coin2) {
      if (coin1 === 'USDT') {
        return [coin1, coin2];
      }
      if (coin2 === 'USDT') {
        return [coin2, coin1];
      }
      if (coin1 === 'BTC') {
        return [coin1, coin2];
      }
      if (coin2 === 'BTC') {
        return [coin2, coin1];
      }
      if (coin1 === 'ETH') {
        return [coin1, coin2];
      }
      if (coin2 === 'ETH') {
        return [coin2, coin1];
      }
      if (coin1 === 'XMR') {
        return [coin1, coin2];
      }
      if (coin2 === 'XMR') {
        return [coin2, coin1];
      }
    }
  }

  customElements.define(CDexPoloniex.is, CDexPoloniex);
}
