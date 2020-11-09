{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  const FIAT = [
    'EUR',
    'AUD',
    'BGN',
    'BRL',
    'CAD',
    'CHF',
    'CNY',
    'CZK',
    'DKK',
    'GBP',
    'HKD',
    'HRK',
    'HUF',
    'IDR',
    'ILS',
    'INR',
    'JPY',
    'KRW',
    'MXN',
    'MYR',
    'NOK',
    'NZD',
    'PHP',
    'PLN',
    'RON',
    'RUB',
    'SEK',
    'SGD',
    'THB',
    'TRY',
    'USD',
    'ZAR'
  ];
  const PAIRS = {
    BTC: { USD: 'USDT_BTC', EUR: 'USDT_BTC', GBP: 'USDT_BTC' },
    ETH: { USD: 'USDT_BTC', EUR: 'USDT_BTC', BTC: 'USDT_BTC' },
    LTC: { USD: 'USDT_BTC', EUR: 'USDT_BTC', BTC: 'USDT_BTC' }
  };
  const MILLISECS = 1000;
  const pairIds = {};

  let sock;

  class CDexGdax extends CDexExchange {
    static get is() {
      return 'cdex-gdax';
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
      if (orderBooks[requestKey] !== undefined) {
        this._sendOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      let base = subscription.base;
      let currency = subscription.currency;
      let key;
      if (FIAT.includes(subscription.base)) {
        currency = 'USD';
        base = subscription.currency;
      } else if (FIAT.includes(subscription.currency)) {
        currency = 'USD';
      }

      if (PAIRS[base] && PAIRS[base][currency]) {
        key = PAIRS[base][currency];
      } else if (PAIRS[currency] && PAIRS[currency][base]) {
        key = PAIRS[currency][base];
        [base, currency] = [currency, base];
      } else {
        throw 'Requested pair ${subscription.base} - ${subscription.currency} is not traded on Poloniex';
      }
      key += String(subscription.type);
      return [key, base, currency];
    }

    // PRIVATE

    __connect() {
      console.debug('GDAX - connecting backend');
      sock = new WebSocket('wss://api2.poloniex.com');

      sock.addEventListener('open', () => {
        console.debug('Poloniex - connected');
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
      console.debug(`Poloniex - subscribing to ${requestKey}`);
      this._orderBooks[requestKey] = undefined;
      sock.send(`{"command":"subscribe","channel":"${requestKey}"}`);
    }

    __unsubscribe(requestKey) {
      console.debug(`Poloniex - unsubscribing from ${requestKey}`);
      sock.send(`{"command":"unsubscribe","channel":"${requestKey}"}`);
    }

    __handleTransaction(tx) {
      // Control message
      if (tx[0] > 1000) {
        return;
      }
      // Initial order book event
      if (tx[2] && tx[2][0][0] === 'i') {
        pairIds[tx[0]] = tx[2][0][1].currencyPair;
        let requestKey = pairIds[tx[0]];
        this._orderBooks[requestKey] = this.__processInitialOrderBook(tx[2][0][1].orderBook);
        this._sendOrderBook(requestKey);
        return;
      }
      // Check message is expected
      let requestKey = pairIds[tx[0]];
      if (requestKey === undefined) {
        console.error(`Poloniex - message for undefined currency pair: ${tx[0]}`);
        return;
      }

      // Process the event
      let events = {};
      events[ORDERS] = [];
      events[TRADES] = [];
      tx[2].forEach(event => {
        switch (event[0]) {
          case 't': // Trade event
            let tradeEvent = this.__processTradeEvent(event);
            events[TRADES].push(tradeEvent);
            break;

          case 'o': // Order book event
            let orderEvent = this.__processOrderEvent(requestKey, event);
            events[ORDERS].push(orderEvent);
            break;
        }
      });

      // Send data to subscriptions
      let cache = {};
      this._subscriptions[requestKey].forEach(subscription => {
        let list = events[subscription.type];
        if (list !== undefined && list.length > 0) {
          let key = `${subscription.base}_${subscription.currency}`;
          let result = cache[key];
          if (result === undefined) {
            result = subscription.convert(list);
            cache[key] = result;
          }
          subscription.data(result);
        }
      });
    }

    __processTradeEvent(event) {
      let price = Number(event[3]);
      let amount = Number(event[4]);
      let type = event[2] === 1 ? BUY : SELL;
      let timestamp = new Date(Number(event[5]) * MILLISECS);
      return { type, timestamp, amount, price };
    }

    __processOrderEvent(requestKey, event) {
      let price = Number(event[2]);
      let newAmount = Number(event[3]);
      let type = event[1] === 1 ? BUY : SELL;
      let orderBook = this._orderBooks[requestKey][type];
      let amount = this._updateOrderBook(orderBook, price, newAmount);
      return { type, amount, price };
    }

    __processInitialOrderBook(data) {
      let orderBook = {};
      data.forEach(obj => {
        for (let key in obj) {
          obj[key] = Number(obj[key]);
        }
      });
      orderBook[BUY] = data[1];
      orderBook[SELL] = data[0];
      return orderBook;
    }
  }

  customElements.define(CDexGdax.is, CDexGdax);
}
