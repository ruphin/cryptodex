{
  const BUY = Symbol.for("buy");
  const SELL = Symbol.for("sell");
  const ORDERS = Symbol.for("orders");
  const TRADES = Symbol.for("trades");

  const ACCEPTED_BASES = ["BTC", "LTC", "ETH", "ETC"];
  const ACCEPTED_CURRENCIES = ["CNY"];

  const MILLISECS = 1000;
  const HOUR = 3600 * MILLISECS;
  const DAY = 24 * HOUR;
  const HOUR_DIFF = 6;

  const orderBooks = {};

  let sock;

  class CDexOkcoin extends CDexExchange {
    static get is() {
      return "cdex-okcoin";
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
      // Fire a single request with the key and push the response to this._requests[requestKey]
      if (orderBooks[requestKey] !== undefined) {
        this.__sendInitialOrderBook(requestKey);
      }
    }

    _requestKey(subscription) {
      let coin1 = subscription.base;
      let coin2 = subscription.currency;

      let coin;
      if (ACCEPTED_BASES.includes(coin1)) {
        this.__checkAcceptedCurrency(coin2);
        coin = coin1.toLowerCase();
      } else if (ACCEPTED_BASES.includes(coin2)) {
        this.__checkAcceptedCurrency(coin1);
        coin = coin2.toLowerCase();
      } else {
        throw `No supported base found in ${coin1}-${coin2}. Accepted are: ${ACCEPTED_BASES.join(
          ", "
        )}`;
      }

      if (subscription.type === TRADES) {
        return `${coin}_trades`;
      }
      if (subscription.type === ORDERS) {
        return `${coin}_depth`;
      }
    }

    __connect() {
      console.info("Okcoin - connecting backend");
      sock = new WebSocket("wss://real.okcoin.com:10440/websocket/okcoinapi");

      sock.addEventListener("open", () => {
        console.info("Okcoin - connected");
        Object.keys(this._subscriptions).forEach(requestKey => {
          this.__subscribe(requestKey);
        });
      });

      sock.addEventListener("close", () => {
        console.error("Okcoin - connection closed");
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener("error", () => {
        console.error("Okcoin - connection error");
        sock = undefined;
        window.setTimeout(() => this.__connect(), 1000);
      });

      sock.addEventListener("message", msg => {
        this.__handleTransaction(JSON.parse(msg.data));
      });
    }

    __subscribe(requestKey) {
      console.info(`Okcoin - subscribing to ${requestKey}`);
      orderBooks[requestKey] = undefined;
      sock.send(`{event: "addChannel", channel: "ok_sub_spot_${requestKey}"}`);
    }

    __unsubscribe(requestKey) {
      console.info(`Okcoin - unsubscribing from ${requestKey}`);
      sock.send(
        `{event: "removeChannel", channel: "ok_sub_spot_${requestKey}"}`
      );
    }

    __handleTransaction(tx) {
      let channel = tx[0].channel;
      let data = tx[0].data;

      if (data.result === "false") {
        console.error(`OKCoin responded with error code: ${data.error_code}`);
        return;
      }

      let requestKey;
      if (channel.endsWith("trades")) {
        requestKey = /ok_sub_spot_(\w+)/.exec(channel)[1];
        let trades = this.__processTradeEvent(requestKey, data);
        this.__sendData(requestKey, TRADES, trades);
        return;
      }

      if (channel.endsWith("depth")) {
        requestKey = /ok_sub_spot_(\w+)/.exec(channel)[1];
        // First message is the initial order book
        if (orderBooks[requestKey] === undefined) {
          orderBooks[requestKey] = data;
          this.__sendInitialOrderBook(requestKey);
          return;
        }

        let orders = this.__processOrderEvent(requestKey, data);
        this.__sendData(requestKey, ORDERS, orders);
      }
    }

    __processTradeEvent(requestKey, data) {
      return data.map(trade => {
        return {
          price: Number(trade[1]),
          amount: Number(trade[2]),
          type: trade[4] === "ask" ? SELL : BUY,
          timestamp: this.__convertTime(trade[3])
        };
      });
    }

    __processOrderEvent(requestKey, event) {
      let sellEvents = event.asks.map(event => {
        let price = event[0];
        let newAmount = event[1];
        let amountDiff = this.__updateOrderBook(
          orderBooks[requestKey].asks,
          price,
          newAmount
        );
        return { price, amount: amountDiff, type: SELL };
      });

      let buyEvents = event.bids.map(event => {
        let price = event[0];
        let newAmount = event[1];
        let amountDiff = this.__updateOrderBook(
          orderBooks[requestKey].bids,
          price,
          newAmount
        );
        return { price, amount: amountDiff, type: BUY };
      });

      return sellEvents.concat(buyEvents);
    }

    __updateOrderBook(orderBook, price, newAmount) {
      let oldAmount = orderBook[price];
      if (oldAmount === undefined) {
        oldAmount = 0;
      }
      let amountDiff = newAmount - oldAmount;
      orderBook[price] = newAmount;
      return amountDiff;
    }

    __sendData(requestKey, type, events) {
      let subscriptions = this._subscriptions[
        requestKey
      ].filter(subscription => {
        return subscription.type === type;
      });
      subscriptions.forEach(subscription => {
        let result = this.__calculateCurrency(requestKey, subscription, events);
        subscription.data(result);
      });
    }

    __sendInitialOrderBook(requestKey) {
      if (this._requests[requestKey] !== undefined) {
        this._requests[requestKey].forEach(subscription => {
          subscription.data(orderBooks[requestKey]);
        });
      }
    }

    __calculateCurrency(requestKey, subscription, list) {
      let convert = requestKey.startsWith(subscription.base.toLowerCase());
      let convertedData = list.map(event => {
        let data = {
          type: event.type,
          amount: event.amount,
          price: event.price
        };
        if (event.timestamp) {
          data.timestamp = event.timestamp;
        }
        if (convert) {
          data.amount = event.amount * event.price;
          data.price = 1 / event.price;
        }
        return data;
      });

      return convertedData;
    }

    __checkAcceptedCurrency(coin) {
      if (!ACCEPTED_CURRENCIES.includes(coin)) {
        throw `Currency ${coin} is not supported by OKCoin`;
      }
    }

    __convertTime(timeString) {
      let [hour, minutes, seconds] = /(\d\d):(\d\d):(\d\d)/
        .exec(timeString)
        .slice(1);
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