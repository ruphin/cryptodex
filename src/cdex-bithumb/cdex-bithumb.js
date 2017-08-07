{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  const ACCEPTED_BASES = ['BTC', 'ETH', 'DASH', 'LTC', 'ETC', 'XRP', 'BCH'];
  const ACCEPTED_CURRENCIES = ['EUR', 'USD', 'KRW'];

  // These are singletons shared between all instances of CDexBithumb
  const subscriptions = {};
  const requests = {};
  let polling = false;
  const poll = () => {
    Object.keys(subscriptions).forEach(requestKey => {
      // Sadly these endpoints are blocked by CORS, so we're done here. Shoulda tested that sooner :<
      fetch(`https://api.bithumb.com/public/${requestKey}`).then(response => {
        return response.json();
      }).then(data => {
        console.log(data)
      })
    });
    // Poll again after 10 seconds
    setTimeout(() => poll(), 10000 - new Date().getTime() % 10000);
  }

  class CDexBithumb extends CDexExchange {
    static get is() { return 'cdex-bithumb' }

    constructor() {
      super();
      // Start polling if we were not already doing so.
      if (!polling) {
        polling = true;
        poll();
      }
    }

    _startSubscription(subscription) {
      let requestKey = this.__requestKey(subscription);
      if (subscriptions[requestKey]) {
        // This requestKey already has subscriptions, so just add this one to the list
        subscriptions[requestKey].push(subscription);
      } else {
        // This requestKey has no subscriptions yet. We need to start a new backend connection
        subscriptions[requestKey] = [subscription]

        // Connect to backend
      }
    }

    _cancelSubscription(subscription) {
      let requestKey = this.__requestKey(subscription);
      subscriptions[requestKey] = subscriptions[requestKey].arr.filter(s => s !== subscription);
      if (subscriptions[requestKey].length === 0) {
        delete subscriptions[requestKey];
        // No remaining subscriptions for this requestKey. Cancel our backend connection

        // TODO: Cancel backend connection
      }
    }

    _startRequest(request) {
      let requestKey = this.__requestKey(request);
      if (this.requests[requestKey]) {
        // This requestKey already has observers, so just add this one to the list
        this.requests[requestKey].push(request);
      } else {
        // This requestKey has no observers yet. We need to fire the request to fulfill this request
        this.requests[requestKey] = [request]

        // Fetch data from backend
        this.__generateRequest(requestKey);
      }
    }

    _cancelRequest(request) {
      let requestKey = this.__requestKey(request);
      this.requests[requestKey] = this.requests[requestKey].arr.filter(r => r !== request);
      if (this.requests[requestKey].length === 0) {
        delete this.requests[requestKey];
        // No remaining observers for this requestKey. We can cancel the backend request maybe?

        // TODO: Cancel backend request maybe? Don't think this is necessary, it will just resolve and not notify anyone.
      }
    }

    __requestKey(subscription) {
      if (!ACCEPTED_BASES.includes(subscription.base)) {
        throw `Base ${subscription.base} is not supported by Bithumb`;
      }

      if (!ACCEPTED_CURRENCIES.includes(subscription.currency)) {
        throw `Currency ${subscription.currency} is not supported by Bithumb`;
      }

      let type;
      if (subscription.type = TRADES) {
        type = 'recent_transactions/'
      } else if (subscription.type = ORDERS) {
        type = 'orderbook/'
      } else {
        throw `Unknown subscription type: ${subscription.type}`;
      }

      return `${type}${subscription.base}`;
    }
  }

  customElements.define(CDexBithumb.is, CDexBithumb)
}
