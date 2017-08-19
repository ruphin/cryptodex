{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');
  const ACCEPTED_BASES = ['BTC', 'ETH', 'DASH', 'LTC', 'ETC', 'XRP', 'BCH'];

  const lastTrades = {};

  class CDexBithumb extends CDexExchange {
    static get is() {
      return 'cdex-bithumb';
    }

    _startSubscription(requestKey) {
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
      let requestBase = subscription.base;
      if (!ACCEPTED_BASES.includes(requestBase)) {
        if (!ACCEPTED_BASES.includes(subscription.currency)) {
          throw `No supported Bithumb base in: ${requestBase}-${subscription.currency}`;
        }
        requestBase = subscription.currency;
      }

      let type;
      if ((subscription.type = TRADES)) {
        type = 'recent_transactions/';
      } else if ((subscription.type = ORDERS)) {
        type = 'orderbook/';
      } else {
        throw `Unknown subscription type: ${subscription.type}`;
      }

      return [`${type}${requestBase}`, requestBase, 'KRW'];
    }

    __poll(requestKey) {
      fetch(`https://api.bithumb.com/public/${requestKey}`)
        .then(response => {
          return response.json();
        })
        .then(data => {
          this.__processData(requestKey, data.data);
        });
      // Poll again after 10 seconds
      setTimeout(() => this.__poll(requestKey), 10000 - new Date().getTime() % 10000);
    }

    __processData(requestKey, data) {
      let dataToProcess = this.__getNewTrades(data, lastTrades[requestKey]);
      if (dataToProcess.length > 0) {
        lastTrades[requestKey] = dataToProcess[0];
        let trades = dataToProcess.map(trade => this.__processTrade(trade));
        trades.reverse();
        this._sendData(trades, requestKey, TRADES);
      }
    }

    __getNewTrades(data, lastTrade) {
      // All trades need to be processed if there is no last trade.
      if (lastTrade === undefined) {
        return data;
      }
      // Get the index of the trade corresponding to lastTrade.
      let index = data.findIndex(trade => {
        for (let key in trade) {
          if (trade[key] !== lastTrade[key]) {
            return false;
          }
        }
        return true;
      });
      // Handle the case we didn't find the last trade.
      if (index === -1) {
        console.log(`Bithumb: possible trades missed between ${lastTrade.transaction_date} and ${data[data.length - 1].transaction_date}`);
        return data;
      }
      return data.slice(0, index);
    }

    __processTrade(trade) {
      return {
        type: trade.type === 'ask' ? SELL : BUY,
        price: Number(trade.price),
        amount: Number(trade.units_traded),
        timestamp: new Date(new Date(trade.transaction_date) - 5 * 60 * 60 * 1000)
      };
    }
  }

  customElements.define(CDexBithumb.is, CDexBithumb);
}
