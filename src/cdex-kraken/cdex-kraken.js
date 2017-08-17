{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  const FIAT = ['EUR', 'USD', 'GBP', 'KRW', 'JPY', 'CAD'];

  const PAIRS = {
    DOGE: { BTC: 'XXDGXXBT' },
    DASH: { BTC: 'DASHXBT', EUR: 'DASHEUR', USD: 'DASHUSD' },
    ETC: { BTC: 'XETCXXBT', ETH: 'XETCXETH', EUR: 'XETCZEUR', USD: 'XETCZUSD' },
    ETH: { BTC: 'XETHXXBT', CAD: 'XETHZCAD', EUR: 'XETHZEUR', GBP: 'XETHZGBP', JPY: 'XETHZJPY', USD: 'XETHZUSD' },
    XLM: { BTC: 'XXLMXXBT', EUR: 'XXLMZEUR', USD: 'XXLMZUSD' },
    EOS: { BTC: 'EOSBTC', ETH: 'EOSETH', EUR: 'EOSEUR', USD: 'EOSUSD' },
    ZEC: { BTC: 'XZECXXBT', EUR: 'XZECZEUR', USD: 'XZECZUSD' },
    ICN: { BTC: 'XICNXBTC', ETH: 'XICNXETH' },
    BCH: { BTC: 'BCHXBT', EUR: 'BCHEUR', USD: 'BCHUSD' },
    BTC: { CAD: 'XXBTZCAD', EUR: 'XXBTZEUR', GBP: 'XXBTZGBP', JPY: 'XXBTZJPY', USD: 'XXBTZUSD' },
    MLN: { BTC: 'XMLNXXBT', ETH: 'XMLNXETH' },
    LTC: { BTC: 'XLTCXXBT', CAD: 'XLTCZCAD', EUR: 'XLTCZEUR', USD: 'XLTCZUSD' },
    XRP: { BTC: 'XXRPXXBT', CAD: 'XXRPZCAD', EUR: 'XXRPZEUR', JPY: 'XXRPZJPY', USD: 'XXRPZUSD' },
    XMR: { BTC: 'XXMRXXBT', EUR: 'XXMRZEUR', USD: 'XXMRZUSD' },
    GNO: { BTC: 'GNOBTC', ETH: 'GNOETH', EUR: 'GNOEUR', USD: 'GNOUSD' },
    REP: { BTC: 'XREPXBTC', ETH: 'XREPZETH', EUR: 'XREPZEUR', USD: 'XREPZUSD' }
  };

  const poll = requestKey => {
    // Sadly these endpoints are blocked by CORS, so we're done here. Shoulda tested that sooner :<
    fetch(`https://api.bithumb.com/public/${requestKey}`)
      .then(response => {
        return response.json();
      })
      .then(data => {
        console.log(data);
        // Feed data to this._subscriptions[requestKey]
      });
    // Poll again after 10 seconds
    setTimeout(() => poll(requestKey), 10000 - new Date().getTime() % 10000);
  };

  class CDexKraken extends CDexExchange {
    static get is() {
      return 'cdex-kraken';
    }

    _startSubscription(requestKey) {
      // Start the poll loop for this requestKey
      poll(requestKey);
    }

    _cancelSubscription(requestKey) {
      // Stop the poll loop for this requestKey
    }

    _startRequest(requestKey) {
      // Fire a single request with the key and push the response to this._requests[requestKey]
    }

    _requestKey(subscription) {
      let key, base, currency;
      if (PAIRS.includes(subscription.base)) {
        key = PAIRS[subscription.base][subscription.currency];
        base = subscription.base;
        currency = subscription.currency;
      } else if (PAIRS.includes(subscription.currency)) {
        key = PAIRS[subscription.currency][subscription.base];
        base = subscription.currency;
        currency = subscription.base;
      }

      if (key === undefined) {
        throw `Poloniex - Unsupported: ${subscription.base} - ${subscription.currency}`;
      }

      if (!ACCEPTED_CURRENCIES.includes(subscription.currency)) {
        throw `Currency ${subscription.currency} is not supported by Bithumb`;
      }

      let type;
      if ((subscription.type = TRADES)) {
        type = 'recent_transactions/';
      } else if ((subscription.type = ORDERS)) {
        type = 'orderbook/';
      } else {
        throw `Unknown subscription type: ${subscription.type}`;
      }

      return `${type}${subscription.base}`;
    }
  }

  customElements.define(CDexKraken.is, CDexKraken);
}
