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
    BTC: {
      ETH: 'BTC_ETH',
      XRP: 'BTC_XRP',
      LTC: 'BTC_LTC',
      DGB: 'BTC_DGB',
      DASH: 'BTC_DASH',
      STR: 'BTC_STR',
      BCH: 'BTC_BCH',
      STRAT: 'BTC_STRAT',
      SC: 'BTC_SC',
      XEM: 'BTC_XEM',
      XMR: 'BTC_XMR',
      BTS: 'BTC_BTS',
      ETC: 'BTC_ETC',
      ZEC: 'BTC_ZEC',
      FCT: 'BTC_FCT',
      NXT: 'BTC_NXT',
      GAME: 'BTC_GAME',
      GNT: 'BTC_GNT',
      MAID: 'BTC_MAID',
      LBC: 'BTC_LBC',
      DCR: 'BTC_DCR',
      BURST: 'BTC_BURST',
      LSK: 'BTC_LSK',
      NEOS: 'BTC_NEOS',
      BCN: 'BTC_BCN',
      DOGE: 'BTC_DOGE',
      REP: 'BTC_REP',
      STEEM: 'BTC_STEEM',
      CLAM: 'BTC_CLAM',
      SJCX: 'BTC_SJCX',
      ARDR: 'BTC_ARDR',
      SYS: 'BTC_SYS',
      GNO: 'BTC_GNO',
      XCP: 'BTC_XCP',
      BELA: 'BTC_BELA',
      RADS: 'BTC_RADS',
      EMC2: 'BTC_EMC2',
      NMC: 'BTC_NMC',
      NAUT: 'BTC_NAUT',
      NXC: 'BTC_NXC',
      VIA: 'BTC_VIA',
      NAV: 'BTC_NAV',
      OMNI: 'BTC_OMNI',
      POT: 'BTC_POT',
      NOTE: 'BTC_NOTE',
      XBC: 'BTC_XBC',
      AMP: 'BTC_AMP',
      VTC: 'BTC_VTC',
      PPC: 'BTC_PPC',
      EXP: 'BTC_EXP',
      FLDC: 'BTC_FLDC',
      PASC: 'BTC_PASC',
      BCY: 'BTC_BCY',
      FLO: 'BTC_FLO',
      BTM: 'BTC_BTM',
      BTCD: 'BTC_BTCD',
      PINK: 'BTC_PINK',
      VRC: 'BTC_VRC',
      BLK: 'BTC_BLK',
      XPM: 'BTC_XPM',
      GRC: 'BTC_GRC',
      RIC: 'BTC_RIC',
      XVC: 'BTC_XVC',
      HUC: 'BTC_HUC',
      SBD: 'BTC_SBD'
    },
    ETH: {
      ZEC: 'ETH_ZEC',
      GNO: 'ETH_GNO',
      BCH: 'ETH_BCH',
      GNT: 'ETH_GNT',
      LSK: 'ETH_LSK',
      REP: 'ETH_REP',
      ETC: 'ETH_ETC',
      STEEM: 'ETH_STEEM'
    },
    XMR: {
      ZEC: 'XMR_ZEC',
      DASH: 'XMR_DASH',
      LTC: 'XMR_LTC',
      NXT: 'XMR_NXT',
      BCN: 'XMR_BCN',
      MAID: 'XMR_MAID',
      BLK: 'XMR_BLK',
      BTCD: 'XMR_BTCD'
    },
    USD: {
      BTC: 'USDT_BTC',
      ETH: 'USDT_ETH',
      DASH: 'USDT_DASH',
      XRP: 'USDT_XRP',
      LTC: 'USDT_LTC',
      ETC: 'USDT_ETC',
      BCH: 'USDT_BCH',
      NXT: 'USDT_NXT',
      ZEC: 'USDT_ZEC',
      STR: 'USDT_STR',
      XMR: 'USDT_XMR',
      REP: 'USDT_REP'
    }
  };

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
      if (orderBooks[requestKey] !== undefined) {
        this.__sendInitialOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      let base = subscription.base;
      let currency = subscription.currency;
      let key;
      if (FIAT.includes(subscription.base)) {
        base = 'USD';
      } else if (FIAT.includes(subscription.currency)) {
        base = 'USD';
        currency = subscription.base;
      }

      if (PAIRS[base] && PAIRS[base][currency]) {
        key = PAIRS[base][currency];
        [base, currency] = [currency, base];
      } else if (PAIRS[currency] && PAIRS[currency][base]) {
        key = PAIRS[currency][base];
      } else {
        throw 'Requested pair ${subscription.base} - ${subscription.currency} is not traded on Poloniex';
      }
      return [key, base, currency];
    }

    // PRIVATE

    __connect() {
      console.debug('Poloniex - connecting backend');
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
      orderBooks[requestKey] = undefined;
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
        let orderBook = tx[2][0][1].orderBook;
        orderBooks[requestKey] = orderBook;
        this.__sendInitialOrderBook(requestKey);
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
      let typeIndex = event[1];
      let type = typeIndex === 1 ? BUY : SELL;

      let orderBook = orderBooks[requestKey];
      let oldAmount = orderBook[typeIndex][price];
      if (oldAmount === undefined) {
        oldAmount = 0;
      }
      let amount = newAmount - oldAmount;
      orderBook[typeIndex][price] = newAmount;

      return { type, amount, price };
    }

    __sendInitialOrderBook(requestKey) {
      if (this._requests[requestKey] !== undefined) {
        this._requests[requestKey].forEach(subscription => {
          subscription.data(orderBooks[requestKey]);
        });
      }
    }
  }

  customElements.define(CDexPoloniex.is, CDexPoloniex);
}
