(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (define){
(function(root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('error-stack-parser', ['stackframe'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(_dereq_('stackframe'));
    } else {
        root.ErrorStackParser = factory(root.StackFrame);
    }
}(this, function ErrorStackParser(StackFrame) {
    'use strict';

    var FIREFOX_SAFARI_STACK_REGEXP = /(^|@)\S+\:\d+/;
    var CHROME_IE_STACK_REGEXP = /^\s*at .*(\S+\:\d+|\(native\))/m;
    var SAFARI_NATIVE_CODE_REGEXP = /^(eval@)?(\[native code\])?$/;

    function _map(array, fn, thisArg) {
        if (typeof Array.prototype.map === 'function') {
            return array.map(fn, thisArg);
        } else {
            var output = new Array(array.length);
            for (var i = 0; i < array.length; i++) {
                output[i] = fn.call(thisArg, array[i]);
            }
            return output;
        }
    }

    function _filter(array, fn, thisArg) {
        if (typeof Array.prototype.filter === 'function') {
            return array.filter(fn, thisArg);
        } else {
            var output = [];
            for (var i = 0; i < array.length; i++) {
                if (fn.call(thisArg, array[i])) {
                    output.push(array[i]);
                }
            }
            return output;
        }
    }

    return {
        /**
         * Given an Error object, extract the most information from it.
         *
         * @param {Error} error object
         * @return {Array} of StackFrames
         */
        parse: function ErrorStackParser$$parse(error) {
            if (typeof error.stacktrace !== 'undefined' || typeof error['opera#sourceloc'] !== 'undefined') {
                return this.parseOpera(error);
            } else if (error.stack && error.stack.match(CHROME_IE_STACK_REGEXP)) {
                return this.parseV8OrIE(error);
            } else if (error.stack) {
                return this.parseFFOrSafari(error);
            } else {
                throw new Error('Cannot parse given Error object');
            }
        },

        /**
         * Separate line and column numbers from a URL-like string.
         *
         * @param {String} urlLike
         * @return {Array} 3-tuple of URL, Line Number, and Column Number
         */
        extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
            // Fail-fast but return locations like "(native)"
            if (urlLike.indexOf(':') === -1) {
                return [urlLike];
            }

            var locationParts = urlLike.replace(/[\(\)\s]/g, '').split(':');
            var lastNumber = locationParts.pop();
            var possibleNumber = locationParts[locationParts.length - 1];
            if (!isNaN(parseFloat(possibleNumber)) && isFinite(possibleNumber)) {
                var lineNumber = locationParts.pop();
                return [locationParts.join(':'), lineNumber, lastNumber];
            } else {
                return [locationParts.join(':'), lastNumber, undefined];
            }
        },

        parseV8OrIE: function ErrorStackParser$$parseV8OrIE(error) {
            var filtered = _filter(error.stack.split('\n'), function(line) {
                return !!line.match(CHROME_IE_STACK_REGEXP);
            }, this);

            return _map(filtered, function(line) {
                if (line.indexOf('(eval ') > -1) {
                    // Throw away eval information until we implement stacktrace.js/stackframe#8
                    line = line.replace(/eval code/g, 'eval').replace(/(\(eval at [^\()]*)|(\)\,.*$)/g, '');
                }
                var tokens = line.replace(/^\s+/, '').replace(/\(eval code/g, '(').split(/\s+/).slice(1);
                var locationParts = this.extractLocation(tokens.pop());
                var functionName = tokens.join(' ') || undefined;
                var fileName = ['eval', '<anonymous>'].indexOf(locationParts[0]) > -1 ? undefined : locationParts[0];

                return new StackFrame(functionName, undefined, fileName, locationParts[1], locationParts[2], line);
            }, this);
        },

        parseFFOrSafari: function ErrorStackParser$$parseFFOrSafari(error) {
            var filtered = _filter(error.stack.split('\n'), function(line) {
                return !line.match(SAFARI_NATIVE_CODE_REGEXP);
            }, this);

            return _map(filtered, function(line) {
                // Throw away eval information until we implement stacktrace.js/stackframe#8
                if (line.indexOf(' > eval') > -1) {
                    line = line.replace(/ line (\d+)(?: > eval line \d+)* > eval\:\d+\:\d+/g, ':$1');
                }

                if (line.indexOf('@') === -1 && line.indexOf(':') === -1) {
                    // Safari eval frames only have function names and nothing else
                    return new StackFrame(line);
                } else {
                    var tokens = line.split('@');
                    var locationParts = this.extractLocation(tokens.pop());
                    var functionName = tokens.join('@') || undefined;
                    return new StackFrame(functionName,
                        undefined,
                        locationParts[0],
                        locationParts[1],
                        locationParts[2],
                        line);
                }
            }, this);
        },

        parseOpera: function ErrorStackParser$$parseOpera(e) {
            if (!e.stacktrace || (e.message.indexOf('\n') > -1 &&
                e.message.split('\n').length > e.stacktrace.split('\n').length)) {
                return this.parseOpera9(e);
            } else if (!e.stack) {
                return this.parseOpera10(e);
            } else {
                return this.parseOpera11(e);
            }
        },

        parseOpera9: function ErrorStackParser$$parseOpera9(e) {
            var lineRE = /Line (\d+).*script (?:in )?(\S+)/i;
            var lines = e.message.split('\n');
            var result = [];

            for (var i = 2, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    result.push(new StackFrame(undefined, undefined, match[2], match[1], undefined, lines[i]));
                }
            }

            return result;
        },

        parseOpera10: function ErrorStackParser$$parseOpera10(e) {
            var lineRE = /Line (\d+).*script (?:in )?(\S+)(?:: In function (\S+))?$/i;
            var lines = e.stacktrace.split('\n');
            var result = [];

            for (var i = 0, len = lines.length; i < len; i += 2) {
                var match = lineRE.exec(lines[i]);
                if (match) {
                    result.push(
                        new StackFrame(
                            match[3] || undefined,
                            undefined,
                            match[2],
                            match[1],
                            undefined,
                            lines[i]
                        )
                    );
                }
            }

            return result;
        },

        // Opera 10.65+ Error.stack very similar to FF/Safari
        parseOpera11: function ErrorStackParser$$parseOpera11(error) {
            var filtered = _filter(error.stack.split('\n'), function(line) {
                return !!line.match(FIREFOX_SAFARI_STACK_REGEXP) && !line.match(/^Error created at/);
            }, this);

            return _map(filtered, function(line) {
                var tokens = line.split('@');
                var locationParts = this.extractLocation(tokens.pop());
                var functionCall = (tokens.shift() || '');
                var functionName = functionCall
                        .replace(/<anonymous function(: (\w+))?>/, '$2')
                        .replace(/\([^\)]*\)/g, '') || undefined;
                var argsRaw;
                if (functionCall.match(/\(([^\)]*)\)/)) {
                    argsRaw = functionCall.replace(/^[^\(]+\(([^\)]*)\)$/, '$1');
                }
                var args = (argsRaw === undefined || argsRaw === '[arguments not available]') ?
                    undefined : argsRaw.split(',');
                return new StackFrame(
                    functionName,
                    args,
                    locationParts[0],
                    locationParts[1],
                    locationParts[2],
                    line);
            }, this);
        }
    };
}));


}).call(this,undefined)
},{"stackframe":7}],2:[function(_dereq_,module,exports){
(function (process,global,define){
/*!
 * @overview es6-promise - a tiny implementation of Promises/A+.
 * @copyright Copyright (c) 2014 Yehuda Katz, Tom Dale, Stefan Penner and contributors (Conversion to ES6 API by Jake Archibald)
 * @license   Licensed under MIT license
 *            See https://raw.githubusercontent.com/jakearchibald/es6-promise/master/LICENSE
 * @version   3.0.2
 */

(function() {
    "use strict";
    function lib$es6$promise$utils$$objectOrFunction(x) {
      return typeof x === 'function' || (typeof x === 'object' && x !== null);
    }

    function lib$es6$promise$utils$$isFunction(x) {
      return typeof x === 'function';
    }

    function lib$es6$promise$utils$$isMaybeThenable(x) {
      return typeof x === 'object' && x !== null;
    }

    var lib$es6$promise$utils$$_isArray;
    if (!Array.isArray) {
      lib$es6$promise$utils$$_isArray = function (x) {
        return Object.prototype.toString.call(x) === '[object Array]';
      };
    } else {
      lib$es6$promise$utils$$_isArray = Array.isArray;
    }

    var lib$es6$promise$utils$$isArray = lib$es6$promise$utils$$_isArray;
    var lib$es6$promise$asap$$len = 0;
    var lib$es6$promise$asap$$toString = {}.toString;
    var lib$es6$promise$asap$$vertxNext;
    var lib$es6$promise$asap$$customSchedulerFn;

    var lib$es6$promise$asap$$asap = function asap(callback, arg) {
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len] = callback;
      lib$es6$promise$asap$$queue[lib$es6$promise$asap$$len + 1] = arg;
      lib$es6$promise$asap$$len += 2;
      if (lib$es6$promise$asap$$len === 2) {
        // If len is 2, that means that we need to schedule an async flush.
        // If additional callbacks are queued before the queue is flushed, they
        // will be processed by this flush that we are scheduling.
        if (lib$es6$promise$asap$$customSchedulerFn) {
          lib$es6$promise$asap$$customSchedulerFn(lib$es6$promise$asap$$flush);
        } else {
          lib$es6$promise$asap$$scheduleFlush();
        }
      }
    }

    function lib$es6$promise$asap$$setScheduler(scheduleFn) {
      lib$es6$promise$asap$$customSchedulerFn = scheduleFn;
    }

    function lib$es6$promise$asap$$setAsap(asapFn) {
      lib$es6$promise$asap$$asap = asapFn;
    }

    var lib$es6$promise$asap$$browserWindow = (typeof window !== 'undefined') ? window : undefined;
    var lib$es6$promise$asap$$browserGlobal = lib$es6$promise$asap$$browserWindow || {};
    var lib$es6$promise$asap$$BrowserMutationObserver = lib$es6$promise$asap$$browserGlobal.MutationObserver || lib$es6$promise$asap$$browserGlobal.WebKitMutationObserver;
    var lib$es6$promise$asap$$isNode = typeof process !== 'undefined' && {}.toString.call(process) === '[object process]';

    // test for web worker but not in IE10
    var lib$es6$promise$asap$$isWorker = typeof Uint8ClampedArray !== 'undefined' &&
      typeof importScripts !== 'undefined' &&
      typeof MessageChannel !== 'undefined';

    // node
    function lib$es6$promise$asap$$useNextTick() {
      // node version 0.10.x displays a deprecation warning when nextTick is used recursively
      // see https://github.com/cujojs/when/issues/410 for details
      return function() {
        process.nextTick(lib$es6$promise$asap$$flush);
      };
    }

    // vertx
    function lib$es6$promise$asap$$useVertxTimer() {
      return function() {
        lib$es6$promise$asap$$vertxNext(lib$es6$promise$asap$$flush);
      };
    }

    function lib$es6$promise$asap$$useMutationObserver() {
      var iterations = 0;
      var observer = new lib$es6$promise$asap$$BrowserMutationObserver(lib$es6$promise$asap$$flush);
      var node = document.createTextNode('');
      observer.observe(node, { characterData: true });

      return function() {
        node.data = (iterations = ++iterations % 2);
      };
    }

    // web worker
    function lib$es6$promise$asap$$useMessageChannel() {
      var channel = new MessageChannel();
      channel.port1.onmessage = lib$es6$promise$asap$$flush;
      return function () {
        channel.port2.postMessage(0);
      };
    }

    function lib$es6$promise$asap$$useSetTimeout() {
      return function() {
        setTimeout(lib$es6$promise$asap$$flush, 1);
      };
    }

    var lib$es6$promise$asap$$queue = new Array(1000);
    function lib$es6$promise$asap$$flush() {
      for (var i = 0; i < lib$es6$promise$asap$$len; i+=2) {
        var callback = lib$es6$promise$asap$$queue[i];
        var arg = lib$es6$promise$asap$$queue[i+1];

        callback(arg);

        lib$es6$promise$asap$$queue[i] = undefined;
        lib$es6$promise$asap$$queue[i+1] = undefined;
      }

      lib$es6$promise$asap$$len = 0;
    }

    function lib$es6$promise$asap$$attemptVertx() {
      try {
        var r = _dereq_;
        var vertx = r('vertx');
        lib$es6$promise$asap$$vertxNext = vertx.runOnLoop || vertx.runOnContext;
        return lib$es6$promise$asap$$useVertxTimer();
      } catch(e) {
        return lib$es6$promise$asap$$useSetTimeout();
      }
    }

    var lib$es6$promise$asap$$scheduleFlush;
    // Decide what async method to use to triggering processing of queued callbacks:
    if (lib$es6$promise$asap$$isNode) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useNextTick();
    } else if (lib$es6$promise$asap$$BrowserMutationObserver) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMutationObserver();
    } else if (lib$es6$promise$asap$$isWorker) {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useMessageChannel();
    } else if (lib$es6$promise$asap$$browserWindow === undefined && typeof _dereq_ === 'function') {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$attemptVertx();
    } else {
      lib$es6$promise$asap$$scheduleFlush = lib$es6$promise$asap$$useSetTimeout();
    }

    function lib$es6$promise$$internal$$noop() {}

    var lib$es6$promise$$internal$$PENDING   = void 0;
    var lib$es6$promise$$internal$$FULFILLED = 1;
    var lib$es6$promise$$internal$$REJECTED  = 2;

    var lib$es6$promise$$internal$$GET_THEN_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$selfFulfillment() {
      return new TypeError("You cannot resolve a promise with itself");
    }

    function lib$es6$promise$$internal$$cannotReturnOwn() {
      return new TypeError('A promises callback cannot return that same promise.');
    }

    function lib$es6$promise$$internal$$getThen(promise) {
      try {
        return promise.then;
      } catch(error) {
        lib$es6$promise$$internal$$GET_THEN_ERROR.error = error;
        return lib$es6$promise$$internal$$GET_THEN_ERROR;
      }
    }

    function lib$es6$promise$$internal$$tryThen(then, value, fulfillmentHandler, rejectionHandler) {
      try {
        then.call(value, fulfillmentHandler, rejectionHandler);
      } catch(e) {
        return e;
      }
    }

    function lib$es6$promise$$internal$$handleForeignThenable(promise, thenable, then) {
       lib$es6$promise$asap$$asap(function(promise) {
        var sealed = false;
        var error = lib$es6$promise$$internal$$tryThen(then, thenable, function(value) {
          if (sealed) { return; }
          sealed = true;
          if (thenable !== value) {
            lib$es6$promise$$internal$$resolve(promise, value);
          } else {
            lib$es6$promise$$internal$$fulfill(promise, value);
          }
        }, function(reason) {
          if (sealed) { return; }
          sealed = true;

          lib$es6$promise$$internal$$reject(promise, reason);
        }, 'Settle: ' + (promise._label || ' unknown promise'));

        if (!sealed && error) {
          sealed = true;
          lib$es6$promise$$internal$$reject(promise, error);
        }
      }, promise);
    }

    function lib$es6$promise$$internal$$handleOwnThenable(promise, thenable) {
      if (thenable._state === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, thenable._result);
      } else if (thenable._state === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, thenable._result);
      } else {
        lib$es6$promise$$internal$$subscribe(thenable, undefined, function(value) {
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      }
    }

    function lib$es6$promise$$internal$$handleMaybeThenable(promise, maybeThenable) {
      if (maybeThenable.constructor === promise.constructor) {
        lib$es6$promise$$internal$$handleOwnThenable(promise, maybeThenable);
      } else {
        var then = lib$es6$promise$$internal$$getThen(maybeThenable);

        if (then === lib$es6$promise$$internal$$GET_THEN_ERROR) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$GET_THEN_ERROR.error);
        } else if (then === undefined) {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        } else if (lib$es6$promise$utils$$isFunction(then)) {
          lib$es6$promise$$internal$$handleForeignThenable(promise, maybeThenable, then);
        } else {
          lib$es6$promise$$internal$$fulfill(promise, maybeThenable);
        }
      }
    }

    function lib$es6$promise$$internal$$resolve(promise, value) {
      if (promise === value) {
        lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$selfFulfillment());
      } else if (lib$es6$promise$utils$$objectOrFunction(value)) {
        lib$es6$promise$$internal$$handleMaybeThenable(promise, value);
      } else {
        lib$es6$promise$$internal$$fulfill(promise, value);
      }
    }

    function lib$es6$promise$$internal$$publishRejection(promise) {
      if (promise._onerror) {
        promise._onerror(promise._result);
      }

      lib$es6$promise$$internal$$publish(promise);
    }

    function lib$es6$promise$$internal$$fulfill(promise, value) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }

      promise._result = value;
      promise._state = lib$es6$promise$$internal$$FULFILLED;

      if (promise._subscribers.length !== 0) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, promise);
      }
    }

    function lib$es6$promise$$internal$$reject(promise, reason) {
      if (promise._state !== lib$es6$promise$$internal$$PENDING) { return; }
      promise._state = lib$es6$promise$$internal$$REJECTED;
      promise._result = reason;

      lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publishRejection, promise);
    }

    function lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection) {
      var subscribers = parent._subscribers;
      var length = subscribers.length;

      parent._onerror = null;

      subscribers[length] = child;
      subscribers[length + lib$es6$promise$$internal$$FULFILLED] = onFulfillment;
      subscribers[length + lib$es6$promise$$internal$$REJECTED]  = onRejection;

      if (length === 0 && parent._state) {
        lib$es6$promise$asap$$asap(lib$es6$promise$$internal$$publish, parent);
      }
    }

    function lib$es6$promise$$internal$$publish(promise) {
      var subscribers = promise._subscribers;
      var settled = promise._state;

      if (subscribers.length === 0) { return; }

      var child, callback, detail = promise._result;

      for (var i = 0; i < subscribers.length; i += 3) {
        child = subscribers[i];
        callback = subscribers[i + settled];

        if (child) {
          lib$es6$promise$$internal$$invokeCallback(settled, child, callback, detail);
        } else {
          callback(detail);
        }
      }

      promise._subscribers.length = 0;
    }

    function lib$es6$promise$$internal$$ErrorObject() {
      this.error = null;
    }

    var lib$es6$promise$$internal$$TRY_CATCH_ERROR = new lib$es6$promise$$internal$$ErrorObject();

    function lib$es6$promise$$internal$$tryCatch(callback, detail) {
      try {
        return callback(detail);
      } catch(e) {
        lib$es6$promise$$internal$$TRY_CATCH_ERROR.error = e;
        return lib$es6$promise$$internal$$TRY_CATCH_ERROR;
      }
    }

    function lib$es6$promise$$internal$$invokeCallback(settled, promise, callback, detail) {
      var hasCallback = lib$es6$promise$utils$$isFunction(callback),
          value, error, succeeded, failed;

      if (hasCallback) {
        value = lib$es6$promise$$internal$$tryCatch(callback, detail);

        if (value === lib$es6$promise$$internal$$TRY_CATCH_ERROR) {
          failed = true;
          error = value.error;
          value = null;
        } else {
          succeeded = true;
        }

        if (promise === value) {
          lib$es6$promise$$internal$$reject(promise, lib$es6$promise$$internal$$cannotReturnOwn());
          return;
        }

      } else {
        value = detail;
        succeeded = true;
      }

      if (promise._state !== lib$es6$promise$$internal$$PENDING) {
        // noop
      } else if (hasCallback && succeeded) {
        lib$es6$promise$$internal$$resolve(promise, value);
      } else if (failed) {
        lib$es6$promise$$internal$$reject(promise, error);
      } else if (settled === lib$es6$promise$$internal$$FULFILLED) {
        lib$es6$promise$$internal$$fulfill(promise, value);
      } else if (settled === lib$es6$promise$$internal$$REJECTED) {
        lib$es6$promise$$internal$$reject(promise, value);
      }
    }

    function lib$es6$promise$$internal$$initializePromise(promise, resolver) {
      try {
        resolver(function resolvePromise(value){
          lib$es6$promise$$internal$$resolve(promise, value);
        }, function rejectPromise(reason) {
          lib$es6$promise$$internal$$reject(promise, reason);
        });
      } catch(e) {
        lib$es6$promise$$internal$$reject(promise, e);
      }
    }

    function lib$es6$promise$enumerator$$Enumerator(Constructor, input) {
      var enumerator = this;

      enumerator._instanceConstructor = Constructor;
      enumerator.promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (enumerator._validateInput(input)) {
        enumerator._input     = input;
        enumerator.length     = input.length;
        enumerator._remaining = input.length;

        enumerator._init();

        if (enumerator.length === 0) {
          lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
        } else {
          enumerator.length = enumerator.length || 0;
          enumerator._enumerate();
          if (enumerator._remaining === 0) {
            lib$es6$promise$$internal$$fulfill(enumerator.promise, enumerator._result);
          }
        }
      } else {
        lib$es6$promise$$internal$$reject(enumerator.promise, enumerator._validationError());
      }
    }

    lib$es6$promise$enumerator$$Enumerator.prototype._validateInput = function(input) {
      return lib$es6$promise$utils$$isArray(input);
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._validationError = function() {
      return new Error('Array Methods must be provided an Array');
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._init = function() {
      this._result = new Array(this.length);
    };

    var lib$es6$promise$enumerator$$default = lib$es6$promise$enumerator$$Enumerator;

    lib$es6$promise$enumerator$$Enumerator.prototype._enumerate = function() {
      var enumerator = this;

      var length  = enumerator.length;
      var promise = enumerator.promise;
      var input   = enumerator._input;

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        enumerator._eachEntry(input[i], i);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._eachEntry = function(entry, i) {
      var enumerator = this;
      var c = enumerator._instanceConstructor;

      if (lib$es6$promise$utils$$isMaybeThenable(entry)) {
        if (entry.constructor === c && entry._state !== lib$es6$promise$$internal$$PENDING) {
          entry._onerror = null;
          enumerator._settledAt(entry._state, i, entry._result);
        } else {
          enumerator._willSettleAt(c.resolve(entry), i);
        }
      } else {
        enumerator._remaining--;
        enumerator._result[i] = entry;
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._settledAt = function(state, i, value) {
      var enumerator = this;
      var promise = enumerator.promise;

      if (promise._state === lib$es6$promise$$internal$$PENDING) {
        enumerator._remaining--;

        if (state === lib$es6$promise$$internal$$REJECTED) {
          lib$es6$promise$$internal$$reject(promise, value);
        } else {
          enumerator._result[i] = value;
        }
      }

      if (enumerator._remaining === 0) {
        lib$es6$promise$$internal$$fulfill(promise, enumerator._result);
      }
    };

    lib$es6$promise$enumerator$$Enumerator.prototype._willSettleAt = function(promise, i) {
      var enumerator = this;

      lib$es6$promise$$internal$$subscribe(promise, undefined, function(value) {
        enumerator._settledAt(lib$es6$promise$$internal$$FULFILLED, i, value);
      }, function(reason) {
        enumerator._settledAt(lib$es6$promise$$internal$$REJECTED, i, reason);
      });
    };
    function lib$es6$promise$promise$all$$all(entries) {
      return new lib$es6$promise$enumerator$$default(this, entries).promise;
    }
    var lib$es6$promise$promise$all$$default = lib$es6$promise$promise$all$$all;
    function lib$es6$promise$promise$race$$race(entries) {
      /*jshint validthis:true */
      var Constructor = this;

      var promise = new Constructor(lib$es6$promise$$internal$$noop);

      if (!lib$es6$promise$utils$$isArray(entries)) {
        lib$es6$promise$$internal$$reject(promise, new TypeError('You must pass an array to race.'));
        return promise;
      }

      var length = entries.length;

      function onFulfillment(value) {
        lib$es6$promise$$internal$$resolve(promise, value);
      }

      function onRejection(reason) {
        lib$es6$promise$$internal$$reject(promise, reason);
      }

      for (var i = 0; promise._state === lib$es6$promise$$internal$$PENDING && i < length; i++) {
        lib$es6$promise$$internal$$subscribe(Constructor.resolve(entries[i]), undefined, onFulfillment, onRejection);
      }

      return promise;
    }
    var lib$es6$promise$promise$race$$default = lib$es6$promise$promise$race$$race;
    function lib$es6$promise$promise$resolve$$resolve(object) {
      /*jshint validthis:true */
      var Constructor = this;

      if (object && typeof object === 'object' && object.constructor === Constructor) {
        return object;
      }

      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$resolve(promise, object);
      return promise;
    }
    var lib$es6$promise$promise$resolve$$default = lib$es6$promise$promise$resolve$$resolve;
    function lib$es6$promise$promise$reject$$reject(reason) {
      /*jshint validthis:true */
      var Constructor = this;
      var promise = new Constructor(lib$es6$promise$$internal$$noop);
      lib$es6$promise$$internal$$reject(promise, reason);
      return promise;
    }
    var lib$es6$promise$promise$reject$$default = lib$es6$promise$promise$reject$$reject;

    var lib$es6$promise$promise$$counter = 0;

    function lib$es6$promise$promise$$needsResolver() {
      throw new TypeError('You must pass a resolver function as the first argument to the promise constructor');
    }

    function lib$es6$promise$promise$$needsNew() {
      throw new TypeError("Failed to construct 'Promise': Please use the 'new' operator, this object constructor cannot be called as a function.");
    }

    var lib$es6$promise$promise$$default = lib$es6$promise$promise$$Promise;
    /**
      Promise objects represent the eventual result of an asynchronous operation. The
      primary way of interacting with a promise is through its `then` method, which
      registers callbacks to receive either a promise's eventual value or the reason
      why the promise cannot be fulfilled.

      Terminology
      -----------

      - `promise` is an object or function with a `then` method whose behavior conforms to this specification.
      - `thenable` is an object or function that defines a `then` method.
      - `value` is any legal JavaScript value (including undefined, a thenable, or a promise).
      - `exception` is a value that is thrown using the throw statement.
      - `reason` is a value that indicates why a promise was rejected.
      - `settled` the final resting state of a promise, fulfilled or rejected.

      A promise can be in one of three states: pending, fulfilled, or rejected.

      Promises that are fulfilled have a fulfillment value and are in the fulfilled
      state.  Promises that are rejected have a rejection reason and are in the
      rejected state.  A fulfillment value is never a thenable.

      Promises can also be said to *resolve* a value.  If this value is also a
      promise, then the original promise's settled state will match the value's
      settled state.  So a promise that *resolves* a promise that rejects will
      itself reject, and a promise that *resolves* a promise that fulfills will
      itself fulfill.


      Basic Usage:
      ------------

      ```js
      var promise = new Promise(function(resolve, reject) {
        // on success
        resolve(value);

        // on failure
        reject(reason);
      });

      promise.then(function(value) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Advanced Usage:
      ---------------

      Promises shine when abstracting away asynchronous interactions such as
      `XMLHttpRequest`s.

      ```js
      function getJSON(url) {
        return new Promise(function(resolve, reject){
          var xhr = new XMLHttpRequest();

          xhr.open('GET', url);
          xhr.onreadystatechange = handler;
          xhr.responseType = 'json';
          xhr.setRequestHeader('Accept', 'application/json');
          xhr.send();

          function handler() {
            if (this.readyState === this.DONE) {
              if (this.status === 200) {
                resolve(this.response);
              } else {
                reject(new Error('getJSON: `' + url + '` failed with status: [' + this.status + ']'));
              }
            }
          };
        });
      }

      getJSON('/posts.json').then(function(json) {
        // on fulfillment
      }, function(reason) {
        // on rejection
      });
      ```

      Unlike callbacks, promises are great composable primitives.

      ```js
      Promise.all([
        getJSON('/posts'),
        getJSON('/comments')
      ]).then(function(values){
        values[0] // => postsJSON
        values[1] // => commentsJSON

        return values;
      });
      ```

      @class Promise
      @param {function} resolver
      Useful for tooling.
      @constructor
    */
    function lib$es6$promise$promise$$Promise(resolver) {
      this._id = lib$es6$promise$promise$$counter++;
      this._state = undefined;
      this._result = undefined;
      this._subscribers = [];

      if (lib$es6$promise$$internal$$noop !== resolver) {
        if (!lib$es6$promise$utils$$isFunction(resolver)) {
          lib$es6$promise$promise$$needsResolver();
        }

        if (!(this instanceof lib$es6$promise$promise$$Promise)) {
          lib$es6$promise$promise$$needsNew();
        }

        lib$es6$promise$$internal$$initializePromise(this, resolver);
      }
    }

    lib$es6$promise$promise$$Promise.all = lib$es6$promise$promise$all$$default;
    lib$es6$promise$promise$$Promise.race = lib$es6$promise$promise$race$$default;
    lib$es6$promise$promise$$Promise.resolve = lib$es6$promise$promise$resolve$$default;
    lib$es6$promise$promise$$Promise.reject = lib$es6$promise$promise$reject$$default;
    lib$es6$promise$promise$$Promise._setScheduler = lib$es6$promise$asap$$setScheduler;
    lib$es6$promise$promise$$Promise._setAsap = lib$es6$promise$asap$$setAsap;
    lib$es6$promise$promise$$Promise._asap = lib$es6$promise$asap$$asap;

    lib$es6$promise$promise$$Promise.prototype = {
      constructor: lib$es6$promise$promise$$Promise,

    /**
      The primary way of interacting with a promise is through its `then` method,
      which registers callbacks to receive either a promise's eventual value or the
      reason why the promise cannot be fulfilled.

      ```js
      findUser().then(function(user){
        // user is available
      }, function(reason){
        // user is unavailable, and you are given the reason why
      });
      ```

      Chaining
      --------

      The return value of `then` is itself a promise.  This second, 'downstream'
      promise is resolved with the return value of the first promise's fulfillment
      or rejection handler, or rejected if the handler throws an exception.

      ```js
      findUser().then(function (user) {
        return user.name;
      }, function (reason) {
        return 'default name';
      }).then(function (userName) {
        // If `findUser` fulfilled, `userName` will be the user's name, otherwise it
        // will be `'default name'`
      });

      findUser().then(function (user) {
        throw new Error('Found user, but still unhappy');
      }, function (reason) {
        throw new Error('`findUser` rejected and we're unhappy');
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // if `findUser` fulfilled, `reason` will be 'Found user, but still unhappy'.
        // If `findUser` rejected, `reason` will be '`findUser` rejected and we're unhappy'.
      });
      ```
      If the downstream promise does not specify a rejection handler, rejection reasons will be propagated further downstream.

      ```js
      findUser().then(function (user) {
        throw new PedagogicalException('Upstream error');
      }).then(function (value) {
        // never reached
      }).then(function (value) {
        // never reached
      }, function (reason) {
        // The `PedgagocialException` is propagated all the way down to here
      });
      ```

      Assimilation
      ------------

      Sometimes the value you want to propagate to a downstream promise can only be
      retrieved asynchronously. This can be achieved by returning a promise in the
      fulfillment or rejection handler. The downstream promise will then be pending
      until the returned promise is settled. This is called *assimilation*.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // The user's comments are now available
      });
      ```

      If the assimliated promise rejects, then the downstream promise will also reject.

      ```js
      findUser().then(function (user) {
        return findCommentsByAuthor(user);
      }).then(function (comments) {
        // If `findCommentsByAuthor` fulfills, we'll have the value here
      }, function (reason) {
        // If `findCommentsByAuthor` rejects, we'll have the reason here
      });
      ```

      Simple Example
      --------------

      Synchronous Example

      ```javascript
      var result;

      try {
        result = findResult();
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js
      findResult(function(result, err){
        if (err) {
          // failure
        } else {
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findResult().then(function(result){
        // success
      }, function(reason){
        // failure
      });
      ```

      Advanced Example
      --------------

      Synchronous Example

      ```javascript
      var author, books;

      try {
        author = findAuthor();
        books  = findBooksByAuthor(author);
        // success
      } catch(reason) {
        // failure
      }
      ```

      Errback Example

      ```js

      function foundBooks(books) {

      }

      function failure(reason) {

      }

      findAuthor(function(author, err){
        if (err) {
          failure(err);
          // failure
        } else {
          try {
            findBoooksByAuthor(author, function(books, err) {
              if (err) {
                failure(err);
              } else {
                try {
                  foundBooks(books);
                } catch(reason) {
                  failure(reason);
                }
              }
            });
          } catch(error) {
            failure(err);
          }
          // success
        }
      });
      ```

      Promise Example;

      ```javascript
      findAuthor().
        then(findBooksByAuthor).
        then(function(books){
          // found books
      }).catch(function(reason){
        // something went wrong
      });
      ```

      @method then
      @param {Function} onFulfilled
      @param {Function} onRejected
      Useful for tooling.
      @return {Promise}
    */
      then: function(onFulfillment, onRejection) {
        var parent = this;
        var state = parent._state;

        if (state === lib$es6$promise$$internal$$FULFILLED && !onFulfillment || state === lib$es6$promise$$internal$$REJECTED && !onRejection) {
          return this;
        }

        var child = new this.constructor(lib$es6$promise$$internal$$noop);
        var result = parent._result;

        if (state) {
          var callback = arguments[state - 1];
          lib$es6$promise$asap$$asap(function(){
            lib$es6$promise$$internal$$invokeCallback(state, child, callback, result);
          });
        } else {
          lib$es6$promise$$internal$$subscribe(parent, child, onFulfillment, onRejection);
        }

        return child;
      },

    /**
      `catch` is simply sugar for `then(undefined, onRejection)` which makes it the same
      as the catch block of a try/catch statement.

      ```js
      function findAuthor(){
        throw new Error('couldn't find that author');
      }

      // synchronous
      try {
        findAuthor();
      } catch(reason) {
        // something went wrong
      }

      // async with promises
      findAuthor().catch(function(reason){
        // something went wrong
      });
      ```

      @method catch
      @param {Function} onRejection
      Useful for tooling.
      @return {Promise}
    */
      'catch': function(onRejection) {
        return this.then(null, onRejection);
      }
    };
    function lib$es6$promise$polyfill$$polyfill() {
      var local;

      if (typeof global !== 'undefined') {
          local = global;
      } else if (typeof self !== 'undefined') {
          local = self;
      } else {
          try {
              local = Function('return this')();
          } catch (e) {
              throw new Error('polyfill failed because global object is unavailable in this environment');
          }
      }

      var P = local.Promise;

      if (P && Object.prototype.toString.call(P.resolve()) === '[object Promise]' && !P.cast) {
        return;
      }

      local.Promise = lib$es6$promise$promise$$default;
    }
    var lib$es6$promise$polyfill$$default = lib$es6$promise$polyfill$$polyfill;

    var lib$es6$promise$umd$$ES6Promise = {
      'Promise': lib$es6$promise$promise$$default,
      'polyfill': lib$es6$promise$polyfill$$default
    };

    /* global define:true module:true window: true */
    if (typeof define === 'function' && define['amd']) {
      define(function() { return lib$es6$promise$umd$$ES6Promise; });
    } else if (typeof module !== 'undefined' && module['exports']) {
      module['exports'] = lib$es6$promise$umd$$ES6Promise;
    } else if (typeof this !== 'undefined') {
      this['ES6Promise'] = lib$es6$promise$umd$$ES6Promise;
    }

    lib$es6$promise$polyfill$$default();
}).call(this);


}).call(this,undefined,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},undefined)
},{}],3:[function(_dereq_,module,exports){
(function (define){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof module === 'object' && module.exports && typeof _dereq_ === 'function') {
        module.exports = definition();
    } else if (typeof define === 'function' && typeof define.amd === 'object') {
        define(definition);
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";
    var noop = function() {};
    var undefinedType = "undefined";

    function realMethod(methodName) {
        if (typeof console === undefinedType) {
            return false; // We can't build a real method without a console to log to
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // these private functions always need `this` to be set properly

    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }
    }

    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public API
       *
       */

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Package-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    return defaultLogger;
}));

}).call(this,undefined)
},{}],4:[function(_dereq_,module,exports){
module.exports = _dereq_('./lib/simple_lru.js');

},{"./lib/simple_lru.js":5}],5:[function(_dereq_,module,exports){
"use strict";

/**
 * LRU cache based on a double linked list
 */

function ListElement(before,next,key,value){
    this.before = before
    this.next = next
    this.key = key
    this.value = value
}

ListElement.prototype.setKey = function(key){
    this.key = key
}

ListElement.prototype.setValue = function(value){
    this.value = value
}


function Cache(options){
    if(!options)
        options = {}
    this.maxSize = options.maxSize 
    this.reset()
}


Cache.prototype.reset = function(){
    this.size = 0   
    this.cache = {}
    this.tail = undefined
    this.head = undefined
}


Cache.prototype.get = function(key,hit){
    var cacheVal = this.cache[key]
    /*
     * Define if the egt function should hit the value to move
     * it to the head of linked list  
     */
    hit = hit != undefined && hit != null ? hit : true;
    if(cacheVal && hit)
        this.hit(cacheVal)
    else
        return undefined
    return cacheVal.value
}

Cache.prototype.set = function(key,val,hit){
    var actual = this.cache[key]
    /*
     * Define if the set function should hit the value to move
     * it to the head of linked list  
     */
     hit = hit != undefined && hit != null ? hit : true;
    
    
    if(actual){
        actual.value = val
        if(hit) this.hit(actual)
    }else{
        var cacheVal
        if(this.size >= this.maxSize){
            var tailKey = this.tail.key 
            this.detach(this.tail)
            
            /*
             * If max is reached we'llreuse object to minimize GC impact 
             * when the objects are cached short time
             */
            cacheVal = this.cache[tailKey]
            delete this.cache[tailKey]

            cacheVal.next = undefined
            cacheVal.before = undefined
            
            /*
             * setters reuse the array object 
             */
            cacheVal.setKey(key)
            cacheVal.setValue(val)
        }

        cacheVal = cacheVal ? cacheVal : new ListElement(undefined,undefined,key,val)
        this.cache[key] = cacheVal
        this.attach(cacheVal)
    }
}

Cache.prototype.del = function(key){
    var val = this.cache[key]
    if(!val)
        return;
    this.detach(val)
    delete this.cache[key]
}

Cache.prototype.hit = function(cacheVal){
    //Send cacheVal to the head of list
    this.detach(cacheVal)
    this.attach(cacheVal)
}

Cache.prototype.attach = function(element){
    if(!element)
        return;
    element.before = undefined
    element.next = this.head
    this.head = element
    if(!element.next)
       this.tail = element
    else
        element.next.before = element
    this.size++ 
}

Cache.prototype.detach = function(element){
    if(!element)
        return;
    var before = element.before
    var next = element.next
    if(before){
        before.next = next
    }else{
        this.head = next
    }
    if(next){
        next.before = before
    }else{
        this.tail = before
    }
    this.size--
}

Cache.prototype.forEach = function(callback){
    var self = this
    Object.keys(this.cache).forEach(function(key){
        var val = self.cache[key]
        callback(val.value,key)
    })
}
module.exports=Cache

},{}],6:[function(_dereq_,module,exports){
(function (define){
(function (root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stack-generator', ['stackframe'], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory(_dereq_('stackframe'));
    } else {
        root.StackGenerator = factory(root.StackFrame);
    }
}(this, function (StackFrame) {
    return {
        backtrace: function StackGenerator$$backtrace(opts) {
            var stack = [];
            var maxStackSize = 10;

            if (typeof opts === 'object' && typeof opts.maxStackSize === 'number') {
                maxStackSize = opts.maxStackSize;
            }

            var curr = arguments.callee;
            while (curr && stack.length < maxStackSize) {
                // Allow V8 optimizations
                var args = new Array(curr['arguments'].length);
                for(var i = 0; i < args.length; ++i) {
                    args[i] = curr['arguments'][i];
                }
                if (/function(?:\s+([\w$]+))+\s*\(/.test(curr.toString())) {
                    stack.push(new StackFrame(RegExp.$1 || undefined, args));
                } else {
                    stack.push(new StackFrame(undefined, args));
                }

                try {
                    curr = curr.caller;
                } catch (e) {
                    break;
                }
            }
            return stack;
        }
    };
}));

}).call(this,undefined)
},{"stackframe":7}],7:[function(_dereq_,module,exports){
(function (define){
(function (root, factory) {
    'use strict';
    // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and browsers.

    /* istanbul ignore next */
    if (typeof define === 'function' && define.amd) {
        define('stackframe', [], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.StackFrame = factory();
    }
}(this, function () {
    'use strict';
    function _isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function StackFrame(functionName, args, fileName, lineNumber, columnNumber, source) {
        if (functionName !== undefined) {
            this.setFunctionName(functionName);
        }
        if (args !== undefined) {
            this.setArgs(args);
        }
        if (fileName !== undefined) {
            this.setFileName(fileName);
        }
        if (lineNumber !== undefined) {
            this.setLineNumber(lineNumber);
        }
        if (columnNumber !== undefined) {
            this.setColumnNumber(columnNumber);
        }
        if (source !== undefined) {
            this.setSource(source);
        }
    }

    StackFrame.prototype = {
        getFunctionName: function () {
            return this.functionName;
        },
        setFunctionName: function (v) {
            this.functionName = String(v);
        },

        getArgs: function () {
            return this.args;
        },
        setArgs: function (v) {
            if (Object.prototype.toString.call(v) !== '[object Array]') {
                throw new TypeError('Args must be an Array');
            }
            this.args = v;
        },

        // NOTE: Property name may be misleading as it includes the path,
        // but it somewhat mirrors V8's JavaScriptStackTraceApi
        // https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi and Gecko's
        // http://mxr.mozilla.org/mozilla-central/source/xpcom/base/nsIException.idl#14
        getFileName: function () {
            return this.fileName;
        },
        setFileName: function (v) {
            this.fileName = String(v);
        },

        getLineNumber: function () {
            return this.lineNumber;
        },
        setLineNumber: function (v) {
            if (!_isNumber(v)) {
                throw new TypeError('Line Number must be a Number');
            }
            this.lineNumber = Number(v);
        },

        getColumnNumber: function () {
            return this.columnNumber;
        },
        setColumnNumber: function (v) {
            if (!_isNumber(v)) {
                throw new TypeError('Column Number must be a Number');
            }
            this.columnNumber = Number(v);
        },

        getSource: function () {
            return this.source;
        },
        setSource: function (v) {
            this.source = String(v);
        },

        toString: function() {
            var functionName = this.getFunctionName() || '{anonymous}';
            var args = '(' + (this.getArgs() || []).join(',') + ')';
            var fileName = this.getFileName() ? ('@' + this.getFileName()) : '';
            var lineNumber = _isNumber(this.getLineNumber()) ? (':' + this.getLineNumber()) : '';
            var columnNumber = _isNumber(this.getColumnNumber()) ? (':' + this.getColumnNumber()) : '';
            return functionName + args + fileName + lineNumber + columnNumber;
        }
    };

    return StackFrame;
}));

}).call(this,undefined)
},{}],8:[function(_dereq_,module,exports){
(function (global){
var core = _dereq_('../core');
var browserPatch = _dereq_('../patch/browser');
if (global.Zone) {
    console.warn('Zone already exported on window the object!');
}
else {
    global.Zone = core.Zone;
    global.zone = new global.Zone();
    browserPatch.apply();
}
exports.Zone = global.Zone;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../core":9,"../patch/browser":11}],9:[function(_dereq_,module,exports){
(function (global){
var keys = _dereq_('./keys');
var promise = _dereq_('./patch/promise');
var deprecated = {};
function deprecatedWarning(key, text) {
    if (!deprecated.hasOwnProperty(key)) {
        deprecated[key] = true;
        console.warn("DEPRECATION WARNING: '" + key +
            "' is no longer supported and will be removed in next major release. " + text);
    }
}
var Zone = (function () {
    function Zone(parentZone, data) {
        this.parent = null;
        // onError is used to override error handling.
        // When a custom error handler is provided, it should most probably rethrow the exception
        // not to break the expected control flow:
        //
        // `promise.then(fnThatThrows).catch(fn);`
        //
        // When this code is executed in a zone with a custom onError handler that doesn't rethrow, the
        // `.catch()` branch will not be taken as the `fnThatThrows` exception will be swallowed by the
        // handler.
        this.onError = null;
        var zone = (arguments.length) ? Object.create(parentZone) : this;
        zone.parent = parentZone || null;
        Object.keys(data || {}).forEach(function (property) {
            var _property = property.substr(1);
            // augment the new zone with a hook decorates the parent's hook
            if (property[0] === '$') {
                zone[_property] = data[property](parentZone[_property] || function () { });
            }
            else if (property[0] === '+') {
                if (parentZone[_property]) {
                    zone[_property] = function () {
                        var result = parentZone[_property].apply(this, arguments);
                        data[property].apply(this, arguments);
                        return result;
                    };
                }
                else {
                    zone[_property] = data[property];
                }
            }
            else if (property[0] === '-') {
                if (parentZone[_property]) {
                    zone[_property] = function () {
                        data[property].apply(this, arguments);
                        return parentZone[_property].apply(this, arguments);
                    };
                }
                else {
                    zone[_property] = data[property];
                }
            }
            else {
                zone[property] = (typeof data[property] === 'object') ?
                    JSON.parse(JSON.stringify(data[property])) :
                    data[property];
            }
        });
        zone.$id = Zone.nextId++;
        return zone;
    }
    Zone.prototype.fork = function (locals) {
        this.onZoneCreated();
        return new Zone(this, locals);
    };
    Zone.prototype.bind = function (fn, skipEnqueue) {
        if (typeof fn !== 'function') {
            throw new Error('Expecting function got: ' + fn);
        }
        skipEnqueue || this.enqueueTask(fn);
        var zone = this.isRootZone() ? this : this.fork();
        return function zoneBoundFn() {
            return zone.run(fn, this, arguments);
        };
    };
    /// @deprecated
    Zone.prototype.bindOnce = function (fn) {
        deprecatedWarning('bindOnce', 'There is no replacement.');
        var boundZone = this;
        return this.bind(function () {
            var result = fn.apply(this, arguments);
            boundZone.dequeueTask(fn);
            return result;
        });
    };
    Zone.prototype.isRootZone = function () {
        return this.parent === null;
    };
    Zone.prototype.run = function (fn, applyTo, applyWith) {
        applyWith = applyWith || [];
        var oldZone = global.zone;
        // MAKE THIS ZONE THE CURRENT ZONE
        global.zone = this;
        try {
            this.beforeTask();
            return fn.apply(applyTo, applyWith);
        }
        catch (e) {
            if (this.onError) {
                this.onError(e);
            }
            else {
                throw e;
            }
        }
        finally {
            this.afterTask();
            // REVERT THE CURRENT ZONE BACK TO THE ORIGINAL ZONE
            global.zone = oldZone;
        }
    };
    Zone.prototype.beforeTask = function () { };
    Zone.prototype.onZoneCreated = function () { };
    Zone.prototype.afterTask = function () { };
    Zone.prototype.enqueueTask = function (fn) {
        deprecatedWarning('enqueueTask', 'Use addTask/addRepeatingTask/addMicroTask');
    };
    Zone.prototype.dequeueTask = function (fn) {
        deprecatedWarning('dequeueTask', 'Use removeTask/removeRepeatingTask/removeMicroTask');
    };
    Zone.prototype.addTask = function (taskFn) { this.enqueueTask(taskFn); };
    Zone.prototype.removeTask = function (taskFn) { this.dequeueTask(taskFn); };
    Zone.prototype.addRepeatingTask = function (taskFn) { this.enqueueTask(taskFn); };
    Zone.prototype.removeRepeatingTask = function (taskFn) { this.dequeueTask(taskFn); };
    Zone.prototype.addMicrotask = function (taskFn) { this.enqueueTask(taskFn); };
    Zone.prototype.removeMicrotask = function (taskFn) { this.dequeueTask(taskFn); };
    Zone.prototype.addEventListener = function () {
        return this[keys.common.addEventListener].apply(this, arguments);
    };
    Zone.prototype.removeEventListener = function () {
        return this[keys.common.removeEventListener].apply(this, arguments);
    };
    // Root zone ID === 1
    Zone.nextId = 1;
    Zone.bindPromiseFn = promise.bindPromiseFn;
    return Zone;
})();
exports.Zone = Zone;
;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":10,"./patch/promise":18}],10:[function(_dereq_,module,exports){
/**
 * Creates keys for `private` properties on exposed objects to minimize interactions with other codebases.
 */
function create(name) {
    // `Symbol` implementation is broken in Chrome 39.0.2171, do not use them even if they are available
    return '_zone$' + name;
}
exports.create = create;
exports.common = {
    addEventListener: create('addEventListener'),
    removeEventListener: create('removeEventListener')
};

},{}],11:[function(_dereq_,module,exports){
(function (global){
var fnPatch = _dereq_('./functions');
var promisePatch = _dereq_('./promise');
var mutationObserverPatch = _dereq_('./mutation-observer');
var definePropertyPatch = _dereq_('./define-property');
var registerElementPatch = _dereq_('./register-element');
var eventTargetPatch = _dereq_('./event-target');
var propertyDescriptorPatch = _dereq_('./property-descriptor');
var geolocationPatch = _dereq_('./geolocation');
var fileReaderPatch = _dereq_('./file-reader');
function apply() {
    fnPatch.patchSetClearFunction(global, global.Zone, [
        ['setTimeout', 'clearTimeout', false, false],
        ['setInterval', 'clearInterval', true, false],
        ['setImmediate', 'clearImmediate', false, false],
        ['requestAnimationFrame', 'cancelAnimationFrame', false, true],
        ['mozRequestAnimationFrame', 'mozCancelAnimationFrame', false, true],
        ['webkitRequestAnimationFrame', 'webkitCancelAnimationFrame', false, true]
    ]);
    fnPatch.patchFunction(global, [
        'alert',
        'prompt'
    ]);
    eventTargetPatch.apply();
    propertyDescriptorPatch.apply();
    promisePatch.apply();
    mutationObserverPatch.patchClass('MutationObserver');
    mutationObserverPatch.patchClass('WebKitMutationObserver');
    definePropertyPatch.apply();
    registerElementPatch.apply();
    geolocationPatch.apply();
    fileReaderPatch.apply();
}
exports.apply = apply;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./define-property":12,"./event-target":13,"./file-reader":14,"./functions":15,"./geolocation":16,"./mutation-observer":17,"./promise":18,"./property-descriptor":19,"./register-element":20}],12:[function(_dereq_,module,exports){
var keys = _dereq_('../keys');
// might need similar for object.freeze
// i regret nothing
var _defineProperty = Object.defineProperty;
var _getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
var _create = Object.create;
var unconfigurablesKey = keys.create('unconfigurables');
function apply() {
    Object.defineProperty = function (obj, prop, desc) {
        if (isUnconfigurable(obj, prop)) {
            throw new TypeError('Cannot assign to read only property \'' + prop + '\' of ' + obj);
        }
        if (prop !== 'prototype') {
            desc = rewriteDescriptor(obj, prop, desc);
        }
        return _defineProperty(obj, prop, desc);
    };
    Object.defineProperties = function (obj, props) {
        Object.keys(props).forEach(function (prop) {
            Object.defineProperty(obj, prop, props[prop]);
        });
        return obj;
    };
    Object.create = function (obj, proto) {
        if (typeof proto === 'object') {
            Object.keys(proto).forEach(function (prop) {
                proto[prop] = rewriteDescriptor(obj, prop, proto[prop]);
            });
        }
        return _create(obj, proto);
    };
    Object.getOwnPropertyDescriptor = function (obj, prop) {
        var desc = _getOwnPropertyDescriptor(obj, prop);
        if (isUnconfigurable(obj, prop)) {
            desc.configurable = false;
        }
        return desc;
    };
}
exports.apply = apply;
;
function _redefineProperty(obj, prop, desc) {
    desc = rewriteDescriptor(obj, prop, desc);
    return _defineProperty(obj, prop, desc);
}
exports._redefineProperty = _redefineProperty;
;
function isUnconfigurable(obj, prop) {
    return obj && obj[unconfigurablesKey] && obj[unconfigurablesKey][prop];
}
function rewriteDescriptor(obj, prop, desc) {
    desc.configurable = true;
    if (!desc.configurable) {
        if (!obj[unconfigurablesKey]) {
            _defineProperty(obj, unconfigurablesKey, { writable: true, value: {} });
        }
        obj[unconfigurablesKey][prop] = true;
    }
    return desc;
}

},{"../keys":10}],13:[function(_dereq_,module,exports){
(function (global){
'use strict';
var utils = _dereq_('../utils');
function apply() {
    // patched properties depend on addEventListener, so this needs to come first
    if (global.EventTarget) {
        utils.patchEventTargetMethods(global.EventTarget.prototype);
    }
    else {
        var apis = [
            'ApplicationCache',
            'EventSource',
            'FileReader',
            'InputMethodContext',
            'MediaController',
            'MessagePort',
            'Node',
            'Performance',
            'SVGElementInstance',
            'SharedWorker',
            'TextTrack',
            'TextTrackCue',
            'TextTrackList',
            'WebKitNamedFlow',
            'Worker',
            'WorkerGlobalScope',
            'XMLHttpRequest',
            'XMLHttpRequestEventTarget',
            'XMLHttpRequestUpload'
        ];
        apis.forEach(function (api) {
            var proto = global[api] && global[api].prototype;
            // Some browsers e.g. Android 4.3's don't actually implement
            // the EventTarget methods for all of these e.g. FileReader.
            // In this case, there is nothing to patch.
            if (proto && proto.addEventListener) {
                utils.patchEventTargetMethods(proto);
            }
        });
        // Patch the methods on `window` instead of `Window.prototype`
        // `Window` is not accessible on Android 4.3
        if (typeof (window) !== 'undefined') {
            utils.patchEventTargetMethods(window);
        }
    }
}
exports.apply = apply;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":22}],14:[function(_dereq_,module,exports){
var utils = _dereq_('../utils');
function apply() {
    utils.patchClass('FileReader');
}
exports.apply = apply;

},{"../utils":22}],15:[function(_dereq_,module,exports){
(function (global){
var wtf = _dereq_('../wtf');
function patchSetClearFunction(window, Zone, fnNames) {
    function patchMacroTaskMethod(setName, clearName, repeating, isRaf) {
        var setNative = window[setName];
        var clearNative = window[clearName];
        var ids = {};
        if (setNative) {
            var wtfSetEventFn = wtf.createEvent('Zone#' + setName + '(uint32 zone, uint32 id, uint32 delay)');
            var wtfClearEventFn = wtf.createEvent('Zone#' + clearName + '(uint32 zone, uint32 id)');
            var wtfCallbackFn = wtf.createScope('Zone#cb:' + setName + '(uint32 zone, uint32 id, uint32 delay)');
            // Forward all calls from the window through the zone.
            window[setName] = function () {
                return global.zone[setName].apply(global.zone, arguments);
            };
            window[clearName] = function () {
                return global.zone[clearName].apply(global.zone, arguments);
            };
            // Set up zone processing for the set function.
            Zone.prototype[setName] = function (fn, delay) {
                // We need to save `fn` in var different then argument. This is because
                // in IE9 `argument[0]` and `fn` have same identity, and assigning to
                // `argument[0]` changes `fn`.
                var callbackFn = fn;
                if (typeof callbackFn !== 'function') {
                    // force the error by calling the method with wrong args
                    setNative.apply(window, arguments);
                }
                var zone = this;
                var setId = null;
                // wrap the callback function into the zone.
                arguments[0] = function () {
                    var callbackZone = zone.isRootZone() || isRaf ? zone : zone.fork();
                    var callbackThis = this;
                    var callbackArgs = arguments;
                    return wtf.leaveScope(wtfCallbackFn(callbackZone.$id, setId, delay), callbackZone.run(function () {
                        if (!repeating) {
                            delete ids[setId];
                            callbackZone.removeTask(callbackFn);
                        }
                        return callbackFn.apply(callbackThis, callbackArgs);
                    }));
                };
                if (repeating) {
                    zone.addRepeatingTask(callbackFn);
                }
                else {
                    zone.addTask(callbackFn);
                }
                setId = setNative.apply(window, arguments);
                ids[setId] = callbackFn;
                wtfSetEventFn(zone.$id, setId, delay);
                return setId;
            };
            Zone.prototype[setName + 'Unpatched'] = function () {
                return setNative.apply(window, arguments);
            };
            // Set up zone processing for the clear function.
            Zone.prototype[clearName] = function (id) {
                wtfClearEventFn(this.$id, id);
                if (ids.hasOwnProperty(id)) {
                    var callbackFn = ids[id];
                    delete ids[id];
                    if (repeating) {
                        this.removeRepeatingTask(callbackFn);
                    }
                    else {
                        this.removeTask(callbackFn);
                    }
                }
                return clearNative.apply(window, arguments);
            };
            Zone.prototype[clearName + 'Unpatched'] = function () {
                return clearNative.apply(window, arguments);
            };
        }
    }
    fnNames.forEach(function (args) {
        patchMacroTaskMethod.apply(null, args);
    });
}
exports.patchSetClearFunction = patchSetClearFunction;
;
function patchFunction(obj, fnNames) {
    fnNames.forEach(function (name) {
        var delegate = obj[name];
        global.zone[name] = function () {
            return delegate.apply(obj, arguments);
        };
        obj[name] = function () {
            return global.zone[name].apply(this, arguments);
        };
    });
}
exports.patchFunction = patchFunction;
;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../wtf":23}],16:[function(_dereq_,module,exports){
(function (global){
var utils = _dereq_('../utils');
function apply() {
    if (global.navigator && global.navigator.geolocation) {
        utils.patchPrototype(global.navigator.geolocation, [
            'getCurrentPosition',
            'watchPosition'
        ]);
    }
}
exports.apply = apply;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":22}],17:[function(_dereq_,module,exports){
(function (global){
var keys = _dereq_('../keys');
var originalInstanceKey = keys.create('originalInstance');
var creationZoneKey = keys.create('creationZone');
var isActiveKey = keys.create('isActive');
// wrap some native API on `window`
function patchClass(className) {
    var OriginalClass = global[className];
    if (!OriginalClass)
        return;
    global[className] = function (fn) {
        this[originalInstanceKey] = new OriginalClass(global.zone.bind(fn, true));
        // Remember where the class was instantiate to execute the enqueueTask and dequeueTask hooks
        this[creationZoneKey] = global.zone;
    };
    var instance = new OriginalClass(function () { });
    global[className].prototype.disconnect = function () {
        var result = this[originalInstanceKey].disconnect.apply(this[originalInstanceKey], arguments);
        if (this[isActiveKey]) {
            this[creationZoneKey].dequeueTask();
            this[isActiveKey] = false;
        }
        return result;
    };
    global[className].prototype.observe = function () {
        if (!this[isActiveKey]) {
            this[creationZoneKey].enqueueTask();
            this[isActiveKey] = true;
        }
        return this[originalInstanceKey].observe.apply(this[originalInstanceKey], arguments);
    };
    var prop;
    for (prop in instance) {
        (function (prop) {
            if (typeof global[className].prototype !== 'undefined') {
                return;
            }
            if (typeof instance[prop] === 'function') {
                global[className].prototype[prop] = function () {
                    return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
                };
            }
            else {
                Object.defineProperty(global[className].prototype, prop, {
                    set: function (fn) {
                        if (typeof fn === 'function') {
                            this[originalInstanceKey][prop] = global.zone.bind(fn);
                        }
                        else {
                            this[originalInstanceKey][prop] = fn;
                        }
                    },
                    get: function () {
                        return this[originalInstanceKey][prop];
                    }
                });
            }
        }(prop));
    }
}
exports.patchClass = patchClass;
;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../keys":10}],18:[function(_dereq_,module,exports){
(function (global){
var utils = _dereq_('../utils');
if (global.Promise) {
    exports.bindPromiseFn = function (delegate) {
        return function () {
            var delegatePromise = delegate.apply(this, arguments);
            // if the delegate returned an instance of Promise, forward it.
            if (delegatePromise instanceof Promise) {
                return delegatePromise;
            }
            // Otherwise wrap the Promise-like in a global Promise
            return new Promise(function (resolve, reject) {
                delegatePromise.then(resolve, reject);
            });
        };
    };
}
else {
    exports.bindPromiseFn = function (delegate) {
        return function () {
            return _patchThenable(delegate.apply(this, arguments));
        };
    };
}
function _patchPromiseFnsOnObject(objectPath, fnNames) {
    var obj = global;
    var exists = objectPath.every(function (segment) {
        obj = obj[segment];
        return obj;
    });
    if (!exists) {
        return;
    }
    fnNames.forEach(function (name) {
        var fn = obj[name];
        if (fn) {
            obj[name] = exports.bindPromiseFn(fn);
        }
    });
}
function _patchThenable(thenable) {
    var then = thenable.then;
    thenable.then = function () {
        var args = utils.bindArguments(arguments);
        var nextThenable = then.apply(thenable, args);
        return _patchThenable(nextThenable);
    };
    var ocatch = thenable.catch;
    thenable.catch = function () {
        var args = utils.bindArguments(arguments);
        var nextThenable = ocatch.apply(thenable, args);
        return _patchThenable(nextThenable);
    };
    return thenable;
}
function apply() {
    // Patch .then() and .catch() on native Promises to execute callbacks in the zone where
    // those functions are called.
    if (global.Promise) {
        utils.patchPrototype(Promise.prototype, [
            'then',
            'catch'
        ]);
        // Patch browser APIs that return a Promise
        var patchFns = [
            // fetch
            [[], ['fetch']],
            [['Response', 'prototype'], ['arrayBuffer', 'blob', 'json', 'text']]
        ];
        patchFns.forEach(function (objPathAndFns) {
            _patchPromiseFnsOnObject(objPathAndFns[0], objPathAndFns[1]);
        });
    }
}
exports.apply = apply;
module.exports = {
    apply: apply,
    bindPromiseFn: exports.bindPromiseFn
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":22}],19:[function(_dereq_,module,exports){
(function (global){
var webSocketPatch = _dereq_('./websocket');
var utils = _dereq_('../utils');
var keys = _dereq_('../keys');
var eventNames = 'copy cut paste abort blur focus canplay canplaythrough change click contextmenu dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange emptied ended input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup pause play playing progress ratechange reset scroll seeked seeking select show stalled submit suspend timeupdate volumechange waiting mozfullscreenchange mozfullscreenerror mozpointerlockchange mozpointerlockerror error webglcontextrestored webglcontextlost webglcontextcreationerror'.split(' ');
function apply() {
    if (utils.isNode()) {
        return;
    }
    var supportsWebSocket = typeof WebSocket !== 'undefined';
    if (canPatchViaPropertyDescriptor()) {
        // for browsers that we can patch the descriptor:  Chrome & Firefox
        if (!utils.isWebWorker()) {
            var onEventNames = eventNames.map(function (property) {
                return 'on' + property;
            });
            utils.patchProperties(HTMLElement.prototype, onEventNames);
        }
        utils.patchProperties(XMLHttpRequest.prototype);
        if (supportsWebSocket) {
            utils.patchProperties(WebSocket.prototype);
        }
    }
    else {
        // Safari, Android browsers (Jelly Bean)
        if (!utils.isWebWorker()) {
            patchViaCapturingAllTheEvents();
        }
        utils.patchClass('XMLHttpRequest');
        if (supportsWebSocket) {
            webSocketPatch.apply();
        }
    }
}
exports.apply = apply;
function canPatchViaPropertyDescriptor() {
    if (!utils.isWebWorker() && !Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick')
        && typeof Element !== 'undefined') {
        // WebKit https://bugs.webkit.org/show_bug.cgi?id=134364
        // IDL interface attributes are not configurable
        var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'onclick');
        if (desc && !desc.configurable)
            return false;
    }
    Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', {
        get: function () {
            return true;
        }
    });
    var req = new XMLHttpRequest();
    var result = !!req.onreadystatechange;
    Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', {});
    return result;
}
;
var unboundKey = keys.create('unbound');
// Whenever any event fires, we check the event target and all parents
// for `onwhatever` properties and replace them with zone-bound functions
// - Chrome (for now)
function patchViaCapturingAllTheEvents() {
    eventNames.forEach(function (property) {
        var onproperty = 'on' + property;
        document.addEventListener(property, function (event) {
            var elt = event.target, bound;
            while (elt) {
                if (elt[onproperty] && !elt[onproperty][unboundKey]) {
                    bound = global.zone.bind(elt[onproperty]);
                    bound[unboundKey] = elt[onproperty];
                    elt[onproperty] = bound;
                }
                elt = elt.parentElement;
            }
        }, true);
    });
}
;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../keys":10,"../utils":22,"./websocket":21}],20:[function(_dereq_,module,exports){
(function (global){
var define_property_1 = _dereq_('./define-property');
var utils = _dereq_('../utils');
function apply() {
    if (utils.isWebWorker() || utils.isNode() || !('registerElement' in global.document)) {
        return;
    }
    var _registerElement = document.registerElement;
    var callbacks = [
        'createdCallback',
        'attachedCallback',
        'detachedCallback',
        'attributeChangedCallback'
    ];
    document.registerElement = function (name, opts) {
        if (opts && opts.prototype) {
            callbacks.forEach(function (callback) {
                if (opts.prototype.hasOwnProperty(callback)) {
                    var descriptor = Object.getOwnPropertyDescriptor(opts.prototype, callback);
                    if (descriptor && descriptor.value) {
                        descriptor.value = global.zone.bind(descriptor.value);
                        define_property_1._redefineProperty(opts.prototype, callback, descriptor);
                    }
                    else {
                        opts.prototype[callback] = global.zone.bind(opts.prototype[callback]);
                    }
                }
                else if (opts.prototype[callback]) {
                    opts.prototype[callback] = global.zone.bind(opts.prototype[callback]);
                }
            });
        }
        return _registerElement.apply(document, [name, opts]);
    };
}
exports.apply = apply;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":22,"./define-property":12}],21:[function(_dereq_,module,exports){
(function (global){
var utils = _dereq_('../utils');
// we have to patch the instance since the proto is non-configurable
function apply() {
    var WS = global.WebSocket;
    // On Safari window.EventTarget doesn't exist so need to patch WS add/removeEventListener
    // On older Chrome, no need since EventTarget was already patched
    if (!global.EventTarget) {
        utils.patchEventTargetMethods(WS.prototype);
    }
    global.WebSocket = function (a, b) {
        var socket = arguments.length > 1 ? new WS(a, b) : new WS(a);
        var proxySocket;
        // Safari 7.0 has non-configurable own 'onmessage' and friends properties on the socket instance
        var onmessageDesc = Object.getOwnPropertyDescriptor(socket, 'onmessage');
        if (onmessageDesc && onmessageDesc.configurable === false) {
            proxySocket = Object.create(socket);
            ['addEventListener', 'removeEventListener', 'send', 'close'].forEach(function (propName) {
                proxySocket[propName] = function () {
                    return socket[propName].apply(socket, arguments);
                };
            });
        }
        else {
            // we can patch the real socket
            proxySocket = socket;
        }
        utils.patchProperties(proxySocket, ['onclose', 'onerror', 'onmessage', 'onopen']);
        return proxySocket;
    };
}
exports.apply = apply;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":22}],22:[function(_dereq_,module,exports){
(function (process,global){
var keys = _dereq_('./keys');
function bindArguments(args) {
    for (var i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === 'function') {
            args[i] = global.zone.bind(args[i]);
        }
    }
    return args;
}
exports.bindArguments = bindArguments;
;
function patchPrototype(obj, fnNames) {
    fnNames.forEach(function (name) {
        var delegate = obj[name];
        if (delegate) {
            obj[name] = function () {
                return delegate.apply(this, bindArguments(arguments));
            };
        }
    });
}
exports.patchPrototype = patchPrototype;
;
function isWebWorker() {
    return (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
}
exports.isWebWorker = isWebWorker;
function isNode() {
    return (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]');
}
exports.isNode = isNode;
function patchProperty(obj, prop) {
    var desc = Object.getOwnPropertyDescriptor(obj, prop) || {
        enumerable: true,
        configurable: true
    };
    // A property descriptor cannot have getter/setter and be writable
    // deleting the writable and value properties avoids this error:
    //
    // TypeError: property descriptors must not specify a value or be writable when a
    // getter or setter has been specified
    delete desc.writable;
    delete desc.value;
    // substr(2) cuz 'onclick' -> 'click', etc
    var eventName = prop.substr(2);
    var _prop = '_' + prop;
    desc.set = function (fn) {
        if (this[_prop]) {
            this.removeEventListener(eventName, this[_prop]);
        }
        if (typeof fn === 'function') {
            this[_prop] = fn;
            this.addEventListener(eventName, fn, false);
        }
        else {
            this[_prop] = null;
        }
    };
    desc.get = function () {
        return this[_prop];
    };
    Object.defineProperty(obj, prop, desc);
}
exports.patchProperty = patchProperty;
;
function patchProperties(obj, properties) {
    (properties || (function () {
        var props = [];
        for (var prop in obj) {
            props.push(prop);
        }
        return props;
    }()).
        filter(function (propertyName) {
        return propertyName.substr(0, 2) === 'on';
    })).
        forEach(function (eventName) {
        patchProperty(obj, eventName);
    });
}
exports.patchProperties = patchProperties;
;
var originalFnKey = keys.create('originalFn');
var boundFnsKey = keys.create('boundFns');
function patchEventTargetMethods(obj) {
    // This is required for the addEventListener hook on the root zone.
    obj[keys.common.addEventListener] = obj.addEventListener;
    obj.addEventListener = function (eventName, handler, useCapturing) {
        //Ignore special listeners of IE11 & Edge dev tools, see https://github.com/angular/zone.js/issues/150
        if (handler && handler.toString() !== "[object FunctionWrapper]") {
            var eventType = eventName + (useCapturing ? '$capturing' : '$bubbling');
            var fn;
            if (handler.handleEvent) {
                // Have to pass in 'handler' reference as an argument here, otherwise it gets clobbered in
                // IE9 by the arguments[1] assignment at end of this function.
                fn = (function (handler) {
                    return function () {
                        handler.handleEvent.apply(handler, arguments);
                    };
                })(handler);
            }
            else {
                fn = handler;
            }
            handler[originalFnKey] = fn;
            handler[boundFnsKey] = handler[boundFnsKey] || {};
            handler[boundFnsKey][eventType] = handler[boundFnsKey][eventType] || global.zone.bind(fn);
            arguments[1] = handler[boundFnsKey][eventType];
        }
        // - Inside a Web Worker, `this` is undefined, the context is `global` (= `self`)
        // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
        // see https://github.com/angular/zone.js/issues/190
        var target = this || global;
        return global.zone.addEventListener.apply(target, arguments);
    };
    // This is required for the removeEventListener hook on the root zone.
    obj[keys.common.removeEventListener] = obj.removeEventListener;
    obj.removeEventListener = function (eventName, handler, useCapturing) {
        var eventType = eventName + (useCapturing ? '$capturing' : '$bubbling');
        if (handler && handler[boundFnsKey] && handler[boundFnsKey][eventType]) {
            var _bound = handler[boundFnsKey];
            arguments[1] = _bound[eventType];
            delete _bound[eventType];
            global.zone.dequeueTask(handler[originalFnKey]);
        }
        // - Inside a Web Worker, `this` is undefined, the context is `global`
        // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
        // see https://github.com/angular/zone.js/issues/190
        var target = this || global;
        var result = global.zone.removeEventListener.apply(target, arguments);
        return result;
    };
}
exports.patchEventTargetMethods = patchEventTargetMethods;
;
var originalInstanceKey = keys.create('originalInstance');
// wrap some native API on `window`
function patchClass(className) {
    var OriginalClass = global[className];
    if (!OriginalClass)
        return;
    global[className] = function () {
        var a = bindArguments(arguments);
        switch (a.length) {
            case 0:
                this[originalInstanceKey] = new OriginalClass();
                break;
            case 1:
                this[originalInstanceKey] = new OriginalClass(a[0]);
                break;
            case 2:
                this[originalInstanceKey] = new OriginalClass(a[0], a[1]);
                break;
            case 3:
                this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2]);
                break;
            case 4:
                this[originalInstanceKey] = new OriginalClass(a[0], a[1], a[2], a[3]);
                break;
            default: throw new Error('what are you even doing?');
        }
    };
    var instance = new OriginalClass();
    var prop;
    for (prop in instance) {
        (function (prop) {
            if (typeof instance[prop] === 'function') {
                global[className].prototype[prop] = function () {
                    return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
                };
            }
            else {
                Object.defineProperty(global[className].prototype, prop, {
                    set: function (fn) {
                        if (typeof fn === 'function') {
                            this[originalInstanceKey][prop] = global.zone.bind(fn);
                        }
                        else {
                            this[originalInstanceKey][prop] = fn;
                        }
                    },
                    get: function () {
                        return this[originalInstanceKey][prop];
                    }
                });
            }
        }(prop));
    }
    for (prop in OriginalClass) {
        if (prop !== 'prototype' && OriginalClass.hasOwnProperty(prop)) {
            global[className][prop] = OriginalClass[prop];
        }
    }
}
exports.patchClass = patchClass;
;

}).call(this,undefined,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./keys":10}],23:[function(_dereq_,module,exports){
(function (global){
// Detect and setup WTF.
var wtfTrace = null;
var wtfEvents = null;
var wtfEnabled = (function () {
    var wtf = global['wtf'];
    if (wtf) {
        wtfTrace = wtf['trace'];
        if (wtfTrace) {
            wtfEvents = wtfTrace['events'];
            return true;
        }
    }
    return false;
})();
function noop() {
}
exports.enabled = wtfEnabled;
exports.createScope = wtfEnabled ? function (signature, flags) {
    return wtfEvents.createScope(signature, flags);
} : function (s, f) {
    return noop;
};
exports.createEvent = wtfEnabled ? function (signature, flags) {
    return wtfEvents.createInstance(signature, flags);
} : function (s, f) {
    return noop;
};
exports.leaveScope = wtfEnabled ? function (scope, returnValue) {
    wtfTrace.leaveScope(scope, returnValue);
    return returnValue;
} : function (s, v) {
    return v;
};
exports.beginTimeRange = wtfEnabled ? function (rangeType, action) {
    return wtfTrace.beginTimeRange(rangeType, action);
} : function (t, a) {
    return null;
};
exports.endTimeRange = wtfEnabled ? function (range) {
    wtfTrace.endTimeRange(range);
} : function (r) {
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],24:[function(_dereq_,module,exports){
(function (global){
_dereq_('./browser/zone');
exports.Zone = global.Zone;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./browser/zone":8}],25:[function(_dereq_,module,exports){
var patchUtils = _dereq_('../patching/patchUtils')
var utils = _dereq_('../lib/utils')
module.exports = function ($provide, transactionService) {
  $provide.decorator('$compile', ['$delegate', '$injector', function ($delegate, $injector) {
    var nameParts = ['$compile', 'compile']
    var traceType = 'template.$compile'

    var traceName = nameParts.join('.')

    function compile () {
      var trace = transactionService.startTrace(traceName, traceType, {enableStackFrames: false})
      try {
        var result = $delegate.apply(this, arguments)
      } finally {
        if (!utils.isUndefined(trace)) {
          trace.end()
        }
      }
      return result
    }

    patchUtils._copyProperties($delegate, compile)

    return compile
  }])
}

},{"../lib/utils":47,"../patching/patchUtils":48}],26:[function(_dereq_,module,exports){
var utils = _dereq_('../lib/utils')

function getControllerInfoFromArgs (args) {
  var scope, name

  if (typeof args[0] === 'string') {
    name = args[0]
  } else if (typeof args[0] === 'function') {
    name = args[0].name

    // Function has been wrapped by us, use original function name
    if (name === 'opbeatFunctionWrapper' && args[0].original) {
      name = args[0].original.name
    }
  }

  if (typeof args[1] === 'object') {
    scope = args[1].$scope
  }

  return {
    scope: scope,
    name: name
  }
}

module.exports = function ($provide, transactionService) {
  $provide.decorator('$controller', ['$delegate', '$injector', function ($delegate, $injector) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var controllerInfo = getControllerInfoFromArgs(args)

      if (controllerInfo.name) {
        var traceName = '$controller.' + controllerInfo.name
        var traceType = 'app.$controller'
        var trace = transactionService.startTrace(traceName, traceType, {enableStackFrames: false})
        var result

        try {
          result = $delegate.apply(this, arguments)
        } finally {
          if (!utils.isUndefined(trace)) {
            trace.end()
          }
        }
      } else {
        result = $delegate.apply(this, arguments)
      }

      return result
    }
  }])
}

},{"../lib/utils":47}],27:[function(_dereq_,module,exports){
var utils = _dereq_('../lib/utils')
module.exports = function ($provide, transactionService) {
  'use strict'
  $provide.decorator('ngRepeatDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var ngRepeat = $delegate[0]
    var _compile = ngRepeat.compile

    ngRepeat.compile = function () {
      var _linkFn = _compile.apply(this, arguments)
      return function () {
        var scope = arguments[0]

        var _watchCollection = scope.$watchCollection

        scope.$watchCollection = function (watchExpression, reactionFunction) {
          var watchStr = humanReadableWatchExpression(watchExpression)
          if (typeof reactionFunction === 'function') {
            // todo: angular $watchCollection only sends oldValue if (listenerFn.length > 1)
            arguments[1] = function (newValue) {
              var runtimeInfo = ''
              if (watchStr != null) {
                var arrayLength = Array.isArray(newValue) ? '[' + newValue.length + ']' : ''
                runtimeInfo = watchStr + arrayLength
              }

              var traceName = 'ngRepeat ' + runtimeInfo
              var traceType = 'template.ngRepeat'
              var trace = transactionService.startTrace(traceName, traceType, { 'enableStackFrames': false })
              var ret = reactionFunction.apply(this, arguments)

              if (!utils.isUndefined(trace)) {
                trace.end()
              }
              return ret
            }
          }
          _watchCollection.apply(this, arguments)
        }
        var ret = _linkFn.apply(this, arguments)

        // Should set $watchCollection back since the scope could be shared with other components
        scope.$watchCollection = _watchCollection
        return ret
      }
    }
    return $delegate
  }])
}

function humanReadableWatchExpression (fn) {
  if (fn == null) {
    return null
  }
  if (fn.exp) {
    fn = fn.exp
  } else if (fn.name) {
    fn = fn.name
  }
  return fn.toString()
}

},{"../lib/utils":47}],28:[function(_dereq_,module,exports){
var utils = _dereq_('../instrumentation/utils')

module.exports = function ($provide, transactionService) {
  // HTTP Instrumentation
  var nextId = 0
  $provide.decorator('$http', ['$delegate', '$injector', function ($delegate, $injector) {
    return utils.instrumentModule($delegate, $injector, {
      type: 'ext.$http',
      prefix: '$http',
      traceBuffer: transactionService,
      instrumentConstructor: true,
      before: function (context) {
        context.taskId = 'http' + nextId
        transactionService.addTask(context.taskId)
        nextId++
      },
      after: function (context) {
        transactionService.removeTask(context.taskId)
      },
      signatureFormatter: function (key, args) {
        var text = ['$http']
        if (args.length) {
          if (args[0] !== null && typeof args[0] === 'object') {
            if (!args[0].method) {
              args[0].method = 'get'
            }
            text = ['$http', args[0].method.toUpperCase(), args[0].url]
          } else if (typeof args[0] === 'string') {
            text = ['$http', args[0]]
          }
        }
        return text.join(' ')
      }
    })
  }])
}

},{"../instrumentation/utils":42}],29:[function(_dereq_,module,exports){
var Exceptions = _dereq_('../exceptions/exceptions')

function NgOpbeatProvider (logger, configService) {
  this.config = function config (properties) {
    if (properties) {
      configService.setConfig(properties)
    }
    if (properties.debug === true) {
      logger.setLevel('debug', false)
    }
  }

  this.version = 'v3.0.1'

  var _exceptions = new Exceptions()

  this.$get = [
    function () {
      return {
        getConfig: function config () {
          return configService
        },
        captureException: function captureException (exception, options) {
          if (!(exception instanceof Error)) {
            logger.error("Can't capture exception. Passed exception needs to be an instanceof Error")
            return
          }

          // TraceKit.report will re-raise any exception passed to it,
          // which means you have to wrap it in try/catch. Instead, we
          // can wrap it here and only re-raise if TraceKit.report
          // raises an exception different from the one we asked to
          // report on.

          _exceptions.processError(exception, options)
        },

        setUserContext: function setUser (user) {
          configService.set('context.user', user)
        },

        setExtraContext: function setExtraContext (data) {
          configService.set('context.extra', data)
        }
      }
    }
  ]
}

function patchExceptionHandler ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

var patchHttp = _dereq_('./httpPatch')
var patchController = _dereq_('./controllerPatch')
var patchCompile = _dereq_('./compilePatch')
var patchRootScope = _dereq_('./rootScopePatch')

function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchHttp($provide, transactionService)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchRootScope($provide, transactionService)

  var patchDirectives = _dereq_('./directivesPatch')
  patchDirectives($provide, transactionService)
}

function initialize (transactionService, logger, configService, zoneService) {
  function moduleRun ($rootScope) {
    if (!configService.isPlatformSupport()) {
      return
    }
    configService.set('isInstalled', true)

    // onRouteChangeStart
    function onRouteChangeStart (event, current) {
      if (!configService.get('performance.enable')) {
        logger.debug('Performance monitoring is disable')
        return
      }
      logger.debug('Route change started')
      var transactionName
      if (current.$$route) { // ngRoute
        transactionName = current.$$route.originalPath
      } else { // UI Router
        transactionName = current.name
      }
      if (transactionName === '' || typeof transactionName === 'undefined') {
        transactionName = '/'
      }

      transactionService.startTransaction(transactionName, 'transaction')
    }

    // ng-router
    $rootScope.$on('$routeChangeStart', onRouteChangeStart)

    // ui-router
    $rootScope.$on('$stateChangeStart', onRouteChangeStart)
  }

  function moduleConfig ($provide) {
    if (!configService.isPlatformSupport()) {
      return
    }
    patchAll($provide, transactionService)
  }

  window.angular.module('ngOpbeat', [])
    .provider('$opbeat', new NgOpbeatProvider(logger, configService))
    .config(['$provide', moduleConfig])
    .run(['$rootScope', moduleRun])
  window.angular.module('opbeat-angular', ['ngOpbeat'])
}

module.exports = initialize

},{"../exceptions/exceptions":37,"./compilePatch":25,"./controllerPatch":26,"./directivesPatch":27,"./httpPatch":28,"./rootScopePatch":31}],30:[function(_dereq_,module,exports){

var ServiceContainer = _dereq_('./serviceContainer')
function init () {
  var services = new ServiceContainer().services
  return services
}

init()

},{"./serviceContainer":32}],31:[function(_dereq_,module,exports){
module.exports = function ($provide, transactionService) {
  $provide.decorator('$rootScope', ['$delegate', '$injector', function ($delegate, $injector) {
    return decorateRootScope($delegate, transactionService)
  }])
}

function decorateRootScope ($delegate, transactionService) {
  var scopePrototype = ('getPrototypeOf' in Object)
    ? Object.getPrototypeOf($delegate) : $delegate.__proto__ // eslint-disable-line 

  var _digest = scopePrototype.$digest
  scopePrototype.$digest = function () {
    var trace = transactionService.startTrace('$scope.$digest', 'app.$digest', {'enableStackFrames': false})
    var ret = _digest.apply(this, arguments)
    if (trace) {
      trace.end()
    }
    return ret
  }
  return $delegate
}

},{}],32:[function(_dereq_,module,exports){
var Logger = _dereq_('loglevel')
var ngOpbeat = _dereq_('./ngOpbeat')
var TransactionService = _dereq_('../transaction/transaction_service')
var Config = _dereq_('../lib/config')

var OpbeatBackend = _dereq_('../backend/opbeat_backend')
var transport = _dereq_('../lib/transport')

var utils = _dereq_('../lib/utils')

function ServiceContainer () {
  this.services = {}

  Config.init()
  var configService = Config
  this.services.configService = configService

  var logger = this.services.logger = this.createLogger()

  var zoneService = this.services.zoneService = this.createZoneService()

  var transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService)

  if (!configService.isPlatformSupport()) {
    ngOpbeat(transactionService, this.services.logger, configService, zoneService)
    this.services.logger.debug('Platform is not supported.')
    return
  }

  this.createOpbeatBackend()

  if (typeof window.angular === 'undefined') {
    throw new Error('AngularJS is not available. Please make sure you load opbeat-angular after AngularJS.')
  }

  if (utils.isUndefined(window.opbeatApi)) {
    window.opbeatApi = {}
  }
  window.opbeatApi.subscribeToTransactions = transactionService.subscribe.bind(transactionService)

  if (!utils.isUndefined(window.opbeatApi.onload)) {
    var onOpbeatLoaded = window.opbeatApi.onload
    onOpbeatLoaded.forEach(function (fn) {
      try {
        fn()
      } catch (error) {
        logger.error(error)
      }
    })
  }

  // binding bootstrap to zone

  // window.angular.bootstrap = zoneService.zone.bind(window.angular.bootstrap)
  var _resumeDeferred = window.angular.resumeDeferredBootstrap
  window.name = 'NG_DEFER_BOOTSTRAP!' + window.name
  window.angular.resumeDeferredBootstrap = zoneService.zone.bind(function () {
    var resumeBootstrap = window.angular.resumeBootstrap
    if (typeof _resumeDeferred === 'function') {
      resumeBootstrap = _resumeDeferred
    }
    resumeBootstrap()
  })

  ngOpbeat(transactionService, logger, configService, zoneService)
}

ServiceContainer.prototype.createLogger = function () {
  if (this.services.configService.get('debug') === true) {
    this.services.configService.config.logLevel = 'debug'
  }
  Logger.setLevel(this.services.configService.get('logLevel'), false)
  return Logger
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger
  // todo: remove this when updating to new version of zone.js
  function noop () { }
  var _warn = console.warn
  console.warn = noop

  if (typeof window.zone === 'undefined') {
    _dereq_('zone.js')
  }

  var zonePrototype = ('getPrototypeOf' in Object)
    ? Object.getPrototypeOf(window.zone) : window.zone.__proto__ // eslint-disable-line 

  zonePrototype.enqueueTask = noop
  zonePrototype.dequeueTask = noop
  console.warn = _warn

  var ZoneService = _dereq_('../transaction/zone_service')
  return new ZoneService(window.zone, logger)
}

ServiceContainer.prototype.createOpbeatBackend = function () {
  var logger = this.services.logger

  var opbeatBackend = new OpbeatBackend(transport, this.services.logger, this.services.configService)
  var serviceContainer = this

  setInterval(function () {
    var transactions = serviceContainer.services.transactionService.getTransactions()

    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    opbeatBackend.sendTransactions(transactions)
    serviceContainer.services.transactionService.clearTransactions()
  }, 5000)
}

module.exports = ServiceContainer

},{"../backend/opbeat_backend":34,"../lib/config":43,"../lib/transport":46,"../lib/utils":47,"../transaction/transaction_service":51,"../transaction/zone_service":52,"./ngOpbeat":29,"loglevel":3,"zone.js":24}],33:[function(_dereq_,module,exports){
module.exports = {
  createValidFrames: function createValidFrames (frames) {
    var result = []
    if (Array.isArray(frames)) {
      result = frames.filter(function (f) {
        return (typeof f['filename'] !== 'undefined' && typeof f['lineno'] !== 'undefined')
      })
    }
    return result
  }
}

},{}],34:[function(_dereq_,module,exports){
var backendUtils = _dereq_('./backend_utils')
module.exports = OpbeatBackend
function OpbeatBackend (transport, logger, config) {
  this._logger = logger
  this._transport = transport
  this._config = config
}
OpbeatBackend.prototype.sendError = function (errorData) {
  errorData.stacktrace.frames = backendUtils.createValidFrames(errorData.stacktrace.frames)
  this._transport.sendError(errorData)
}

OpbeatBackend.prototype.sendTransactions = function (transactionList) {
  if (this._config.isValid()) {
    var formatedTransactions = this._formatTransactions(transactionList)
    return this._transport.sendTransaction(formatedTransactions)
  } else {
    this._logger.debug('Config is not valid')
  }
}
OpbeatBackend.prototype._formatTransactions = function (transactionList) {
  var transactions = this.groupTransactions(transactionList)

  var traces = [].concat.apply([], transactionList.map(function (trans) {
    return trans.traces
  }))

  var groupedTraces = groupTraces(traces)
  var groupedTracesTimings = this.getRawGroupedTracesTimings(traces, groupedTraces)

  return {
    transactions: transactions,
    traces: {
      groups: groupedTraces,
      raw: groupedTracesTimings
    }
  }
}

OpbeatBackend.prototype.groupTransactions = function groupTransactions (transactions) {
  var groups = grouper(transactions, transactionGroupingKey)
  return Object.keys(groups).map(function (key) {
    var trans = groups[key][0]
    var durations = groups[key].map(function (trans) {
      return trans.duration()
    })
    return {
      transaction: trans.name,
      result: trans.result,
      kind: trans.type,
      timestamp: groupingTs(trans._startStamp).toISOString(),
      durations: durations
    }
  })
}

OpbeatBackend.prototype.getRawGroupedTracesTimings = function getRawGroupedTracesTimings (traces, groupedTraces) {
  var getTraceGroupIndex = function (col, item) {
    var index = 0
    var targetGroup = traceGroupingKey(item)

    col.forEach(function (item, i) {
      if (item._group === targetGroup) {
        index = i
      }
    })

    return index
  }
  var self = this
  var groupedByTransaction = grouper(traces, function (trace) {
    return trace.transaction.name + '|' + trace.transaction._start
  })

  return Object.keys(groupedByTransaction).map(function (key) {
    var traces = groupedByTransaction[key]
    var transaction = traces[0].transaction

    var data = [transaction.duration()]

    traces.forEach(function (trace) {
      var groupIndex = getTraceGroupIndex(groupedTraces, trace)
      var relativeTraceStart = trace._start - transaction._start

      if (relativeTraceStart > transaction.duration()) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.relativeTraceStartLargerThanTransactionDuration', 'color: #ff0000', relativeTraceStart, transaction._start, transaction.duration(), { trace: trace, transaction: transaction })
      } else if (relativeTraceStart < 0) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.negativeRelativeTraceStart!', 'color: #ff0000', relativeTraceStart, trace._start, transaction._start, trace)
      } else if (trace.duration() > transaction.duration()) {
        self._logger.debug('%c -- opbeat.instrumentation.getRawGroupedTracesTimings.error.traceDurationLargerThanTranscationDuration', 'color: #ff0000', trace.duration(), transaction.duration(), { trace: trace, transaction: transaction })
      } else {
        data.push([groupIndex, relativeTraceStart, trace.duration()])
      }
    })

    return data
  })
}

function groupTraces (traces) {
  var groupedByMinute = grouper(traces, traceGroupingKey)

  return Object.keys(groupedByMinute).map(function (key) {
    var trace = groupedByMinute[key][0]

    var startTime = trace._start
    if (trace.transaction) {
      startTime = startTime - trace.transaction._start
    } else {
      startTime = 0
    }

    var extra = {}
    var frames = backendUtils.createValidFrames(trace.frames)
    if (frames.length > 0) {
      extra._frames = frames
    }

    return {
      transaction: trace.transaction.name,
      signature: trace.signature,
      kind: trace.type,
      timestamp: trace._startStamp.toISOString(),
      parents: trace.ancestors(),
      extra: extra,
      _group: key
    }
  }).sort(function (a, b) {
    return a.start_time - b.start_time
  })
}

function grouper (arr, func) {
  var groups = {}

  arr.forEach(function (obj) {
    var key = func(obj)
    if (key in groups) {
      groups[key].push(obj)
    } else {
      groups[key] = [obj]
    }

    obj._traceGroup = key
  })

  return groups
}

function groupingTs (ts) {
  return new Date(ts.getFullYear(), ts.getMonth(), ts.getDate(), ts.getHours(), ts.getMinutes())
}

function transactionGroupingKey (trans) {
  return [
    groupingTs(trans._startStamp).getTime(),
    trans.name,
    trans.result,
    trans.type
  ].join('-')
}

function traceGroupingKey (trace) {
  var ancestors = trace.ancestors().map(function (trace) {
    return trace.signature
  }).join(',')

  return [
    groupingTs(trace._startStamp).getTime(),
    trace.transaction.name,
    ancestors,
    trace.signature,
    trace.type
  ].join('-')
}

},{"./backend_utils":33}],35:[function(_dereq_,module,exports){
function Subscription () {
  this.subscriptions = []
}

Subscription.prototype.subscribe = function (fn) {
  var self = this
  this.subscriptions.push(fn)

  return function () {
    var index = self.subscriptions.indexOf(fn)
    if (index > -1) {
      self.subscriptions.splice(index, 1)
    }
  }
}

Subscription.prototype.applyAll = function (applyTo, applyWith) {
  this.subscriptions.forEach(function (fn) {
    try {
      fn.apply(applyTo, applyWith)
    } catch (error) {
      console.log(error, error.stack)
    }
  }, this)
}

module.exports = Subscription

},{}],36:[function(_dereq_,module,exports){
var Promise = _dereq_('es6-promise').Promise
var utils = _dereq_('../lib/utils')
var fileFetcher = _dereq_('../lib/fileFetcher')

module.exports = {

  _findSourceMappingURL: function (source) {
    var m = /\/\/[#@] ?sourceMappingURL=([^\s'"]+)[\s]*$/.exec(source)
    if (m && m[1]) {
      return m[1]
    }
    return null
  },

  getFileSourceMapUrl: function (fileUrl) {
    var self = this
    var fileBasePath

    if (!fileUrl) {
      return Promise.reject('no fileUrl')
    }

    if (fileUrl.split('/').length > 1) {
      fileBasePath = fileUrl.split('/').slice(0, -1).join('/') + '/'
    } else {
      fileBasePath = '/'
    }

    return new Promise(function (resolve, reject) {
      fileFetcher.getFile(fileUrl).then(function (source) {
        var sourceMapUrl = self._findSourceMappingURL(source)
        if (sourceMapUrl) {
          sourceMapUrl = fileBasePath + sourceMapUrl
          resolve(sourceMapUrl)
        } else {
          reject('no sourceMapUrl')
        }
      }, reject)
    })
  },

  getExceptionContexts: function (url, line) {
    if (!url || !line) {
      return Promise.reject('no line or url')
    }

    return new Promise(function (resolve, reject) {
      fileFetcher.getFile(url).then(function (source) {
        line -= 1 // convert line to 0-based index

        var sourceLines = source.split('\n')
        var linesBefore = 5
        var linesAfter = 5

        var contexts = {
          preContext: [],
          contextLine: null,
          postContext: []
        }

        if (sourceLines.length) {
          var isMinified

          // Treat HTML files as non-minified
          if (source.indexOf('<html') > -1) {
            isMinified = false
          } else {
            isMinified = this.isSourceMinified(source)
          }

          // Don't generate contexts if source is minified
          if (isMinified) {
            return reject()
          }

          // Pre context
          var preStartIndex = Math.max(0, line - linesBefore - 1)
          var preEndIndex = Math.min(sourceLines.length, line - 1)
          for (var i = preStartIndex; i <= preEndIndex; ++i) {
            if (!utils.isUndefined(sourceLines[i])) {
              contexts.preContext.push(sourceLines[i])
            }
          }

          // Line context
          contexts.contextLine = sourceLines[line]

          // Post context
          var postStartIndex = Math.min(sourceLines.length, line + 1)
          var postEndIndex = Math.min(sourceLines.length, line + linesAfter)
          for (var j = postStartIndex; j <= postEndIndex; ++j) {
            if (!utils.isUndefined(sourceLines[j])) {
              contexts.postContext.push(sourceLines[j])
            }
          }
        }

        var charLimit = 1000
        // Circuit breaker for huge file contexts
        if (contexts.contextLine.length > charLimit) {
          reject('aborting generating contexts, as line is over 1000 chars')
        }

        contexts.preContext.forEach(function (line) {
          if (line.length > charLimit) {
            reject('aborting generating contexts, as preContext line is over 1000 chars')
          }
        })

        contexts.postContext.forEach(function (line) {
          if (line.length > charLimit) {
            reject('aborting generating contexts, as postContext line is over 1000 chars')
          }
        })

        resolve(contexts)
      }.bind(this), reject)
    }.bind(this))
  },

  isSourceMinified: function (source) {
    // Source: https://dxr.mozilla.org/mozilla-central/source/devtools/client/debugger/utils.js#62
    var SAMPLE_SIZE = 50 // no of lines
    var INDENT_COUNT_THRESHOLD = 5 // percentage
    var CHARACTER_LIMIT = 250 // line character limit

    var isMinified
    var lineEndIndex = 0
    var lineStartIndex = 0
    var lines = 0
    var indentCount = 0
    var overCharLimit = false

    if (!source) {
      return false
    }

    // Strip comments.
    source = source.replace(/\/\*[\S\s]*?\*\/|\/\/(.+|\n)/g, '')

    while (lines++ < SAMPLE_SIZE) {
      lineEndIndex = source.indexOf('\n', lineStartIndex)
      if (lineEndIndex === -1) {
        break
      }
      if (/^\s+/.test(source.slice(lineStartIndex, lineEndIndex))) {
        indentCount++
      }
      // For files with no indents but are not minified.
      if ((lineEndIndex - lineStartIndex) > CHARACTER_LIMIT) {
        overCharLimit = true
        break
      }
      lineStartIndex = lineEndIndex + 1
    }

    isMinified = ((indentCount / lines) * 100) < INDENT_COUNT_THRESHOLD || overCharLimit

    return isMinified
  }

}

},{"../lib/fileFetcher":44,"../lib/utils":47,"es6-promise":2}],37:[function(_dereq_,module,exports){
var Promise = _dereq_('es6-promise').Promise
var stackTrace = _dereq_('./stacktrace')
var frames = _dereq_('./frames')

var Exceptions = function () {

}

Exceptions.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    processError.call(this, error, msg, file, line, col)
  }.bind(this)
}

Exceptions.prototype.uninstall = function () {
  window.onerror = null
}

Exceptions.prototype.processError = function (err) {
  processError(err)
}

function processError (error, msg, file, line, col) {
  if (msg === 'Script error.' && !file) {
    // ignoring script errors: See https://github.com/getsentry/raven-js/issues/41
    return
  }

  var exception = {
    'message': error ? error.message : msg,
    'type': error ? error.name : null,
    'fileurl': file || null,
    'lineno': line || null,
    'colno': col || null
  }

  if (!exception.type) {
    // Try to extract type from message formatted like 'ReferenceError: Can't find variable: initHighlighting'
    if (exception.message.indexOf(':') > -1) {
      exception.type = exception.message.split(':')[0]
    }
  }

  var resolveStackFrames

  if (error) {
    resolveStackFrames = stackTrace.fromError(error)
  } else {
    resolveStackFrames = new Promise(function (resolve, reject) {
      resolve([{
        'fileName': file,
        'lineNumber': line,
        'columnNumber': col
      }])
    })
  }

  resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return frames.stackInfoToOpbeatException(exception).then(function (exception) {
      frames.processOpbeatException(exception)
    })
  })['catch'](function () {})
}

module.exports = Exceptions

},{"./frames":38,"./stacktrace":39,"es6-promise":2}],38:[function(_dereq_,module,exports){
var Promise = _dereq_('es6-promise').Promise

var logger = _dereq_('../lib/logger')
var config = _dereq_('../lib/config')
var transport = _dereq_('../lib/transport')
var backendUtils = _dereq_('../backend/backend_utils')
var utils = _dereq_('../lib/utils')
var context = _dereq_('./context')
var stackTrace = _dereq_('./stacktrace')

var promiseSequence = function (tasks) {
  var current = Promise.resolve()
  var results = []

  for (var k = 0; k < tasks.length; ++k) {
    results.push(current = current.then(tasks[k]))
  }

  return Promise.all(results)
}

module.exports = {
  getFramesForCurrent: function () {
    return stackTrace.get().then(function (frames) {
      var tasks = frames.map(function (frame) {
        return this.buildOpbeatFrame.bind(this, frame)
      }.bind(this))

      var allFrames = promiseSequence(tasks)

      return allFrames.then(function (opbeatFrames) {
        return opbeatFrames
      })
    }.bind(this))
  },

  buildOpbeatFrame: function buildOpbeatFrame (stack) {
    return new Promise(function (resolve, reject) {
      if (!stack.fileName && !stack.lineNumber) {
        // Probably an stack from IE, return empty frame as we can't use it.
        return resolve({})
      }

      if (!stack.columnNumber && !stack.lineNumber) {
        // We can't use frames with no columnNumber & lineNumber, so ignore for now
        return resolve({})
      }

      var filePath = this.cleanFilePath(stack.fileName)
      var fileName = this.filePathToFileName(filePath)

      if (this.isFileInline(filePath)) {
        fileName = '(inline script)'
      }

      // Build Opbeat frame data
      var frame = {
        'filename': fileName,
        'lineno': stack.lineNumber,
        'colno': stack.columnNumber,
        'function': stack.functionName || '<anonymous>',
        'abs_path': stack.fileName,
        'in_app': this.isFileInApp(filePath)
      }

      // Detect Sourcemaps
      var sourceMapResolver = context.getFileSourceMapUrl(filePath)

      sourceMapResolver.then(function (sourceMapUrl) {
        frame.sourcemap_url = sourceMapUrl
        resolve(frame)
      }, function () {
        // // Resolve contexts if no source map
        var filePath = this.cleanFilePath(stack.fileName)
        var contextsResolver = context.getExceptionContexts(filePath, stack.lineNumber)

        contextsResolver.then(function (contexts) {
          frame.pre_context = contexts.preContext
          frame.context_line = contexts.contextLine
          frame.post_context = contexts.postContext
          resolve(frame)
        })['catch'](function () {
          resolve(frame)
        })
      }.bind(this))
    }.bind(this))
  },

  stackInfoToOpbeatException: function (stackInfo) {
    return new Promise(function (resolve, reject) {
      if (stackInfo.stack && stackInfo.stack.length) {
        var tasks = stackInfo.stack.map(function (frame) {
          return this.buildOpbeatFrame.bind(this, frame)
        }.bind(this))

        var allFrames = promiseSequence(tasks)

        allFrames.then(function (frames) {
          stackInfo.frames = frames
          stackInfo.stack = null
          resolve(stackInfo)
        })
      } else {
        resolve(stackInfo)
      }
    }.bind(this))
  },

  processOpbeatException: function (exception) {
    var type = exception.type
    var message = String(exception.message) || 'Script error'
    var filePath = this.cleanFilePath(exception.fileurl)
    var fileName = this.filePathToFileName(filePath)
    var frames = exception.frames || []
    var culprit

    if (frames && frames.length) {
      // Opbeat.com expects frames oldest to newest and JS sends them as newest to oldest
      frames.reverse()
    } else if (fileName) {
      frames.push({
        filename: fileName,
        lineno: exception.lineno
      })
    }

    var stacktrace = {
      frames: frames
    }

    // Set fileName from last frame, if filename is missing
    if (!fileName && frames.length) {
      var lastFrame = frames[frames.length - 1]
      if (lastFrame.filename) {
        fileName = lastFrame.filename
      } else {
        // If filename empty, assume inline script
        fileName = '(inline script)'
      }
    }

    if (this.isFileInline(filePath)) {
      culprit = '(inline script)'
    } else {
      culprit = fileName
    }

    var data = {
      message: type + ': ' + message,
      culprit: culprit,
      exception: {
        type: type,
        value: message
      },
      http: {
        url: window.location.href
      },
      stacktrace: stacktrace,
      user: config.get('context.user'),
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (config.get('context.extra')) {
      data.extra = utils.mergeObject(data.extra, config.get('context.extra'))
    }

    data.stacktrace.frames = backendUtils.createValidFrames(data.stacktrace.frames)
    logger.log('opbeat.exceptions.processOpbeatException', data)
    transport.sendError(data)
  },

  cleanFilePath: function (filePath) {
    if (!filePath) {
      filePath = ''
    }

    if (filePath === '<anonymous>') {
      filePath = ''
    }

    return filePath
  },

  filePathToFileName: function (fileUrl) {
    var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '')

    if (fileUrl.indexOf(origin) > -1) {
      fileUrl = fileUrl.replace(origin + '/', '')
    }

    return fileUrl
  },

  isFileInline: function (fileUrl) {
    if (fileUrl) {
      return window.location.href.indexOf(fileUrl) === 0
    } else {
      return false
    }
  },

  isFileInApp: function (filename) {
    var pattern = config.get('libraryPathPattern')
    return !RegExp(pattern).test(filename)
  },

  getBrowserSpecificMetadata: function () {
    var viewportInfo = utils.getViewPortInfo()
    var extra = {
      'environment': {
        'utcOffset': new Date().getTimezoneOffset() / -60.0,
        'browserWidth': viewportInfo.width,
        'browserHeight': viewportInfo.height,
        'screenWidth': window.screen.width,
        'screenHeight': window.screen.height,
        'language': navigator.language,
        'userAgent': navigator.userAgent,
        'platform': navigator.platform
      },
      'page': {
        'referer': document.referrer,
        'host': document.domain,
        'location': window.location.href
      }
    }

    return extra
  }

}

},{"../backend/backend_utils":33,"../lib/config":43,"../lib/logger":45,"../lib/transport":46,"../lib/utils":47,"./context":36,"./stacktrace":39,"es6-promise":2}],39:[function(_dereq_,module,exports){
var ErrorStackParser = _dereq_('error-stack-parser')
var StackGenerator = _dereq_('stack-generator')
var Promise = _dereq_('es6-promise').Promise
var utils = _dereq_('../lib/utils')

var defaultOptions = {
  filter: function (stackframe) {
    // Filter out stackframes for this library by default
    return (stackframe.functionName || '').indexOf('StackTrace$$') === -1 &&
    (stackframe.functionName || '').indexOf('ErrorStackParser$$') === -1 &&
    (stackframe.functionName || '').indexOf('StackGenerator$$') === -1 &&
    (stackframe.functionName || '').indexOf('opbeatFunctionWrapper') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat-angular.js') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat-angular.min.js') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat.js') === -1 &&
    (stackframe.fileName || '').indexOf('opbeat.min.js') === -1
  }
}

module.exports = {
  get: function StackTrace$$generate (opts) {
    try {
      // Error must be thrown to get stack in IE
      throw new Error()
    } catch (err) {
      if (_isShapedLikeParsableError(err)) {
        return this.fromError(err, opts)
      } else {
        return this.generateArtificially(opts)
      }
    }
  },

  generateArtificially: function StackTrace$$generateArtificially (opts) {
    opts = utils.mergeObject(defaultOptions, opts)

    var stackFrames = StackGenerator.backtrace(opts)
    if (typeof opts.filter === 'function') {
      stackFrames = stackFrames.filter(opts.filter)
    }

    stackFrames = ErrorStackNormalizer(stackFrames)

    return Promise.resolve(stackFrames)
  },

  fromError: function StackTrace$$fromError (error, opts) {
    opts = utils.mergeObject(defaultOptions, opts)

    return new Promise(function (resolve) {
      var stackFrames = ErrorStackParser.parse(error)
      if (typeof opts.filter === 'function') {
        stackFrames = stackFrames.filter(opts.filter)
      }

      stackFrames = ErrorStackNormalizer(stackFrames)

      resolve(Promise.all(stackFrames.map(function (sf) {
        return new Promise(function (resolve) {
          resolve(sf)
        })
      })))
    })
  }
}

function _isShapedLikeParsableError (err) {
  return err.stack || err['opera#sourceloc']
}

function ErrorStackNormalizer (stackFrames) {
  return stackFrames.map(function (frame) {
    if (frame.functionName) {
      frame.functionName = normalizeFunctionName(frame.functionName)
    }
    return frame
  })
}

function normalizeFunctionName (fnName) {
  // SpinderMonkey name convetion (https://developer.mozilla.org/en-US/docs/Tools/Debugger-API/Debugger.Object#Accessor_Properties_of_the_Debugger.Object_prototype)

  // We use a/b to refer to the b defined within a
  var parts = fnName.split('/')
  if (parts.length > 1) {
    fnName = ['Object', parts[parts.length - 1]].join('.')
  } else {
    fnName = parts[0]
  }

  // a< to refer to a function that occurs somewhere within an expression that is assigned to a.
  fnName = fnName.replace(/.<$/gi, '.<anonymous>')

  // Normalize IE's 'Anonymous function'
  fnName = fnName.replace(/^Anonymous function$/, '<anonymous>')

  // Always use the last part
  parts = fnName.split('.')
  if (parts.length > 1) {
    fnName = parts[parts.length - 1]
  } else {
    fnName = parts[0]
  }

  return fnName
}

},{"../lib/utils":47,"error-stack-parser":1,"es6-promise":2,"stack-generator":6}],40:[function(_dereq_,module,exports){
var SimpleCache = _dereq_('simple-lru-cache')

module.exports = new SimpleCache({
  'maxSize': 5000
})

},{"simple-lru-cache":4}],41:[function(_dereq_,module,exports){
var logger = _dereq_('../lib/logger')

var TransactionStore = function () {

}

TransactionStore.prototype.init = function ($injector) {
  this.$rootScope = $injector.get('$rootScope')
  this.$rootScope._opbeatTransactionStore = {}
}

TransactionStore.prototype.pushToUrl = function (url, transaction) {
  var transactions = this.$rootScope._opbeatTransactionStore[url] || []
  transactions.push(transaction)

  logger.log('opbeat.instrumentation.TransactionStore.pushToUrl', url, transaction)

  this.$rootScope._opbeatTransactionStore[url] = transactions
}

TransactionStore.prototype.getAllByUrl = function (url) {
  logger.log('opbeat.instrumentation.TransactionStore.pushToUrl', url, this.$rootScope)

  if (!this.$rootScope) {
    return []
  }

  return this.$rootScope._opbeatTransactionStore[url] || []
}

TransactionStore.prototype.getRecentByUrl = function (url) {
  var transactions

  if (this.$rootScope) {
    transactions = this.$rootScope._opbeatTransactionStore[url]
  }

  logger.log('opbeat.instrumentation.TransactionStore.getRecentByUrl', url, transactions)

  if (transactions && transactions.length) {
    return transactions.slice(-1)[0]
  }

  return null
}

TransactionStore.prototype.clearByUrl = function (url) {
  this.$rootScope._opbeatTransactionStore[url] = []
}

module.exports = new TransactionStore()

},{"../lib/logger":45}],42:[function(_dereq_,module,exports){
var logger = _dereq_('../lib/logger')
var utils = _dereq_('../lib/utils')
var config = _dereq_('../lib/config')
var transactionStore = _dereq_('./transactionStore')

module.exports = {
  wrapMethod: function (_opbeatOriginalFunction, _opbeatBefore, _opbeatAfter, _opbeatContext) {
    var context = {
      _opbeatOriginalFunction: _opbeatOriginalFunction,
      _opbeatBefore: _opbeatBefore,
      _opbeatAfter: _opbeatAfter,
      _opbeatContext: _opbeatContext
    }

    return wrapFn(context)
  },

  instrumentMethodWithCallback: function (fn, fnName, type, options) {
    options = options || {}
    var nameParts = []

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethodWithCallback.not.installed')
      return fn
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentMethodWithCallback.disabled', 'color: #3360A3')
      return fn
    }

    if (options.prefix) {
      if (typeof options.prefix === 'function') {
        var args = options.wrapper ? options.wrapper.args : []
        options.prefix = options.prefix.call(this, args)
      }
      nameParts.push(options.prefix)
    }

    if (fnName) {
      nameParts.push(fnName)
    }

    var name = nameParts.join('.')
    var ref = fn
    var context = {
      traceName: name,
      traceType: type,
      traceBuffer: options.traceBuffer,
      transactionStore: transactionStore,
      fn: fn,
      options: options
    }

    var wrappedMethod = this.wrapMethod(ref, function instrumentMethodWithCallbackBefore (context) {
      var args = Array.prototype.slice.call(arguments).slice(1)
      var callback = args[options.callbackIndex]

      if (typeof callback === 'function') {
        // Wrap callback
        var wrappedCallback = this.wrapMethod(callback, function instrumentMethodWithCallbackBeforeCallback () {
          instrumentMethodAfter.apply(this, [context])
          return {}
        }, null)

        // Override callback with wrapped one
        args[context.options.callbackIndex] = wrappedCallback
      }

      // Call base
      return instrumentMethodBefore.apply(this, [context].concat(args))
    }.bind(this), null, context)

    wrappedMethod.original = ref

    return wrappedMethod
  },

  instrumentMethod: function (fn, type, options) {
    options = options || {}

    var nameParts = []

    if (options.prefix) {
      if (typeof options.prefix === 'function') {
        var args = options.wrapper ? options.wrapper.args : []
        options.prefix = options.prefix.call(this, args)
      }
      nameParts.push(options.prefix)
    }

    var fnName
    if (typeof fn === 'function' && fn.name) {
      fnName = fn.name
    } else if (options.fnName) {
      fnName = options.fnName
    }

    if (fnName) {
      nameParts.push(fnName)
    }

    var name = nameParts.join('.')

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentMethod.not.installed')
      return fn
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentMethod.disabled', 'color: #3360A3')
      return fn
    }

    var traceType
    if (typeof type === 'function') {
      traceType = type.call(options)
    } else {
      traceType = type
    }

    var context = {
      traceName: name,
      traceType: traceType,
      traceBuffer: options.traceBuffer,
      options: options,
      fn: fn,
      fnName: fnName,
      transactionStore: transactionStore
    }

    var beforeMethod = instrumentMethodBefore
    var afterMethod = instrumentMethodAfter
    if (options.before) {
      beforeMethod = function (context) {
        options.before(context)
        return instrumentMethodBefore.apply(this, arguments)
      }
    }
    if (options.after) {
      afterMethod = function (context) {
        instrumentMethodAfter.apply(this, arguments)
        options.after(context)
      }
    }

    var wrappedMethod = this.wrapMethod(fn, beforeMethod, afterMethod, context)
    wrappedMethod.original = fn

    // Copy all properties over
    _copyProperties(wrappedMethod.original, wrappedMethod)

    // Set original prototype
    wrappedMethod.prototype = fn.prototype

    return wrappedMethod
  },

  instrumentModule: function ($delegate, $injector, options) {
    var self = this

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentModule.not.installed')
      return $delegate
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentModule.disabled', 'color: #3360A3')
      return $delegate
    }

    var opbeatInstrumentInstanceWrapperFunction = function () {
      var args = Array.prototype.slice.call(arguments)

      var wrapped = $delegate

      // Instrument wrapped constructor
      if (options.instrumentConstructor) {
        wrapped = self.instrumentMethod($delegate, options.type, options)
      }

      var result = wrapped.apply(this, args)

      options.wrapper = {
        args: args
      }

      if (!utils.isUndefined(result)) {
        self.instrumentObject(result, $injector, options)
      }
      return result
    }

    // Copy all static properties over
    _copyProperties($delegate, opbeatInstrumentInstanceWrapperFunction)
    this.instrumentObject(opbeatInstrumentInstanceWrapperFunction, $injector, options)

    return opbeatInstrumentInstanceWrapperFunction
  },

  instrumentObject: function (object, $injector, options) {
    options = options || {}

    if (!config.get('isInstalled')) {
      logger.log('opbeat.instrumentation.instrumentObject.not.installed')
      return object
    }

    if (!config.get('performance.enable')) {
      logger.log('- %c opbeat.instrumentation.instrumentObject.disabled', 'color: #3360A3')
      return object
    }

    if (options.instrumentObjectFunctions === false) {
      return object
    }

    // Instrument static functions
    this.getObjectFunctions(object).forEach(function (funcScope) {
      var subOptions = utils.mergeObject(options, {})
      subOptions.fnName = funcScope.property
      object[funcScope.property] = this.instrumentMethod(funcScope.ref, options.type, subOptions)
    }.bind(this))

    return object
  },

  uninstrumentMethod: function (module, fn) {
    var ref = module[fn]
    if (ref.original) {
      module[fn] = ref.original
    }
  },

  getObjectFunctions: function (scope) {
    return Object.keys(scope).filter(function (key) {
      return typeof scope[key] === 'function'
    }).map(function (property) {
      var ref = scope[property]
      return {
        scope: scope,
        property: property,
        ref: ref
      }
    })
  },

  getControllerInfoFromArgs: function (args) {
    var scope, name

    if (typeof args[0] === 'string') {
      name = args[0]
    } else if (typeof args[0] === 'function') {
      name = args[0].name

      // Function has been wrapped by us, use original function name
      if (name === 'opbeatFunctionWrapper' && args[0].original) {
        name = args[0].original.name
      }
    }

    if (typeof args[1] === 'object') {
      scope = args[1].$scope
    }

    return {
      scope: scope,
      name: name
    }
  },

  resolveAngularDependenciesByType: function ($rootElement, type) {
    var appName = $rootElement.attr('ng-app') || config.get('angularAppName')

    if (!appName) {
      return []
    }

    return window.angular.module(appName)._invokeQueue.filter(function (m) {
      return m[1] === type
    }).map(function (m) {
      return m[2][0]
    })
  }
}

function instrumentMethodBefore (context) {
  // Optimized copy of arguments (V8 https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358)
  var args = new Array(arguments.length)
  for (var i = 0, l = arguments.length; i < l; i++) {
    args[i] = arguments[i]
  }

  args = args.slice(1)

  var name = context.traceName
  var transactionStore = context.transactionStore

  var transaction = transactionStore.getRecentByUrl(window.location.href)
  if (!transaction && context.traceBuffer && !context.traceBuffer.isLocked()) {
    transaction = context.traceBuffer
  }

  if (context.options.signatureFormatter) {
    name = context.options.signatureFormatter.apply(this, [context.fnName, args, context.options])
  }

  if (transaction) {
    var trace = transaction.startTrace(name, context.traceType, context.options)
    context.trace = trace
  } else {
    logger.log('%c instrumentMethodBefore.error.transaction.missing', 'background-color: #ffff00', context)
  }

  return {
    args: args
  }
}

function _copyProperties (source, target) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] = source[key]
    }
  }
}

function instrumentMethodAfter (context) {
  if (context.trace) {
    context.trace.end()
  }
}

function wrapFn (ctx) {
  var _opbeatOriginalFunction = ctx['_opbeatOriginalFunction']
  var _opbeatBefore = ctx['_opbeatBefore']
  var _opbeatAfter = ctx['_opbeatAfter']
  var _opbeatContext = ctx['_opbeatContext']

  function opbeatFunctionWrapper () {
    var args = new Array(arguments.length)
    for (var i = 0, l = arguments.length; i < l; i++) {
      args[i] = arguments[i]
    }
    var zone = Object.create(_opbeatContext) // new zone for every call
    // Before callback
    if (typeof _opbeatBefore === 'function') {
      var beforeData = _opbeatBefore.apply(this, [zone].concat(args))
      if (beforeData.args) {
        args = beforeData.args
      }
    }
    // Execute original function
    var result = _opbeatOriginalFunction.apply(this, args)
    // After callback
    if (typeof _opbeatAfter === 'function') {
      // After + Promise handling
      if (result && typeof result.then === 'function') {
        result.finally(function () {
          _opbeatAfter.apply(this, [zone].concat(args))
        }.bind(this))
      } else {
        _opbeatAfter.apply(this, [zone].concat(args))
      }
    }
    return result
  }

  if (typeof _opbeatOriginalFunction.$inject === 'undefined') {
    opbeatFunctionWrapper.$inject = getAnnotation(_opbeatOriginalFunction)
  } else {
    opbeatFunctionWrapper.$inject = _opbeatOriginalFunction.$inject
  }
  return opbeatFunctionWrapper
}

// source: angular.js injector

var ARROW_ARG = /^([^\(]+?)=>/
var FN_ARGS = /^[^\(]*\(\s*([^\)]*)\)/m
var FN_ARG_SPLIT = /,/
var FN_ARG = /^\s*(_?)(\S+?)\1\s*$/
var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg

function extractArgs (fn) {
  var fnText = fn.toString().replace(STRIP_COMMENTS, '')
  var args = fnText.match(ARROW_ARG) || fnText.match(FN_ARGS)
  return args
}

function getAnnotation (fn) {
  var $inject
  var argDecl

  if (typeof fn === 'function') {
    if (!($inject = fn.$inject)) {
      $inject = []
      if (fn.length) {
        argDecl = extractArgs(fn)
        argDecl[1].split(FN_ARG_SPLIT).forEach(function (arg) {
          arg.replace(FN_ARG, function (all, underscore, name) {
            $inject.push(name)
          })
        })
      }
    }
  } else {
    //    throw  'Argument is not a function'
  }
  return $inject
}

},{"../lib/config":43,"../lib/logger":45,"../lib/utils":47,"./transactionStore":41}],43:[function(_dereq_,module,exports){
var utils = _dereq_('./utils')

function Config () {
  this.config = {}
  this.defaults = {
    VERSION: 'v3.0.1',
    apiHost: 'intake.opbeat.com',
    isInstalled: false,
    logLevel: 'warn',
    orgId: null,
    appId: null,
    angularAppName: null,
    performance: {
      enable: true,
      enableStackFrames: false
    },
    libraryPathPattern: '(node_modules|bower_components|webpack)',
    context: {
      user: {},
      extra: null
    }
  }

  // Only generate stack frames 10% of the time
  var shouldGenerateStackFrames = utils.getRandomInt(0, 10) === 1
  if (shouldGenerateStackFrames) {
    this.defaults.performance.enableStackFrames = shouldGenerateStackFrames
  }
}

Config.prototype.init = function () {
  var scriptData = _getConfigFromScript()
  this.setConfig(scriptData)
}

Config.prototype.get = function (key) {
  return utils.arrayReduce(key.split('.'), function (obj, i) {
    return obj[i]
  }, this.config)
}

Config.prototype.set = function (key, value) {
  var levels = key.split('.')
  var max_level = levels.length - 1
  var target = this.config

  utils.arraySome(levels, function (level, i) {
    if (typeof level === 'undefined') {
      return true
    }
    if (i === max_level) {
      target[level] = value
    } else {
      var obj = target[level] || {}
      target[level] = obj
      target = obj
    }
  })
}

Config.prototype.setConfig = function (properties) {
  properties = properties || {}
  var prevCfg = utils.mergeObject(this.defaults, this.config)
  this.config = utils.mergeObject(prevCfg, properties)
}

Config.prototype.isValid = function () {
  var requiredKeys = ['appId', 'orgId']
  var values = utils.arrayMap(requiredKeys, utils.functionBind(function (key) {
    return (this.config[key] === null) || (this.config[key] === undefined)
  }, this))

  return utils.arrayIndexOf(values, true) === -1
}

var _getConfigFromScript = function () {
  var script = utils.getCurrentScript()
  var config = _getDataAttributesFromNode(script)
  return config
}

function _getDataAttributesFromNode (node) {
  var dataAttrs = {}
  var dataRegex = /^data\-([\w\-]+)$/

  if (node) {
    var attrs = node.attributes
    for (var i = 0; i < attrs.length; i++) {
      var attr = attrs[i]
      if (dataRegex.test(attr.nodeName)) {
        var key = attr.nodeName.match(dataRegex)[1]

        // camelCase key
        key = utils.arrayMap(key.split('-'), function (group, index) {
          return index > 0 ? group.charAt(0).toUpperCase() + group.substring(1) : group
        }).join('')

        dataAttrs[key] = attr.value || attr.nodeValue
      }
    }
  }

  return dataAttrs
}

Config.prototype.VERSION = 'v3.0.1'

Config.prototype.isPlatformSupport = function () {
  return typeof Array.prototype.forEach === 'function' &&
  typeof JSON.stringify === 'function' &&
  typeof Function.bind === 'function' &&
  window.performance &&
  typeof window.performance.now === 'function' &&
  utils.isCORSSupported()
}

module.exports = new Config()

},{"./utils":47}],44:[function(_dereq_,module,exports){
var SimpleCache = _dereq_('simple-lru-cache')
var transport = _dereq_('./transport')

var cache = new SimpleCache({
  'maxSize': 1000
})

module.exports = {
  getFile: function (url) {
    var cachedPromise = cache.get(url)
    if (typeof cachedPromise !== 'undefined') {
      return cachedPromise
    }
    var filePromise = transport.getFile(url)
    cache.set(url, filePromise)
    return filePromise
  }
}

},{"./transport":46,"simple-lru-cache":4}],45:[function(_dereq_,module,exports){
var config = _dereq_('./config')

var logStack = []

module.exports = {
  getLogStack: function () {
    return logStack
  },

  error: function (msg, data) {
    return this.log('%c ' + msg, 'color: red', data)
  },

  warning: function (msg, data) {
    return this.log('%c ' + msg, 'background-color: ffff00', data)
  },

  log: function (message, data) {
    // Optimized copy of arguments (V8 https://github.com/GoogleChrome/devtools-docs/issues/53#issuecomment-51941358)
    var args = new Array(arguments.length)
    for (var i = 0, l = arguments.length; i < l; i++) {
      args[i] = arguments[i]
    }

    var isDebugMode = config.get('debug') === true || config.get('debug') === 'true'
    var hasConsole = window.console

    logStack.push({
      msg: message,
      data: args.slice(1)
    })

    if (isDebugMode && hasConsole) {
      if (typeof Function.prototype.bind === 'function') {
        return window.console.log.apply(window.console, args)
      } else {
        return Function.prototype.apply.call(window.console.log, window.console, args)
      }
    }
  }
}

},{"./config":43}],46:[function(_dereq_,module,exports){
var logger = _dereq_('./logger')
var config = _dereq_('./config')
var Promise = _dereq_('es6-promise').Promise

module.exports = {
  sendError: function (data) {
    return _sendToOpbeat('errors', data)
  },

  sendTransaction: function (data) {
    return _sendToOpbeat('transactions', data)
  },

  getFile: function (fileUrl) {
    return _makeRequest(fileUrl, 'GET', '', {})
  }
}

function _sendToOpbeat (endpoint, data) {
  logger.log('opbeat.transport.sendToOpbeat', data)

  var url = 'https://' + config.get('apiHost') + '/api/v1/organizations/' + config.get('orgId') + '/apps/' + config.get('appId') + '/client-side/' + endpoint + '/'

  var headers = {
    'X-Opbeat-Client': 'opbeat-js/' + config.get('VERSION')
  }

  return _makeRequest(url, 'POST', 'JSON', data, headers)
}

function _makeRequest (url, method, type, data, headers) {
  return new Promise(function (resolve, reject) {
    var xhr = new window.XMLHttpRequest()

    xhr.open(method, url, true)
    xhr.timeout = 10000

    if (type === 'JSON') {
      xhr.setRequestHeader('Content-Type', 'application/json')
    }

    if (headers) {
      for (var header in headers) {
        if (headers.hasOwnProperty(header)) {
          xhr.setRequestHeader(header.toLowerCase(), headers[header])
        }
      }
    }

    xhr.onreadystatechange = function (evt) {
      if (xhr.readyState === 4) {
        var status = xhr.status
        if (status === 0 || status > 399 && status < 600) {
          // An http 4xx or 5xx error. Signal an error.
          var err = new Error(url + ' HTTP status: ' + status)
          err.xhr = xhr
          reject(err)
          logger.log('opbeat.transport.makeRequest.error', err)
        } else {
          resolve(xhr.responseText)
          logger.log('opbeat.transport.makeRequest.success')
        }
      }
    }

    xhr.onerror = function (err) {
      reject(err)
      logger.log('opbeat.transport.makeRequest.error', err)
    }

    if (type === 'JSON') {
      data = JSON.stringify(data)
    }

    xhr.send(data)
  })
}

},{"./config":43,"./logger":45,"es6-promise":2}],47:[function(_dereq_,module,exports){
module.exports = {
  getViewPortInfo: function getViewPort () {
    var e = document.documentElement
    var g = document.getElementsByTagName('body')[0]
    var x = window.innerWidth || e.clientWidth || g.clientWidth
    var y = window.innerHeight || e.clientHeight || g.clientHeight

    return {
      width: x,
      height: y
    }
  },

  mergeObject: function (o1, o2) {
    var a
    var o3 = {}

    for (a in o1) {
      o3[a] = o1[a]
    }

    for (a in o2) {
      o3[a] = o2[a]
    }

    return o3
  },

  arrayReduce: function (arrayValue, callback, value) {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reduce
    if (arrayValue == null) {
      throw new TypeError('Array.prototype.reduce called on null or undefined')
    }
    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function')
    }
    var t = Object(arrayValue)
    var len = t.length >>> 0
    var k = 0

    if (!value) {
      while (k < len && !(k in t)) {
        k++
      }
      if (k >= len) {
        throw new TypeError('Reduce of empty array with no initial value')
      }
      value = t[k++]
    }

    for (; k < len; k++) {
      if (k in t) {
        value = callback(value, t[k], k, t)
      }
    }
    return value
  },

  arraySome: function (value, callback, thisArg) {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some
    if (value == null) {
      throw new TypeError('Array.prototype.some called on null or undefined')
    }

    if (typeof callback !== 'function') {
      throw new TypeError()
    }

    var t = Object(value)
    var len = t.length >>> 0

    if (!thisArg) {
      thisArg = void 0
    }

    for (var i = 0; i < len; i++) {
      if (i in t && callback.call(thisArg, t[i], i, t)) {
        return true
      }
    }
    return false
  },

  arrayMap: function (arrayValue, callback, thisArg) {
    // Source https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/Map
    var T, A, k

    if (this == null) {
      throw new TypeError(' this is null or not defined')
    }
    var O = Object(arrayValue)
    var len = O.length >>> 0

    if (typeof callback !== 'function') {
      throw new TypeError(callback + ' is not a function')
    }
    if (arguments.length > 1) {
      T = thisArg
    }
    A = new Array(len)
    k = 0
    while (k < len) {
      var kValue, mappedValue
      if (k in O) {
        kValue = O[k]
        mappedValue = callback.call(T, kValue, k, O)
        A[k] = mappedValue
      }
      k++
    }
    return A
  },

  arrayIndexOf: function (arrayVal, searchElement, fromIndex) {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf
    var k
    if (arrayVal == null) {
      throw new TypeError('"arrayVal" is null or not defined')
    }

    var o = Object(arrayVal)
    var len = o.length >>> 0

    if (len === 0) {
      return -1
    }

    var n = +fromIndex || 0

    if (Math.abs(n) === Infinity) {
      n = 0
    }

    if (n >= len) {
      return -1
    }

    k = Math.max(n >= 0 ? n : len - Math.abs(n), 0)

    while (k < len) {
      if (k in o && o[k] === searchElement) {
        return k
      }
      k++
    }
    return -1
  },

  functionBind: function (func, oThis) {
    // Source: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/bind
    var aArgs = Array.prototype.slice.call(arguments, 2)
    var FNOP = function () {}
    var fBound = function () {
      return func.apply(oThis, aArgs.concat(Array.prototype.slice.call(arguments)))
    }

    FNOP.prototype = func.prototype
    fBound.prototype = new FNOP()
    return fBound
  },

  getRandomInt: function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min
  },

  isUndefined: function (obj) {
    return (typeof obj) === 'undefined'
  },

  isCORSSupported: function () {
    var xhr = new window.XMLHttpRequest()
    return 'withCredentials' in xhr
  },

  getCurrentScript: function () {
    // Source http://www.2ality.com/2014/05/current-script.html
    return document.currentScript || (function () {
      var scripts = document.getElementsByTagName('script')
      return scripts[scripts.length - 1]
    })()
  },

  generateUuid: function () {
    function _p8 (s) {
      var p = (Math.random().toString(16) + '000000000').substr(2, 8)
      return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
    }
    return _p8() + _p8(true) + _p8(true) + _p8()
  }

}

},{}],48:[function(_dereq_,module,exports){
module.exports = {
  patchFunction: function patchModule (delegate, options) {},
  _copyProperties: function _copyProperties (source, target) {
    for (var key in source) {
      if (source.hasOwnProperty(key)) {
        target[key] = source[key]
      }
    }
  },
  wrapAfter: function wrapAfter (fn, wrapWith) {
    return function () {
      var res = fn.apply(this, arguments)
      wrapWith.apply(this, arguments)
      return res
    }
  },
  wrapBefore: function wrapBefore (fn, wrapWith) {
    return function () {
      wrapWith.apply(this, arguments)
      return fn.apply(this, arguments)
    }
  },
  wrap: function (fn, before, after) {
    return function () {
      before.apply(this, arguments)
      var res = fn.apply(this, arguments)
      after.apply(this, arguments)
      return res
    }
  },
  argumentsToArray: function argumentsToArray (args) {
    var newArgs = []
    for (var i = 0; i < args.length; i++) {
      newArgs[i] = args[i]
    }
    return newArgs
  },
  opbeatSymbol: opbeatSymbol,
  patchMethod: patchMethod
}

function opbeatSymbol (name) {
  return '__opbeat_symbol__' + name
}

function patchMethod (target, name, patchFn) {
  var proto = target
  while (proto && !proto.hasOwnProperty(name)) {
    proto = Object.getPrototypeOf(proto)
  }
  if (!proto && target[name]) {
    // somehow we did not find it, but we can see it. This happens on IE for Window properties.
    proto = target
  }
  var delegateName = opbeatSymbol(name)
  var delegate
  if (proto && !(delegate = proto[delegateName])) {
    delegate = proto[delegateName] = proto[name]
    proto[name] = createNamedFn(name, patchFn(delegate, delegateName, name))
  }
  return delegate
}

function createNamedFn (name, delegate) {
  try {
    return (Function('f', 'return function ' + name + '(){return f(this, arguments)}'))(delegate) // eslint-disable-line
  } catch (e) {
    // if we fail, we must be CSP, just return delegate.
    return function () {
      return delegate(this, arguments)
    }
  }
}

},{}],49:[function(_dereq_,module,exports){
var Promise = _dereq_('es6-promise').Promise
var frames = _dereq_('../exceptions/frames')
var traceCache = _dereq_('../instrumentation/traceCache')
var utils = _dereq_('../lib/utils')

function Trace (transaction, signature, type, options) {
  this.transaction = transaction
  this.signature = signature
  this.type = type
  this.ended = false
  this._parent = null
  this._diff = null
  this._end = null

  // Start timers
  this._start = window.performance.now()
  this._startStamp = new Date()

  this._isFinish = new Promise(function (resolve, reject) {
    this._markFinishedFunc = resolve
  }.bind(this))

  if (utils.isUndefined(options) || options == null) {
    options = {}
  }
  var shouldGenerateStackFrames = options['enableStackFrames']

  if (shouldGenerateStackFrames) {
    this.getTraceStackFrames(function (frames) {
      if (frames) {
        this.frames = frames.reverse() // Reverse frames to make Opbeat happy
      }
      this._markFinishedFunc() // Mark the trace as finished
    }.bind(this))
  } else {
    this._markFinishedFunc() // Mark the trace as finished
  }
}

Trace.prototype.calcDiff = function () {
  if (!this._end || !this._start) {
    return
  }
  this._diff = this._end - this._start
}

Trace.prototype.end = function () {
  this._end = window.performance.now()

  this.calcDiff()
  this.ended = true
  if (!utils.isUndefined(this.transaction) && typeof this.transaction._onTraceEnd === 'function') {
    this.transaction._onTraceEnd(this)
  }
}

Trace.prototype.duration = function () {
  if (!this.ended) {
    return null
  }

  return parseFloat(this._diff)
}

Trace.prototype.startTime = function () {
  if (!this.ended || !this.transaction.ended) {
    return null
  }

  return this._start
}

Trace.prototype.ancestors = function () {
  var parent = this.parent()
  if (!parent) {
    return []
  } else {
    return [parent.signature]
  }
}

Trace.prototype.parent = function () {
  return this._parent
}

Trace.prototype.setParent = function (val) {
  this._parent = val
}

Trace.prototype.getFingerprint = function () {
  var key = [this.transaction.name, this.signature, this.type]

  // Iterate over parents
  var prev = this._parent
  while (prev) {
    key.push(prev.signature)
    prev = prev._parent
  }

  return key.join('-')
}

Trace.prototype.getTraceStackFrames = function (callback) {
  // Use callbacks instead of Promises to keep the stack
  var key = this.getFingerprint()
  var traceFrames = traceCache.get(key)
  if (traceFrames) {
    callback(traceFrames)
  } else {
    frames.getFramesForCurrent().then(function (traceFrames) {
      traceCache.set(key, traceFrames)
      callback(traceFrames)
    })['catch'](function () {
      callback(null)
    })
  }
}

module.exports = Trace

},{"../exceptions/frames":38,"../instrumentation/traceCache":40,"../lib/utils":47,"es6-promise":2}],50:[function(_dereq_,module,exports){
var Trace = _dereq_('./trace')
var Promise = _dereq_('es6-promise').Promise
var utils = _dereq_('../lib/utils')

var Transaction = function (name, type, options) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._markDoneAfterLastTrace = false
  this._isDone = false
  this._options = options
  if (typeof options === 'undefined') {
    this._options = {}
  }

  this.traces = []
  this._activeTraces = {}

  this._scheduledTasks = {}

  this.events = {}

  Promise.call(this.donePromise = Object.create(Promise.prototype), function (resolve, reject) {
    this._resolve = resolve
    this._reject = reject
  }.bind(this.donePromise))

  // A transaction should always have a root trace spanning the entire transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction', {enableStackFrames: false})
  this._startStamp = this._rootTrace._startStamp
  this._start = this._rootTrace._start

  this.duration = this._rootTrace.duration.bind(this._rootTrace)
  this.nextId = 0
}

Transaction.prototype.startTrace = function (signature, type, options) {
  // todo: should not accept more traces if the transaction is alreadyFinished
  var opts = typeof options === 'undefined' ? {} : options
  opts.enableStackFrames = this._options.enableStackFrames === true && opts.enableStackFrames !== false

  var trace = new Trace(this, signature, type, opts)
  trace.traceId = this.nextId
  this.nextId++
  if (this._rootTrace) {
    trace.setParent(this._rootTrace)
    this._activeTraces[trace.traceId] = trace
  }

  return trace
}

Transaction.prototype.recordEvent = function (e) {
  var event = this.events[e.name]
  if (utils.isUndefined(event)) {
    event = { name: e.name, start: e.start, end: e.end, time: e.end - e.start, count: 0 }
    this.events[event.name] = event
  } else {
    event.time += (e.end - e.start)
    event.count++
    event.end = e.end
  }
}

Transaction.prototype.isFinished = function () {
  return (
  Object.keys(this._scheduledTasks).length === 0 &&
  Object.keys(this._activeTraces).length === 0)
}

Transaction.prototype.detectFinish = function () {
  if (this.isFinished()) this.end()
}

Transaction.prototype.end = function () {
  if (this.ended) {
    return
  }

  this.ended = true
  this._rootTrace.end()

  if (this.isFinished() === true) {
    this._finish()
  }
  return this.donePromise
}

Transaction.prototype.addTask = function (taskId) {
  // todo: should not accept more tasks if the transaction is alreadyFinished
  this._scheduledTasks[taskId] = taskId
}

Transaction.prototype.removeTask = function (taskId) {
  delete this._scheduledTasks[taskId]
}

Transaction.prototype.addEndedTraces = function (existingTraces) {
  this.traces = this.traces.concat(existingTraces)
}

Transaction.prototype._onTraceEnd = function (trace) {
  this.traces.push(trace)
  trace._scheduledTasks = Object.keys(this._scheduledTasks)
  // Remove trace from _activeTraces
  delete this._activeTraces[trace.traceId]
}

Transaction.prototype._finish = function () {
  if (this._alreadFinished === true) {
    return
  }

  this._alreadFinished = true

  for (var key in this.events) {
    var event = this.events[key]
    var eventTrace = new Trace(this, key, key, this._options)
    eventTrace.ended = true
    eventTrace._start = event.start
    eventTrace._diff = event.time
    eventTrace._end = event.end
    eventTrace.setParent(this._rootTrace)
    this.traces.push(eventTrace)
  }

  this._adjustStartToEarliestTrace()
  this._adjustEndToLatestTrace()

  var self = this
  var whenAllTracesFinished = self.traces.map(function (trace) {
    return trace._isFinish
  })

  Promise.all(whenAllTracesFinished).then(function () {
    self.donePromise._resolve(self)
  })
}

Transaction.prototype._adjustEndToLatestTrace = function () {
  var latestTrace = findLatestTrace(this.traces)
  if (typeof latestTrace !== 'undefined') {
    this._rootTrace._end = latestTrace._end
    this._rootTrace.calcDiff()
  }
}

Transaction.prototype._adjustStartToEarliestTrace = function () {
  var trace = getEarliestTrace(this.traces)

  if (trace) {
    this._rootTrace._start = trace._start
    this._rootTrace._startStamp = trace._startStamp
    this._rootTrace.calcDiff()

    this._startStamp = this._rootTrace._startStamp
    this._start = this._rootTrace._start
  }
}

function getEarliestTrace (traces) {
  var earliestTrace = null

  traces.forEach(function (trace) {
    if (!earliestTrace) {
      earliestTrace = trace
    }
    if (earliestTrace && earliestTrace._start > trace._start) {
      earliestTrace = trace
    }
  })

  return earliestTrace
}

function findLatestTrace (traces) {
  var latestTrace = null

  traces.forEach(function (trace) {
    if (!latestTrace) {
      latestTrace = trace
    }
    if (latestTrace && latestTrace._end < trace._end) {
      latestTrace = trace
    }
  })

  return latestTrace
}

module.exports = Transaction

},{"../lib/utils":47,"./trace":49,"es6-promise":2}],51:[function(_dereq_,module,exports){
var Transaction = _dereq_('./transaction')
var utils = _dereq_('../lib/utils')
var Subscription = _dereq_('../common/subscription')

function TransactionService (zoneService, logger, config) {
  this._config = config
  if (typeof config === 'undefined') {
    logger.debug('TransactionService: config is not provided')
  }
  this._queue = []
  this._logger = logger
  this._zoneService = zoneService

  this.transactions = []
  this.nextId = 1

  this.taskMap = {}

  this._queue = []

  this._subscription = new Subscription()

  var transactionService = this
  zoneService.spec.onAddTask = function (taskId) {
    transactionService.addTask(taskId)
  }

  zoneService.spec.onRemoveTask = function (taskId) {
    transactionService.removeTask(taskId)
  }

  zoneService.spec.onDetectFinish = function () {
    transactionService.detectFinish()
  }
}

TransactionService.prototype.getTransaction = function (id) {
  return this.transactions[id]
}

TransactionService.prototype.createTransaction = function (name, type) {}

TransactionService.prototype.startTransaction = function (name, type) {
  var self = this

  var perfOptions = this._config.get('performance')
  if (!perfOptions.enable) {
    return
  }

  var tr = this._zoneService.get('transaction')
  if (typeof tr === 'undefined' || tr.ended) {
    tr = new Transaction(name, type, perfOptions)
    this._zoneService.set('transaction', tr)
  } else {
    tr.name = name
    tr.type = type
    tr._options = perfOptions
  }

  if (this.transactions.indexOf(tr) === -1) {
    this._logger.debug('TransactionService.startTransaction', tr)
    var p = tr.donePromise
    p.then(function (t) {
      self._logger.debug('TransactionService transaction finished', tr)
      self.add(tr)
      self._subscription.applyAll(self, [tr])

      var index = self.transactions.indexOf(tr)
      if (index !== -1) {
        self.transactions.splice(index, 1)
      }
    })
    this.transactions.push(tr)
  }

  return tr
}

TransactionService.prototype.startTrace = function (signature, type, options) {
  var perfOptions = this._config.get('performance')
  if (!perfOptions.enable) {
    return
  }
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    this._logger.debug('TransactionService.startTrace', signature, type)
  } else {
    tr = new Transaction('ZoneTransaction', 'transaction', perfOptions)
    this._zoneService.set('transaction', tr)
    this._logger.debug('TransactionService.startTrace - ZoneTransaction', signature, type)
  }
  var trace = tr.startTrace(signature, type, options)
  // var zone = this._zoneService.getCurrentZone()
  // trace._zone = 'Zone(' + zone.$id + ') ' // parent(' + zone.parent.$id + ') '
  return trace
}

// !!DEPRECATED!!
TransactionService.prototype.isLocked = function () {
  return false
}

TransactionService.prototype.add = function (transaction) {
  var perfOptions = this._config.get('performance')
  if (!perfOptions.enable) {
    return
  }

  this._queue.push(transaction)
  this._logger.debug('TransactionService.add', transaction)
}

TransactionService.prototype.getTransactions = function () {
  return this._queue
}

TransactionService.prototype.clearTransactions = function () {
  this._queue = []
}

TransactionService.prototype.subscribe = function (fn) {
  return this._subscription.subscribe(fn)
}

TransactionService.prototype.addTask = function (taskId) {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.addTask(taskId)
    this._logger.debug('TransactionService.addTask', taskId)
  }
}
TransactionService.prototype.removeTask = function (taskId) {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.removeTask(taskId)
    this._logger.debug('TransactionService.removeTask', taskId)
  }
}

TransactionService.prototype.detectFinish = function () {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.detectFinish()
    this._logger.debug('TransactionService.detectFinish')
  }
}

module.exports = TransactionService

},{"../common/subscription":35,"../lib/utils":47,"./transaction":50}],52:[function(_dereq_,module,exports){
var patchUtils = _dereq_('../patching/patchUtils')
var Subscription = _dereq_('../common/subscription')

var utils = _dereq_('../lib/utils')
function ZoneService (zone, logger) {
  function rafPatch (parentRaf) {
    return function (rafFn) {
      var self = this
      var args = patchUtils.argumentsToArray(arguments)
      var tId
      args[0] = patchUtils.wrapAfter(rafFn, function () {
        self._removeTransactionTask('raf' + tId)
        self.log(' - requestAnimationFrame ')
      })
      tId = parentRaf.apply(this, args)
      self._addTransactionTask('raf' + tId)
      self.log(' + requestAnimationFrame ')
      return tId
    }
  }

  function cancelRafPatch (id) {
    this._removeTransactionTask('raf' + id)
    this.log('cancelAnimationFrame')
  }

  this.events = new Subscription()
  // var zoneService = this
  function noop () { }
  var spec = this.spec = {
    onAddTask: noop,
    onRemoveTask: noop,
    onDetectFinish: noop
  }

  var zoneConfig = {
    log: function log (methodName, theRest) {
      var logText = 'Zone(' + this.$id + ') parent(' + this.parent.$id + ') ' + methodName
      var logArray = [logText]
      if (!utils.isUndefined(theRest)) {
        logArray.push(theRest)
      }
      logger.debug.apply(logger, logArray)
    },
    // onZoneCreated: function () {
    //   this.log('onZoneCreated')
    // },
    beforeTask: function () {
      var sig = this.signature
      this.log('beforeTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
    },
    afterTask: function () {
      var sig = this.signature
      this.log('afterTask', (typeof sig === 'undefined' ? undefined : ' signature: ' + sig))
      this._detectFinish()
    },
    // '-onError': function () {
    //   this.log('onError')
    // },
    // enqueueTask: function () {
    //   this.log('enqueueTask', arguments)
    // },
    // dequeueTask: function () {
    //   this.log('dequeueTask', arguments)
    // },
    $setTimeout: function (parentTimeout) {
      return function (timeoutFn, delay) {
        var self = this
        if (delay === 0) {
          var args = patchUtils.argumentsToArray(arguments)
          var tId
          args[0] = patchUtils.wrapAfter(timeoutFn, function () {
            self._removeTransactionTask('setTimeout' + tId)
            self.log(' - setTimeout ', ' delay: ' + delay)
          })
          tId = parentTimeout.apply(this, args)
          self._addTransactionTask('setTimeout' + tId)
          self.log(' + setTimeout ', ' delay: ' + delay)
          return tId
        } else {
          return parentTimeout.apply(this, arguments)
        }
      }
    },
    '-clearTimeout': function (id) {
      this._removeTransactionTask('setTimeout' + id)
      this.log('clearTimeout', this.timeout)
    },
    '$requestAnimationFrame': rafPatch,
    '-cancelAnimationFrame': cancelRafPatch,

    '$webkitRequestAnimationFrame': rafPatch,
    '-webkitCancelAnimationFrame': cancelRafPatch,

    '$mozRequestAnimationFrame': rafPatch,
    '-mozCancelAnimationFrame': cancelRafPatch

  // $addEventListener: function (parentAddEventListener) {
  //   return function (type, listener) {
  //     if (type === 'click') {
  //       console.log('addEventListener', arguments)
  //       var args = patchUtils.argumentsToArray(arguments)
  //       args[1] = patchUtils.wrapAfter(listener, function () {
  //         console.log('addEventListener callback')
  //         zoneService.events.applyAll(this, arguments)
  //       })
  //       var result = parentAddEventListener.apply(this, args)
  //       return result
  //     } else {
  //       return parentAddEventListener.apply(this, arguments)
  //     }
  //   }
  // }
  }

  this.zone = zone.fork(zoneConfig)

  this.zone._addTransactionTask = function (taskId) {
    spec.onAddTask(taskId)
  }
  this.zone._removeTransactionTask = function (taskId) {
    spec.onRemoveTask(taskId)
  }
  this.zone._detectFinish = function () {
    spec.onDetectFinish()
  }
}

ZoneService.prototype.set = function (key, value) {
  window.zone[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.zone[key]
}

ZoneService.prototype.getCurrentZone = function () {
  return window.zone
}

module.exports = ZoneService

},{"../common/subscription":35,"../lib/utils":47,"../patching/patchUtils":48}]},{},[30]);
