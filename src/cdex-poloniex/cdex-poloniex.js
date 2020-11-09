import { CDexExchange } from '../cdex-exchange/cdex-exchange.js';

export default undefined;

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
  BTC: { USD: 'USDT_BTC' },
  ETH: { BTC: 'BTC_ETH', USD: 'USDT_ETH' },
  XRP: { BTC: 'BTC_XRP', USD: 'USDT_XRP' },
  LTC: { BTC: 'BTC_LTC', XMR: 'XMR_LTC', USD: 'USDT_LTC' },
  DGB: { BTC: 'BTC_DGB' },
  DASH: { BTC: 'BTC_DASH', XMR: 'XMR_DASH', USD: 'USDT_DASH' },
  STR: { BTC: 'BTC_STR', USD: 'USDT_STR' },
  BCH: { BTC: 'BTC_BCH', ETH: 'ETH_BCH', USD: 'USDT_BCH' },
  STRAT: { BTC: 'BTC_STRAT' },
  SC: { BTC: 'BTC_SC' },
  XEM: { BTC: 'BTC_XEM' },
  XMR: { BTC: 'BTC_XMR', USD: 'USDT_XMR' },
  BTS: { BTC: 'BTC_BTS' },
  ETC: { BTC: 'BTC_ETC', ETH: 'ETH_ETC', USD: 'USDT_ETC' },
  ZEC: { BTC: 'BTC_ZEC', ETH: 'ETH_ZEC', XMR: 'XMR_ZEC', USD: 'USDT_ZEC' },
  FCT: { BTC: 'BTC_FCT' },
  NXT: { BTC: 'BTC_NXT', XMR: 'XMR_NXT', USD: 'USDT_NXT' },
  GAME: { BTC: 'BTC_GAME' },
  GNT: { BTC: 'BTC_GNT', ETH: 'ETH_GNT' },
  MAID: { BTC: 'BTC_MAID', XMR: 'XMR_MAID' },
  LBC: { BTC: 'BTC_LBC' },
  DCR: { BTC: 'BTC_DCR' },
  BURST: { BTC: 'BTC_BURST' },
  LSK: { BTC: 'BTC_LSK', ETH: 'ETH_LSK' },
  NEOS: { BTC: 'BTC_NEOS' },
  BCN: { BTC: 'BTC_BCN', XMR: 'XMR_BCN' },
  DOGE: { BTC: 'BTC_DOGE' },
  REP: { BTC: 'BTC_REP', ETH: 'ETH_REP', USD: 'USDT_REP' },
  STEEM: { BTC: 'BTC_STEEM', ETH: 'ETH_STEEM' },
  CLAM: { BTC: 'BTC_CLAM' },
  SJCX: { BTC: 'BTC_SJCX' },
  ARDR: { BTC: 'BTC_ARDR' },
  SYS: { BTC: 'BTC_SYS' },
  GNO: { BTC: 'BTC_GNO', ETH: 'ETH_GNO' },
  XCP: { BTC: 'BTC_XCP' },
  BELA: { BTC: 'BTC_BELA' },
  RADS: { BTC: 'BTC_RADS' },
  EMC2: { BTC: 'BTC_EMC2' },
  NMC: { BTC: 'BTC_NMC' },
  NAUT: { BTC: 'BTC_NAUT' },
  NXC: { BTC: 'BTC_NXC' },
  VIA: { BTC: 'BTC_VIA' },
  NAV: { BTC: 'BTC_NAV' },
  OMNI: { BTC: 'BTC_OMNI' },
  POT: { BTC: 'BTC_POT' },
  NOTE: { BTC: 'BTC_NOTE' },
  XBC: { BTC: 'BTC_XBC' },
  AMP: { BTC: 'BTC_AMP' },
  VTC: { BTC: 'BTC_VTC' },
  PPC: { BTC: 'BTC_PPC' },
  EXP: { BTC: 'BTC_EXP' },
  FLDC: { BTC: 'BTC_FLDC' },
  PASC: { BTC: 'BTC_PASC' },
  BCY: { BTC: 'BTC_BCY' },
  FLO: { BTC: 'BTC_FLO' },
  BTM: { BTC: 'BTC_BTM' },
  BTCD: { BTC: 'BTC_BTCD', XMR: 'XMR_BTCD' },
  PINK: { BTC: 'BTC_PINK' },
  VRC: { BTC: 'BTC_VRC' },
  BLK: { BTC: 'BTC_BLK', XMR: 'XMR_BLK' },
  XPM: { BTC: 'BTC_XPM' },
  GRC: { BTC: 'BTC_GRC' },
  RIC: { BTC: 'BTC_RIC' },
  XVC: { BTC: 'BTC_XVC' },
  HUC: { BTC: 'BTC_HUC' },
  SBD: { BTC: 'BTC_SBD' }
};
const MILLISECS = 1000;
const pairIds = {};

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

customElements.define(CDexPoloniex.is, CDexPoloniex);
