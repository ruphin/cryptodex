{
  const TRADES = Symbol.for('trades');
  const ORDERS = Symbol.for('orders');

  // This Class is designed to be extended by implementation for each exchange.
  // Each exchange must implement the following methods:
  //   _startSubscription(requestKey)
  //     Starts a backend connection for this requestKey
  //
  //   _cancelSubscription(requestKey)
  //     Stop the backend connection for this requestKey
  //
  //   _startRequest(requestKey)
  //     Start a single backend request for this requestKey
  //
  //  _requestKey(subscription)
  //    Returns a string that functions as a key for this subscription.
  //    It is based on the following properties:
  //      - subscription.base
  //      - subscription.currency
  //      - subscription.type
  //    The requestKey should map these properties to a unique object per backend query.
  //    For example, {BTC, EUR, TRADES} and {BTC, USD, TRADES} should map to the same string if there is only one fiat currency
  class CDexExchange extends Gluon.Element {
    constructor() {
      super();
      // Initialize class singletons for subscriptions and requests
      this.constructor.__subscriptions = this.constructor.__subscriptions || {};
      this.constructor.__requests = this.constructor.__requests || {};
      this._subscriptions = this.constructor.__subscriptions;
      this._requests = this.constructor.__requests;
    }

    getOrderBook(base, currency) {
      let subscription = new Subscription();
      let type = ORDERS;
      let cancel = () => this._cancelRequest(subscription);
      Object.assign(subscription, { base, currency, cancel, type });
      this.__fudgeRequest(subscription, 'get');
      return subscription;
    }

    subscribeOrderBook(base, currency) {
      let subscription = new Subscription();
      let type = ORDERS;
      let cancel = () => this._cancelSubscription(subscription);
      Object.assign(subscription, { base, currency, cancel, type });
      this.__fudgeSubscription(subscription, 'subscribe');
      return subscription;
    }

    subscribeTrades(base, currency) {
      let subscription = new Subscription();
      let type = TRADES;
      let cancel = () => this._cancelSubscription(subscription);
      Object.assign(subscription, { base, currency, cancel, type });
      this.__fudgeSubscription(subscription, 'subscribe');
      return subscription;
    }

    // This is the default implementation that simply coerces all relevant properties
    // Most exchanges will want to override this
    _requestKey(subscription) {
      return `${subscription.base}_${subscription.currency}_${String(subscription.type)}`;
    }

    __fudgeSubscription(subscription) {
      let requestKey = this._requestKey(subscription);
      if (this._subscriptions[requestKey]) {
        // This requestKey already has subscriptions, so just add this one to the list
        this._subscriptions[requestKey].push(subscription);
      } else {
        // This requestKey has no subscriptions yet. We need to start a new backend connection
        this._subscriptions[requestKey] = [subscription];
        this._startSubscription(requestKey);
      }
    }

    __fudgeRequest(subscription) {
      let requestKey = this._requestKey(subscription);
      if (this._requests[requestKey]) {
        // This requestKey already has subscriptions, so just add this one to the list
        this._requests[requestKey].push(subscription);
      } else {
        // This requestKey has no subscriptions yet. We need to start a new backend connection
        this._requests[requestKey] = [subscription];
        this._startRequest(requestKey);
      }
    }
  }

  // The subscription class is what is returned from exchange API calls.
  class Subscription {
    constructor() {
      this.handlers = {
        data: [],
        error: []
      };
      this._cache = {
        data: [],
        error: []
      };
    }

    // This is used by the subscriber to attach callbacks to events
    on(eventType, handler) {
      // Register the handler
      this.handlers[eventType].push(handler);
      // If this is the first handler for an event type and the cache for this event type is not empty
      if (this.handlers[eventType].length === 1 && this._cache[eventType] >= 0) {
        // Fire the handler for each item in the cache
        this._cache[eventType].forEach(payload => {
          __processEvent(eventType, payload);
        });
        // Clear the cache
        this._cache[eventType] = [];
      }
    }

    // This is called by exchanges to pass data to the subscriber
    data(data) {
      this.__processEvent('data', data);
    }

    // This is called by exchanges to notify the subscriber of errors
    error(error) {
      this.__processEvent('error', error);
    }

    __processEvent(type, payload) {
      if (this.handlers[type].length === 0) {
        this._cache[type].push(payload);
      } else {
        this.handlers[type].forEach(handler => {
          handler(payload);
        });
      }
    }
  }

  window.CDexExchange = CDexExchange;
}
