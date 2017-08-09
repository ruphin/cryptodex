{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  const ACCEPTED_BASES = ['BTC', 'ETH', 'DASH', 'LTC', 'ETC', 'XRP', 'BCH'];
  const ACCEPTED_CURRENCIES = ['EUR', 'USD', 'KRW'];

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

  class CDexBithumb extends CDexExchange {
    static get is() {
      return 'cdex-bithumb';
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
      if (!ACCEPTED_BASES.includes(subscription.base)) {
        throw `Base ${subscription.base} is not supported by Bithumb`;
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

  customElements.define(CDexBithumb.is, CDexBithumb);
}
