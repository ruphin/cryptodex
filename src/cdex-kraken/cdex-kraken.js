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

  // PAIRS[base][currency]
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

  const lastMap = {};

  class CDexKraken extends CDexExchange {
    static get is() {
      return 'cdex-kraken';
    }

    _startSubscription(requestKey) {
      console.log('STARTING SUBSCRIPTION');
      // Start the poll loop for this requestKey
      this.__poll(requestKey);
    }

    _cancelSubscription(requestKey) {
      // Stop the poll loop for this requestKey
    }

    _startRequest(requestKey) {
      // Fire a single request with the key and push the response to this._requests[requestKey]
    }

    _requestKey(subscription) {
      let base = subscription.base;
      let currency = subscription.currency;
      let key;

      if (PAIRS[base] && (PAIRS[base][currency] || FIAT.includes(currency))) {
        if (!PAIRS[base][currency]) {
          currency = 'EUR'; // Default to EUR for non-listed fiat
        }
      } else if (PAIRS[currency] && (PAIRS[currency][base] || FIAT.includes(base))) {
        base = currency;
        if (!PAIRS[currency][base]) {
          currency = 'EUR'; // Default to EUR for non-listed fiat
        } else {
          currency = subcription.base;
        }
      } else {
        throw 'Requested pair ${subscription.base} - ${subscription.currency} is not traded on Kraken';
      }

      key = `${PAIRS[base][currency]}_${String(subscription.type)}`;
      return [key, base, currency];
    }

    __poll(requestKey) {
      let pair = requestKey.split('_')[0];
      let since = (lastMap[requestKey] && `&since=${lastMap[requestKey]}`) || '';
      fetch(`https://api.kraken.com/0/public/Trades?pair=${pair}${since}`)
        .then(response => {
          return response.json();
        })
        .then(data => {
          data = data.result;
          lastMap[requestKey] = data.last;
          let trades = data[pair].map(trade => {
            let price = Number(trade[0]);
            let amount = Number(trade[1]);
            let timestamp = new Date(Math.floor(trade[2] * 1000));
            let type = trade[3] === 'b' ? BUY : SELL;
            return { type, timestamp, amount, price };
          });
          this._subscriptions[requestKey].forEach(subscription => {
            subscription.data(trades);
          });
        });
      // Poll again after 10 seconds
      setTimeout(() => this.__poll(requestKey), 10000 - new Date().getTime() % 10000);
    }
  }

  customElements.define(CDexKraken.is, CDexKraken);
}
