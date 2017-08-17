{
  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');
  const ORDERS = Symbol.for('orders');
  const TRADES = Symbol.for('trades');

  const ACCEPTED_BASES = ['BTC', 'LTC', 'ETH', 'ETC'];

  const MILLISECS = 1000;
  const HOUR = 3600 * MILLISECS;
  const DAY = 24 * HOUR;
  const HOUR_DIFF = 6;

  let sock;

  class CDexOkcoin extends CDexExchange {
    static get is() {
      return 'cdex-okcoin';
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
      if (this._orderBooks[requestKey] !== undefined) {
        this._sendOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      let coin1 = subscription.base;
      let coin2 = subscription.currency;

      let requestBase;
      if (ACCEPTED_BASES.includes(coin1)) {
        requestBase = coin1;
      } else if (ACCEPTED_BASES.includes(coin2)) {
        requestBase = coin2;
      } else {
        throw `No supported base found in ${coin1}-${coin2}. Accepted are: ${ACCEPTED_BASES.join(', ')}`;
      }

      let requestKey;
      if (subscription.type === TRADES) {
        requestKey = `${requestBase.toLowerCase()}_trades`;
      }
      if (subscription.type === ORDERS) {
        requestKey = `${requestBase.toLowerCase()}_depth`;
      }

      return [requestKey, requestBase, 'CNY'];
    }

    // PRIVATE

    __connect() {
      console.info('Okcoin - connecting backend');
      sock = new WebSocket('wss://real.okcoin.com:10440/websocket/okcoinapi');

      sock.addEventListener('open', () => {
        console.info('Okcoin - connected');
        Object.keys(this._subscriptions).forEach(requestKey => {
          this.__subscribe(requestKey);
        });
      });

      sock.addEventListener('close', () => {
        console.error('Okcoin - connection closed');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('error', () => {
        console.error('Okcoin - connection error');
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener('message', msg => {
        this.__handleTransaction(JSON.parse(msg.data));
      });
    }

    __subscribe(requestKey) {
      console.info(`Okcoin - subscribing to ${requestKey}`);
      this._orderBooks[requestKey] = undefined;
      sock.send(`{event: "addChannel", channel: "ok_sub_spot_${requestKey}"}`);
    }

    __unsubscribe(requestKey) {
      console.info(`Okcoin - unsubscribing from ${requestKey}`);
      sock.send(`{event: "removeChannel", channel: "ok_sub_spot_${requestKey}"}`);
    }

    __handleTransaction(tx) {
      let channel = tx[0].channel;
      let data = tx[0].data;

      if (data.result === 'false') {
        console.error(`OKCoin responded with error code: ${data.error_code}`);
        return;
      }

      let requestKey;
      if (channel.endsWith('trades')) {
        requestKey = /ok_sub_spot_(\w+)/.exec(channel)[1];
        let trades = this.__processTradeEvent(requestKey, data);
        this._sendData(trades, requestKey, TRADES);
        return;
      }

      if (channel.endsWith('depth')) {
        requestKey = /ok_sub_spot_(\w+)/.exec(channel)[1];
        // First message is the initial order book
        if (this._orderBooks[requestKey] === undefined) {
          this._orderBooks[requestKey] = this.__processInitialOrderBook(data);
          this._sendOrderBook(requestKey);
          return;
        }

        let orders = this.__processOrderEvent(requestKey, data);
        this._sendData(orders, requestKey, ORDERS);
      }
    }

    __processTradeEvent(requestKey, data) {
      return data.map(trade => {
        return {
          price: Number(trade[1]),
          amount: Number(trade[2]),
          type: trade[4] === 'ask' ? SELL : BUY,
          timestamp: this.__convertTime(trade[3])
        };
      });
    }

    // Transform the OKCoin orderBook to the CDexExchange format.
    __processInitialOrderBook(data) {
      let orderBook = {};
      let reduceFunc = (obj, value) => {
        obj[value[0]] = value[1];
        return obj;
      };
      orderBook[BUY] = data.bids.reduce(reduceFunc, {});
      orderBook[SELL] = data.asks.reduce(reduceFunc, {});
      return orderBook;
    }

    __processOrderEvent(requestKey, event) {
      let sellEvents = event.asks.map(event => {
        let type = SELL;
        let price = event[0];
        let newAmount = event[1];
        let amount = this._updateOrderBook(this._orderBooks[requestKey][type], price, newAmount);
        return { price, amount, type };
      });

      let buyEvents = event.bids.map(event => {
        let type = BUY;
        let price = event[0];
        let newAmount = event[1];
        let amount = this._updateOrderBook(this._orderBooks[requestKey][type], price, newAmount);
        return { price, amount, type };
      });

      return sellEvents.concat(buyEvents);
    }

    // OKCoin sends the timestamp in an awkward format, convert it to a Date.
    __convertTime(timeString) {
      let [hour, minutes, seconds] = /(\d\d):(\d\d):(\d\d)/.exec(timeString).slice(1);
      let date = new Date();
      date.setHours(hour);
      date.setMinutes(minutes);
      date.setSeconds(seconds);
      let newTime = date.getTime() - HOUR_DIFF * HOUR;
      if (HOUR_DIFF > hour) {
        newTime += DAY;
      }
      return new Date(newTime);
    }
  }

  customElements.define(CDexOkcoin.is, CDexOkcoin);
}
