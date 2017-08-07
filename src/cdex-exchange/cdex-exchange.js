{
  const TRADES = Symbol.for('trades');
  const ORDERS = Symbol.for('orders');

  // This Class is designed to be extended by implementation for each exchange.
  // Each exchange must implement the following methods:
  //   _startSubscription(subscription)
  //     Starts pushing trade or order changes to a subscription
  //
  //   _cancelSubscription(subscription)
  //     Cancels pushing trade or order changes to a subscription
  //
  //   _startRequest(subscription)
  //     Pushes the requested data to the subscription once
  //
  //   _cancelRequest(subscription)
  //     Cancels pushing the requested data to the subscription
  class CDexExchange extends Gluon.Element {
    getOrderBook(base, currency) {
      let subscription = new Subscription();
      let type = ORDERS;
      let cancel = () => this._cancelRequest(subscription);
      Object.assign(subscription, {base, currency, cancel, type});
      this._startRequest(subscription);
      return subscription;
    }

    subscribeOrderBook(base, currency) {
      let subscription = new Subscription();
      let type = ORDERS;
      let cancel = () => this._cancelSubscription(subscription);
      Object.assign(subscription, {base, currency, cancel, type});
      this._startSubscription(subscription);
      return subscription;
    }

    subscribeTrades(base, currency) {
      let subscription = new Subscription();
      let type = TRADES;
      let cancel = () => this._cancelSubscription(subscription);
      Object.assign(subscription, {base, currency, cancel, type});
      this._startSubscription(subscription);
      return subscription;
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
