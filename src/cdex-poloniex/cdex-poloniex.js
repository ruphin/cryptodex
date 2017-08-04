{
  const _source = document.currentScript;

  const BUY = Symbol.for('buy');
  const SELL = Symbol.for('sell');

  const MILLISECS = 1000;

  const subscriptions = {};
  const pairIds = {};

  let sock;

  class CDexPoloniex extends Gluon.Element {
    static get _source() {
      return _source;
    }

    static get is() { return 'cdex-poloniex' }

    connectedCallback() {
        console.log(`Connecting ${this.constructor.is}`)
    }

    connect() {
      if (sock === undefined) {
        console.info("Poloniex - connecting backend");
        sock = new WebSocket("wss://api2.poloniex.com");

        sock.addEventListener('open', () => {
          console.info("Poloniex - connected");
          // TODO: Figure out exactly which messages to send for different subscription types
          Object.keys(subscriptions).forEach((pair) => {
            console.log(subscriptions)
            console.log(pair)
            console.info(`Poloniex - subscribing to ${pair}`);
            sock.send(`{"command":"subscribe","channel":"${pair}"}`);
          });
        });

        sock.addEventListener('close', () => {
          console.error("Poloniex - connection closed")
          sock = undefined;
          window.setTimeout(() => connect(), 1000);
        });

        sock.addEventListener('error', () => {
          console.error("Poloniex - connection error")
          sock = undefined;
          window.setTimeout(() => connect(), 1000);
        });

        sock.addEventListener('message', msg => {
          this._handleTransaction(JSON.parse(msg.data));
        });
      }
    }

    subscribe(coinPair, dataType) {
      let pair = this._getPairString(coinPair.first, coinPair.second);
      let subscription = new Subscription();
      subscription.unsubscribe = () => {
        subscriptions[pair][dataType].delete(subscription);
        if (subscriptions[pair][dataType].size === 0) {
          _unsubscribe(pair);
        }
      }

      if (subscriptions[pair] === undefined) {
        if (sock.readyState === 1) {
          sock.send(`{"command":"subscribe","channel":"${pair}"}`);
        }
        subscriptions[pair] = { volume: new Set(), trades: new Set() };
      }
      subscriptions[pair][dataType].add(subscription);
      return subscription;
    }

    _unsubscribe(pair) {
      // TODO: Check if subscriptions is empty and something should be sent to the backend to disconnect a certain channel.
    }

    _getPairString(coin1, coin2) {
      if (coin1 === 'USDT') {
        return `${coin1}_${coin2}`;
      }
      if (coin2 === 'USDT') {
        return `${coin2}_${coin1}`;
      }
      if (coin1 === 'BTC') {
        return `${coin1}_${coin2}`;
      }
      if (coin2 === 'BTC') {
        return `${coin2}_${coin1}`;
      }
      if (coin1 === 'ETH') {
        return `${coin1}_${coin2}`;
      }
      if (coin2 === 'ETH') {
        return `${coin2}_${coin1}`;
      }
      if (coin1 === 'XMR') {
        return `${coin1}_${coin2}`;
      }
      if (coin2 === 'XMR') {
        return `${coin2}_${coin1}`;
      }
    }

    _handleTransaction(tx) {
      if (tx[0] > 1000) {
        return;
      }
      if (tx[2] && tx[2][0][0] === "i") {
        pairIds[tx[0]] = tx[2][0][1].currencyPair;
        return;
      }

      let pair = pairIds[tx[0]];
      if (pair === undefined) {
        console.error(`Poloniex - message for undefined currency pair: ${tx[0]}`)
        return;
      }

      tx[2].forEach(event => {
        if (event[0] === "t") { // Trade event
          let amount = Number(event[3]) * Number(event[4]);
          let timestamp = new Date(Number(event[5]) * MILLISECS);
          let type;

          if (event[2] === 1) {
            type = BUY;
          } else {
            type = SELL;
          }
          // TODO: Extract price
          let price = 0;
          this._tradeEvent(pair, type, timestamp, amount, price);
        }
      })
    }

    _tradeEvent(pair, type, timestamp, amount, price) {
      subscriptions[pair].trades.forEach(subscription => {
        subscription.fire('data', {
          type,
          timestamp,
          amount,
          price
        });
      });
    }
  }

  customElements.define(CDexPoloniex.is, CDexPoloniex)
}

class Subscription {
  constructor() {
    this.handlers = {};
  }
  on(eventType, handler) {
    if (this.handlers[eventType] === undefined) {
      this.handlers[eventType] = [];
    }
    this.handlers[eventType].push(handler);
  }
  fire(eventType, data) {
    this.handlers[eventType].forEach(handler => {
      handler(data)
    })
  }
}
