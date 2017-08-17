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
      let cancel = () => this._cancelRequest(subscription);
      let type = ORDERS;
      Object.assign(subscription, { type, base, currency, cancel });
      this.__fudgeRequest(subscription);
      return subscription;
    }

    subscribeOrderBook(base, currency) {
      let subscription = new Subscription();
      let cancel = () => this._cancelSubscription(subscription);
      let type = ORDERS;
      Object.assign(subscription, { type, base, currency, cancel });
      this.__fudgeSubscription(subscription);
      return subscription;
    }

    subscribeTrades(base, currency) {
      let subscription = new Subscription();
      let type = TRADES;
      let cancel = () => this._cancelSubscription(subscription);
      Object.assign(subscription, { type, base, currency, cancel });
      this.__fudgeSubscription(subscription);
      return subscription;
    }

    // This is the default implementation that simply coerces all relevant properties
    // Most exchanges will want to override this
    _requestKey(subscription) {
      return [`${subscription.base}_${subscription.currency}_${String(subscription.type)}`, subscription.base, subscription.currency];
    }

    __fudgeSubscription(subscription) {
      let [requestKey, requestBase, requestCurrency] = this._requestKey(subscription);
      Object.assign(subscription, { requestKey, requestBase, requestCurrency });
      subscription.convert = this.__getConvertFunction(subscription);

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
      let [requestKey, requestBase, requestCurrency] = this._requestKey(subscription);
      Object.assign(subscription, { requestKey, requestBase, requestCurrency });
      subscription.convert = this.__getConvertFunction(subscription);

      if (this._requests[requestKey]) {
        // This requestKey already has subscriptions, so just add this one to the list
        this._requests[requestKey].push(subscription);
      } else {
        // This requestKey has no subscriptions yet. We need to start a new backend connection
        this._requests[requestKey] = [subscription];
        this._startRequest(requestKey);
      }
    }

    // The trade or order book event amounts and prices from the exchange (requestBase-requestCurrency)
    // are converted to the desired values (subscription base-currency) using the function this returns.
    // Assumed is the user subscription contains at least one crypto currency the exchange supports.
    //
    // TODO: refactor (including the conversion functions) to separate location.
    __getConvertFunction(subscription) {
      let basesMatch = subscription.requestBase === subscription.base;
      let currenciesMatch = subscription.requestCurrency === subscription.currency;
      let requestBaseMatchCurrency = subscription.requestBase === subscription.currency;
      let requestCurrencyMatchBase = subscription.requestCurrency === subscription.base;
      if (basesMatch && currenciesMatch) {
        // No conversion needed
        return noopFunc;
      } else if (requestBaseMatchCurrency && requestCurrencyMatchBase) {
        // Only the base and currency need to be switched
        return switchBaseFunc;
      } else if (basesMatch || currenciesMatch) {
        // A currency conversion is needed
        let currencyFrom, currencyTo;
        if (basesMatch) {
          currencyFrom = subscription.requestCurrency;
          currencyTo = subscription.currency;
        } else {
          currencyFrom = subscription.requestBase;
          currencyTo = subscription.base;
        }
        let rate = getRate(currencyFrom, currencyTo);
        return events => {
          if (currenciesMatch) {
            return currencyConversionAndConvertBaseFunc(events, rate);
          } else {
            return currencyConversionFunc(events, rate);
          }
        };
      } else {
        // The base needs to be switched and the currency converted
        let currencyFrom, currencyTo;
        if (requestBaseMatchCurrency) {
          currencyFrom = subscription.requestCurrency;
          currencyTo = subscription.base;
        } else {
          currencyFrom = subscription.requestBase;
          currencyTo = subscription.currency;
        }
        let rate = getRate(currencyFrom, currencyTo);
        if (requestBaseMatchCurrency) {
          return events => {
            return switchBaseCurrencyConversionAndConvertBaseFunc(events, rate);
          };
        } else {
          return events => {
            return switchBaseAndCurrencyConversionFunc(events, rate);
          };
        }
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

  // FIAT RATES

  const rates = { EUR: 1 };
  // Get the latest Fiat rates from fixer.io
  const fetchRates = function() {
    fetch('//api.fixer.io/latest')
      .then(r => {
        return r.json();
      })
      .then(data => {
        console.debug('Setting fiat rates');
        Object.assign(rates, data.rates);
      });
  };

  const getRate = function(currencyFrom, currencyTo) {
    if (rates[currencyFrom] === undefined) {
      throw `No rate set for ${currencyFrom}`;
    }
    if (rates[currencyTo] === undefined) {
      throw `No rate set for ${currencyTo}`;
    }
    return rates[currencyTo] / rates[currencyFrom];
  };

  // Get the current rates
  fetchRates();

  // // Refresh rates every 24 hours
  // window.setInterval(() => {
  //   refreshRates();
  // }, 1000 * 60 * 60 * 24);

  // // Fiat rates reset daily around 4 PM CET.
  // let now = new Date();
  // let millisTillRefresh = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 20, 0, 0) - now;
  // if (millisTillRefresh < 0) {
  //   millisTillRefresh += 86400000; // refresh happened today already, refresh tomorrow
  // }
  // window.setTimeout(() => {
  //   refreshRates();
  //   // After the refresh, keep refreshing daily as long as the window is open.
  //   window.setInterval(() => {
  //     refreshRates();
  //   }, 86400000);
  // }, millisTillRefresh);

  // CONVERSION FUNCTIONS

  const noopFunc = function(events) {
    return events;
  };

  const switchBaseFunc = function(events) {
    return events.map(event => {
      return {
        type: event.type,
        timestamp: event.timestamp,
        amount: event.amount * event.price,
        price: 1 / event.price
      };
    });
  };

  const currencyConversionFunc = function(events, rate) {
    return events.map(event => {
      return {
        type: event.type,
        timestamp: event.timestamp,
        price: event.price * rate,
        amount: event.amount
      };
    });
  };

  const currencyConversionAndConvertBaseFunc = function(events, rate) {
    return events.map(event => {
      return {
        type: event.type,
        timestamp: event.timestamp,
        price: event.price * rate,
        amount: event.amount / rate
      };
    });
  };

  const switchBaseAndCurrencyConversionFunc = function(events, rate) {
    return currencyConversionFunc(switchBaseFunc(events), rate);
  };

  const switchBaseCurrencyConversionAndConvertBaseFunc = function(events, rate) {
    return currencyConversionAndConvertBaseFunc(switchBaseFunc(events), rate);
  };

  window.CDexExchange = CDexExchange;
}
