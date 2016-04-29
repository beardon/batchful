'use strict';

const _ = require('lodash');
const Promise = require('bluebird');

class Batchful {
    constructor(options) {
        this.max = options.max || 1;
        this.timeout = options.timeout;
        this.exec = Promise.method(options.exec);
        this.queue = [];
        this.timer = null;
    }

    push(data) {
        const dfd = {};
        const promise = new Promise(function (resolve, reject) {
            dfd.resolve = resolve;
            dfd.reject = reject;
        });

        this.queue.push({ data, dfd: dfd });

        this.wait();

        return promise;
    }

    wait() {
        if (!this.timer && this.timeout && this.queue.length > 0) {
            this.timer = setTimeout(this.run.bind(this), this.timeout);
        }

        if (this.queue.length > this.max) {
            this.run();
        }
    }

    run() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        const toExec = this.queue.slice(0, this.max);
        this.queue.splice(0, this.max);

        return this.exec(_.map(toExec, 'data'))
            .map(function (val, index) {
                return toExec[index].dfd.resolve(val);
            })
            .tap(this.wait.bind(this));
    }
}

module.exports = Batchful;
