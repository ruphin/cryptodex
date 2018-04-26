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
    BTC: { USD: 'BTCUSD' },
    BCH: { BTC: 'BCHBTC', ETH: 'BCHETH', USD: 'BCHUSD' },
    DASH: { BTC: 'DASHBTC', USD: 'DASHUSD' },
    ETH: { BTC: 'ETHBTC', USD: 'ETHUSD' },
    ZEC: { BTC: 'ZECBTC', USD: 'ZECUSD' },
    XMR: { BTC: 'XMRBTC', USD: 'XMRUSD' },
    ETC: { BTC: 'LTCBTC', USD: 'LTCUSD' },
    OMG: { BTC: 'OMGBTC', ETH: 'OMGETH', USD: 'OMGUSD' },
    EOS: { BTC: 'EOSBTC', ETH: 'EOSETH', USD: 'EOSUSD' },
    IOTA: { BTC: 'IOTABTC', ETH: 'IOTAETH', USD: 'IOTAUSD' },
    RRT: { BTC: 'RRTBTC', USD: 'RRTUSD' },
    XRP: { BTC: 'XRPBTC', USD: 'XRPUSD' }
  };
  const MILLISECS = 1000;
  const chanIds = {};

  let sock;

  class CdexBitfinex extends CDexExchange {
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
        key = String(subscription.type) + PAIRS[base][currency];
      } else if (PAIRS[currency] && PAIRS[currency][base]) {
        key = String(subscription.type) + PAIRS[currency][base];
        [base, currency] = [currency, base];
      } else {
        throw 'Requested pair ${subscription.base} - ${subscription.currency} is not traded on Bitfinex';
      }
      return [key, base, currency];
    }

    // PRIVATE

    __connect() {
      console.debug('Bitfinex - connecting backend');
      sock = new WebSocket('wss://api.bitfinex.com/ws/2');

      sock.addEventListener('open', () => {
        console.debug('Bitfinex - connected');
        Object.keys(this._subscriptions).forEach(requestKey => {
          this.__subscribe(this._subscriptions[requestKey][0]);
        });
      });

      sock.addEventListener('close', () => {
        console.error('Bitfinex - connection closed');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('error', () => {
        console.error('Bitfinex - connection error');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('message', msg => {
        this.__handleMessage(JSON.parse(msg.data));
      });
    }

    __subscribe(requestKey) {
      let subscription = this._subscriptions[requestKey][0];
      let symbol = `t${subscription.requestBase}${subscription.requestCurrency}`;
      console.debug(`Bitfinex - subscribing to ${symbol}`);
      this._orderBooks[requestKey] = undefined;
      sock.send(`{"event": "subscribe","channel": "trades","symbol": "${symbol}"}`);
    }

    __unsubscribe(requestKey) {
      let chanId = chanIds[requestKey];
      sock.send(`{"event": "unsubscribe","chanid": "${chanId}"}`);
    }

    __handleMessage(msg) {
      // Subscription confirmation
      if (msg.event === 'subscribed') {
        chanIds[msg.chanId] = msg.pair;
        return;
      }

      let chanId = msg[0];
      if (chanId === undefined) {
        console.error(`Bitfinex - message for undefined currency pair: ${tx[0]}`);
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

  customElements.define(CDexPoloniex.is, CDexPoloniex);
}
