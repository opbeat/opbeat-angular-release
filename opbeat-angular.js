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

    function _indexOf(array, target) {
        if (typeof Array.prototype.indexOf === 'function') {
            return array.indexOf(target);
        } else {
            for (var i = 0; i < array.length; i++) {
                if (array[i] === target) {
                    return i;
                }
            }
            return -1;
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

        // Separate line and column numbers from a string of the form: (URI:Line:Column)
        extractLocation: function ErrorStackParser$$extractLocation(urlLike) {
            // Fail-fast but return locations like "(native)"
            if (urlLike.indexOf(':') === -1) {
                return [urlLike];
            }

            var regExp = /(.+?)(?:\:(\d+))?(?:\:(\d+))?$/;
            var parts = regExp.exec(urlLike.replace(/[\(\)]/g, ''));
            return [parts[1], parts[2] || undefined, parts[3] || undefined];
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
                var fileName = _indexOf(['eval', '<anonymous>'], locationParts[0]) > -1 ? undefined : locationParts[0];

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
},{"stackframe":26}],2:[function(_dereq_,module,exports){
(function (define){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
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
},{}],3:[function(_dereq_,module,exports){
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

},{}],4:[function(_dereq_,module,exports){
var backendUtils = _dereq_('./backend_utils')
var utils = _dereq_('../lib/utils')

module.exports = OpbeatBackend
function OpbeatBackend (transport, logger, config) {
  this._logger = logger
  this._transport = transport
  this._config = config
}
OpbeatBackend.prototype.sendError = function (errorData) {
  if (this._config.isValid()) {
    errorData.stacktrace.frames = backendUtils.createValidFrames(errorData.stacktrace.frames)
    var fileErrors = {}
    errorData.stacktrace.frames.forEach(function (frame) {
      if (frame.debug && frame.debug.length > 0) {
        fileErrors[frame.abs_path] = frame.debug.join(' - ')
        delete frame.debug
      }
    })
    if (Object.keys(fileErrors).length > 0) {
      if (!errorData.extra.debug) {
        errorData.extra.debug = {}
      }
      errorData.extra.debug.file_errors = fileErrors
    }

    var headers = this.getHeaders()

    errorData = this._config.applyFilters(errorData)
    if (!errorData) {
      this._logger.debug('opbeat.transport.sendToOpbeat.cancelled')
    } else {
      return this._transport.sendError(errorData, headers)
    }
  } else {
    this._logger.debug('Config is not valid')
  }
}

OpbeatBackend.prototype.getHeaders = function () {
  var platform = this._config.get('platform')
  var headers = {
    'X-Opbeat-Client': this._config.getAgentName()
  }
  if (platform) {
    var pl = []
    if (platform.platform) pl.push('platform=' + platform.platform)
    if (platform.framework) pl.push('framework=' + platform.framework)
    if (pl.length > 0) headers['X-Opbeat-Platform'] = pl.join(' ')
  }
  return headers
}

OpbeatBackend.prototype.groupSmallContinuouslySimilarTraces = function (transaction, threshold) {
  var transDuration = transaction.duration()
  var traces = []
  var lastCount = 1
  transaction.traces
    .forEach(function (trace, index) {
      if (traces.length === 0) {
        traces.push(trace)
      } else {
        var lastTrace = traces[traces.length - 1]

        var isContinuouslySimilar = lastTrace.type === trace.type &&
          lastTrace.signature === trace.signature &&
          trace.duration() / transDuration < threshold &&
          (trace._start - lastTrace._end) / transDuration < threshold

        var isLastTrace = transaction.traces.length === index + 1

        if (isContinuouslySimilar) {
          lastCount++
          lastTrace._end = trace._end
          lastTrace.calcDiff()
        }

        if (lastCount > 1 && (!isContinuouslySimilar || isLastTrace)) {
          lastTrace.signature = lastCount + 'x ' + lastTrace.signature
          lastCount = 1
        }

        if (!isContinuouslySimilar) {
          traces.push(trace)
        }
      }
    })
  return traces
}

OpbeatBackend.prototype.checkBrowserResponsiveness = function (transaction, interval, buffer) {
  var counter = transaction.browserResponsivenessCounter
  if (typeof interval === 'undefined' || typeof counter === 'undefined') {
    return true
  }

  var duration = transaction._rootTrace.duration()
  var expectedCount = Math.floor(duration / interval)
  var wasBrowserResponsive = counter + buffer >= expectedCount

  return wasBrowserResponsive
}

OpbeatBackend.prototype.setTransactionContextInfo = function setTransactionContextInfo (transaction) {
  var opbeatBackend = this
  var browserResponsivenessInterval = opbeatBackend._config.get('performance.browserResponsivenessInterval')
  var checkBrowserResponsiveness = opbeatBackend._config.get('performance.checkBrowserResponsiveness')

  var context = opbeatBackend._config.get('context')
  if (context) {
    transaction.addContextInfo(context)
  }

  var ctx = transaction.contextInfo
  var url = ctx.url
  if (url && url.location) {
    url.location = url.location.substring(0, 511)

    // var parsed = new URL(ctx.url.location, true)
    var parsed = utils.parseUrl(url.location)

    var protocol = parsed.protocol
    var acceptedProtocols = ['http:', 'https:', 'file:']
    if (acceptedProtocols.indexOf(protocol) < 0) {
      delete url.location
    } else {
      url.base = parsed.path
      if (Object.keys(parsed.queryStringParsed).length > 0) {
        url.query = parsed.queryStringParsed
      }
      if (parsed.hash) {
        url.hash = parsed.hash
      }
    }
  }

  transaction.addContextInfo({
    system: {
      agent: opbeatBackend._config.getAgentName()
    }
  })

  if (checkBrowserResponsiveness) {
    transaction.setDebugData('browserResponsivenessCounter', transaction.browserResponsivenessCounter)
    transaction.setDebugData('browserResponsivenessInterval', browserResponsivenessInterval)
  }
}

OpbeatBackend.prototype.sendTransactions = function (transactionList) {
  var opbeatBackend = this
  if (this._config.isValid()) {
    var browserResponsivenessInterval = opbeatBackend._config.get('performance.browserResponsivenessInterval')
    var checkBrowserResponsiveness = opbeatBackend._config.get('performance.checkBrowserResponsiveness')

    transactionList.forEach(function (transaction) {
      transaction.traces.sort(function (traceA, traceB) {
        return traceA._start - traceB._start
      })

      if (opbeatBackend._config.get('performance.groupSimilarTraces')) {
        var similarTraceThreshold = opbeatBackend._config.get('performance.similarTraceThreshold')
        transaction.traces = opbeatBackend.groupSmallContinuouslySimilarTraces(transaction, similarTraceThreshold)
      }
      opbeatBackend.setTransactionContextInfo(transaction)
    })

    var filterTransactions = transactionList.filter(function (tr) {
      if (checkBrowserResponsiveness && !tr.isHardNavigation) {
        var buffer = opbeatBackend._config.get('performance.browserResponsivenessBuffer')

        var duration = tr._rootTrace.duration()
        var wasBrowserResponsive = opbeatBackend.checkBrowserResponsiveness(tr, browserResponsivenessInterval, buffer)
        if (!wasBrowserResponsive) {
          opbeatBackend._logger.debug('Transaction was discarded! browser was not responsive enough during the transaction.', ' duration:', duration, ' browserResponsivenessCounter:', tr.browserResponsivenessCounter, 'interval:', browserResponsivenessInterval)
          return false
        }
      }
      return true
    })

    if (filterTransactions.length > 0) {
      var formatedTransactions = this._formatTransactions(filterTransactions)
      var headers = this.getHeaders()
      return this._transport.sendTransaction(formatedTransactions, headers)
        .then(undefined, function (reason) {
          opbeatBackend._logger.warn('Failed sending transactions!', reason)
          return Promise.reject(reason)
        })
    }
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

  groupedTraces.forEach(function (g) {
    delete g._group
    if (typeof g.signature === 'string') {
      g.signature = g.signature.substring(0, 511)
    }
  })

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

    if (transaction.contextInfo && Object.keys(transaction.contextInfo).length > 0) {
      data.push(transaction.contextInfo)
    }
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
      transaction_kind: trace.transaction.type,
      signature: trace.signature,
      kind: trace.type,
      timestamp: trace.transaction._startStamp.toISOString(),
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
    groupingTs(trace.transaction._startStamp).getTime(),
    trace.transaction.name,
    ancestors,
    trace.signature,
    trace.type
  ].join('-')
}

},{"../lib/utils":16,"./backend_utils":3}],5:[function(_dereq_,module,exports){
var patchXMLHttpRequest = _dereq_('./patches/xhrPatch')

function patchCommon (serviceContainer) {
  patchXMLHttpRequest(serviceContainer)
}

module.exports = patchCommon

},{"./patches/xhrPatch":7}],6:[function(_dereq_,module,exports){
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

},{}],7:[function(_dereq_,module,exports){
var patchUtils = _dereq_('../patchUtils')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')
var isAsyncSymbol = patchUtils.opbeatSymbol('isAsync')

module.exports = function patchXMLHttpRequest () {
  patchUtils.patchMethod(window.XMLHttpRequest.prototype, 'open', function (delegate) {
    return function (self, args) {
      self[methodSymbol] = args[0]
      self[urlSympbol] = args[1]
      self[isAsyncSymbol] = args[2]
      delegate.apply(self, args)
    }
  })
}

},{"../patchUtils":6}],8:[function(_dereq_,module,exports){
var OpbeatBackend = _dereq_('../backend/opbeat_backend')
var Logger = _dereq_('loglevel')
var Config = _dereq_('../lib/config')

var utils = _dereq_('../lib/utils')
var Transport = _dereq_('../lib/transport')
var ExceptionHandler = _dereq_('../exceptions/exceptionHandler')
var StackFrameService = _dereq_('../exceptions/stackFrameService')

var PerformanceServiceContainer = _dereq_('../performance/serviceContainer')

function ServiceFactory () {
  this.services = {}
}

ServiceFactory.prototype.getOpbeatBackend = function () {
  if (utils.isUndefined(this.services['OpbeatBackend'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var _transport = this.getTransport()
    this.services['OpbeatBackend'] = new OpbeatBackend(_transport, logger, configService)
  }
  return this.services['OpbeatBackend']
}

ServiceFactory.prototype.getTransport = function () {
  if (utils.isUndefined(this.services['Transport'])) {
    var configService = this.getConfigService()
    var logger = this.getLogger()
    this.services['Transport'] = new Transport(configService, logger)
  }
  return this.services['Transport']
}

ServiceFactory.prototype.setLogLevel = function (logger, configService) {
  if (configService.get('debug') === true && configService.config.logLevel !== 'trace') {
    logger.setLevel('debug', false)
  } else {
    logger.setLevel(configService.get('logLevel'), false)
  }
}

ServiceFactory.prototype.getLogger = function () {
  if (utils.isUndefined(this.services['Logger'])) {
    var configService = this.getConfigService()
    var serviceFactory = this
    serviceFactory.setLogLevel(Logger, configService)
    configService.subscribeToChange(function (newConfig) {
      serviceFactory.setLogLevel(Logger, configService)
    })
    this.services['Logger'] = Logger
  }
  return this.services['Logger']
}

ServiceFactory.prototype.getConfigService = function () {
  if (utils.isUndefined(this.services['ConfigService'])) {
    var configService = new Config()
    configService.init()
    this.services['ConfigService'] = configService
  }
  return this.services['ConfigService']
}

ServiceFactory.prototype.getExceptionHandler = function () {
  if (utils.isUndefined(this.services['ExceptionHandler'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var exceptionHandler = new ExceptionHandler(this.getOpbeatBackend(), configService, logger, this.getStackFrameService())
    this.services['ExceptionHandler'] = exceptionHandler
  }
  return this.services['ExceptionHandler']
}

ServiceFactory.prototype.getStackFrameService = function () {
  if (utils.isUndefined(this.services['StackFrameService'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var stackFrameService = new StackFrameService(configService, logger)
    this.services['StackFrameService'] = stackFrameService
  }
  return this.services['StackFrameService']
}

ServiceFactory.prototype.getPerformanceServiceContainer = function () {
  if (utils.isUndefined(this.services['PerformanceServiceContainer'])) {
    this.services['PerformanceServiceContainer'] = new PerformanceServiceContainer(this)
  }
  return this.services['PerformanceServiceContainer']
}

module.exports = ServiceFactory

},{"../backend/opbeat_backend":4,"../exceptions/exceptionHandler":10,"../exceptions/stackFrameService":11,"../lib/config":14,"../lib/transport":15,"../lib/utils":16,"../performance/serviceContainer":18,"loglevel":2}],9:[function(_dereq_,module,exports){
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

},{}],10:[function(_dereq_,module,exports){
var stackTrace = _dereq_('./stacktrace')
var utils = _dereq_('../lib/utils')

var ExceptionHandler = function (opbeatBackend, config, logger, stackFrameService) {
  this._opbeatBackend = opbeatBackend
  this._config = config
  this._logger = logger
  this._stackFrameService = stackFrameService
}

ExceptionHandler.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    var options = {
      eventObject: {
        msg: msg, file: file, line: line, col: col
      }
    }
    this._processError(error, options)
  }.bind(this)
}

ExceptionHandler.prototype.uninstall = function () {
  window.onerror = null
}

ExceptionHandler.prototype.processError = function (err, options) {
  return this._processError(err, options)
}

ExceptionHandler.prototype.getExceptionData = function getExceptionData (errorObject, options) {
  var eo = options && options.eventObject || {}
  var msg = eo.msg
  var file = eo.file
  var line = eo.line
  var col = eo.col
  var error = errorObject

  if (eo.msg && typeof eo.msg !== 'string') {
    // https://developer.mozilla.org/en-US/docs/Web/API/ErrorEvent
    var errorEvent = eo.msg
    msg = errorEvent.message
    file = file || errorEvent.filename
    line = line || errorEvent.lineno
    col = col || errorEvent.colno
    error = errorObject || errorEvent.error
  }

  if (msg === 'Script error.' && !file) {
    // ignoring script errors: See https://github.com/getsentry/raven-js/issues/41
    return
  }

  var extraContext = error ? getProperties(error) : undefined // error ? error['_opbeat_extra_context'] : undefined
  if (options && options.extra) {
    extraContext = utils.merge({}, extraContext, options.extra)
  }

  var exception = {
    'message': error ? error.message : msg,
    'type': error ? error.name : null,
    'fileurl': file || null,
    'lineno': line || null,
    'colno': col || null,
    'extra': extraContext
  }
  if (!exception.type) {
    // Try to extract type from message formatted like 'ReferenceError: Can't find variable: initHighlighting'
    if (exception.message && exception.message.indexOf(':') > -1) {
      exception.type = exception.message.split(':')[0]
    } else {
      exception.type = ''
    }
  }

  var resolveStackFrames

  if (error) {
    resolveStackFrames = stackTrace.fromError(error)
  } else {
    resolveStackFrames = new Promise(function (resolve, reject) {
      resolve([{
        'fileName': exception.fileurl,
        'lineNumber': exception.lineno,
        'columnNumber': exception.colno
      }])
    })
  }

  var exceptionHandler = this
  return resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return exceptionHandler._stackFrameService.stackInfoToOpbeatException(exception).then(function (exception) {
      var data = exceptionHandler._stackFrameService.processOpbeatException(exception, exceptionHandler._config.get('context.user'), exceptionHandler._config.get('context.extra'))
      return data
    })
  })
}

ExceptionHandler.prototype._processError = function processError (errorObject, options) {
  var exceptionHandler = this
  var resultPromise = exceptionHandler.getExceptionData(errorObject, options)
  if (resultPromise) {
    return resultPromise.then(function (data) {
      return exceptionHandler._opbeatBackend.sendError(data)
    })['catch'](function (error) {
      exceptionHandler._logger.warn(error)
    })
  }
}

function getProperties (err) {
  var properties = {}
  Object.keys(err).forEach(function (key) {
    if (key === 'stack') return
    var val = err[key]
    if (val === null) return // null is typeof object and well break the switch below
    switch (typeof val) {
      case 'function':
        return
      case 'object':
        // ignore all objects except Dates
        if (typeof val.toISOString !== 'function') return
        val = val.toISOString()
    }
    properties[key] = val
  })
  return properties
}

module.exports = ExceptionHandler

},{"../lib/utils":16,"./stacktrace":12}],11:[function(_dereq_,module,exports){
var utils = _dereq_('../lib/utils')
var stackTrace = _dereq_('./stacktrace')

var promiseSequence = function (tasks) {
  var current = Promise.resolve()
  var results = []

  for (var k = 0; k < tasks.length; ++k) {
    results.push(current = current.then(tasks[k]))
  }

  return Promise.all(results)
}

function StackFrameService (config, logger) {
  this._logger = logger
  this._config = config
}

StackFrameService.prototype.getFramesForCurrent = function getFramesForCurrent () {
  return stackTrace.get().then(function (frames) {
    var tasks = frames.map(function (frame) {
      return this.buildOpbeatFrame.bind(this, frame)
    }.bind(this))

    var allFrames = promiseSequence(tasks)

    return allFrames.then(function (opbeatFrames) {
      return opbeatFrames
    })
  }.bind(this))
}

StackFrameService.prototype.buildOpbeatFrame = function buildOpbeatFrame (stack) {
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
      'in_app': this.isFileInApp(filePath),
      'debug': []
    }

    resolve(frame)
  }.bind(this))
}

StackFrameService.prototype.stackInfoToOpbeatException = function stackInfoToOpbeatException (stackInfo) {
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
}

StackFrameService.prototype.processOpbeatException = function (exception, userContext, extraContext) {
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

  var messagePrefix = ''
  if (type && typeof message === 'string' && message.indexOf('Error:') !== 0) {
    messagePrefix = type + ': '
  }

  var data = {
    message: messagePrefix + message,
    culprit: culprit,
    exception: {
      type: type,
      value: message
    },
    http: {
      url: window.location.href
    },
    stacktrace: stacktrace,
    user: userContext || {},
    level: null,
    logger: null,
    machine: null
  }

  var browserMetadata = this.getBrowserSpecificMetadata()
  data.extra = utils.merge({}, browserMetadata, extraContext, exception.extra)

  this._logger.debug('opbeat.exceptions.processOpbeatException', data)
  return data
}
StackFrameService.prototype.cleanFilePath = function (filePath) {
  if (!filePath) {
    filePath = ''
  }

  if (filePath === '<anonymous>') {
    filePath = ''
  }

  return filePath
}

StackFrameService.prototype.filePathToFileName = function (fileUrl) {
  var origin = window.location.origin || window.location.protocol + '//' + window.location.hostname + (window.location.port ? (':' + window.location.port) : '')

  if (fileUrl.indexOf(origin) > -1) {
    fileUrl = fileUrl.replace(origin + '/', '')
  }

  return fileUrl
}

StackFrameService.prototype.isFileInline = function (fileUrl) {
  if (fileUrl) {
    return window.location.href.indexOf(fileUrl) === 0
  } else {
    return false
  }
}
StackFrameService.prototype.isFileInApp = function (filename) {
  var pattern = this._config.get('libraryPathPattern')
  return !RegExp(pattern).test(filename)
}

StackFrameService.prototype.getBrowserSpecificMetadata = function () {
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

module.exports = StackFrameService

},{"../lib/utils":16,"./stacktrace":12}],12:[function(_dereq_,module,exports){
var ErrorStackParser = _dereq_('error-stack-parser')
var StackGenerator = _dereq_('stack-generator')
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

},{"../lib/utils":16,"error-stack-parser":1,"stack-generator":25}],13:[function(_dereq_,module,exports){
// export public core APIs.

module.exports['ServiceFactory'] = _dereq_('./common/serviceFactory')
module.exports['ServiceContainer'] = _dereq_('./performance/serviceContainer')
module.exports['ConfigService'] = _dereq_('./lib/config')
module.exports['TransactionService'] = _dereq_('./performance/transactionService')
module.exports['Subscription'] = _dereq_('./common/subscription')

module.exports['patchUtils'] = _dereq_('./common/patchUtils')
module.exports['patchCommon'] = _dereq_('./common/patchCommon')
module.exports['utils'] = _dereq_('./lib/utils')

},{"./common/patchCommon":5,"./common/patchUtils":6,"./common/serviceFactory":8,"./common/subscription":9,"./lib/config":14,"./lib/utils":16,"./performance/serviceContainer":18,"./performance/transactionService":21}],14:[function(_dereq_,module,exports){
var utils = _dereq_('./utils')
var Subscription = _dereq_('../common/subscription')

function Config () {
  this.config = {}
  this.defaults = {
    opbeatAgentName: 'opbeat-js',
    VERSION: 'v3.15.1',
    apiOrigin: 'https://intake.opbeat.com',
    apiUrlPrefix: '/api/v1',
    isInstalled: false,
    debug: false,
    logLevel: 'warn',
    orgId: null,
    appId: null,
    angularAppName: null,
    performance: {
      browserResponsivenessInterval: 500,
      browserResponsivenessBuffer: 3,
      checkBrowserResponsiveness: true,
      enable: true,
      enableStackFrames: false,
      groupSimilarTraces: true,
      similarTraceThreshold: 0.05,
      captureInteractions: false,
      sendVerboseDebugInfo: false,
      includeXHRQueryString: false,
      capturePageLoad: true
    },
    ignoreTransactions: [],
    libraryPathPattern: '(node_modules|bower_components|webpack)',
    context: {},
    platform: {}
  }

  this._changeSubscription = new Subscription()
  this.filters = []
}

Config.prototype.addFilter = function addFilter (cb) {
  if (typeof cb !== 'function') {
    throw new Error('Argument to must be function')
  }
  this.filters.push(cb)
}

Config.prototype.applyFilters = function applyFilters (data) {
  for (var i = 0; i < this.filters.length; i++) {
    data = this.filters[i](data)
    if (!data) {
      return
    }
  }
  return data
}

Config.prototype.init = function () {
  var scriptData = _getConfigFromScript()
  this.setConfig(scriptData)
}

Config.prototype.get = function (key) {
  return utils.arrayReduce(key.split('.'), function (obj, i) {
    return obj && obj[i]
  }, this.config)
}

Config.prototype.getEndpointUrl = function getEndpointUrl (endpoint) {
  var url = this.get('apiOrigin') + this.get('apiUrlPrefix') + '/organizations/' + this.get('orgId') + '/apps/' + this.get('appId') + '/client-side/' + endpoint + '/'
  return url
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

Config.prototype.getAgentName = function () {
  var version = this.config['VERSION']
  if (!version || version.indexOf('%%VERSION') >= 0) {
    version = 'dev'
  }
  return this.get('opbeatAgentName') + '/' + version
}

Config.prototype.setConfig = function (properties) {
  properties = properties || {}
  this.config = utils.merge({}, this.defaults, this.config, properties)

  this._changeSubscription.applyAll(this, [this.config])
}

Config.prototype.subscribeToChange = function (fn) {
  return this._changeSubscription.subscribe(fn)
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

Config.prototype.VERSION = 'v3.15.1'

Config.prototype.isPlatformSupported = function () {
  return typeof Array.prototype.forEach === 'function' &&
    typeof JSON.stringify === 'function' &&
    typeof Function.bind === 'function' &&
    window.performance &&
    typeof window.performance.now === 'function' &&
    utils.isCORSSupported()
}

module.exports = Config

},{"../common/subscription":9,"./utils":16}],15:[function(_dereq_,module,exports){
function Transport (configService, logger) {
  this.configService = configService
  this.logger = logger
}

Transport.prototype.sendError = function sendError (data, headers) {
  return this._sendToOpbeat('errors', data, headers)
}

Transport.prototype.sendTransaction = function sendTransaction (data, headers) {
  return this._sendToOpbeat('transactions', data, headers)
}

Transport.prototype._sendToOpbeat = function _sendToOpbeat (endpoint, data, headers) {
  var self = this
  this.logger.debug('opbeat.transport.sendToOpbeat', data)

  var url = this.configService.getEndpointUrl(endpoint)

  return _makeRequest(url, 'POST', 'JSON', data, headers)
    .then(function (response) {
      self.logger.debug('opbeat.transport.makeRequest.success')
      return response
    }, function (reason) {
      self.logger.debug('opbeat.transport.makeRequest.error', reason)
      return Promise.reject(reason)
    })
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
        } else {
          resolve(xhr.responseText)
        }
      }
    }

    xhr.onerror = function (err) {
      reject(err)
    }

    if (type === 'JSON') {
      data = JSON.stringify(data)
    }

    xhr.send(data)
  })
}

module.exports = Transport

},{}],16:[function(_dereq_,module,exports){
var slice = [].slice

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

  extend: function extend (dst) {
    return this.baseExtend(dst, slice.call(arguments, 1), false)
  },

  merge: function merge (dst) {
    return this.baseExtend(dst, slice.call(arguments, 1), true)
  },

  baseExtend: function baseExtend (dst, objs, deep) {
    for (var i = 0, ii = objs.length; i < ii; ++i) {
      var obj = objs[i]
      if (!isObject(obj) && !isFunction(obj)) continue
      var keys = Object.keys(obj)
      for (var j = 0, jj = keys.length; j < jj; j++) {
        var key = keys[j]
        var src = obj[key]

        if (deep && isObject(src)) {
          if (!isObject(dst[key])) dst[key] = Array.isArray(src) ? [] : {}
          baseExtend(dst[key], [src], false) // only one level of deep merge
        } else {
          dst[key] = src
        }
      }
    }

    return dst
  },

  isObject: isObject,

  isFunction: isFunction,

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
  getOpbeatScript: function () {
    if (typeof document !== 'undefined') {
      var scripts = document.getElementsByTagName('script')
      for (var i = 0, l = scripts.length; i < l; i++) {
        var sc = scripts[i]
        if (sc.src.indexOf('opbeat') > 0) {
          return sc
        }
      }
    }
  },

  getCurrentScript: function () {
    if (typeof document !== 'undefined') {
      // Source http://www.2ality.com/2014/05/current-script.html
      var currentScript = document.currentScript
      if (!currentScript) {
        return this.getOpbeatScript()
      }
      return currentScript
    }
  },

  generateUuid: function () {
    function _p8 (s) {
      var p = (Math.random().toString(16) + '000000000').substr(2, 8)
      return s ? '-' + p.substr(0, 4) + '-' + p.substr(4, 4) : p
    }
    return _p8() + _p8(true) + _p8(true) + _p8()
  },

  parseUrl: function parseUrl (url) {
    // source: angular.js/$LocationProvider
    var PATH_MATCH = /^([^\?#]*)(\?([^#]*))?(#(.*))?$/
    var match = PATH_MATCH.exec(url)
    var path = match[1] || ''
    var queryString = match[3] || ''
    var hash = match[5] ? '#' + match[5] : ''

    var protocol = ''
    if (url.indexOf('://') > -1) {
      protocol = url.split('://')[0] + ':'
    }

    var params = {}
    var queries = queryString.split('&')
    for (var i = 0, l = queries.length; i < l; i++) {
      var query = queries[i]
      if (query === '' || typeof query === 'undefined' || query === null) {
        continue
      }
      var keyvalue = queries[i].split('=')
      var key = keyvalue.shift()
      params[key] = keyvalue.join('=')
    }
    return { protocol: protocol, path: path, queryString: queryString, queryStringParsed: params, hash: hash }
  }

}

function isObject (value) {
  // http://jsperf.com/isobject4
  return value !== null && typeof value === 'object'
}

function isFunction (value) {
  return typeof value === 'function'
}

},{}],17:[function(_dereq_,module,exports){
var Trace = _dereq_('./trace')

var eventPairs = [
  ['domainLookupStart', 'domainLookupEnd', 'DNS lookup'],
  ['connectStart', 'connectEnd', 'Connect'],
  ['requestStart', 'responseStart', 'Sending and waiting for first byte'],
  ['responseStart', 'responseEnd', 'Downloading'],
  ['domLoading', 'domInteractive', 'Fetching, parsing and sync. execution'],
  ['domContentLoadedEventStart', 'domContentLoadedEventEnd', '"DOMContentLoaded" event handling'],
  ['loadEventStart', 'loadEventEnd', '"load" event handling']
]

var navigationTimingKeys = [
  'navigationStart', 'unloadEventStart', 'unloadEventEnd', 'redirectStart', 'redirectEnd', 'fetchStart', 'domainLookupStart', 'domainLookupEnd', 'connectStart',
  'connectEnd', 'secureConnectionStart', 'requestStart', 'responseStart', 'responseEnd', 'domLoading', 'domInteractive', 'domContentLoadedEventStart', 'domContentLoadedEventEnd', 'domComplete', 'loadEventStart', 'loadEventEnd']

var traceThreshold = 5 * 60 * 1000 // 5 minutes
function isValidTrace (transaction, trace) {
  var d = trace.duration()
  return (d < traceThreshold && d > 0 && trace._start <= transaction._rootTrace._end && trace._end <= transaction._rootTrace._end)
}

module.exports = function captureHardNavigation (transaction) {
  if (transaction.isHardNavigation && window.performance && window.performance.timing) {
    var baseTime = window.performance.timing.fetchStart
    var timings = window.performance.timing

    transaction._rootTrace._start = transaction._start = 0
    transaction.type = 'page-load'
    for (var i = 0; i < eventPairs.length; i++) {
      // var transactionStart = eventPairs[0]
      var start = timings[eventPairs[i][0]]
      var end = timings[eventPairs[i][1]]
      if (start && end && end - start !== 0) {
        var trace = new Trace(transaction, eventPairs[i][2], 'hard-navigation.browser-timing')
        trace._start = timings[eventPairs[i][0]] - baseTime
        trace.ended = true
        trace.setParent(transaction._rootTrace)
        trace.end()
        trace._end = timings[eventPairs[i][1]] - baseTime
        trace.calcDiff()
        if (!isValidTrace(transaction, trace)) {
          transaction.traces.splice(transaction.traces.indexOf(trace), 1)
        }
      }
    }

    if (window.performance.getEntriesByType) {
      var entries = window.performance.getEntriesByType('resource')

      var ajaxUrls = transaction.traces
          .filter(function (trace) { return trace.type.indexOf('ext.HttpRequest') > -1 })
          .map(function (trace) { return trace.signature.split(' ')[1] })

      for (i = 0; i < entries.length; i++) {
        var entry = entries[i]
        if (entry.initiatorType && entry.initiatorType === 'xmlhttprequest') {
          continue
        } else if (entry.initiatorType !== 'css' && entry.initiatorType !== 'img' && entry.initiatorType !== 'script' && entry.initiatorType !== 'link') {
          // is web request? test for css/img before the expensive operation
          var foundAjaxReq = false
          for (var j = 0; j < ajaxUrls.length; j++) {
            // entry.name.endsWith(ajaxUrls[j])
            var idx = entry.name.lastIndexOf(ajaxUrls[j])
            if (idx > -1 && idx === (entry.name.length - ajaxUrls[j].length)) {
              foundAjaxReq = true
              break
            }
          }
          if (foundAjaxReq) {
            continue
          }
        } else {
          var kind = 'resource'
          if (entry.initiatorType) {
            kind += '.' + entry.initiatorType
          }

          trace = new Trace(transaction, entry.name, kind)
          trace._start = entry.startTime
          trace.ended = true
          trace.setParent(transaction._rootTrace)
          trace.end()
          trace._end = entry.responseEnd
          trace.calcDiff()
          if (!isValidTrace(transaction, trace)) {
            transaction.traces.splice(transaction.traces.indexOf(trace), 1)
          }
        }
      }
    }
    transaction._adjustStartToEarliestTrace()
    transaction._adjustEndToLatestTrace()

    var metrics = {
      timeToComplete: transaction._rootTrace._end
    }
    navigationTimingKeys.forEach(function (timingKey) {
      var m = timings[timingKey]
      if (m) {
        metrics[timingKey] = m - baseTime
      }
    })
    transaction.addMetrics(metrics)
  }
  return 0
}

},{"./trace":19}],18:[function(_dereq_,module,exports){
var TransactionService = _dereq_('./transactionService')
var ZoneService = _dereq_('./zoneService')
var utils = _dereq_('../lib/utils')

function ServiceContainer (serviceFactory) {
  this.serviceFactory = serviceFactory
  this.services = {}
  this.services.configService = this.serviceFactory.getConfigService()
  this.services.logger = this.serviceFactory.getLogger()
  this.services.zoneService = this.createZoneService()
}

ServiceContainer.prototype.initialize = function () {
  var configService = this.services.configService
  var logger = this.services.logger
  this.services.zoneService.initialize(window.Zone.current)

  var opbeatBackend = this.services.opbeatBackend = this.serviceFactory.getOpbeatBackend()
  var transactionService = this.services.transactionService = new TransactionService(this.services.zoneService, this.services.logger, configService, opbeatBackend)
  transactionService.scheduleTransactionSend()

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
}

ServiceContainer.prototype.createZoneService = function () {
  var logger = this.services.logger

  return new ZoneService(logger, this.services.configService)
}

module.exports = ServiceContainer

},{"../lib/utils":16,"./transactionService":21,"./zoneService":22}],19:[function(_dereq_,module,exports){
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

  if (utils.isUndefined(options) || options == null) {
    options = {}
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
  if (utils.isUndefined(this.ended) || utils.isUndefined(this._start)) {
    return null
  }
  this._diff = this._end - this._start

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
  // should use stacktrace.js to get stackframes raw data synchronously
  callback()
}

module.exports = Trace

},{"../lib/utils":16}],20:[function(_dereq_,module,exports){
var Trace = _dereq_('./trace')
var utils = _dereq_('../lib/utils')

var Transaction = function (name, type, options, logger) {
  this.metadata = {}
  this.name = name
  this.type = type
  this.ended = false
  this._markDoneAfterLastTrace = false
  this._isDone = false
  this._options = options
  this._logger = logger
  if (typeof options === 'undefined') {
    this._options = {}
  }

  this.contextInfo = {
    _debug: {},
    _metrics: {}
  }
  if (this._options.sendVerboseDebugInfo) {
    this.contextInfo._debug.log = []
    this.debugLog('Transaction', name, type)
  }

  this.traces = []
  this._activeTraces = {}

  this._scheduledTasks = {}

  this.events = {}

  this.doneCallback = function noop () {}

  // A transaction should always have a root trace spanning the entire transaction.
  this._rootTrace = this.startTrace('transaction', 'transaction', {enableStackFrames: false})
  this._startStamp = new Date()
  this._start = this._rootTrace._start

  this.duration = this._rootTrace.duration.bind(this._rootTrace)
  this.nextId = 0

  this.isHardNavigation = false
}

Transaction.prototype.debugLog = function () {
  if (this._options.sendVerboseDebugInfo) {
    var messages = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
    messages.unshift(Date.now().toString())
    var textMessage = messages.join(' - ')
    this.contextInfo._debug.log.push(textMessage)
    if (this._logger) this._logger.debug(textMessage)
  }
}

Transaction.prototype.addContextInfo = function (obj) {
  utils.merge(this.contextInfo, obj)
}

Transaction.prototype.setDebugData = function setDebugData (key, value) {
  this.contextInfo._debug[key] = value
}

Transaction.prototype.addMetrics = function (obj) {
  this.contextInfo._metrics = utils.merge(this.contextInfo._metrics, obj)
}

Transaction.prototype.redefine = function (name, type, options) {
  this.debugLog('redefine', name, type)
  this.name = name
  this.type = type
  this._options = options
}

Transaction.prototype.startTrace = function (signature, type, options) {
  // todo: should not accept more traces if the transaction is alreadyFinished
  this.debugLog('startTrace', signature, type)
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
  var scheduledTasks = Object.keys(this._scheduledTasks)
  this.debugLog('isFinished scheduledTasks', scheduledTasks)
  return (scheduledTasks.length === 0)
}

Transaction.prototype.detectFinish = function () {
  if (this.isFinished()) this.end()
}

Transaction.prototype.end = function () {
  if (this.ended) {
    return
  }
  this.debugLog('end')
  this.ended = true

  this.addContextInfo({
    url: {
      location: window.location.href
    }
  })
  this._rootTrace.end()

  if (this.isFinished() === true) {
    this._finish()
  }
}

Transaction.prototype.addTask = function (taskId) {
  // todo: should not accept more tasks if the transaction is alreadyFinished]
  this.debugLog('addTask', taskId)
  this._scheduledTasks[taskId] = taskId
}

Transaction.prototype.removeTask = function (taskId) {
  this.debugLog('removeTask', taskId)
  this.setDebugData('lastRemovedTask', taskId)
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
  this.doneCallback(this)
}

Transaction.prototype._adjustEndToLatestTrace = function () {
  var latestTrace = findLatestNonXHRTrace(this.traces)

  if (latestTrace) {
    this._rootTrace._end = latestTrace._end
    this._rootTrace.calcDiff()

    // set all traces that now are longer than the transaction to
    // be truncated traces
    for (var i = 0; i < this.traces.length; i++) {
      var trace = this.traces[i]
      if (trace._end > this._rootTrace._end) {
        trace._end = this._rootTrace._end
        trace.calcDiff()
        trace.type = trace.type + '.truncated'
      }
    }
  }
}

Transaction.prototype._adjustStartToEarliestTrace = function () {
  var trace = getEarliestTrace(this.traces)

  if (trace) {
    this._rootTrace._start = trace._start
    this._rootTrace.calcDiff()
    this._start = this._rootTrace._start
  }
}

function findLatestNonXHRTrace (traces) {
  var latestTrace = null
  for (var i = 0; i < traces.length; i++) {
    var trace = traces[i]
    if (trace.type && trace.type.indexOf('ext') === -1 &&
      trace.type !== 'transaction' &&
      (!latestTrace || latestTrace._end < trace._end)) {
      latestTrace = trace
    }
  }
  return latestTrace
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

module.exports = Transaction

},{"../lib/utils":16,"./trace":19}],21:[function(_dereq_,module,exports){
var Transaction = _dereq_('./transaction')
var utils = _dereq_('../lib/utils')
var Subscription = _dereq_('../common/subscription')

var captureHardNavigation = _dereq_('./captureHardNavigation')

function TransactionService (zoneService, logger, config, opbeatBackend) {
  this._config = config
  if (typeof config === 'undefined') {
    logger.debug('TransactionService: config is not provided')
  }
  this._queue = []
  this._logger = logger
  this._opbeatBackend = opbeatBackend
  this._zoneService = zoneService

  this.nextAutoTaskId = 1

  this.taskMap = {}
  this.metrics = {}

  this._queue = []
  this.initialPageLoadName = undefined

  this._subscription = new Subscription()

  var transactionService = this
  this._alreadyCapturedPageLoad = false

  function onBeforeInvokeTask (task) {
    if (task.source === 'XMLHttpRequest.send' && task.trace && !task.trace.ended) {
      task.trace.end()
    }
    transactionService.logInTransaction('Executing', task.taskId)
  }
  zoneService.spec.onBeforeInvokeTask = onBeforeInvokeTask

  var self = this

  function onScheduleTask (task) {
    if (task.source === 'XMLHttpRequest.send') {
      var url = task['XHR']['url']
      var traceSignature = task['XHR']['method'] + ' '
      if (transactionService._config.get('performance.includeXHRQueryString')) {
        traceSignature = traceSignature + url
      } else {
        var parsed = utils.parseUrl(url)
        traceSignature = traceSignature + parsed.path
      }

      var trace = transactionService.startTrace(traceSignature, 'ext.HttpRequest', {'enableStackFrames': false})
      task.trace = trace
    } else if (task.type === 'interaction') {
      if (typeof self.interactionStarted === 'function') {
        self.interactionStarted(task)
      }
    }
    transactionService.addTask(task.taskId)
  }
  zoneService.spec.onScheduleTask = onScheduleTask

  function onInvokeTask (task) {
    if (task.source === 'XMLHttpRequest.send' && task.trace && !task.trace.ended) {
      task.trace.end()
      transactionService.logInTransaction('xhr late ending')
      transactionService.setDebugDataOnTransaction('xhrLateEnding', true)
    }
    transactionService.removeTask(task.taskId)
    transactionService.detectFinish()
  }
  zoneService.spec.onInvokeTask = onInvokeTask

  function onCancelTask (task) {
    transactionService.removeTask(task.taskId)
    transactionService.detectFinish()
  }
  zoneService.spec.onCancelTask = onCancelTask
  function onInvokeEnd (task) {
    logger.trace('onInvokeEnd', 'source:', task.source, 'type:', task.type)
    transactionService.detectFinish()
  }
  zoneService.spec.onInvokeEnd = onInvokeEnd

  function onInvokeStart (task) {
    logger.trace('onInvokeStart', 'source:', task.source, 'type:', task.type)
  }
  zoneService.spec.onInvokeStart = onInvokeStart
}

TransactionService.prototype.createTransaction = function (name, type, options) {
  var perfOptions = options
  if (utils.isUndefined(perfOptions)) {
    perfOptions = this._config.get('performance')
  }
  if (!perfOptions.enable || !this._zoneService.isOpbeatZone()) {
    return
  }

  var tr = new Transaction(name, type, perfOptions, this._logger)
  tr.setDebugData('zone', this._zoneService.getCurrentZone().name)
  this._zoneService.set('transaction', tr)
  if (perfOptions.checkBrowserResponsiveness) {
    this.startCounter(tr)
  }
  return tr
}

TransactionService.prototype.createZoneTransaction = function () {
  return this.createTransaction('ZoneTransaction', 'transaction')
}

TransactionService.prototype.getCurrentTransaction = function () {
  var perfOptions = this._config.get('performance')
  if (!perfOptions.enable || !this._zoneService.isOpbeatZone()) {
    return
  }
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    return tr
  }
  return this.createZoneTransaction()
}

TransactionService.prototype.startCounter = function (transaction) {
  transaction.browserResponsivenessCounter = 0
  var interval = this._config.get('performance.browserResponsivenessInterval')
  if (typeof interval === 'undefined') {
    this._logger.debug('browserResponsivenessInterval is undefined!')
    return
  }
  this._zoneService.runOuter(function () {
    var id = setInterval(function () {
      if (transaction.ended) {
        window.clearInterval(id)
      } else {
        transaction.browserResponsivenessCounter++
      }
    }, interval)
  })
}

TransactionService.prototype.sendPageLoadMetrics = function (name) {
  var self = this
  var perfOptions = this._config.get('performance')
  var tr

  tr = this._zoneService.getFromOpbeatZone('transaction')

  var trName = name || this.initialPageLoadName || window.location.pathname

  if (tr && tr.name === 'ZoneTransaction') {
    tr.redefine(trName, 'page-load', perfOptions)
  } else {
    tr = new Transaction(trName, 'page-load', perfOptions, this._logger)
  }
  tr.isHardNavigation = true

  tr.doneCallback = function () {
    self.applyAsync(function () {
      var captured = self.capturePageLoadMetrics(tr)
      if (captured) {
        self.add(tr)
        self._subscription.applyAll(self, [tr])
      }
    })
  }
  tr.detectFinish()
  return tr
}

TransactionService.prototype.capturePageLoadMetrics = function (tr) {
  var self = this
  var capturePageLoad = self._config.get('performance.capturePageLoad')
  if (capturePageLoad && !self._alreadyCapturedPageLoad && tr.isHardNavigation) {
    tr.addMetrics(self.metrics)
    captureHardNavigation(tr)
    self._alreadyCapturedPageLoad = true
    return true
  }
}

TransactionService.prototype.startTransaction = function (name, type) {
  var self = this
  var perfOptions = this._config.get('performance')
  if (type === 'interaction' && !perfOptions.captureInteractions) {
    return
  }

  // this will create a zone transaction if possible
  var tr = this.getCurrentTransaction()

  if (tr) {
    if (tr.name !== 'ZoneTransaction') {
      // todo: need to handle cases in which the transaction has active traces and/or scheduled tasks
      this.logInTransaction('Ending early to start a new transaction:', name, type)
      this._logger.debug('Ending old transaction', tr)
      tr.end()
      tr = this.createTransaction(name, type)
    } else {
      tr.redefine(name, type, perfOptions)
    }
  } else {
    return
  }

  this._logger.debug('TransactionService.startTransaction', tr)
  tr.doneCallback = function () {
    self.applyAsync(function () {
      self._logger.debug('TransactionService transaction finished', tr)

      if (tr.traces.length > 1 && !self.shouldIgnoreTransaction(tr.name)) {
        self.capturePageLoadMetrics(tr)
        self.add(tr)
        self._subscription.applyAll(self, [tr])
      }
    })
  }
  return tr
}

TransactionService.prototype.applyAsync = function (fn, applyThis, applyArgs) {
  return this._zoneService.runOuter(function () {
    return Promise.resolve()
      .then(function () {
        return fn.apply(applyThis, applyArgs)
      })
  })
}

TransactionService.prototype.shouldIgnoreTransaction = function (transaction_name) {
  var ignoreList = this._config.get('ignoreTransactions')

  for (var i = 0; i < ignoreList.length; i++) {
    var element = ignoreList[i]
    if (typeof element.test === 'function') {
      if (element.test(transaction_name)) {
        return true
      }
    } else if (element === transaction_name) {
      return true
    }
  }
  return false
}

TransactionService.prototype.startTrace = function (signature, type, options) {
  var trans = this.getCurrentTransaction()

  if (trans) {
    this._logger.debug('TransactionService.startTrace', signature, type)
    var trace = trans.startTrace(signature, type, options)
    return trace
  }
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
  var tr = this.getCurrentTransaction()
  if (tr) {
    if (typeof taskId === 'undefined') {
      taskId = 'autoId' + this.nextAutoTaskId++
    }
    tr.addTask(taskId)
    this._logger.debug('TransactionService.addTask', taskId)
  }
  return taskId
}
TransactionService.prototype.removeTask = function (taskId) {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.removeTask(taskId)
    this._logger.debug('TransactionService.removeTask', taskId)
  }
}
TransactionService.prototype.logInTransaction = function () {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.debugLog.apply(tr, arguments)
  }
}
TransactionService.prototype.setDebugDataOnTransaction = function setDebugDataOnTransaction (key, value) {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.setDebugData(key, value)
  }
}

TransactionService.prototype.detectFinish = function () {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.detectFinish()
    this._logger.debug('TransactionService.detectFinish')
  }
}

TransactionService.prototype.scheduleTransactionSend = function () {
  var logger = this._logger
  var opbeatBackend = this._opbeatBackend
  var self = this

  setInterval(function () {
    var transactions = self.getTransactions()
    if (transactions.length === 0) {
      return
    }
    logger.debug('Sending Transactions to opbeat.', transactions.length)
    // todo: if transactions are already being sent, should check
    var promise = opbeatBackend.sendTransactions(transactions)
    if (promise) {
      promise.then(undefined, function () {
        logger.debug('Failed sending transactions!')
      })
    }
    self.clearTransactions()
  }, 5000)
}

module.exports = TransactionService

},{"../common/subscription":9,"../lib/utils":16,"./captureHardNavigation":17,"./transaction":20}],22:[function(_dereq_,module,exports){
var Subscription = _dereq_('../common/subscription')
var patchUtils = _dereq_('../common/patchUtils')
var opbeatTaskSymbol = patchUtils.opbeatSymbol('taskData')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')

var XMLHttpRequest_send = 'XMLHttpRequest.send'

var opbeatDataSymbol = patchUtils.opbeatSymbol('opbeatData')

var testTransactionAfterEvents = ['click', 'contextmenu', 'dblclick', 'mousedown', 'keydown', 'keypress', 'keyup'] // leave these out for now: 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover',
var testTransactionAfterEventsObj = {}
testTransactionAfterEvents.forEach(function (ev) {
  testTransactionAfterEventsObj[ev] = 1
})

function ZoneService (logger, config) {
  this.events = new Subscription()

  var nextId = 0

  // var zoneService = this
  function noop () { }
  var spec = this.spec = {
    onScheduleTask: noop,
    onBeforeInvokeTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop,
    onHandleError: noop,
    onInvokeStart: noop,
    onInvokeEnd: noop
  }

  this.zoneConfig = {
    name: 'opbeatRootZone',
    onScheduleTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      if (task.type === 'eventTask' && task.data.eventName === 'opbeatImmediatelyFiringEvent') {
        task.data.handler(task.data)
        return task
      }

      var hasTarget = task.data && task.data.target
      if (hasTarget && typeof task.data.target[opbeatDataSymbol] === 'undefined') {
        task.data.target[opbeatDataSymbol] = {registeredEventListeners: {}}
      }

      logger.trace('zoneservice.onScheduleTask', task.source, ' type:', task.type)
      if (task.type === 'macroTask') {
        logger.trace('Zone: ', targetZone.name)
        var taskId = nextId++
        var opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: task.type
        }

        if (task.source === 'setTimeout') {
          if (task.data.args[1] === 0 || typeof task.data.args[1] === 'undefined') {
            task[opbeatTaskSymbol] = opbeatTask
            spec.onScheduleTask(opbeatTask)
          }
        } else if (task.source === XMLHttpRequest_send) {
          /*
                  "XMLHttpRequest.addEventListener:load"
                  "XMLHttpRequest.addEventListener:error"
                  "XMLHttpRequest.addEventListener:abort"
                  "XMLHttpRequest.send"
                  "XMLHttpRequest.addEventListener:readystatechange"
          */

          opbeatTask['XHR'] = {
            resolved: false,
            'send': false,
            url: task.data.target[urlSympbol],
            method: task.data.target[methodSymbol]
          }

          // target for event tasks is different instance from the XMLHttpRequest, on mobile browsers
          // A hack to get the correct target for event tasks
          task.data.target.addEventListener('opbeatImmediatelyFiringEvent', function (event) {
            if (typeof event.target[opbeatDataSymbol] !== 'undefined') {
              task.data.target[opbeatDataSymbol] = event.target[opbeatDataSymbol]
            } else {
              task.data.target[opbeatDataSymbol] = event.target[opbeatDataSymbol] = {registeredEventListeners: {}}
            }
          })

          task.data.target[opbeatDataSymbol].task = opbeatTask
          task.data.target[opbeatDataSymbol].typeName = 'XMLHttpRequest'

          spec.onScheduleTask(opbeatTask)
        }
      } else if (task.type === 'eventTask' && hasTarget && (task.data.eventName === 'readystatechange' || task.data.eventName === 'load')) {
        task.data.target[opbeatDataSymbol].registeredEventListeners[task.data.eventName] = {resolved: false}
      } else if (task.type === 'microTask' && task.source === 'Promise.then') {
        taskId = nextId++
        opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: task.type
        }

        task[opbeatTaskSymbol] = opbeatTask
        spec.onScheduleTask(opbeatTask)
      }

      var delegateTask = parentZoneDelegate.scheduleTask(targetZone, task)
      return delegateTask
    },
    onInvoke: function (parentZoneDelegate, currentZone, targetZone, delegate, applyThis, applyArgs, source) {
      var taskId = nextId++
      var opbeatTask = {
        taskId: source + taskId,
        source: source,
        type: 'invoke'
      }
      spec.onInvokeStart(opbeatTask)
      var result = delegate.apply(applyThis, applyArgs)
      spec.onInvokeEnd(opbeatTask)
      return result
    },
    onInvokeTask: function (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) {
      spec.onInvokeStart({source: task.source, type: task.type})
      logger.trace('zoneservice.onInvokeTask', task.source, ' type:', task.type)
      var hasTarget = task.data && task.data.target
      var result

      if (hasTarget && task.data.target[opbeatDataSymbol].typeName === 'XMLHttpRequest') {
        var opbeatData = task.data.target[opbeatDataSymbol]
        logger.trace('opbeatData', opbeatData)
        var opbeatTask = opbeatData.task

        if (opbeatTask && task.data.eventName === 'readystatechange' && task.data.target.readyState === task.data.target.DONE) {
          opbeatData.registeredEventListeners['readystatechange'].resolved = true
          spec.onBeforeInvokeTask(opbeatTask)
        } else if (opbeatTask && task.data.eventName === 'load' && 'load' in opbeatData.registeredEventListeners) {
          opbeatData.registeredEventListeners.load.resolved = true
        } else if (opbeatTask && task.source === XMLHttpRequest_send) {
          opbeatTask.XHR.resolved = true
        }

        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        if (opbeatTask && (!opbeatData.registeredEventListeners['load'] || opbeatData.registeredEventListeners['load'].resolved) && (!opbeatData.registeredEventListeners['readystatechange'] || opbeatData.registeredEventListeners['readystatechange'].resolved) && opbeatTask.XHR.resolved) {
          spec.onInvokeTask(opbeatTask)
        }
      } else if (task[opbeatTaskSymbol] && (task.source === 'setTimeout' || task.source === 'Promise.then')) {
        spec.onBeforeInvokeTask(task[opbeatTaskSymbol])
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(task[opbeatTaskSymbol])
      } else if (task.type === 'eventTask' && hasTarget && task.data.eventName in testTransactionAfterEventsObj) {
        var taskId = nextId++
        opbeatTask = {
          taskId: task.source + taskId,
          source: task.source,
          type: 'interaction',
          applyArgs: applyArgs
        }

        spec.onScheduleTask(opbeatTask)

        // clear traces on the zone transaction
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(opbeatTask)
      } else {
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
      }
      spec.onInvokeEnd({source: task.source, type: task.type})
      return result
    },
    onCancelTask: function (parentZoneDelegate, currentZone, targetZone, task) {
      // logger.trace('Zone: ', targetZone.name)
      var opbeatTask
      if (task.type === 'macroTask') {
        if (task.source === XMLHttpRequest_send) {
          opbeatTask = task.data.target[opbeatDataSymbol].task
          spec.onCancelTask(opbeatTask)
        } else if (task[opbeatTaskSymbol] && (task.source === 'setTimeout')) {
          opbeatTask = task[opbeatTaskSymbol]
          spec.onCancelTask(opbeatTask)
        }
      }
      return parentZoneDelegate.cancelTask(targetZone, task)
    }
  // onHandleError: function (parentZoneDelegate, currentZone, targetZone, error) {
  //   spec.onHandleError(error)
  //   parentZoneDelegate.handleError(targetZone, error)
  // }
  }

  // if (config.get('debug') === true) {
  //   zoneConfig.properties = {opbeatZoneData: {name: 'opbeatRootZone', children: []}}
  //   zoneConfig.onFork = function (parentZoneDelegate, currentZone, targetZone, zoneSpec) {
  //     var childZone = parentZoneDelegate.fork(targetZone, zoneSpec)
  //     console.log('onFork: ', arguments)
  //     console.log('onFork: ', childZone)

  //     var childZoneData = {name: childZone.name}

//     if (targetZone._properties['opbeatZoneData']) {
//       targetZone._properties['opbeatZoneData'].children.push(childZoneData)
//     } else {
//       targetZone._properties['opbeatZoneData'] = {
//         name: targetZone.name,
//         children: [childZoneData]
//       }
//     }
//     console.log('onFork:opbeatZoneData:', targetZone._properties['opbeatZoneData'])
//     return childZone
//   }
// }
}

ZoneService.prototype.initialize = function (zone) {
  this.outer = zone
  this.zone = zone.fork(this.zoneConfig)
}

ZoneService.prototype.set = function (key, value) {
  window.Zone.current._properties[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.Zone.current.get(key)
}

ZoneService.prototype.getFromOpbeatZone = function (key) {
  return this.zone.get(key)
}
ZoneService.prototype.setOnOpbeatZone = function (key, value) {
  this.zone._properties[key] = value
}

ZoneService.prototype.getCurrentZone = function () {
  return window.Zone.current
}

ZoneService.prototype.isOpbeatZone = function () {
  return this.zone.name === window.Zone.current.name
}

ZoneService.prototype.runOuter = function (fn, applyThis, applyArgs) {
  if (this.outer) {
    return this.outer.run(fn, applyThis, applyArgs)
  } else {
    return fn.apply(applyThis, applyArgs)
  }
}

ZoneService.prototype.runInOpbeatZone = function runInOpbeatZone (fn, applyThis, applyArgs, source) {
  return this.zone.run(fn, applyThis, applyArgs, source || 'runInOpbeatZone:' + fn.name)
}

module.exports = ZoneService

},{"../common/patchUtils":6,"../common/subscription":9}],23:[function(_dereq_,module,exports){
(function (global,define){
/**
* @license
* Copyright Google Inc. All Rights Reserved.
*
* Use of this source code is governed by an MIT-style license that can be
* found in the LICENSE file at https://angular.io/license
*/
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (factory());
}(this, (function () { 'use strict';

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var Zone$1 = (function (global) {
    var performance = global['performance'];
    function mark(name) {
        performance && performance['mark'] && performance['mark'](name);
    }
    function performanceMeasure(name, label) {
        performance && performance['measure'] && performance['measure'](name, label);
    }
    mark('Zone');
    if (global['Zone']) {
        throw new Error('Zone already loaded.');
    }
    var Zone = (function () {
        function Zone(parent, zoneSpec) {
            this._properties = null;
            this._parent = parent;
            this._name = zoneSpec ? zoneSpec.name || 'unnamed' : '<root>';
            this._properties = zoneSpec && zoneSpec.properties || {};
            this._zoneDelegate =
                new ZoneDelegate(this, this._parent && this._parent._zoneDelegate, zoneSpec);
        }
        Zone.assertZonePatched = function () {
            if (global['Promise'] !== patches['ZoneAwarePromise']) {
                throw new Error('Zone.js has detected that ZoneAwarePromise `(window|global).Promise` ' +
                    'has been overwritten.\n' +
                    'Most likely cause is that a Promise polyfill has been loaded ' +
                    'after Zone.js (Polyfilling Promise api is not necessary when zone.js is loaded. ' +
                    'If you must load one, do so before loading zone.js.)');
            }
        };
        Object.defineProperty(Zone, "root", {
            get: function () {
                var zone = Zone.current;
                while (zone.parent) {
                    zone = zone.parent;
                }
                return zone;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Zone, "current", {
            get: function () {
                return _currentZoneFrame.zone;
            },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(Zone, "currentTask", {
            get: function () {
                return _currentTask;
            },
            enumerable: true,
            configurable: true
        });
        
        Zone.__load_patch = function (name, fn) {
            if (patches.hasOwnProperty(name)) {
                throw Error('Already loaded patch: ' + name);
            }
            else if (!global['__Zone_disable_' + name]) {
                var perfName = 'Zone:' + name;
                mark(perfName);
                patches[name] = fn(global, Zone, _api);
                performanceMeasure(perfName, perfName);
            }
        };
        Object.defineProperty(Zone.prototype, "parent", {
            get: function () {
                return this._parent;
            },
            enumerable: true,
            configurable: true
        });
        
        Object.defineProperty(Zone.prototype, "name", {
            get: function () {
                return this._name;
            },
            enumerable: true,
            configurable: true
        });
        
        Zone.prototype.get = function (key) {
            var zone = this.getZoneWith(key);
            if (zone)
                return zone._properties[key];
        };
        Zone.prototype.getZoneWith = function (key) {
            var current = this;
            while (current) {
                if (current._properties.hasOwnProperty(key)) {
                    return current;
                }
                current = current._parent;
            }
            return null;
        };
        Zone.prototype.fork = function (zoneSpec) {
            if (!zoneSpec)
                throw new Error('ZoneSpec required!');
            return this._zoneDelegate.fork(this, zoneSpec);
        };
        Zone.prototype.wrap = function (callback, source) {
            if (typeof callback !== 'function') {
                throw new Error('Expecting function got: ' + callback);
            }
            var _callback = this._zoneDelegate.intercept(this, callback, source);
            var zone = this;
            return function () {
                return zone.runGuarded(_callback, this, arguments, source);
            };
        };
        Zone.prototype.run = function (callback, applyThis, applyArgs, source) {
            if (applyThis === void 0) { applyThis = undefined; }
            if (applyArgs === void 0) { applyArgs = null; }
            if (source === void 0) { source = null; }
            _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
            try {
                return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
            }
            finally {
                _currentZoneFrame = _currentZoneFrame.parent;
            }
        };
        Zone.prototype.runGuarded = function (callback, applyThis, applyArgs, source) {
            if (applyThis === void 0) { applyThis = null; }
            if (applyArgs === void 0) { applyArgs = null; }
            if (source === void 0) { source = null; }
            _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
            try {
                try {
                    return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
                }
                catch (error) {
                    if (this._zoneDelegate.handleError(this, error)) {
                        throw error;
                    }
                }
            }
            finally {
                _currentZoneFrame = _currentZoneFrame.parent;
            }
        };
        Zone.prototype.runTask = function (task, applyThis, applyArgs) {
            if (task.zone != this) {
                throw new Error('A task can only be run in the zone of creation! (Creation: ' +
                    (task.zone || NO_ZONE).name + '; Execution: ' + this.name + ')');
            }
            // https://github.com/angular/zone.js/issues/778, sometimes eventTask
            // will run in notScheduled(canceled) state, we should not try to
            // run such kind of task but just return
            // we have to define an variable here, if not
            // typescript compiler will complain below
            var isNotScheduled = task.state === notScheduled;
            if (isNotScheduled && task.type === eventTask) {
                return;
            }
            var reEntryGuard = task.state != running;
            reEntryGuard && task._transitionTo(running, scheduled);
            task.runCount++;
            var previousTask = _currentTask;
            _currentTask = task;
            _currentZoneFrame = { parent: _currentZoneFrame, zone: this };
            try {
                if (task.type == macroTask && task.data && !task.data.isPeriodic) {
                    task.cancelFn = null;
                }
                try {
                    return this._zoneDelegate.invokeTask(this, task, applyThis, applyArgs);
                }
                catch (error) {
                    if (this._zoneDelegate.handleError(this, error)) {
                        throw error;
                    }
                }
            }
            finally {
                // if the task's state is notScheduled or unknown, then it has already been cancelled
                // we should not reset the state to scheduled
                if (task.state !== notScheduled && task.state !== unknown) {
                    if (task.type == eventTask || (task.data && task.data.isPeriodic)) {
                        reEntryGuard && task._transitionTo(scheduled, running);
                    }
                    else {
                        task.runCount = 0;
                        this._updateTaskCount(task, -1);
                        reEntryGuard &&
                            task._transitionTo(notScheduled, running, notScheduled);
                    }
                }
                _currentZoneFrame = _currentZoneFrame.parent;
                _currentTask = previousTask;
            }
        };
        Zone.prototype.scheduleTask = function (task) {
            if (task.zone && task.zone !== this) {
                // check if the task was rescheduled, the newZone
                // should not be the children of the original zone
                var newZone = this;
                while (newZone) {
                    if (newZone === task.zone) {
                        throw Error("can not reschedule task to " + this
                            .name + " which is descendants of the original zone " + task.zone.name);
                    }
                    newZone = newZone.parent;
                }
            }
            task._transitionTo(scheduling, notScheduled);
            var zoneDelegates = [];
            task._zoneDelegates = zoneDelegates;
            task._zone = this;
            try {
                task = this._zoneDelegate.scheduleTask(this, task);
            }
            catch (err) {
                // should set task's state to unknown when scheduleTask throw error
                // because the err may from reschedule, so the fromState maybe notScheduled
                task._transitionTo(unknown, scheduling, notScheduled);
                // TODO: @JiaLiPassion, should we check the result from handleError?
                this._zoneDelegate.handleError(this, err);
                throw err;
            }
            if (task._zoneDelegates === zoneDelegates) {
                // we have to check because internally the delegate can reschedule the task.
                this._updateTaskCount(task, 1);
            }
            if (task.state == scheduling) {
                task._transitionTo(scheduled, scheduling);
            }
            return task;
        };
        Zone.prototype.scheduleMicroTask = function (source, callback, data, customSchedule) {
            return this.scheduleTask(new ZoneTask(microTask, source, callback, data, customSchedule, null));
        };
        Zone.prototype.scheduleMacroTask = function (source, callback, data, customSchedule, customCancel) {
            return this.scheduleTask(new ZoneTask(macroTask, source, callback, data, customSchedule, customCancel));
        };
        Zone.prototype.scheduleEventTask = function (source, callback, data, customSchedule, customCancel) {
            return this.scheduleTask(new ZoneTask(eventTask, source, callback, data, customSchedule, customCancel));
        };
        Zone.prototype.cancelTask = function (task) {
            if (task.zone != this)
                throw new Error('A task can only be cancelled in the zone of creation! (Creation: ' +
                    (task.zone || NO_ZONE).name + '; Execution: ' + this.name + ')');
            task._transitionTo(canceling, scheduled, running);
            try {
                this._zoneDelegate.cancelTask(this, task);
            }
            catch (err) {
                // if error occurs when cancelTask, transit the state to unknown
                task._transitionTo(unknown, canceling);
                this._zoneDelegate.handleError(this, err);
                throw err;
            }
            this._updateTaskCount(task, -1);
            task._transitionTo(notScheduled, canceling);
            task.runCount = 0;
            return task;
        };
        Zone.prototype._updateTaskCount = function (task, count) {
            var zoneDelegates = task._zoneDelegates;
            if (count == -1) {
                task._zoneDelegates = null;
            }
            for (var i = 0; i < zoneDelegates.length; i++) {
                zoneDelegates[i]._updateTaskCount(task.type, count);
            }
        };
        return Zone;
    }());
    Zone.__symbol__ = __symbol__;
    var DELEGATE_ZS = {
        name: '',
        onHasTask: function (delegate, _, target, hasTaskState) {
            return delegate.hasTask(target, hasTaskState);
        },
        onScheduleTask: function (delegate, _, target, task) {
            return delegate.scheduleTask(target, task);
        },
        onInvokeTask: function (delegate, _, target, task, applyThis, applyArgs) { return delegate.invokeTask(target, task, applyThis, applyArgs); },
        onCancelTask: function (delegate, _, target, task) {
            return delegate.cancelTask(target, task);
        }
    };
    var ZoneDelegate = (function () {
        function ZoneDelegate(zone, parentDelegate, zoneSpec) {
            this._taskCounts = { 'microTask': 0, 'macroTask': 0, 'eventTask': 0 };
            this.zone = zone;
            this._parentDelegate = parentDelegate;
            this._forkZS = zoneSpec && (zoneSpec && zoneSpec.onFork ? zoneSpec : parentDelegate._forkZS);
            this._forkDlgt = zoneSpec && (zoneSpec.onFork ? parentDelegate : parentDelegate._forkDlgt);
            this._forkCurrZone = zoneSpec && (zoneSpec.onFork ? this.zone : parentDelegate.zone);
            this._interceptZS =
                zoneSpec && (zoneSpec.onIntercept ? zoneSpec : parentDelegate._interceptZS);
            this._interceptDlgt =
                zoneSpec && (zoneSpec.onIntercept ? parentDelegate : parentDelegate._interceptDlgt);
            this._interceptCurrZone =
                zoneSpec && (zoneSpec.onIntercept ? this.zone : parentDelegate.zone);
            this._invokeZS = zoneSpec && (zoneSpec.onInvoke ? zoneSpec : parentDelegate._invokeZS);
            this._invokeDlgt =
                zoneSpec && (zoneSpec.onInvoke ? parentDelegate : parentDelegate._invokeDlgt);
            this._invokeCurrZone = zoneSpec && (zoneSpec.onInvoke ? this.zone : parentDelegate.zone);
            this._handleErrorZS =
                zoneSpec && (zoneSpec.onHandleError ? zoneSpec : parentDelegate._handleErrorZS);
            this._handleErrorDlgt =
                zoneSpec && (zoneSpec.onHandleError ? parentDelegate : parentDelegate._handleErrorDlgt);
            this._handleErrorCurrZone =
                zoneSpec && (zoneSpec.onHandleError ? this.zone : parentDelegate.zone);
            this._scheduleTaskZS =
                zoneSpec && (zoneSpec.onScheduleTask ? zoneSpec : parentDelegate._scheduleTaskZS);
            this._scheduleTaskDlgt =
                zoneSpec && (zoneSpec.onScheduleTask ? parentDelegate : parentDelegate._scheduleTaskDlgt);
            this._scheduleTaskCurrZone =
                zoneSpec && (zoneSpec.onScheduleTask ? this.zone : parentDelegate.zone);
            this._invokeTaskZS =
                zoneSpec && (zoneSpec.onInvokeTask ? zoneSpec : parentDelegate._invokeTaskZS);
            this._invokeTaskDlgt =
                zoneSpec && (zoneSpec.onInvokeTask ? parentDelegate : parentDelegate._invokeTaskDlgt);
            this._invokeTaskCurrZone =
                zoneSpec && (zoneSpec.onInvokeTask ? this.zone : parentDelegate.zone);
            this._cancelTaskZS =
                zoneSpec && (zoneSpec.onCancelTask ? zoneSpec : parentDelegate._cancelTaskZS);
            this._cancelTaskDlgt =
                zoneSpec && (zoneSpec.onCancelTask ? parentDelegate : parentDelegate._cancelTaskDlgt);
            this._cancelTaskCurrZone =
                zoneSpec && (zoneSpec.onCancelTask ? this.zone : parentDelegate.zone);
            this._hasTaskZS = null;
            this._hasTaskDlgt = null;
            this._hasTaskDlgtOwner = null;
            this._hasTaskCurrZone = null;
            var zoneSpecHasTask = zoneSpec && zoneSpec.onHasTask;
            var parentHasTask = parentDelegate && parentDelegate._hasTaskZS;
            if (zoneSpecHasTask || parentHasTask) {
                // If we need to report hasTask, than this ZS needs to do ref counting on tasks. In such
                // a case all task related interceptors must go through this ZD. We can't short circuit it.
                this._hasTaskZS = zoneSpecHasTask ? zoneSpec : DELEGATE_ZS;
                this._hasTaskDlgt = parentDelegate;
                this._hasTaskDlgtOwner = this;
                this._hasTaskCurrZone = zone;
                if (!zoneSpec.onScheduleTask) {
                    this._scheduleTaskZS = DELEGATE_ZS;
                    this._scheduleTaskDlgt = parentDelegate;
                    this._scheduleTaskCurrZone = this.zone;
                }
                if (!zoneSpec.onInvokeTask) {
                    this._invokeTaskZS = DELEGATE_ZS;
                    this._invokeTaskDlgt = parentDelegate;
                    this._invokeTaskCurrZone = this.zone;
                }
                if (!zoneSpec.onCancelTask) {
                    this._cancelTaskZS = DELEGATE_ZS;
                    this._cancelTaskDlgt = parentDelegate;
                    this._cancelTaskCurrZone = this.zone;
                }
            }
        }
        ZoneDelegate.prototype.fork = function (targetZone, zoneSpec) {
            return this._forkZS ? this._forkZS.onFork(this._forkDlgt, this.zone, targetZone, zoneSpec) :
                new Zone(targetZone, zoneSpec);
        };
        ZoneDelegate.prototype.intercept = function (targetZone, callback, source) {
            return this._interceptZS ?
                this._interceptZS.onIntercept(this._interceptDlgt, this._interceptCurrZone, targetZone, callback, source) :
                callback;
        };
        ZoneDelegate.prototype.invoke = function (targetZone, callback, applyThis, applyArgs, source) {
            return this._invokeZS ?
                this._invokeZS.onInvoke(this._invokeDlgt, this._invokeCurrZone, targetZone, callback, applyThis, applyArgs, source) :
                callback.apply(applyThis, applyArgs);
        };
        ZoneDelegate.prototype.handleError = function (targetZone, error) {
            return this._handleErrorZS ?
                this._handleErrorZS.onHandleError(this._handleErrorDlgt, this._handleErrorCurrZone, targetZone, error) :
                true;
        };
        ZoneDelegate.prototype.scheduleTask = function (targetZone, task) {
            var returnTask = task;
            if (this._scheduleTaskZS) {
                if (this._hasTaskZS) {
                    returnTask._zoneDelegates.push(this._hasTaskDlgtOwner);
                }
                returnTask = this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, this._scheduleTaskCurrZone, targetZone, task);
                if (!returnTask)
                    returnTask = task;
            }
            else {
                if (task.scheduleFn) {
                    task.scheduleFn(task);
                }
                else if (task.type == microTask) {
                    scheduleMicroTask(task);
                }
                else {
                    throw new Error('Task is missing scheduleFn.');
                }
            }
            return returnTask;
        };
        ZoneDelegate.prototype.invokeTask = function (targetZone, task, applyThis, applyArgs) {
            return this._invokeTaskZS ?
                this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this._invokeTaskCurrZone, targetZone, task, applyThis, applyArgs) :
                task.callback.apply(applyThis, applyArgs);
        };
        ZoneDelegate.prototype.cancelTask = function (targetZone, task) {
            var value;
            if (this._cancelTaskZS) {
                value = this._cancelTaskZS.onCancelTask(this._cancelTaskDlgt, this._cancelTaskCurrZone, targetZone, task);
            }
            else {
                if (!task.cancelFn) {
                    throw Error('Task is not cancelable');
                }
                value = task.cancelFn(task);
            }
            return value;
        };
        ZoneDelegate.prototype.hasTask = function (targetZone, isEmpty) {
            // hasTask should not throw error so other ZoneDelegate
            // can still trigger hasTask callback
            try {
                return this._hasTaskZS &&
                    this._hasTaskZS.onHasTask(this._hasTaskDlgt, this._hasTaskCurrZone, targetZone, isEmpty);
            }
            catch (err) {
                this.handleError(targetZone, err);
            }
        };
        ZoneDelegate.prototype._updateTaskCount = function (type, count) {
            var counts = this._taskCounts;
            var prev = counts[type];
            var next = counts[type] = prev + count;
            if (next < 0) {
                return; // throw new Error('More tasks executed then were scheduled.');
            }
            if (prev == 0 || next == 0) {
                var isEmpty = {
                    microTask: counts.microTask > 0,
                    macroTask: counts.macroTask > 0,
                    eventTask: counts.eventTask > 0,
                    change: type
                };
                this.hasTask(this.zone, isEmpty);
            }
        };
        return ZoneDelegate;
    }());
    var ZoneTask = (function () {
        function ZoneTask(type, source, callback, options, scheduleFn, cancelFn) {
            this._zone = null;
            this.runCount = 0;
            this._zoneDelegates = null;
            this._state = 'notScheduled';
            this.type = type;
            this.source = source;
            this.data = options;
            this.scheduleFn = scheduleFn;
            this.cancelFn = cancelFn;
            this.callback = callback;
            var self = this;
            this.invoke = function () {
                _numberOfNestedTaskFrames++;
                try {
                    self.runCount++;
                    return self.zone.runTask(self, this, arguments);
                }
                finally {
                    if (_numberOfNestedTaskFrames == 1) {
                        drainMicroTaskQueue();
                    }
                    _numberOfNestedTaskFrames--;
                }
            };
        }
        Object.defineProperty(ZoneTask.prototype, "zone", {
            get: function () {
                return this._zone;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ZoneTask.prototype, "state", {
            get: function () {
                return this._state;
            },
            enumerable: true,
            configurable: true
        });
        ZoneTask.prototype.cancelScheduleRequest = function () {
            this._transitionTo(notScheduled, scheduling);
        };
        ZoneTask.prototype._transitionTo = function (toState, fromState1, fromState2) {
            if (this._state === fromState1 || this._state === fromState2) {
                this._state = toState;
                if (toState == notScheduled) {
                    this._zoneDelegates = null;
                }
            }
            else {
                throw new Error(this.type + " '" + this.source + "': can not transition to '" + toState + "', expecting state '" + fromState1 + "'" + (fromState2 ?
                    ' or \'' + fromState2 + '\'' :
                    '') + ", was '" + this._state + "'.");
            }
        };
        ZoneTask.prototype.toString = function () {
            if (this.data && typeof this.data.handleId !== 'undefined') {
                return this.data.handleId;
            }
            else {
                return Object.prototype.toString.call(this);
            }
        };
        // add toJSON method to prevent cyclic error when
        // call JSON.stringify(zoneTask)
        ZoneTask.prototype.toJSON = function () {
            return {
                type: this.type,
                state: this.state,
                source: this.source,
                zone: this.zone.name,
                invoke: this.invoke,
                scheduleFn: this.scheduleFn,
                cancelFn: this.cancelFn,
                runCount: this.runCount,
                callback: this.callback
            };
        };
        return ZoneTask;
    }());
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    ///  MICROTASK QUEUE
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    var symbolSetTimeout = __symbol__('setTimeout');
    var symbolPromise = __symbol__('Promise');
    var symbolThen = __symbol__('then');
    var _microTaskQueue = [];
    var _isDrainingMicrotaskQueue = false;
    function scheduleMicroTask(task) {
        // if we are not running in any task, and there has not been anything scheduled
        // we must bootstrap the initial task creation by manually scheduling the drain
        if (_numberOfNestedTaskFrames === 0 && _microTaskQueue.length === 0) {
            // We are not running in Task, so we need to kickstart the microtask queue.
            if (global[symbolPromise]) {
                global[symbolPromise].resolve(0)[symbolThen](drainMicroTaskQueue);
            }
            else {
                global[symbolSetTimeout](drainMicroTaskQueue, 0);
            }
        }
        task && _microTaskQueue.push(task);
    }
    function drainMicroTaskQueue() {
        if (!_isDrainingMicrotaskQueue) {
            _isDrainingMicrotaskQueue = true;
            while (_microTaskQueue.length) {
                var queue = _microTaskQueue;
                _microTaskQueue = [];
                for (var i = 0; i < queue.length; i++) {
                    var task = queue[i];
                    try {
                        task.zone.runTask(task, null, null);
                    }
                    catch (error) {
                        _api.onUnhandledError(error);
                    }
                }
            }
            var showError = !Zone[__symbol__('ignoreConsoleErrorUncaughtError')];
            _api.microtaskDrainDone();
            _isDrainingMicrotaskQueue = false;
        }
    }
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    ///  BOOTSTRAP
    //////////////////////////////////////////////////////
    //////////////////////////////////////////////////////
    var NO_ZONE = { name: 'NO ZONE' };
    var notScheduled = 'notScheduled', scheduling = 'scheduling', scheduled = 'scheduled', running = 'running', canceling = 'canceling', unknown = 'unknown';
    var microTask = 'microTask', macroTask = 'macroTask', eventTask = 'eventTask';
    var patches = {};
    var _api = {
        symbol: __symbol__,
        currentZoneFrame: function () { return _currentZoneFrame; },
        onUnhandledError: noop,
        microtaskDrainDone: noop,
        scheduleMicroTask: scheduleMicroTask,
        showUncaughtError: function () { return !Zone[__symbol__('ignoreConsoleErrorUncaughtError')]; },
        patchEventTargetMethods: function () { return false; },
        patchOnProperties: noop,
        patchMethod: function () { return noop; }
    };
    var symbolRootZoneSpec = '__rootZoneSpec__';
    var rootZone = new Zone(null, null);
    if (global[symbolRootZoneSpec]) {
        rootZone = rootZone.fork(global[symbolRootZoneSpec]);
        delete global[symbolRootZoneSpec];
    }
    var _currentZoneFrame = { parent: null, zone: rootZone };
    var _currentTask = null;
    var _numberOfNestedTaskFrames = 0;
    function noop() { }
    function __symbol__(name) {
        return '__zone_symbol__' + name;
    }
    performanceMeasure('Zone', 'Zone');
    return global['Zone'] = Zone;
})(typeof window !== 'undefined' && window || typeof self !== 'undefined' && self || global);

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('ZoneAwarePromise', function (global, Zone, api) {
    var __symbol__ = api.symbol;
    var _uncaughtPromiseErrors = [];
    var symbolPromise = __symbol__('Promise');
    var symbolThen = __symbol__('then');
    api.onUnhandledError = function (e) {
        if (api.showUncaughtError()) {
            var rejection = e && e.rejection;
            if (rejection) {
                console.error('Unhandled Promise rejection:', rejection instanceof Error ? rejection.message : rejection, '; Zone:', e.zone.name, '; Task:', e.task && e.task.source, '; Value:', rejection, rejection instanceof Error ? rejection.stack : undefined);
            }
            else {
                console.error(e);
            }
        }
    };
    api.microtaskDrainDone = function () {
        while (_uncaughtPromiseErrors.length) {
            var _loop_1 = function () {
                var uncaughtPromiseError = _uncaughtPromiseErrors.shift();
                try {
                    uncaughtPromiseError.zone.runGuarded(function () {
                        throw uncaughtPromiseError;
                    });
                }
                catch (error) {
                    handleUnhandledRejection(error);
                }
            };
            while (_uncaughtPromiseErrors.length) {
                _loop_1();
            }
        }
    };
    function handleUnhandledRejection(e) {
        api.onUnhandledError(e);
        try {
            var handler = Zone[__symbol__('unhandledPromiseRejectionHandler')];
            if (handler && typeof handler === 'function') {
                handler.apply(this, [e]);
            }
        }
        catch (err) {
        }
    }
    function isThenable(value) {
        return value && value.then;
    }
    function forwardResolution(value) {
        return value;
    }
    function forwardRejection(rejection) {
        return ZoneAwarePromise.reject(rejection);
    }
    var symbolState = __symbol__('state');
    var symbolValue = __symbol__('value');
    var source = 'Promise.then';
    var UNRESOLVED = null;
    var RESOLVED = true;
    var REJECTED = false;
    var REJECTED_NO_CATCH = 0;
    function makeResolver(promise, state) {
        return function (v) {
            try {
                resolvePromise(promise, state, v);
            }
            catch (err) {
                resolvePromise(promise, false, err);
            }
            // Do not return value or you will break the Promise spec.
        };
    }
    var once = function () {
        var wasCalled = false;
        return function wrapper(wrappedFunction) {
            return function () {
                if (wasCalled) {
                    return;
                }
                wasCalled = true;
                wrappedFunction.apply(null, arguments);
            };
        };
    };
    // Promise Resolution
    function resolvePromise(promise, state, value) {
        var onceWrapper = once();
        if (promise === value) {
            throw new TypeError('Promise resolved with itself');
        }
        if (promise[symbolState] === UNRESOLVED) {
            // should only get value.then once based on promise spec.
            var then = null;
            try {
                if (typeof value === 'object' || typeof value === 'function') {
                    then = value && value.then;
                }
            }
            catch (err) {
                onceWrapper(function () {
                    resolvePromise(promise, false, err);
                })();
                return promise;
            }
            // if (value instanceof ZoneAwarePromise) {
            if (state !== REJECTED && value instanceof ZoneAwarePromise &&
                value.hasOwnProperty(symbolState) && value.hasOwnProperty(symbolValue) &&
                value[symbolState] !== UNRESOLVED) {
                clearRejectedNoCatch(value);
                resolvePromise(promise, value[symbolState], value[symbolValue]);
            }
            else if (state !== REJECTED && typeof then === 'function') {
                try {
                    then.apply(value, [
                        onceWrapper(makeResolver(promise, state)), onceWrapper(makeResolver(promise, false))
                    ]);
                }
                catch (err) {
                    onceWrapper(function () {
                        resolvePromise(promise, false, err);
                    })();
                }
            }
            else {
                promise[symbolState] = state;
                var queue = promise[symbolValue];
                promise[symbolValue] = value;
                // record task information in value when error occurs, so we can
                // do some additional work such as render longStackTrace
                if (state === REJECTED && value instanceof Error) {
                    value[__symbol__('currentTask')] = Zone.currentTask;
                }
                for (var i = 0; i < queue.length;) {
                    scheduleResolveOrReject(promise, queue[i++], queue[i++], queue[i++], queue[i++]);
                }
                if (queue.length == 0 && state == REJECTED) {
                    promise[symbolState] = REJECTED_NO_CATCH;
                    try {
                        throw new Error('Uncaught (in promise): ' + value +
                            (value && value.stack ? '\n' + value.stack : ''));
                    }
                    catch (err) {
                        var error_1 = err;
                        error_1.rejection = value;
                        error_1.promise = promise;
                        error_1.zone = Zone.current;
                        error_1.task = Zone.currentTask;
                        _uncaughtPromiseErrors.push(error_1);
                        api.scheduleMicroTask(); // to make sure that it is running
                    }
                }
            }
        }
        // Resolving an already resolved promise is a noop.
        return promise;
    }
    function clearRejectedNoCatch(promise) {
        if (promise[symbolState] === REJECTED_NO_CATCH) {
            // if the promise is rejected no catch status
            // and queue.length > 0, means there is a error handler
            // here to handle the rejected promise, we should trigger
            // windows.rejectionhandled eventHandler or nodejs rejectionHandled
            // eventHandler
            try {
                var handler = Zone[__symbol__('rejectionHandledHandler')];
                if (handler && typeof handler === 'function') {
                    handler.apply(this, [{ rejection: promise[symbolValue], promise: promise }]);
                }
            }
            catch (err) {
            }
            promise[symbolState] = REJECTED;
            for (var i = 0; i < _uncaughtPromiseErrors.length; i++) {
                if (promise === _uncaughtPromiseErrors[i].promise) {
                    _uncaughtPromiseErrors.splice(i, 1);
                }
            }
        }
    }
    function scheduleResolveOrReject(promise, zone, chainPromise, onFulfilled, onRejected) {
        clearRejectedNoCatch(promise);
        var delegate = promise[symbolState] ?
            (typeof onFulfilled === 'function') ? onFulfilled : forwardResolution :
            (typeof onRejected === 'function') ? onRejected : forwardRejection;
        zone.scheduleMicroTask(source, function () {
            try {
                resolvePromise(chainPromise, true, zone.run(delegate, undefined, [promise[symbolValue]]));
            }
            catch (error) {
                resolvePromise(chainPromise, false, error);
            }
        });
    }
    var ZoneAwarePromise = (function () {
        function ZoneAwarePromise(executor) {
            var promise = this;
            if (!(promise instanceof ZoneAwarePromise)) {
                throw new Error('Must be an instanceof Promise.');
            }
            promise[symbolState] = UNRESOLVED;
            promise[symbolValue] = []; // queue;
            try {
                executor && executor(makeResolver(promise, RESOLVED), makeResolver(promise, REJECTED));
            }
            catch (error) {
                resolvePromise(promise, false, error);
            }
        }
        ZoneAwarePromise.toString = function () {
            return 'function ZoneAwarePromise() { [native code] }';
        };
        ZoneAwarePromise.resolve = function (value) {
            return resolvePromise(new this(null), RESOLVED, value);
        };
        ZoneAwarePromise.reject = function (error) {
            return resolvePromise(new this(null), REJECTED, error);
        };
        ZoneAwarePromise.race = function (values) {
            var resolve;
            var reject;
            var promise = new this(function (res, rej) {
                _a = [res, rej], resolve = _a[0], reject = _a[1];
                var _a;
            });
            function onResolve(value) {
                promise && (promise = null || resolve(value));
            }
            function onReject(error) {
                promise && (promise = null || reject(error));
            }
            for (var _i = 0, values_1 = values; _i < values_1.length; _i++) {
                var value = values_1[_i];
                if (!isThenable(value)) {
                    value = this.resolve(value);
                }
                value.then(onResolve, onReject);
            }
            return promise;
        };
        ZoneAwarePromise.all = function (values) {
            var resolve;
            var reject;
            var promise = new this(function (res, rej) {
                resolve = res;
                reject = rej;
            });
            var count = 0;
            var resolvedValues = [];
            for (var _i = 0, values_2 = values; _i < values_2.length; _i++) {
                var value = values_2[_i];
                if (!isThenable(value)) {
                    value = this.resolve(value);
                }
                value.then((function (index) { return function (value) {
                    resolvedValues[index] = value;
                    count--;
                    if (!count) {
                        resolve(resolvedValues);
                    }
                }; })(count), reject);
                count++;
            }
            if (!count)
                resolve(resolvedValues);
            return promise;
        };
        ZoneAwarePromise.prototype.then = function (onFulfilled, onRejected) {
            var chainPromise = new this.constructor(null);
            var zone = Zone.current;
            if (this[symbolState] == UNRESOLVED) {
                this[symbolValue].push(zone, chainPromise, onFulfilled, onRejected);
            }
            else {
                scheduleResolveOrReject(this, zone, chainPromise, onFulfilled, onRejected);
            }
            return chainPromise;
        };
        ZoneAwarePromise.prototype.catch = function (onRejected) {
            return this.then(null, onRejected);
        };
        return ZoneAwarePromise;
    }());
    // Protect against aggressive optimizers dropping seemingly unused properties.
    // E.g. Closure Compiler in advanced mode.
    ZoneAwarePromise['resolve'] = ZoneAwarePromise.resolve;
    ZoneAwarePromise['reject'] = ZoneAwarePromise.reject;
    ZoneAwarePromise['race'] = ZoneAwarePromise.race;
    ZoneAwarePromise['all'] = ZoneAwarePromise.all;
    var NativePromise = global[symbolPromise] = global['Promise'];
    global['Promise'] = ZoneAwarePromise;
    var symbolThenPatched = __symbol__('thenPatched');
    function patchThen(Ctor) {
        var proto = Ctor.prototype;
        var originalThen = proto.then;
        // Keep a reference to the original method.
        proto[symbolThen] = originalThen;
        Ctor.prototype.then = function (onResolve, onReject) {
            var _this = this;
            var wrapped = new ZoneAwarePromise(function (resolve, reject) {
                originalThen.call(_this, resolve, reject);
            });
            return wrapped.then(onResolve, onReject);
        };
        Ctor[symbolThenPatched] = true;
    }
    function zoneify(fn) {
        return function () {
            var resultPromise = fn.apply(this, arguments);
            if (resultPromise instanceof ZoneAwarePromise) {
                return resultPromise;
            }
            var ctor = resultPromise.constructor;
            if (!ctor[symbolThenPatched]) {
                patchThen(ctor);
            }
            return resultPromise;
        };
    }
    if (NativePromise) {
        patchThen(NativePromise);
        var fetch_1 = global['fetch'];
        if (typeof fetch_1 == 'function') {
            global['fetch'] = zoneify(fetch_1);
        }
    }
    // This is not part of public API, but it is useful for tests, so we expose it.
    Promise[Zone.__symbol__('uncaughtPromiseErrors')] = _uncaughtPromiseErrors;
    return ZoneAwarePromise;
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/**
 * Suppress closure compiler errors about unknown 'Zone' variable
 * @fileoverview
 * @suppress {undefinedVars,globalThis}
 */
var zoneSymbol = function (n) { return "__zone_symbol__" + n; };
var _global = typeof window === 'object' && window || typeof self === 'object' && self || global;
function bindArguments(args, source) {
    for (var i = args.length - 1; i >= 0; i--) {
        if (typeof args[i] === 'function') {
            args[i] = Zone.current.wrap(args[i], source + '_' + i);
        }
    }
    return args;
}
function patchPrototype(prototype, fnNames) {
    var source = prototype.constructor['name'];
    var _loop_1 = function (i) {
        var name_1 = fnNames[i];
        var delegate = prototype[name_1];
        if (delegate) {
            prototype[name_1] = (function (delegate) {
                var patched = function () {
                    return delegate.apply(this, bindArguments(arguments, source + '.' + name_1));
                };
                attachOriginToPatched(patched, delegate);
                return patched;
            })(delegate);
        }
    };
    for (var i = 0; i < fnNames.length; i++) {
        _loop_1(i);
    }
}
var isWebWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
// Make sure to access `process` through `_global` so that WebPack does not accidently browserify
// this code.
var isNode = (!('nw' in _global) && typeof _global.process !== 'undefined' &&
    {}.toString.call(_global.process) === '[object process]');
var isBrowser = !isNode && !isWebWorker && !!(typeof window !== 'undefined' && window['HTMLElement']);
// we are in electron of nw, so we are both browser and nodejs
// Make sure to access `process` through `_global` so that WebPack does not accidently browserify
// this code.
var isMix = typeof _global.process !== 'undefined' &&
    {}.toString.call(_global.process) === '[object process]' && !isWebWorker &&
    !!(typeof window !== 'undefined' && window['HTMLElement']);
function patchProperty(obj, prop, prototype) {
    var desc = Object.getOwnPropertyDescriptor(obj, prop);
    if (!desc && prototype) {
        // when patch window object, use prototype to check prop exist or not
        var prototypeDesc = Object.getOwnPropertyDescriptor(prototype, prop);
        if (prototypeDesc) {
            desc = { enumerable: true, configurable: true };
        }
    }
    // if the descriptor not exists or is not configurable
    // just return
    if (!desc || !desc.configurable) {
        return;
    }
    // A property descriptor cannot have getter/setter and be writable
    // deleting the writable and value properties avoids this error:
    //
    // TypeError: property descriptors must not specify a value or be writable when a
    // getter or setter has been specified
    delete desc.writable;
    delete desc.value;
    var originalDescGet = desc.get;
    // substr(2) cuz 'onclick' -> 'click', etc
    var eventName = prop.substr(2);
    var _prop = zoneSymbol('_' + prop);
    desc.set = function (newValue) {
        // in some of windows's onproperty callback, this is undefined
        // so we need to check it
        var target = this;
        if (!target && obj === _global) {
            target = _global;
        }
        if (!target) {
            return;
        }
        var previousValue = target[_prop];
        if (previousValue) {
            target.removeEventListener(eventName, previousValue);
        }
        if (typeof newValue === 'function') {
            var wrapFn = function (event) {
                var result = newValue.apply(this, arguments);
                if (result != undefined && !result) {
                    event.preventDefault();
                }
                return result;
            };
            target[_prop] = wrapFn;
            target.addEventListener(eventName, wrapFn, false);
        }
        else {
            target[_prop] = null;
        }
    };
    // The getter would return undefined for unassigned properties but the default value of an
    // unassigned property is null
    desc.get = function () {
        // in some of windows's onproperty callback, this is undefined
        // so we need to check it
        var target = this;
        if (!target && obj === _global) {
            target = _global;
        }
        if (!target) {
            return null;
        }
        if (target.hasOwnProperty(_prop)) {
            return target[_prop];
        }
        else if (originalDescGet) {
            // result will be null when use inline event attribute,
            // such as <button onclick="func();">OK</button>
            // because the onclick function is internal raw uncompiled handler
            // the onclick will be evaluated when first time event was triggered or
            // the property is accessed, https://github.com/angular/zone.js/issues/525
            // so we should use original native get to retrieve the handler
            var value = originalDescGet && originalDescGet.apply(this);
            if (value) {
                desc.set.apply(this, [value]);
                if (typeof target['removeAttribute'] === 'function') {
                    target.removeAttribute(prop);
                }
                return value;
            }
        }
        return null;
    };
    Object.defineProperty(obj, prop, desc);
}
function patchOnProperties(obj, properties, prototype) {
    if (properties) {
        for (var i = 0; i < properties.length; i++) {
            patchProperty(obj, 'on' + properties[i], prototype);
        }
    }
    else {
        var onProperties = [];
        for (var prop in obj) {
            if (prop.substr(0, 2) == 'on') {
                onProperties.push(prop);
            }
        }
        for (var j = 0; j < onProperties.length; j++) {
            patchProperty(obj, onProperties[j], prototype);
        }
    }
}
var EVENT_TASKS = zoneSymbol('eventTasks');
// For EventTarget
var ADD_EVENT_LISTENER = 'addEventListener';
var REMOVE_EVENT_LISTENER = 'removeEventListener';
// compare the EventListenerOptionsOrCapture
// 1. if the options is usCapture: boolean, compare the useCpature values directly
// 2. if the options is EventListerOptions, only compare the capture
function compareEventListenerOptions(left, right) {
    var leftCapture = (typeof left === 'boolean') ?
        left :
        ((typeof left === 'object') ? (left && left.capture) : false);
    var rightCapture = (typeof right === 'boolean') ?
        right :
        ((typeof right === 'object') ? (right && right.capture) : false);
    return !!leftCapture === !!rightCapture;
}
function findExistingRegisteredTask(target, handler, name, options, remove) {
    var eventTasks = target[EVENT_TASKS];
    if (eventTasks) {
        for (var i = 0; i < eventTasks.length; i++) {
            var eventTask = eventTasks[i];
            var data = eventTask.data;
            var listener = data.handler;
            if ((data.handler === handler || listener.listener === handler) &&
                compareEventListenerOptions(data.options, options) && data.eventName === name) {
                if (remove) {
                    eventTasks.splice(i, 1);
                }
                return eventTask;
            }
        }
    }
    return null;
}
function findAllExistingRegisteredTasks(target, name, remove) {
    var eventTasks = target[EVENT_TASKS];
    if (eventTasks) {
        var result = [];
        for (var i = eventTasks.length - 1; i >= 0; i--) {
            var eventTask = eventTasks[i];
            var data = eventTask.data;
            if (data.eventName === name) {
                result.push(eventTask);
                if (remove) {
                    eventTasks.splice(i, 1);
                }
            }
        }
        return result;
    }
    return null;
}
function attachRegisteredEvent(target, eventTask, isPrepend) {
    var eventTasks = target[EVENT_TASKS];
    if (!eventTasks) {
        eventTasks = target[EVENT_TASKS] = [];
    }
    if (isPrepend) {
        eventTasks.unshift(eventTask);
    }
    else {
        eventTasks.push(eventTask);
    }
}
var defaultListenerMetaCreator = function (self, args) {
    return {
        options: args[2],
        eventName: args[0],
        handler: args[1],
        target: self || _global,
        name: args[0],
        crossContext: false,
        invokeAddFunc: function (addFnSymbol, delegate) {
            // check if the data is cross site context, if it is, fallback to
            // remove the delegate directly and try catch error
            if (!this.crossContext) {
                if (delegate && delegate.invoke) {
                    return this.target[addFnSymbol](this.eventName, delegate.invoke, this.options);
                }
                else {
                    return this.target[addFnSymbol](this.eventName, delegate, this.options);
                }
            }
            else {
                // add a if/else branch here for performance concern, for most times
                // cross site context is false, so we don't need to try/catch
                try {
                    return this.target[addFnSymbol](this.eventName, delegate, this.options);
                }
                catch (err) {
                    // do nothing here is fine, because objects in a cross-site context are unusable
                }
            }
        },
        invokeRemoveFunc: function (removeFnSymbol, delegate) {
            // check if the data is cross site context, if it is, fallback to
            // remove the delegate directly and try catch error
            if (!this.crossContext) {
                if (delegate && delegate.invoke) {
                    return this.target[removeFnSymbol](this.eventName, delegate.invoke, this.options);
                }
                else {
                    return this.target[removeFnSymbol](this.eventName, delegate, this.options);
                }
            }
            else {
                // add a if/else branch here for performance concern, for most times
                // cross site context is false, so we don't need to try/catch
                try {
                    return this.target[removeFnSymbol](this.eventName, delegate, this.options);
                }
                catch (err) {
                    // do nothing here is fine, because objects in a cross-site context are unusable
                }
            }
        }
    };
};
function makeZoneAwareAddListener(addFnName, removeFnName, useCapturingParam, allowDuplicates, isPrepend, metaCreator) {
    if (useCapturingParam === void 0) { useCapturingParam = true; }
    if (allowDuplicates === void 0) { allowDuplicates = false; }
    if (isPrepend === void 0) { isPrepend = false; }
    if (metaCreator === void 0) { metaCreator = defaultListenerMetaCreator; }
    var addFnSymbol = zoneSymbol(addFnName);
    var removeFnSymbol = zoneSymbol(removeFnName);
    var defaultUseCapturing = useCapturingParam ? false : undefined;
    function scheduleEventListener(eventTask) {
        var meta = eventTask.data;
        attachRegisteredEvent(meta.target, eventTask, isPrepend);
        return meta.invokeAddFunc(addFnSymbol, eventTask);
    }
    function cancelEventListener(eventTask) {
        var meta = eventTask.data;
        findExistingRegisteredTask(meta.target, eventTask.invoke, meta.eventName, meta.options, true);
        return meta.invokeRemoveFunc(removeFnSymbol, eventTask);
    }
    return function zoneAwareAddListener(self, args) {
        var data = metaCreator(self, args);
        data.options = data.options || defaultUseCapturing;
        // - Inside a Web Worker, `this` is undefined, the context is `global`
        // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
        // see https://github.com/angular/zone.js/issues/190
        var delegate = null;
        if (typeof data.handler == 'function') {
            delegate = data.handler;
        }
        else if (data.handler && data.handler.handleEvent) {
            delegate = function (event) { return data.handler.handleEvent(event); };
        }
        var validZoneHandler = false;
        try {
            // In cross site contexts (such as WebDriver frameworks like Selenium),
            // accessing the handler object here will cause an exception to be thrown which
            // will fail tests prematurely.
            validZoneHandler = data.handler && data.handler.toString() === '[object FunctionWrapper]';
        }
        catch (error) {
            // we can still try to add the data.handler even we are in cross site context
            data.crossContext = true;
            return data.invokeAddFunc(addFnSymbol, data.handler);
        }
        // Ignore special listeners of IE11 & Edge dev tools, see
        // https://github.com/angular/zone.js/issues/150
        if (!delegate || validZoneHandler) {
            return data.invokeAddFunc(addFnSymbol, data.handler);
        }
        if (!allowDuplicates) {
            var eventTask = findExistingRegisteredTask(data.target, data.handler, data.eventName, data.options, false);
            if (eventTask) {
                // we already registered, so this will have noop.
                return data.invokeAddFunc(addFnSymbol, eventTask);
            }
        }
        var zone = Zone.current;
        var source = data.target.constructor['name'] + '.' + addFnName + ':' + data.eventName;
        zone.scheduleEventTask(source, delegate, data, scheduleEventListener, cancelEventListener);
    };
}
function makeZoneAwareRemoveListener(fnName, useCapturingParam, metaCreator) {
    if (useCapturingParam === void 0) { useCapturingParam = true; }
    if (metaCreator === void 0) { metaCreator = defaultListenerMetaCreator; }
    var symbol = zoneSymbol(fnName);
    var defaultUseCapturing = useCapturingParam ? false : undefined;
    return function zoneAwareRemoveListener(self, args) {
        var data = metaCreator(self, args);
        data.options = data.options || defaultUseCapturing;
        // - Inside a Web Worker, `this` is undefined, the context is `global`
        // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
        // see https://github.com/angular/zone.js/issues/190
        var delegate = null;
        if (typeof data.handler == 'function') {
            delegate = data.handler;
        }
        else if (data.handler && data.handler.handleEvent) {
            delegate = function (event) { return data.handler.handleEvent(event); };
        }
        var validZoneHandler = false;
        try {
            // In cross site contexts (such as WebDriver frameworks like Selenium),
            // accessing the handler object here will cause an exception to be thrown which
            // will fail tests prematurely.
            validZoneHandler = data.handler && data.handler.toString() === '[object FunctionWrapper]';
        }
        catch (error) {
            data.crossContext = true;
            return data.invokeRemoveFunc(symbol, data.handler);
        }
        // Ignore special listeners of IE11 & Edge dev tools, see
        // https://github.com/angular/zone.js/issues/150
        if (!delegate || validZoneHandler) {
            return data.invokeRemoveFunc(symbol, data.handler);
        }
        var eventTask = findExistingRegisteredTask(data.target, data.handler, data.eventName, data.options, true);
        if (eventTask) {
            eventTask.zone.cancelTask(eventTask);
        }
        else {
            data.invokeRemoveFunc(symbol, data.handler);
        }
    };
}


function patchEventTargetMethods(obj, addFnName, removeFnName, metaCreator) {
    if (addFnName === void 0) { addFnName = ADD_EVENT_LISTENER; }
    if (removeFnName === void 0) { removeFnName = REMOVE_EVENT_LISTENER; }
    if (metaCreator === void 0) { metaCreator = defaultListenerMetaCreator; }
    if (obj && obj[addFnName]) {
        patchMethod(obj, addFnName, function () { return makeZoneAwareAddListener(addFnName, removeFnName, true, false, false, metaCreator); });
        patchMethod(obj, removeFnName, function () { return makeZoneAwareRemoveListener(removeFnName, true, metaCreator); });
        return true;
    }
    else {
        return false;
    }
}
var originalInstanceKey = zoneSymbol('originalInstance');
// wrap some native API on `window`
function patchClass(className) {
    var OriginalClass = _global[className];
    if (!OriginalClass)
        return;
    // keep original class in global
    _global[zoneSymbol(className)] = OriginalClass;
    _global[className] = function () {
        var a = bindArguments(arguments, className);
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
            default:
                throw new Error('Arg list too long.');
        }
    };
    // attach original delegate to patched function
    attachOriginToPatched(_global[className], OriginalClass);
    var instance = new OriginalClass(function () { });
    var prop;
    for (prop in instance) {
        // https://bugs.webkit.org/show_bug.cgi?id=44721
        if (className === 'XMLHttpRequest' && prop === 'responseBlob')
            continue;
        (function (prop) {
            if (typeof instance[prop] === 'function') {
                _global[className].prototype[prop] = function () {
                    return this[originalInstanceKey][prop].apply(this[originalInstanceKey], arguments);
                };
            }
            else {
                Object.defineProperty(_global[className].prototype, prop, {
                    set: function (fn) {
                        if (typeof fn === 'function') {
                            this[originalInstanceKey][prop] = Zone.current.wrap(fn, className + '.' + prop);
                            // keep callback in wrapped function so we can
                            // use it in Function.prototype.toString to return
                            // the native one.
                            attachOriginToPatched(this[originalInstanceKey][prop], fn);
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
            _global[className][prop] = OriginalClass[prop];
        }
    }
}
function patchMethod(target, name, patchFn) {
    var proto = target;
    while (proto && !proto.hasOwnProperty(name)) {
        proto = Object.getPrototypeOf(proto);
    }
    if (!proto && target[name]) {
        // somehow we did not find it, but we can see it. This happens on IE for Window properties.
        proto = target;
    }
    var delegateName = zoneSymbol(name);
    var delegate;
    if (proto && !(delegate = proto[delegateName])) {
        delegate = proto[delegateName] = proto[name];
        var patchDelegate_1 = patchFn(delegate, delegateName, name);
        proto[name] = function () {
            return patchDelegate_1(this, arguments);
        };
        attachOriginToPatched(proto[name], delegate);
    }
    return delegate;
}
// TODO: @JiaLiPassion, support cancel task later if necessary
function patchMacroTask(obj, funcName, metaCreator) {
    var setNative = null;
    function scheduleTask(task) {
        var data = task.data;
        data.args[data.callbackIndex] = function () {
            task.invoke.apply(this, arguments);
        };
        setNative.apply(data.target, data.args);
        return task;
    }
    setNative = patchMethod(obj, funcName, function (delegate) { return function (self, args) {
        var meta = metaCreator(self, args);
        if (meta.callbackIndex >= 0 && typeof args[meta.callbackIndex] === 'function') {
            var task = Zone.current.scheduleMacroTask(meta.name, args[meta.callbackIndex], meta, scheduleTask, null);
            return task;
        }
        else {
            // cause an error by calling it directly.
            return delegate.apply(self, args);
        }
    }; });
}

function findEventTask(target, evtName) {
    var eventTasks = target[zoneSymbol('eventTasks')];
    var result = [];
    if (eventTasks) {
        for (var i = 0; i < eventTasks.length; i++) {
            var eventTask = eventTasks[i];
            var data = eventTask.data;
            var eventName = data && data.eventName;
            if (eventName === evtName) {
                result.push(eventTask);
            }
        }
    }
    return result;
}
function attachOriginToPatched(patched, original) {
    patched[zoneSymbol('OriginalDelegate')] = original;
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// override Function.prototype.toString to make zone.js patched function
// look like native function
Zone.__load_patch('toString', function (global, Zone, api) {
    // patch Func.prototype.toString to let them look like native
    var originalFunctionToString = Function.prototype.toString;
    Function.prototype.toString = function () {
        if (typeof this === 'function') {
            var originalDelegate = this[zoneSymbol('OriginalDelegate')];
            if (originalDelegate) {
                if (typeof originalDelegate === 'function') {
                    return originalFunctionToString.apply(this[zoneSymbol('OriginalDelegate')], arguments);
                }
                else {
                    return Object.prototype.toString.call(originalDelegate);
                }
            }
            if (this === Promise) {
                var nativePromise = global[zoneSymbol('Promise')];
                if (nativePromise) {
                    return originalFunctionToString.apply(nativePromise, arguments);
                }
            }
            if (this === Error) {
                var nativeError = global[zoneSymbol('Error')];
                if (nativeError) {
                    return originalFunctionToString.apply(nativeError, arguments);
                }
            }
        }
        return originalFunctionToString.apply(this, arguments);
    };
    // patch Object.prototype.toString to let them look like native
    var originalObjectToString = Object.prototype.toString;
    Object.prototype.toString = function () {
        if (this instanceof Promise) {
            return '[object Promise]';
        }
        return originalObjectToString.apply(this, arguments);
    };
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function patchTimer(window, setName, cancelName, nameSuffix) {
    var setNative = null;
    var clearNative = null;
    setName += nameSuffix;
    cancelName += nameSuffix;
    var tasksByHandleId = {};
    function scheduleTask(task) {
        var data = task.data;
        function timer() {
            try {
                task.invoke.apply(this, arguments);
            }
            finally {
                if (typeof data.handleId === 'number') {
                    // Node returns complex objects as handleIds
                    delete tasksByHandleId[data.handleId];
                }
            }
        }
        data.args[0] = timer;
        data.handleId = setNative.apply(window, data.args);
        if (typeof data.handleId === 'number') {
            // Node returns complex objects as handleIds -> no need to keep them around. Additionally,
            // this throws an
            // exception in older node versions and has no effect there, because of the stringified key.
            tasksByHandleId[data.handleId] = task;
        }
        return task;
    }
    function clearTask(task) {
        if (typeof task.data.handleId === 'number') {
            // Node returns complex objects as handleIds
            delete tasksByHandleId[task.data.handleId];
        }
        return clearNative(task.data.handleId);
    }
    setNative =
        patchMethod(window, setName, function (delegate) { return function (self, args) {
            if (typeof args[0] === 'function') {
                var zone = Zone.current;
                var options = {
                    handleId: null,
                    isPeriodic: nameSuffix === 'Interval',
                    delay: (nameSuffix === 'Timeout' || nameSuffix === 'Interval') ? args[1] || 0 : null,
                    args: args
                };
                var task = zone.scheduleMacroTask(setName, args[0], options, scheduleTask, clearTask);
                if (!task) {
                    return task;
                }
                // Node.js must additionally support the ref and unref functions.
                var handle = task.data.handleId;
                // check whether handle is null, because some polyfill or browser
                // may return undefined from setTimeout/setInterval/setImmediate/requestAnimationFrame
                if (handle && handle.ref && handle.unref && typeof handle.ref === 'function' &&
                    typeof handle.unref === 'function') {
                    task.ref = handle.ref.bind(handle);
                    task.unref = handle.unref.bind(handle);
                }
                return task;
            }
            else {
                // cause an error by calling it directly.
                return delegate.apply(window, args);
            }
        }; });
    clearNative =
        patchMethod(window, cancelName, function (delegate) { return function (self, args) {
            var task = typeof args[0] === 'number' ? tasksByHandleId[args[0]] : args[0];
            if (task && typeof task.type === 'string') {
                if (task.state !== 'notScheduled' &&
                    (task.cancelFn && task.data.isPeriodic || task.runCount === 0)) {
                    // Do not cancel already canceled functions
                    task.zone.cancelTask(task);
                }
            }
            else {
                // cause an error by calling it directly.
                delegate.apply(window, args);
            }
        }; });
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
/*
 * This is necessary for Chrome and Chrome mobile, to enable
 * things like redefining `createdCallback` on an element.
 */
var _defineProperty = Object[zoneSymbol('defineProperty')] = Object.defineProperty;
var _getOwnPropertyDescriptor = Object[zoneSymbol('getOwnPropertyDescriptor')] =
    Object.getOwnPropertyDescriptor;
var _create = Object.create;
var unconfigurablesKey = zoneSymbol('unconfigurables');
function propertyPatch() {
    Object.defineProperty = function (obj, prop, desc) {
        if (isUnconfigurable(obj, prop)) {
            throw new TypeError('Cannot assign to read only property \'' + prop + '\' of ' + obj);
        }
        var originalConfigurableFlag = desc.configurable;
        if (prop !== 'prototype') {
            desc = rewriteDescriptor(obj, prop, desc);
        }
        return _tryDefineProperty(obj, prop, desc, originalConfigurableFlag);
    };
    Object.defineProperties = function (obj, props) {
        Object.keys(props).forEach(function (prop) {
            Object.defineProperty(obj, prop, props[prop]);
        });
        return obj;
    };
    Object.create = function (obj, proto) {
        if (typeof proto === 'object' && !Object.isFrozen(proto)) {
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
function _redefineProperty(obj, prop, desc) {
    var originalConfigurableFlag = desc.configurable;
    desc = rewriteDescriptor(obj, prop, desc);
    return _tryDefineProperty(obj, prop, desc, originalConfigurableFlag);
}
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
function _tryDefineProperty(obj, prop, desc, originalConfigurableFlag) {
    try {
        return _defineProperty(obj, prop, desc);
    }
    catch (error) {
        if (desc.configurable) {
            // In case of errors, when the configurable flag was likely set by rewriteDescriptor(), let's
            // retry with the original flag value
            if (typeof originalConfigurableFlag == 'undefined') {
                delete desc.configurable;
            }
            else {
                desc.configurable = originalConfigurableFlag;
            }
            try {
                return _defineProperty(obj, prop, desc);
            }
            catch (error) {
                var descJson = null;
                try {
                    descJson = JSON.stringify(desc);
                }
                catch (error) {
                    descJson = descJson.toString();
                }
                console.log("Attempting to configure '" + prop + "' with descriptor '" + descJson + "' on object '" + obj + "' and got error, giving up: " + error);
            }
        }
        else {
            throw error;
        }
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var WTF_ISSUE_555 = 'Anchor,Area,Audio,BR,Base,BaseFont,Body,Button,Canvas,Content,DList,Directory,Div,Embed,FieldSet,Font,Form,Frame,FrameSet,HR,Head,Heading,Html,IFrame,Image,Input,Keygen,LI,Label,Legend,Link,Map,Marquee,Media,Menu,Meta,Meter,Mod,OList,Object,OptGroup,Option,Output,Paragraph,Pre,Progress,Quote,Script,Select,Source,Span,Style,TableCaption,TableCell,TableCol,Table,TableRow,TableSection,TextArea,Title,Track,UList,Unknown,Video';
var NO_EVENT_TARGET = 'ApplicationCache,EventSource,FileReader,InputMethodContext,MediaController,MessagePort,Node,Performance,SVGElementInstance,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebKitNamedFlow,Window,Worker,WorkerGlobalScope,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload,IDBRequest,IDBOpenDBRequest,IDBDatabase,IDBTransaction,IDBCursor,DBIndex,WebSocket'
    .split(',');
var EVENT_TARGET = 'EventTarget';
function eventTargetPatch(_global) {
    var apis = [];
    var isWtf = _global['wtf'];
    if (isWtf) {
        // Workaround for: https://github.com/google/tracing-framework/issues/555
        apis = WTF_ISSUE_555.split(',').map(function (v) { return 'HTML' + v + 'Element'; }).concat(NO_EVENT_TARGET);
    }
    else if (_global[EVENT_TARGET]) {
        apis.push(EVENT_TARGET);
    }
    else {
        // Note: EventTarget is not available in all browsers,
        // if it's not available, we instead patch the APIs in the IDL that inherit from EventTarget
        apis = NO_EVENT_TARGET;
    }
    for (var i = 0; i < apis.length; i++) {
        var type = _global[apis[i]];
        patchEventTargetMethods(type && type.prototype);
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
// we have to patch the instance since the proto is non-configurable
function apply(_global) {
    var WS = _global.WebSocket;
    // On Safari window.EventTarget doesn't exist so need to patch WS add/removeEventListener
    // On older Chrome, no need since EventTarget was already patched
    if (!_global.EventTarget) {
        patchEventTargetMethods(WS.prototype);
    }
    _global.WebSocket = function (a, b) {
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
        patchOnProperties(proxySocket, ['close', 'error', 'message', 'open']);
        return proxySocket;
    };
    for (var prop in WS) {
        _global['WebSocket'][prop] = WS[prop];
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
var globalEventHandlersEventNames = [
    'abort',
    'animationcancel',
    'animationend',
    'animationiteration',
    'auxclick',
    'beforeinput',
    'blur',
    'cancel',
    'canplay',
    'canplaythrough',
    'change',
    'compositionstart',
    'compositionupdate',
    'compositionend',
    'cuechange',
    'click',
    'close',
    'contextmenu',
    'curechange',
    'dblclick',
    'drag',
    'dragend',
    'dragenter',
    'dragexit',
    'dragleave',
    'dragover',
    'drop',
    'durationchange',
    'emptied',
    'ended',
    'error',
    'focus',
    'focusin',
    'focusout',
    'gotpointercapture',
    'input',
    'invalid',
    'keydown',
    'keypress',
    'keyup',
    'load',
    'loadstart',
    'loadeddata',
    'loadedmetadata',
    'lostpointercapture',
    'mousedown',
    'mouseenter',
    'mouseleave',
    'mousemove',
    'mouseout',
    'mouseover',
    'mouseup',
    'mousewheel',
    'pause',
    'play',
    'playing',
    'pointercancel',
    'pointerdown',
    'pointerenter',
    'pointerleave',
    'pointerlockchange',
    'mozpointerlockchange',
    'webkitpointerlockerchange',
    'pointerlockerror',
    'mozpointerlockerror',
    'webkitpointerlockerror',
    'pointermove',
    'pointout',
    'pointerover',
    'pointerup',
    'progress',
    'ratechange',
    'reset',
    'resize',
    'scroll',
    'seeked',
    'seeking',
    'select',
    'selectionchange',
    'selectstart',
    'show',
    'sort',
    'stalled',
    'submit',
    'suspend',
    'timeupdate',
    'volumechange',
    'touchcancel',
    'touchmove',
    'touchstart',
    'transitioncancel',
    'transitionend',
    'waiting',
    'wheel'
];
var documentEventNames = [
    'afterscriptexecute', 'beforescriptexecute', 'DOMContentLoaded', 'fullscreenchange',
    'mozfullscreenchange', 'webkitfullscreenchange', 'msfullscreenchange', 'fullscreenerror',
    'mozfullscreenerror', 'webkitfullscreenerror', 'msfullscreenerror', 'readystatechange'
];
var windowEventNames = [
    'absolutedeviceorientation',
    'afterinput',
    'afterprint',
    'appinstalled',
    'beforeinstallprompt',
    'beforeprint',
    'beforeunload',
    'devicelight',
    'devicemotion',
    'deviceorientation',
    'deviceorientationabsolute',
    'deviceproximity',
    'hashchange',
    'languagechange',
    'message',
    'mozbeforepaint',
    'offline',
    'online',
    'paint',
    'pageshow',
    'pagehide',
    'popstate',
    'rejectionhandled',
    'storage',
    'unhandledrejection',
    'unload',
    'userproximity',
    'vrdisplyconnected',
    'vrdisplaydisconnected',
    'vrdisplaypresentchange'
];
var htmlElementEventNames = [
    'beforecopy', 'beforecut', 'beforepaste', 'copy', 'cut', 'paste', 'dragstart', 'loadend',
    'animationstart', 'search', 'transitionrun', 'transitionstart', 'webkitanimationend',
    'webkitanimationiteration', 'webkitanimationstart', 'webkittransitionend'
];
var mediaElementEventNames = ['encrypted', 'waitingforkey', 'msneedkey', 'mozinterruptbegin', 'mozinterruptend'];
var ieElementEventNames = [
    'activate',
    'afterupdate',
    'ariarequest',
    'beforeactivate',
    'beforedeactivate',
    'beforeeditfocus',
    'beforeupdate',
    'cellchange',
    'controlselect',
    'dataavailable',
    'datasetchanged',
    'datasetcomplete',
    'errorupdate',
    'filterchange',
    'layoutcomplete',
    'losecapture',
    'move',
    'moveend',
    'movestart',
    'propertychange',
    'resizeend',
    'resizestart',
    'rowenter',
    'rowexit',
    'rowsdelete',
    'rowsinserted',
    'command',
    'compassneedscalibration',
    'deactivate',
    'help',
    'mscontentzoom',
    'msmanipulationstatechanged',
    'msgesturechange',
    'msgesturedoubletap',
    'msgestureend',
    'msgesturehold',
    'msgesturestart',
    'msgesturetap',
    'msgotpointercapture',
    'msinertiastart',
    'mslostpointercapture',
    'mspointercancel',
    'mspointerdown',
    'mspointerenter',
    'mspointerhover',
    'mspointerleave',
    'mspointermove',
    'mspointerout',
    'mspointerover',
    'mspointerup',
    'pointerout',
    'mssitemodejumplistitemremoved',
    'msthumbnailclick',
    'stop',
    'storagecommit'
];
var webglEventNames = ['webglcontextrestored', 'webglcontextlost', 'webglcontextcreationerror'];
var formEventNames = ['autocomplete', 'autocompleteerror'];
var detailEventNames = ['toggle'];
var frameEventNames = ['load'];
var frameSetEventNames = ['blur', 'error', 'focus', 'load', 'resize', 'scroll'];
var marqueeEventNames = ['bounce', 'finish', 'start'];
var XMLHttpRequestEventNames = [
    'loadstart', 'progress', 'abort', 'error', 'load', 'progress', 'timeout', 'loadend',
    'readystatechange'
];
var IDBIndexEventNames = ['upgradeneeded', 'complete', 'abort', 'success', 'error', 'blocked', 'versionchange', 'close'];
var websocketEventNames = ['close', 'error', 'open', 'message'];
var eventNames = globalEventHandlersEventNames.concat(webglEventNames, formEventNames, detailEventNames, documentEventNames, windowEventNames, htmlElementEventNames, ieElementEventNames);
function propertyDescriptorPatch(_global) {
    if (isNode && !isMix) {
        return;
    }
    var supportsWebSocket = typeof WebSocket !== 'undefined';
    if (canPatchViaPropertyDescriptor()) {
        // for browsers that we can patch the descriptor:  Chrome & Firefox
        if (isBrowser) {
            // in IE/Edge, onProp not exist in window object, but in WindowPrototype
            // so we need to pass WindowPrototype to check onProp exist or not
            patchOnProperties(window, eventNames, Object.getPrototypeOf(window));
            patchOnProperties(Document.prototype, eventNames);
            if (typeof window['SVGElement'] !== 'undefined') {
                patchOnProperties(window['SVGElement'].prototype, eventNames);
            }
            patchOnProperties(Element.prototype, eventNames);
            patchOnProperties(HTMLElement.prototype, eventNames);
            patchOnProperties(HTMLMediaElement.prototype, mediaElementEventNames);
            patchOnProperties(HTMLFrameSetElement.prototype, windowEventNames.concat(frameSetEventNames));
            patchOnProperties(HTMLBodyElement.prototype, windowEventNames.concat(frameSetEventNames));
            patchOnProperties(HTMLFrameElement.prototype, frameEventNames);
            patchOnProperties(HTMLIFrameElement.prototype, frameEventNames);
            var HTMLMarqueeElement_1 = window['HTMLMarqueeElement'];
            if (HTMLMarqueeElement_1) {
                patchOnProperties(HTMLMarqueeElement_1.prototype, marqueeEventNames);
            }
        }
        patchOnProperties(XMLHttpRequest.prototype, XMLHttpRequestEventNames);
        var XMLHttpRequestEventTarget = _global['XMLHttpRequestEventTarget'];
        if (XMLHttpRequestEventTarget) {
            patchOnProperties(XMLHttpRequestEventTarget && XMLHttpRequestEventTarget.prototype, XMLHttpRequestEventNames);
        }
        if (typeof IDBIndex !== 'undefined') {
            patchOnProperties(IDBIndex.prototype, IDBIndexEventNames);
            patchOnProperties(IDBRequest.prototype, IDBIndexEventNames);
            patchOnProperties(IDBOpenDBRequest.prototype, IDBIndexEventNames);
            patchOnProperties(IDBDatabase.prototype, IDBIndexEventNames);
            patchOnProperties(IDBTransaction.prototype, IDBIndexEventNames);
            patchOnProperties(IDBCursor.prototype, IDBIndexEventNames);
        }
        if (supportsWebSocket) {
            patchOnProperties(WebSocket.prototype, websocketEventNames);
        }
    }
    else {
        // Safari, Android browsers (Jelly Bean)
        patchViaCapturingAllTheEvents();
        patchClass('XMLHttpRequest');
        if (supportsWebSocket) {
            apply(_global);
        }
    }
}
function canPatchViaPropertyDescriptor() {
    if ((isBrowser || isMix) && !Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick') &&
        typeof Element !== 'undefined') {
        // WebKit https://bugs.webkit.org/show_bug.cgi?id=134364
        // IDL interface attributes are not configurable
        var desc = Object.getOwnPropertyDescriptor(Element.prototype, 'onclick');
        if (desc && !desc.configurable)
            return false;
    }
    var xhrDesc = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'onreadystatechange');
    // add enumerable and configurable here because in opera
    // by default XMLHttpRequest.prototype.onreadystatechange is undefined
    // without adding enumerable and configurable will cause onreadystatechange
    // non-configurable
    // and if XMLHttpRequest.prototype.onreadystatechange is undefined,
    // we should set a real desc instead a fake one
    if (xhrDesc) {
        Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', {
            enumerable: true,
            configurable: true,
            get: function () {
                return true;
            }
        });
        var req = new XMLHttpRequest();
        var result = !!req.onreadystatechange;
        // restore original desc
        Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', xhrDesc || {});
        return result;
    }
    else {
        Object.defineProperty(XMLHttpRequest.prototype, 'onreadystatechange', {
            enumerable: true,
            configurable: true,
            get: function () {
                return this[zoneSymbol('fakeonreadystatechange')];
            },
            set: function (value) {
                this[zoneSymbol('fakeonreadystatechange')] = value;
            }
        });
        var req = new XMLHttpRequest();
        var detectFunc = function () { };
        req.onreadystatechange = detectFunc;
        var result = req[zoneSymbol('fakeonreadystatechange')] === detectFunc;
        req.onreadystatechange = null;
        return result;
    }
}

var unboundKey = zoneSymbol('unbound');
// Whenever any eventListener fires, we check the eventListener target and all parents
// for `onwhatever` properties and replace them with zone-bound functions
// - Chrome (for now)
function patchViaCapturingAllTheEvents() {
    var _loop_1 = function (i) {
        var property = eventNames[i];
        var onproperty = 'on' + property;
        self.addEventListener(property, function (event) {
            var elt = event.target, bound, source;
            if (elt) {
                source = elt.constructor['name'] + '.' + onproperty;
            }
            else {
                source = 'unknown.' + onproperty;
            }
            while (elt) {
                if (elt[onproperty] && !elt[onproperty][unboundKey]) {
                    bound = Zone.current.wrap(elt[onproperty], source);
                    bound[unboundKey] = elt[onproperty];
                    elt[onproperty] = bound;
                }
                elt = elt.parentElement;
            }
        }, true);
    };
    for (var i = 0; i < eventNames.length; i++) {
        _loop_1(i);
    }
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
function registerElementPatch(_global) {
    if ((!isBrowser && !isMix) || !('registerElement' in _global.document)) {
        return;
    }
    var _registerElement = document.registerElement;
    var callbacks = ['createdCallback', 'attachedCallback', 'detachedCallback', 'attributeChangedCallback'];
    document.registerElement = function (name, opts) {
        if (opts && opts.prototype) {
            callbacks.forEach(function (callback) {
                var source = 'Document.registerElement::' + callback;
                if (opts.prototype.hasOwnProperty(callback)) {
                    var descriptor = Object.getOwnPropertyDescriptor(opts.prototype, callback);
                    if (descriptor && descriptor.value) {
                        descriptor.value = Zone.current.wrap(descriptor.value, source);
                        _redefineProperty(opts.prototype, callback, descriptor);
                    }
                    else {
                        opts.prototype[callback] = Zone.current.wrap(opts.prototype[callback], source);
                    }
                }
                else if (opts.prototype[callback]) {
                    opts.prototype[callback] = Zone.current.wrap(opts.prototype[callback], source);
                }
            });
        }
        return _registerElement.apply(document, [name, opts]);
    };
    attachOriginToPatched(document.registerElement, _registerElement);
}

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */
Zone.__load_patch('timers', function (global, Zone, api) {
    var set = 'set';
    var clear = 'clear';
    patchTimer(global, set, clear, 'Timeout');
    patchTimer(global, set, clear, 'Interval');
    patchTimer(global, set, clear, 'Immediate');
    patchTimer(global, 'request', 'cancel', 'AnimationFrame');
    patchTimer(global, 'mozRequest', 'mozCancel', 'AnimationFrame');
    patchTimer(global, 'webkitRequest', 'webkitCancel', 'AnimationFrame');
});
Zone.__load_patch('blocking', function (global, Zone, api) {
    var blockingMethods = ['alert', 'prompt', 'confirm'];
    for (var i = 0; i < blockingMethods.length; i++) {
        var name_1 = blockingMethods[i];
        patchMethod(global, name_1, function (delegate, symbol, name) {
            return function (s, args) {
                return Zone.current.run(delegate, global, args, name);
            };
        });
    }
});
Zone.__load_patch('EventTarget', function (global, Zone, api) {
    eventTargetPatch(global);
    // patch XMLHttpRequestEventTarget's addEventListener/removeEventListener
    var XMLHttpRequestEventTarget = global['XMLHttpRequestEventTarget'];
    if (XMLHttpRequestEventTarget && XMLHttpRequestEventTarget.prototype) {
        patchEventTargetMethods(XMLHttpRequestEventTarget.prototype);
    }
    patchClass('MutationObserver');
    patchClass('WebKitMutationObserver');
    patchClass('FileReader');
});
Zone.__load_patch('on_property', function (global, Zone, api) {
    propertyDescriptorPatch(global);
    propertyPatch();
    registerElementPatch(global);
});
Zone.__load_patch('canvas', function (global, Zone, api) {
    var HTMLCanvasElement = global['HTMLCanvasElement'];
    if (typeof HTMLCanvasElement !== 'undefined' && HTMLCanvasElement.prototype &&
        HTMLCanvasElement.prototype.toBlob) {
        patchMacroTask(HTMLCanvasElement.prototype, 'toBlob', function (self, args) {
            return { name: 'HTMLCanvasElement.toBlob', target: self, callbackIndex: 0, args: args };
        });
    }
});
Zone.__load_patch('XHR', function (global, Zone, api) {
    // Treat XMLHTTPRequest as a macrotask.
    patchXHR(global);
    var XHR_TASK = zoneSymbol('xhrTask');
    var XHR_SYNC = zoneSymbol('xhrSync');
    var XHR_LISTENER = zoneSymbol('xhrListener');
    var XHR_SCHEDULED = zoneSymbol('xhrScheduled');
    function patchXHR(window) {
        function findPendingTask(target) {
            var pendingTask = target[XHR_TASK];
            return pendingTask;
        }
        function scheduleTask(task) {
            XMLHttpRequest[XHR_SCHEDULED] = false;
            var data = task.data;
            // remove existing event listener
            var listener = data.target[XHR_LISTENER];
            var oriAddListener = data.target[zoneSymbol('addEventListener')];
            var oriRemoveListener = data.target[zoneSymbol('removeEventListener')];
            if (listener) {
                oriRemoveListener.apply(data.target, ['readystatechange', listener]);
            }
            var newListener = data.target[XHR_LISTENER] = function () {
                if (data.target.readyState === data.target.DONE) {
                    // sometimes on some browsers XMLHttpRequest will fire onreadystatechange with
                    // readyState=4 multiple times, so we need to check task state here
                    if (!data.aborted && XMLHttpRequest[XHR_SCHEDULED] &&
                        task.state === 'scheduled') {
                        task.invoke();
                    }
                }
            };
            oriAddListener.apply(data.target, ['readystatechange', newListener]);
            var storedTask = data.target[XHR_TASK];
            if (!storedTask) {
                data.target[XHR_TASK] = task;
            }
            sendNative.apply(data.target, data.args);
            XMLHttpRequest[XHR_SCHEDULED] = true;
            return task;
        }
        function placeholderCallback() { }
        function clearTask(task) {
            var data = task.data;
            // Note - ideally, we would call data.target.removeEventListener here, but it's too late
            // to prevent it from firing. So instead, we store info for the event listener.
            data.aborted = true;
            return abortNative.apply(data.target, data.args);
        }
        var openNative = patchMethod(window.XMLHttpRequest.prototype, 'open', function () { return function (self, args) {
            self[XHR_SYNC] = args[2] == false;
            return openNative.apply(self, args);
        }; });
        var sendNative = patchMethod(window.XMLHttpRequest.prototype, 'send', function () { return function (self, args) {
            var zone = Zone.current;
            if (self[XHR_SYNC]) {
                // if the XHR is sync there is no task to schedule, just execute the code.
                return sendNative.apply(self, args);
            }
            else {
                var options = { target: self, isPeriodic: false, delay: null, args: args, aborted: false };
                return zone.scheduleMacroTask('XMLHttpRequest.send', placeholderCallback, options, scheduleTask, clearTask);
            }
        }; });
        var abortNative = patchMethod(window.XMLHttpRequest.prototype, 'abort', function (delegate) { return function (self, args) {
            var task = findPendingTask(self);
            if (task && typeof task.type == 'string') {
                // If the XHR has already completed, do nothing.
                // If the XHR has already been aborted, do nothing.
                // Fix #569, call abort multiple times before done will cause
                // macroTask task count be negative number
                if (task.cancelFn == null || (task.data && task.data.aborted)) {
                    return;
                }
                task.zone.cancelTask(task);
            }
            // Otherwise, we are trying to abort an XHR which has not yet been sent, so there is no
            // task
            // to cancel. Do nothing.
        }; });
    }
});
Zone.__load_patch('geolocation', function (global, Zone, api) {
    /// GEO_LOCATION
    if (global['navigator'] && global['navigator'].geolocation) {
        patchPrototype(global['navigator'].geolocation, ['getCurrentPosition', 'watchPosition']);
    }
});
Zone.__load_patch('PromiseRejectionEvent', function (global, Zone, api) {
    // handle unhandled promise rejection
    function findPromiseRejectionHandler(evtName) {
        return function (e) {
            var eventTasks = findEventTask(global, evtName);
            eventTasks.forEach(function (eventTask) {
                // windows has added unhandledrejection event listener
                // trigger the event listener
                var PromiseRejectionEvent = global['PromiseRejectionEvent'];
                if (PromiseRejectionEvent) {
                    var evt = new PromiseRejectionEvent(evtName, { promise: e.promise, reason: e.rejection });
                    eventTask.invoke(evt);
                }
            });
        };
    }
    if (global['PromiseRejectionEvent']) {
        Zone[zoneSymbol('unhandledPromiseRejectionHandler')] =
            findPromiseRejectionHandler('unhandledrejection');
        Zone[zoneSymbol('rejectionHandledHandler')] =
            findPromiseRejectionHandler('rejectionhandled');
    }
});
Zone.__load_patch('util', function (global, Zone, api) {
    api.patchEventTargetMethods = patchEventTargetMethods;
    api.patchOnProperties = patchOnProperties;
    api.patchMethod = patchMethod;
});

/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

})));

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {},undefined)
},{}],24:[function(_dereq_,module,exports){
(function (define){
(function(root, factory) {
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
}(this, function() {
    'use strict';
    function _isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }

    function _capitalize(str) {
        return str[0].toUpperCase() + str.substring(1);
    }

    function _getter(p) {
        return function() {
            return this[p];
        };
    }

    var booleanProps = ['isConstructor', 'isEval', 'isNative', 'isToplevel'];
    var numericProps = ['columnNumber', 'lineNumber'];
    var stringProps = ['fileName', 'functionName', 'source'];
    var arrayProps = ['args'];

    var props = booleanProps.concat(numericProps, stringProps, arrayProps);

    function StackFrame(obj) {
        if (obj instanceof Object) {
            for (var i = 0; i < props.length; i++) {
                if (obj.hasOwnProperty(props[i]) && obj[props[i]] !== undefined) {
                    this['set' + _capitalize(props[i])](obj[props[i]]);
                }
            }
        }
    }

    StackFrame.prototype = {
        getArgs: function() {
            return this.args;
        },
        setArgs: function(v) {
            if (Object.prototype.toString.call(v) !== '[object Array]') {
                throw new TypeError('Args must be an Array');
            }
            this.args = v;
        },

        getEvalOrigin: function() {
            return this.evalOrigin;
        },
        setEvalOrigin: function(v) {
            if (v instanceof StackFrame) {
                this.evalOrigin = v;
            } else if (v instanceof Object) {
                this.evalOrigin = new StackFrame(v);
            } else {
                throw new TypeError('Eval Origin must be an Object or StackFrame');
            }
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

    for (var i = 0; i < booleanProps.length; i++) {
        StackFrame.prototype['get' + _capitalize(booleanProps[i])] = _getter(booleanProps[i]);
        StackFrame.prototype['set' + _capitalize(booleanProps[i])] = (function(p) {
            return function(v) {
                this[p] = Boolean(v);
            };
        })(booleanProps[i]);
    }

    for (var j = 0; j < numericProps.length; j++) {
        StackFrame.prototype['get' + _capitalize(numericProps[j])] = _getter(numericProps[j]);
        StackFrame.prototype['set' + _capitalize(numericProps[j])] = (function(p) {
            return function(v) {
                if (!_isNumber(v)) {
                    throw new TypeError(p + ' must be a Number');
                }
                this[p] = Number(v);
            };
        })(numericProps[j]);
    }

    for (var k = 0; k < stringProps.length; k++) {
        StackFrame.prototype['get' + _capitalize(stringProps[k])] = _getter(stringProps[k]);
        StackFrame.prototype['set' + _capitalize(stringProps[k])] = (function(p) {
            return function(v) {
                this[p] = String(v);
            };
        })(stringProps[k]);
    }

    return StackFrame;
}));

}).call(this,undefined)
},{}],25:[function(_dereq_,module,exports){
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
                    stack.push(new StackFrame({functionName: RegExp.$1 || undefined, args: args}));
                } else {
                    stack.push(new StackFrame({args: args}));
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
},{"stackframe":24}],26:[function(_dereq_,module,exports){
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
},{}],27:[function(_dereq_,module,exports){
var ngOpbeat = _dereq_('./ngOpbeat')
var patchAngularBootstrap = _dereq_('./patches/bootstrapPatch')
var patchCommon = _dereq_('opbeat-js-core').patchCommon

function initialize (serviceFactory) {
  var serviceContainer = serviceFactory.getPerformanceServiceContainer()
  var services = serviceContainer.services
  if (!services.configService.isPlatformSupported()) {
    services.logger.warn('Platform is not supported.')
  } else {
    serviceContainer.initialize()
  }

  var alreadyRegistered = false
  patchCommon(serviceContainer)

  function noop () {}
  services['angularInitializer'] = {
    afterBootstrap: noop,
    beforeBootstrap: noop
  }

  function beforeBootstrap (modules) {
    services['angularInitializer'].beforeBootstrap()
  }

  function afterBootstrap () {
    services['angularInitializer'].afterBootstrap()
  }

  function opbeatBootstrap (fn, applyThis, applyArgs) {
    if (!alreadyRegistered) {
      alreadyRegistered = registerOpbeatModule(services)
    }
    var result
    if (services.configService.isPlatformSupported()) {
      beforeBootstrap()
      result = services.zoneService.runInOpbeatZone(fn, applyThis, applyArgs, 'angular:bootstrap')
      afterBootstrap()
    } else {
      result = fn.apply(applyThis, applyArgs)
    }
    return result
  }

  services.exceptionHandler = serviceFactory.getExceptionHandler()
  services.exceptionHandler.install()
  alreadyRegistered = registerOpbeatModule(services)
  patchAngularBootstrap(opbeatBootstrap)
}

function registerOpbeatModule (services) {
  return ngOpbeat(services)
}

module.exports = initialize

},{"./ngOpbeat":28,"./patches/bootstrapPatch":30,"opbeat-js-core":13}],28:[function(_dereq_,module,exports){
var patchController = _dereq_('./patches/controllerPatch')
var patchCompile = _dereq_('./patches/compilePatch')
var patchRootScope = _dereq_('./patches/rootScopePatch')
var patchDirectives = _dereq_('./patches/directivesPatch')
var patchExceptionHandler = _dereq_('./patches/exceptionHandlerPatch')
var patchInteractions = _dereq_('./patches/interactionsPatch')

var utils = _dereq_('opbeat-js-core').utils

function NgOpbeatProvider (logger, configService, exceptionHandler) {
  this.config = function config (properties) {
    if (properties) {
      configService.setConfig(properties)
    }
  }

  this.version = configService.get('VERSION')

  this.install = function install () {
    logger.warn('$opbeatProvider.install is deprecated!')
  }

  this.$get = [
    function () {
      return {
        getConfig: function config () {
          return configService
        },
        captureException: function captureException (exception, options) {
          if (!(exception instanceof Error)) {
            logger.warn("Can't capture exception. Passed exception needs to be an instanceof Error")
            return
          }

          // TraceKit.report will re-raise any exception passed to it,
          // which means you have to wrap it in try/catch. Instead, we
          // can wrap it here and only re-raise if TraceKit.report
          // raises an exception different from the one we asked to
          // report on.

          exceptionHandler.processError(exception, options)
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

function patchAll ($provide, transactionService) {
  patchExceptionHandler($provide)
  patchController($provide, transactionService)
  patchCompile($provide, transactionService)
  patchRootScope($provide, transactionService)
  patchDirectives($provide, transactionService)
  patchInteractions($provide, transactionService)
}

function publishExternalApi (spec) {
  var opbeat = window.opbeat || (window.opbeat = {})
  utils.extend(opbeat, spec)
}

function noop () {}

function registerOpbeatModule (services) {
  var transactionService = services.transactionService
  var logger = services.logger
  var configService = services.configService
  var exceptionHandler = services.exceptionHandler
  var angularInitializer = services.angularInitializer

  var routeChanged = false
  var hardNavigation = true

  function moduleRun ($rootScope, $injector) {
    configService.set('isInstalled', true)
    configService.set('opbeatAgentName', 'opbeat-angular')
    configService.set('platform.framework', 'angular/' + window.angular.version.full)

    var platform = getPlatform()
    if (platform) {
      configService.set('platform.platform', platform)
    }

    logger.debug('Agent:', configService.getAgentName())

    function startRouteChange (name) {
      routeChanged = true
      if (!configService.get('performance.enable')) {
        logger.debug('Performance monitoring is disable')
        return
      }
      logger.debug('Route change started')
      var transactionName = name
      if (transactionName === '' || typeof transactionName === 'undefined') {
        transactionName = '/'
      }

      var tr = transactionService.startTransaction(transactionName, 'route-change')
      if (tr && hardNavigation) {
        hardNavigation = false
        tr.isHardNavigation = true
      }
    }

    function onRouteChangeStart (event, current) {
      var transactionName
      if (current && current.$$route) { // ngRoute
        // ignoring redirects since we will get another event
        if (typeof current.$$route.redirectTo !== 'undefined') {
          return
        }
        transactionName = current.$$route.originalPath
      } else if (current && current.name) { // UI Router
        transactionName = current.name
      }
      startRouteChange(transactionName)
    }

    // ui-router 1
    if ($injector.has('$transitions')) {
      var $transitions = $injector.get('$transitions')

      $transitions.onStart({ }, function uiRouterOnStart (trans) {
        var to = trans.to()
        startRouteChange(to.name)
      })
    } else {

      // ng-router
      $rootScope.$on('$routeChangeStart', onRouteChangeStart)

      // ui-router
      $rootScope.$on('$stateChangeStart', onRouteChangeStart)
    }
  }

  function moduleConfig ($provide) {
    patchAll($provide, transactionService)
  }

  function getPlatform () {
    var isCordovaApp = (typeof window.cordova !== 'undefined')
    if (isCordovaApp) {
      return 'cordova'
    } else {
      return 'browser'
    }
  }

  publishExternalApi({
    'setInitialPageLoadName': function setInitialPageLoadName (name) {
      transactionService.initialPageLoadName = name
    }
  })

  if (window.angular && typeof window.angular.module === 'function') {
    if (!configService.isPlatformSupported()) {
      window.angular.module('ngOpbeat', [])
        .provider('$opbeat', new NgOpbeatProvider(logger, configService, exceptionHandler))
        .config(['$provide', noop])
        .run(['$rootScope', noop])
    } else {
      window.angular.module('ngOpbeat', [])
        .provider('$opbeat', new NgOpbeatProvider(logger, configService, exceptionHandler))
        .config(['$provide', moduleConfig])
        .run(['$rootScope', '$injector', moduleRun])

      angularInitializer.beforeBootstrap = function beforeBootstrap () {
        transactionService.metrics['appBeforeBootstrap'] = performance.now()
      }
      angularInitializer.afterBootstrap = function afterBootstrap () {
        transactionService.metrics['appAfterBootstrap'] = performance.now()
        if (!routeChanged) {
          transactionService.sendPageLoadMetrics()
        }
      }
    }
    window.angular.module('opbeat-angular', ['ngOpbeat'])
    return true
  }
}

module.exports = registerOpbeatModule

},{"./patches/compilePatch":31,"./patches/controllerPatch":32,"./patches/directivesPatch":33,"./patches/exceptionHandlerPatch":34,"./patches/interactionsPatch":35,"./patches/rootScopePatch":36,"opbeat-js-core":13}],29:[function(_dereq_,module,exports){
var opbeatCore = _dereq_('opbeat-js-core')
var ServiceFactory = opbeatCore.ServiceFactory
var angularInitializer = _dereq_('./angularInitializer')

_dereq_('opbeat-zone')
function init () {
  var serviceFactory = new ServiceFactory()
  if (window.opbeatApi && window.opbeatApi.serviceFactory) {
    serviceFactory = window.opbeatApi.serviceFactory
  }
  angularInitializer(serviceFactory)
}

init()

},{"./angularInitializer":27,"opbeat-js-core":13,"opbeat-zone":23}],30:[function(_dereq_,module,exports){
var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'
var deferRegex = new RegExp('^' + DEFER_LABEL + '.*')

function patchMainBootstrap (opbeatBootstrap, weDeferred) {
  if (typeof window.angular === 'undefined') {
    return
  }
  var originalBootstrapFn = window.angular.bootstrap

  function bootstrap (element, modules) {
    if (weDeferred && deferRegex.test(window.name)) {
      window.name = window.name.substring(DEFER_LABEL.length)
    }
    return opbeatBootstrap(originalBootstrapFn, window.angular, arguments)
  }

  Object.defineProperty(window.angular, 'bootstrap', {
    get: function () {
      if (typeof originalBootstrapFn === 'function') {
        return bootstrap
      } else {
        return originalBootstrapFn
      }
    },
    set: function (bootstrapFn) {
      originalBootstrapFn = bootstrapFn
    }
  })
}

function patchDeferredBootstrap (opbeatBootstrap) {
  if (typeof window.angular === 'undefined') {
    return
  }
  // If the bootstrap is already deferred. (like run by Protractor)
  // In this case `resumeBootstrap` should be patched
  if (deferRegex.test(window.name)) {
    var originalResumeBootstrap = window.angular.resumeBootstrap
    Object.defineProperty(window.angular, 'resumeBootstrap', {
      get: function () {
        if (typeof originalResumeBootstrap === 'function') {
          return function (modules) {
            return opbeatBootstrap(originalResumeBootstrap, window.angular, arguments)
          }
        } else {
          return originalResumeBootstrap
        }
      },
      set: function (resumeBootstrap) {
        originalResumeBootstrap = resumeBootstrap
      }
    })
    // we have not deferred the bootstrap
    return false
  } else { // If this is not a test, defer bootstrapping
    window.name = DEFER_LABEL + window.name

    window.angular.resumeDeferredBootstrap = function () {
      var modules = []
      return opbeatBootstrap(window.angular.resumeBootstrap, window.angular, [modules])
    }
    /* angular should remove DEFER_LABEL from window.name, but if angular is never loaded, we want
     to remove it ourselves */
    window.addEventListener('beforeunload', function () {
      if (deferRegex.test(window.name)) {
        window.name = window.name.substring(DEFER_LABEL.length)
      }
    })
    // we have deferred the bootstrap
    return true
  }
}

function createAngular (opbeatBootstrap) {
  // with this method we can initialize opbeat-angular before or after angular is loaded
  var alreadyPatched = false
  var originalAngular = window.angular
  // todo: check if defineProperty exists, add it isPlatformSupported
  // we don't support browsers that don't have defineProperty (IE<9)
  Object.defineProperty(window, 'angular', {
    get: function () {
      return originalAngular
    },
    set: function (value) {
      originalAngular = value
      if (!alreadyPatched && typeof originalAngular === 'object') {
        alreadyPatched = true
        patchAll(opbeatBootstrap)
      }
    },
    enumerable: true,
    configurable: true
  })
}

function patchAll (opbeatBootstrap) {
  var weDeferred = patchDeferredBootstrap(opbeatBootstrap)
  patchMainBootstrap(opbeatBootstrap, weDeferred)
}

function patchAngularBootstrap (opbeatBootstrap) {
  if (window.angular) {
    patchAll(opbeatBootstrap)
  } else {
    createAngular(opbeatBootstrap)
  }
}

module.exports = patchAngularBootstrap

},{}],31:[function(_dereq_,module,exports){
var opbeatCore = _dereq_('opbeat-js-core')
var patchUtils = opbeatCore.patchUtils
var utils = opbeatCore.utils
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

},{"opbeat-js-core":13}],32:[function(_dereq_,module,exports){
var utils = _dereq_('opbeat-js-core').utils

function getControllerInfoFromArgs (args) {
  var scope, name

  if (typeof args[0] === 'string') {
    name = args[0]
  } else if (typeof args[0] === 'function') {
    name = args[0].name
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

},{"opbeat-js-core":13}],33:[function(_dereq_,module,exports){
var utils = _dereq_('opbeat-js-core').utils
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

},{"opbeat-js-core":13}],34:[function(_dereq_,module,exports){

module.exports = function patchExceptionHandler ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

},{}],35:[function(_dereq_,module,exports){
module.exports = function ($provide, transactionService) {
  'use strict'
  function patchEventDirective (delegate, eventName) {
    var nativeCompile = delegate.compile
    delegate.compile = function () {
      var nativeLink = nativeCompile.apply(this, arguments)
      return function (scope, element, attributes) {
        var directiveName = attributes.$normalize('ng-' + eventName)
        var action = attributes[directiveName]
        element.on(eventName, function (event) {
          transactionService.startTransaction(directiveName + ': ' + action, 'interaction')
        })
        return nativeLink.apply(this, arguments)
      }
    }
  }

  $provide.decorator('ngSubmitDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var directive = $delegate[0]
    patchEventDirective(directive, 'submit')
    return $delegate
  }])

  $provide.decorator('ngClickDirective', ['$delegate', '$injector', function ($delegate, $injector) {
    var ngClick = $delegate[0]
    patchEventDirective(ngClick, 'click')
    return $delegate
  }])
}

},{}],36:[function(_dereq_,module,exports){
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

},{}]},{},[29]);
