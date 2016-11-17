(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
(function (process){
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {"use strict";
	__webpack_require__(1);
	var event_target_1 = __webpack_require__(2);
	var define_property_1 = __webpack_require__(4);
	var register_element_1 = __webpack_require__(5);
	var property_descriptor_1 = __webpack_require__(6);
	var timers_1 = __webpack_require__(8);
	var utils_1 = __webpack_require__(3);
	var set = 'set';
	var clear = 'clear';
	var blockingMethods = ['alert', 'prompt', 'confirm'];
	var _global = typeof window == 'undefined' ? global : window;
	timers_1.patchTimer(_global, set, clear, 'Timeout');
	timers_1.patchTimer(_global, set, clear, 'Interval');
	timers_1.patchTimer(_global, set, clear, 'Immediate');
	timers_1.patchTimer(_global, 'request', 'cancel', 'AnimationFrame');
	timers_1.patchTimer(_global, 'mozRequest', 'mozCancel', 'AnimationFrame');
	timers_1.patchTimer(_global, 'webkitRequest', 'webkitCancel', 'AnimationFrame');
	for (var i = 0; i < blockingMethods.length; i++) {
	    var name = blockingMethods[i];
	    utils_1.patchMethod(_global, name, function (delegate, symbol, name) {
	        return function (s, args) {
	            return Zone.current.run(delegate, _global, args, name);
	        };
	    });
	}
	event_target_1.eventTargetPatch(_global);
	property_descriptor_1.propertyDescriptorPatch(_global);
	utils_1.patchClass('MutationObserver');
	utils_1.patchClass('WebKitMutationObserver');
	utils_1.patchClass('FileReader');
	define_property_1.propertyPatch();
	register_element_1.registerElementPatch(_global);
	// Treat XMLHTTPRequest as a macrotask.
	patchXHR(_global);
	var XHR_TASK = utils_1.zoneSymbol('xhrTask');
	function patchXHR(window) {
	    function findPendingTask(target) {
	        var pendingTask = target[XHR_TASK];
	        return pendingTask;
	    }
	    function scheduleTask(task) {
	        var data = task.data;
	        data.target.addEventListener('readystatechange', function () {
	            if (data.target.readyState === data.target.DONE) {
	                if (!data.aborted) {
	                    task.invoke();
	                }
	            }
	        });
	        var storedTask = data.target[XHR_TASK];
	        if (!storedTask) {
	            data.target[XHR_TASK] = task;
	        }
	        setNative.apply(data.target, data.args);
	        return task;
	    }
	    function placeholderCallback() {
	    }
	    function clearTask(task) {
	        var data = task.data;
	        // Note - ideally, we would call data.target.removeEventListener here, but it's too late
	        // to prevent it from firing. So instead, we store info for the event listener.
	        data.aborted = true;
	        return clearNative.apply(data.target, data.args);
	    }
	    var setNative = utils_1.patchMethod(window.XMLHttpRequest.prototype, 'send', function () { return function (self, args) {
	        var zone = Zone.current;
	        var options = {
	            target: self,
	            isPeriodic: false,
	            delay: null,
	            args: args,
	            aborted: false
	        };
	        return zone.scheduleMacroTask('XMLHttpRequest.send', placeholderCallback, options, scheduleTask, clearTask);
	    }; });
	    var clearNative = utils_1.patchMethod(window.XMLHttpRequest.prototype, 'abort', function (delegate) { return function (self, args) {
	        var task = findPendingTask(self);
	        if (task && typeof task.type == 'string') {
	            // If the XHR has already completed, do nothing.
	            if (task.cancelFn == null) {
	                return;
	            }
	            task.zone.cancelTask(task);
	        }
	        // Otherwise, we are trying to abort an XHR which has not yet been sent, so there is no task to cancel. Do nothing.
	    }; });
	}
	/// GEO_LOCATION
	if (_global['navigator'] && _global['navigator'].geolocation) {
	    utils_1.patchPrototype(_global['navigator'].geolocation, [
	        'getCurrentPosition',
	        'watchPosition'
	    ]);
	}

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 1 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {;
	;
	var Zone = (function (global) {
	    if (global.Zone) {
	        throw new Error('Zone already loaded.');
	    }
	    var Zone = (function () {
	        function Zone(parent, zoneSpec) {
	            this._properties = null;
	            this._parent = parent;
	            this._name = zoneSpec ? zoneSpec.name || 'unnamed' : '<root>';
	            this._properties = zoneSpec && zoneSpec.properties || {};
	            this._zoneDelegate = new ZoneDelegate(this, this._parent && this._parent._zoneDelegate, zoneSpec);
	        }
	        Object.defineProperty(Zone, "current", {
	            get: function () { return _currentZone; },
	            enumerable: true,
	            configurable: true
	        });
	        ;
	        Object.defineProperty(Zone, "currentTask", {
	            get: function () { return _currentTask; },
	            enumerable: true,
	            configurable: true
	        });
	        ;
	        Object.defineProperty(Zone.prototype, "parent", {
	            get: function () { return this._parent; },
	            enumerable: true,
	            configurable: true
	        });
	        ;
	        Object.defineProperty(Zone.prototype, "name", {
	            get: function () { return this._name; },
	            enumerable: true,
	            configurable: true
	        });
	        ;
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
	            if (applyThis === void 0) { applyThis = null; }
	            if (applyArgs === void 0) { applyArgs = null; }
	            if (source === void 0) { source = null; }
	            var oldZone = _currentZone;
	            _currentZone = this;
	            try {
	                return this._zoneDelegate.invoke(this, callback, applyThis, applyArgs, source);
	            }
	            finally {
	                _currentZone = oldZone;
	            }
	        };
	        Zone.prototype.runGuarded = function (callback, applyThis, applyArgs, source) {
	            if (applyThis === void 0) { applyThis = null; }
	            if (applyArgs === void 0) { applyArgs = null; }
	            if (source === void 0) { source = null; }
	            var oldZone = _currentZone;
	            _currentZone = this;
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
	                _currentZone = oldZone;
	            }
	        };
	        Zone.prototype.runTask = function (task, applyThis, applyArgs) {
	            task.runCount++;
	            if (task.zone != this)
	                throw new Error('A task can only be run in the zone which created it! (Creation: ' +
	                    task.zone.name + '; Execution: ' + this.name + ')');
	            var previousTask = _currentTask;
	            _currentTask = task;
	            var oldZone = _currentZone;
	            _currentZone = this;
	            try {
	                if (task.type == 'macroTask' && task.data && !task.data.isPeriodic) {
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
	                _currentZone = oldZone;
	                _currentTask = previousTask;
	            }
	        };
	        Zone.prototype.scheduleMicroTask = function (source, callback, data, customSchedule) {
	            return this._zoneDelegate.scheduleTask(this, new ZoneTask('microTask', this, source, callback, data, customSchedule, null));
	        };
	        Zone.prototype.scheduleMacroTask = function (source, callback, data, customSchedule, customCancel) {
	            return this._zoneDelegate.scheduleTask(this, new ZoneTask('macroTask', this, source, callback, data, customSchedule, customCancel));
	        };
	        Zone.prototype.scheduleEventTask = function (source, callback, data, customSchedule, customCancel) {
	            return this._zoneDelegate.scheduleTask(this, new ZoneTask('eventTask', this, source, callback, data, customSchedule, customCancel));
	        };
	        Zone.prototype.cancelTask = function (task) {
	            var value = this._zoneDelegate.cancelTask(this, task);
	            task.runCount = -1;
	            task.cancelFn = null;
	            return value;
	        };
	        Zone.__symbol__ = __symbol__;
	        return Zone;
	    }());
	    ;
	    var ZoneDelegate = (function () {
	        function ZoneDelegate(zone, parentDelegate, zoneSpec) {
	            this._taskCounts = { microTask: 0, macroTask: 0, eventTask: 0 };
	            this.zone = zone;
	            this._parentDelegate = parentDelegate;
	            this._forkZS = zoneSpec && (zoneSpec && zoneSpec.onFork ? zoneSpec : parentDelegate._forkZS);
	            this._forkDlgt = zoneSpec && (zoneSpec.onFork ? parentDelegate : parentDelegate._forkDlgt);
	            this._interceptZS = zoneSpec && (zoneSpec.onIntercept ? zoneSpec : parentDelegate._interceptZS);
	            this._interceptDlgt = zoneSpec && (zoneSpec.onIntercept ? parentDelegate : parentDelegate._interceptDlgt);
	            this._invokeZS = zoneSpec && (zoneSpec.onInvoke ? zoneSpec : parentDelegate._invokeZS);
	            this._invokeDlgt = zoneSpec && (zoneSpec.onInvoke ? parentDelegate : parentDelegate._invokeDlgt);
	            this._handleErrorZS = zoneSpec && (zoneSpec.onHandleError ? zoneSpec : parentDelegate._handleErrorZS);
	            this._handleErrorDlgt = zoneSpec && (zoneSpec.onHandleError ? parentDelegate : parentDelegate._handleErrorDlgt);
	            this._scheduleTaskZS = zoneSpec && (zoneSpec.onScheduleTask ? zoneSpec : parentDelegate._scheduleTaskZS);
	            this._scheduleTaskDlgt = zoneSpec && (zoneSpec.onScheduleTask ? parentDelegate : parentDelegate._scheduleTaskDlgt);
	            this._invokeTaskZS = zoneSpec && (zoneSpec.onInvokeTask ? zoneSpec : parentDelegate._invokeTaskZS);
	            this._invokeTaskDlgt = zoneSpec && (zoneSpec.onInvokeTask ? parentDelegate : parentDelegate._invokeTaskDlgt);
	            this._cancelTaskZS = zoneSpec && (zoneSpec.onCancelTask ? zoneSpec : parentDelegate._cancelTaskZS);
	            this._cancelTaskDlgt = zoneSpec && (zoneSpec.onCancelTask ? parentDelegate : parentDelegate._cancelTaskDlgt);
	            this._hasTaskZS = zoneSpec && (zoneSpec.onHasTask ? zoneSpec : parentDelegate._hasTaskZS);
	            this._hasTaskDlgt = zoneSpec && (zoneSpec.onHasTask ? parentDelegate : parentDelegate._hasTaskDlgt);
	        }
	        ZoneDelegate.prototype.fork = function (targetZone, zoneSpec) {
	            return this._forkZS
	                ? this._forkZS.onFork(this._forkDlgt, this.zone, targetZone, zoneSpec)
	                : new Zone(targetZone, zoneSpec);
	        };
	        ZoneDelegate.prototype.intercept = function (targetZone, callback, source) {
	            return this._interceptZS
	                ? this._interceptZS.onIntercept(this._interceptDlgt, this.zone, targetZone, callback, source)
	                : callback;
	        };
	        ZoneDelegate.prototype.invoke = function (targetZone, callback, applyThis, applyArgs, source) {
	            return this._invokeZS
	                ? this._invokeZS.onInvoke(this._invokeDlgt, this.zone, targetZone, callback, applyThis, applyArgs, source)
	                : callback.apply(applyThis, applyArgs);
	        };
	        ZoneDelegate.prototype.handleError = function (targetZone, error) {
	            return this._handleErrorZS
	                ? this._handleErrorZS.onHandleError(this._handleErrorDlgt, this.zone, targetZone, error)
	                : true;
	        };
	        ZoneDelegate.prototype.scheduleTask = function (targetZone, task) {
	            try {
	                if (this._scheduleTaskZS) {
	                    return this._scheduleTaskZS.onScheduleTask(this._scheduleTaskDlgt, this.zone, targetZone, task);
	                }
	                else if (task.scheduleFn) {
	                    task.scheduleFn(task);
	                }
	                else if (task.type == 'microTask') {
	                    scheduleMicroTask(task);
	                }
	                else {
	                    throw new Error('Task is missing scheduleFn.');
	                }
	                return task;
	            }
	            finally {
	                if (targetZone == this.zone) {
	                    this._updateTaskCount(task.type, 1);
	                }
	            }
	        };
	        ZoneDelegate.prototype.invokeTask = function (targetZone, task, applyThis, applyArgs) {
	            try {
	                return this._invokeTaskZS
	                    ? this._invokeTaskZS.onInvokeTask(this._invokeTaskDlgt, this.zone, targetZone, task, applyThis, applyArgs)
	                    : task.callback.apply(applyThis, applyArgs);
	            }
	            finally {
	                if (targetZone == this.zone && (task.type != 'eventTask') && !(task.data && task.data.isPeriodic)) {
	                    this._updateTaskCount(task.type, -1);
	                }
	            }
	        };
	        ZoneDelegate.prototype.cancelTask = function (targetZone, task) {
	            var value;
	            if (this._cancelTaskZS) {
	                value = this._cancelTaskZS.onCancelTask(this._cancelTaskDlgt, this.zone, targetZone, task);
	            }
	            else if (!task.cancelFn) {
	                return; // throw new Error('Task does not support cancellation, or is already canceled.');
	            }
	            else {
	                value = task.cancelFn(task);
	            }
	            if (targetZone == this.zone) {
	                // this should not be in the finally block, because exceptions assume not canceled.
	                this._updateTaskCount(task.type, -1);
	            }
	            return value;
	        };
	        ZoneDelegate.prototype.hasTask = function (targetZone, isEmpty) {
	            return this._hasTaskZS && this._hasTaskZS.onHasTask(this._hasTaskDlgt, this.zone, targetZone, isEmpty);
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
	                try {
	                    this.hasTask(this.zone, isEmpty);
	                }
	                finally {
	                    if (this._parentDelegate) {
	                        this._parentDelegate._updateTaskCount(type, count);
	                    }
	                }
	            }
	        };
	        return ZoneDelegate;
	    }());
	    var ZoneTask = (function () {
	        function ZoneTask(type, zone, source, callback, options, scheduleFn, cancelFn) {
	            this.runCount = 0;
	            this.type = type;
	            this.zone = zone;
	            this.source = source;
	            this.data = options;
	            this.scheduleFn = scheduleFn;
	            this.cancelFn = cancelFn;
	            this.callback = callback;
	            var self = this;
	            this.invoke = function () {
	                _numberOfNestedTaskFrames++;
	                try {
	                    return zone.runTask(self, this, arguments);
	                }
	                finally {
	                    if (_numberOfNestedTaskFrames == 1) {
	                        drainMicroTaskQueue();
	                    }
	                    _numberOfNestedTaskFrames--;
	                }
	            };
	        }
	        ZoneTask.prototype.toString = function () {
	            if (this.data && typeof this.data.handleId !== 'undefined') {
	                return this.data.handleId;
	            }
	            else {
	                return this.toString();
	            }
	        };
	        return ZoneTask;
	    }());
	    function __symbol__(name) { return '__zone_symbol__' + name; }
	    ;
	    var symbolSetTimeout = __symbol__('setTimeout');
	    var symbolPromise = __symbol__('Promise');
	    var symbolThen = __symbol__('then');
	    var _currentZone = new Zone(null, null);
	    var _currentTask = null;
	    var _microTaskQueue = [];
	    var _isDrainingMicrotaskQueue = false;
	    var _uncaughtPromiseErrors = [];
	    var _numberOfNestedTaskFrames = 0;
	    function scheduleQueueDrain() {
	        // if we are not running in any task, and there has not been anything scheduled
	        // we must bootstrap the initial task creation by manually scheduling the drain
	        if (_numberOfNestedTaskFrames == 0 && _microTaskQueue.length == 0) {
	            // We are not running in Task, so we need to kickstart the microtask queue.
	            if (global[symbolPromise]) {
	                global[symbolPromise].resolve(0)[symbolThen](drainMicroTaskQueue);
	            }
	            else {
	                global[symbolSetTimeout](drainMicroTaskQueue, 0);
	            }
	        }
	    }
	    function scheduleMicroTask(task) {
	        scheduleQueueDrain();
	        _microTaskQueue.push(task);
	    }
	    function consoleError(e) {
	        var rejection = e && e.rejection;
	        if (rejection) {
	            console.error('Unhandled Promise rejection:', rejection instanceof Error ? rejection.message : rejection, '; Zone:', e.zone.name, '; Task:', e.task && e.task.source, '; Value:', rejection, rejection instanceof Error ? rejection.stack : undefined);
	        }
	        console.error(e);
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
	                    catch (e) {
	                        consoleError(e);
	                    }
	                }
	            }
	            while (_uncaughtPromiseErrors.length) {
	                var _loop_1 = function() {
	                    var uncaughtPromiseError = _uncaughtPromiseErrors.shift();
	                    try {
	                        uncaughtPromiseError.zone.runGuarded(function () { throw uncaughtPromiseError; });
	                    }
	                    catch (e) {
	                        consoleError(e);
	                    }
	                };
	                while (_uncaughtPromiseErrors.length) {
	                    _loop_1();
	                }
	            }
	            _isDrainingMicrotaskQueue = false;
	        }
	    }
	    function isThenable(value) {
	        return value && value.then;
	    }
	    function forwardResolution(value) { return value; }
	    function forwardRejection(rejection) { return ZoneAwarePromise.reject(rejection); }
	    var symbolState = __symbol__('state');
	    var symbolValue = __symbol__('value');
	    var source = 'Promise.then';
	    var UNRESOLVED = null;
	    var RESOLVED = true;
	    var REJECTED = false;
	    var REJECTED_NO_CATCH = 0;
	    function makeResolver(promise, state) {
	        return function (v) {
	            resolvePromise(promise, state, v);
	            // Do not return value or you will break the Promise spec.
	        };
	    }
	    function resolvePromise(promise, state, value) {
	        if (promise[symbolState] === UNRESOLVED) {
	            if (value instanceof ZoneAwarePromise && value[symbolState] !== UNRESOLVED) {
	                clearRejectedNoCatch(value);
	                resolvePromise(promise, value[symbolState], value[symbolValue]);
	            }
	            else if (isThenable(value)) {
	                value.then(makeResolver(promise, state), makeResolver(promise, false));
	            }
	            else {
	                promise[symbolState] = state;
	                var queue = promise[symbolValue];
	                promise[symbolValue] = value;
	                for (var i = 0; i < queue.length;) {
	                    scheduleResolveOrReject(promise, queue[i++], queue[i++], queue[i++], queue[i++]);
	                }
	                if (queue.length == 0 && state == REJECTED) {
	                    promise[symbolState] = REJECTED_NO_CATCH;
	                    try {
	                        throw new Error("Uncaught (in promise): " + value);
	                    }
	                    catch (e) {
	                        var error = e;
	                        error.rejection = value;
	                        error.promise = promise;
	                        error.zone = Zone.current;
	                        error.task = Zone.currentTask;
	                        _uncaughtPromiseErrors.push(error);
	                        scheduleQueueDrain();
	                    }
	                }
	            }
	        }
	        // Resolving an already resolved promise is a noop.
	        return promise;
	    }
	    function clearRejectedNoCatch(promise) {
	        if (promise[symbolState] === REJECTED_NO_CATCH) {
	            promise[symbolState] = REJECTED;
	            for (var i = 0; i < _uncaughtPromiseErrors.length; i++) {
	                if (promise === _uncaughtPromiseErrors[i].promise) {
	                    _uncaughtPromiseErrors.splice(i, 1);
	                    break;
	                }
	            }
	        }
	    }
	    function scheduleResolveOrReject(promise, zone, chainPromise, onFulfilled, onRejected) {
	        clearRejectedNoCatch(promise);
	        var delegate = promise[symbolState] ? onFulfilled || forwardResolution : onRejected || forwardRejection;
	        zone.scheduleMicroTask(source, function () {
	            try {
	                resolvePromise(chainPromise, true, zone.run(delegate, null, [promise[symbolValue]]));
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
	            catch (e) {
	                resolvePromise(promise, false, e);
	            }
	        }
	        ZoneAwarePromise.resolve = function (value) {
	            return resolvePromise(new this(null), RESOLVED, value);
	        };
	        ZoneAwarePromise.reject = function (error) {
	            return resolvePromise(new this(null), REJECTED, error);
	        };
	        ZoneAwarePromise.race = function (values) {
	            var resolve;
	            var reject;
	            var promise = new this(function (res, rej) { resolve = res; reject = rej; });
	            function onResolve(value) { promise && (promise = null || resolve(value)); }
	            function onReject(error) { promise && (promise = null || reject(error)); }
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
	            var promise = new this(function (res, rej) { resolve = res; reject = rej; });
	            var count = 0;
	            var resolvedValues = [];
	            function onReject(error) { promise && reject(error); promise = null; }
	            for (var _i = 0, values_2 = values; _i < values_2.length; _i++) {
	                var value = values_2[_i];
	                if (!isThenable(value)) {
	                    value = this.resolve(value);
	                }
	                value.then((function (index) { return function (value) {
	                    resolvedValues[index] = value;
	                    count--;
	                    if (promise && !count) {
	                        resolve(resolvedValues);
	                    }
	                    promise == null;
	                }; })(count), onReject);
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
	    var NativePromise = global[__symbol__('Promise')] = global.Promise;
	    global.Promise = ZoneAwarePromise;
	    if (NativePromise) {
	        var NativePromiseProtototype = NativePromise.prototype;
	        var NativePromiseThen_1 = NativePromiseProtototype[__symbol__('then')]
	            = NativePromiseProtototype.then;
	        NativePromiseProtototype.then = function (onResolve, onReject) {
	            var nativePromise = this;
	            return new ZoneAwarePromise(function (resolve, reject) {
	                NativePromiseThen_1.call(nativePromise, resolve, reject);
	            }).then(onResolve, onReject);
	        };
	    }
	    // This is not part of public API, but it is usefull for tests, so we expose it.
	    Promise[Zone.__symbol__('uncaughtPromiseErrors')] = _uncaughtPromiseErrors;
	    return global.Zone = Zone;
	})(typeof window === 'undefined' ? global : window);

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var utils_1 = __webpack_require__(3);
	var WTF_ISSUE_555 = 'Anchor,Area,Audio,BR,Base,BaseFont,Body,Button,Canvas,Content,DList,Directory,Div,Embed,FieldSet,Font,Form,Frame,FrameSet,HR,Head,Heading,Html,IFrame,Image,Input,Keygen,LI,Label,Legend,Link,Map,Marquee,Media,Menu,Meta,Meter,Mod,OList,Object,OptGroup,Option,Output,Paragraph,Pre,Progress,Quote,Script,Select,Source,Span,Style,TableCaption,TableCell,TableCol,Table,TableRow,TableSection,TextArea,Title,Track,UList,Unknown,Video';
	var NO_EVENT_TARGET = 'ApplicationCache,EventSource,FileReader,InputMethodContext,MediaController,MessagePort,Node,Performance,SVGElementInstance,SharedWorker,TextTrack,TextTrackCue,TextTrackList,WebKitNamedFlow,Window,Worker,WorkerGlobalScope,XMLHttpRequest,XMLHttpRequestEventTarget,XMLHttpRequestUpload,IDBRequest,IDBOpenDBRequest,IDBDatabase,IDBTransaction,IDBCursor,DBIndex'.split(',');
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
	        utils_1.patchEventTargetMethods(type && type.prototype);
	    }
	}
	exports.eventTargetPatch = eventTargetPatch;


/***/ },
/* 3 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * Suppress closure compiler errors about unknown 'process' variable
	 * @fileoverview
	 * @suppress {undefinedVars}
	 */
	"use strict";
	exports.zoneSymbol = Zone['__symbol__'];
	var _global = typeof window == 'undefined' ? global : window;
	function bindArguments(args, source) {
	    for (var i = args.length - 1; i >= 0; i--) {
	        if (typeof args[i] === 'function') {
	            args[i] = Zone.current.wrap(args[i], source + '_' + i);
	        }
	    }
	    return args;
	}
	exports.bindArguments = bindArguments;
	;
	function patchPrototype(prototype, fnNames) {
	    var source = prototype.constructor['name'];
	    var _loop_1 = function(i) {
	        var name_1 = fnNames[i];
	        var delegate = prototype[name_1];
	        if (delegate) {
	            prototype[name_1] = (function (delegate) {
	                return function () {
	                    return delegate.apply(this, bindArguments(arguments, source + '.' + name_1));
	                };
	            })(delegate);
	        }
	    };
	    for (var i = 0; i < fnNames.length; i++) {
	        _loop_1(i);
	    }
	}
	exports.patchPrototype = patchPrototype;
	;
	exports.isWebWorker = (typeof WorkerGlobalScope !== 'undefined' && self instanceof WorkerGlobalScope);
	exports.isNode = (typeof process !== 'undefined' && {}.toString.call(process) === '[object process]');
	exports.isBrowser = !exports.isNode && !exports.isWebWorker && !!(typeof window !== 'undefined' && window['HTMLElement']);
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
	            var wrapFn = function (event) {
	                var result;
	                result = fn.apply(this, arguments);
	                if (result != undefined && !result)
	                    event.preventDefault();
	            };
	            this[_prop] = wrapFn;
	            this.addEventListener(eventName, wrapFn, false);
	        }
	        else {
	            this[_prop] = null;
	        }
	    };
	    // The getter would return undefined for unassigned properties but the default value of an unassigned property is null
	    desc.get = function () {
	        return this[_prop] || null;
	    };
	    Object.defineProperty(obj, prop, desc);
	}
	exports.patchProperty = patchProperty;
	;
	function patchOnProperties(obj, properties) {
	    var onProperties = [];
	    for (var prop in obj) {
	        if (prop.substr(0, 2) == 'on') {
	            onProperties.push(prop);
	        }
	    }
	    for (var j = 0; j < onProperties.length; j++) {
	        patchProperty(obj, onProperties[j]);
	    }
	    if (properties) {
	        for (var i = 0; i < properties.length; i++) {
	            patchProperty(obj, 'on' + properties[i]);
	        }
	    }
	}
	exports.patchOnProperties = patchOnProperties;
	;
	var EVENT_TASKS = exports.zoneSymbol('eventTasks');
	var ADD_EVENT_LISTENER = 'addEventListener';
	var REMOVE_EVENT_LISTENER = 'removeEventListener';
	var SYMBOL_ADD_EVENT_LISTENER = exports.zoneSymbol(ADD_EVENT_LISTENER);
	var SYMBOL_REMOVE_EVENT_LISTENER = exports.zoneSymbol(REMOVE_EVENT_LISTENER);
	function findExistingRegisteredTask(target, handler, name, capture, remove) {
	    var eventTasks = target[EVENT_TASKS];
	    if (eventTasks) {
	        for (var i = 0; i < eventTasks.length; i++) {
	            var eventTask = eventTasks[i];
	            var data = eventTask.data;
	            if (data.handler === handler
	                && data.useCapturing === capture
	                && data.eventName === name) {
	                if (remove) {
	                    eventTasks.splice(i, 1);
	                }
	                return eventTask;
	            }
	        }
	    }
	    return null;
	}
	function attachRegisteredEvent(target, eventTask) {
	    var eventTasks = target[EVENT_TASKS];
	    if (!eventTasks) {
	        eventTasks = target[EVENT_TASKS] = [];
	    }
	    eventTasks.push(eventTask);
	}
	function scheduleEventListener(eventTask) {
	    var meta = eventTask.data;
	    attachRegisteredEvent(meta.target, eventTask);
	    return meta.target[SYMBOL_ADD_EVENT_LISTENER](meta.eventName, eventTask.invoke, meta.useCapturing);
	}
	function cancelEventListener(eventTask) {
	    var meta = eventTask.data;
	    findExistingRegisteredTask(meta.target, eventTask.invoke, meta.eventName, meta.useCapturing, true);
	    meta.target[SYMBOL_REMOVE_EVENT_LISTENER](meta.eventName, eventTask.invoke, meta.useCapturing);
	}
	function zoneAwareAddEventListener(self, args) {
	    var eventName = args[0];
	    var handler = args[1];
	    var useCapturing = args[2] || false;
	    // - Inside a Web Worker, `this` is undefined, the context is `global`
	    // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
	    // see https://github.com/angular/zone.js/issues/190
	    var target = self || _global;
	    var delegate = null;
	    if (typeof handler == 'function') {
	        delegate = handler;
	    }
	    else if (handler && handler.handleEvent) {
	        delegate = function (event) { return handler.handleEvent(event); };
	    }
	    var validZoneHandler = false;
	    try {
	        // In cross site contexts (such as WebDriver frameworks like Selenium),
	        // accessing the handler object here will cause an exception to be thrown which
	        // will fail tests prematurely.
	        validZoneHandler = handler && handler.toString() === "[object FunctionWrapper]";
	    }
	    catch (e) {
	        // Returning nothing here is fine, because objects in a cross-site context are unusable
	        return;
	    }
	    // Ignore special listeners of IE11 & Edge dev tools, see https://github.com/angular/zone.js/issues/150
	    if (!delegate || validZoneHandler) {
	        return target[SYMBOL_ADD_EVENT_LISTENER](eventName, handler, useCapturing);
	    }
	    var eventTask = findExistingRegisteredTask(target, handler, eventName, useCapturing, false);
	    if (eventTask) {
	        // we already registered, so this will have noop.
	        return target[SYMBOL_ADD_EVENT_LISTENER](eventName, eventTask.invoke, useCapturing);
	    }
	    var zone = Zone.current;
	    var source = target.constructor['name'] + '.addEventListener:' + eventName;
	    var data = {
	        target: target,
	        eventName: eventName,
	        name: eventName,
	        useCapturing: useCapturing,
	        handler: handler
	    };
	    zone.scheduleEventTask(source, delegate, data, scheduleEventListener, cancelEventListener);
	}
	function zoneAwareRemoveEventListener(self, args) {
	    var eventName = args[0];
	    var handler = args[1];
	    var useCapturing = args[2] || false;
	    // - Inside a Web Worker, `this` is undefined, the context is `global`
	    // - When `addEventListener` is called on the global context in strict mode, `this` is undefined
	    // see https://github.com/angular/zone.js/issues/190
	    var target = self || _global;
	    var eventTask = findExistingRegisteredTask(target, handler, eventName, useCapturing, true);
	    if (eventTask) {
	        eventTask.zone.cancelTask(eventTask);
	    }
	    else {
	        target[SYMBOL_REMOVE_EVENT_LISTENER](eventName, handler, useCapturing);
	    }
	}
	function patchEventTargetMethods(obj) {
	    if (obj && obj.addEventListener) {
	        patchMethod(obj, ADD_EVENT_LISTENER, function () { return zoneAwareAddEventListener; });
	        patchMethod(obj, REMOVE_EVENT_LISTENER, function () { return zoneAwareRemoveEventListener; });
	        return true;
	    }
	    else {
	        return false;
	    }
	}
	exports.patchEventTargetMethods = patchEventTargetMethods;
	;
	var originalInstanceKey = exports.zoneSymbol('originalInstance');
	// wrap some native API on `window`
	function patchClass(className) {
	    var OriginalClass = _global[className];
	    if (!OriginalClass)
	        return;
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
	            default: throw new Error('Arg list too long.');
	        }
	    };
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
	exports.patchClass = patchClass;
	;
	function createNamedFn(name, delegate) {
	    try {
	        return (Function('f', "return function " + name + "(){return f(this, arguments)}"))(delegate);
	    }
	    catch (e) {
	        // if we fail, we must be CSP, just return delegate.
	        return function () {
	            return delegate(this, arguments);
	        };
	    }
	}
	exports.createNamedFn = createNamedFn;
	function patchMethod(target, name, patchFn) {
	    var proto = target;
	    while (proto && !proto.hasOwnProperty(name)) {
	        proto = Object.getPrototypeOf(proto);
	    }
	    if (!proto && target[name]) {
	        // somehow we did not find it, but we can see it. This happens on IE for Window properties.
	        proto = target;
	    }
	    var delegateName = exports.zoneSymbol(name);
	    var delegate;
	    if (proto && !(delegate = proto[delegateName])) {
	        delegate = proto[delegateName] = proto[name];
	        proto[name] = createNamedFn(name, patchFn(delegate, delegateName, name));
	    }
	    return delegate;
	}
	exports.patchMethod = patchMethod;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var utils_1 = __webpack_require__(3);
	/*
	 * This is necessary for Chrome and Chrome mobile, to enable
	 * things like redefining `createdCallback` on an element.
	 */
	var _defineProperty = Object.defineProperty;
	var _getOwnPropertyDescriptor = Object.getOwnPropertyDescriptor;
	var _create = Object.create;
	var unconfigurablesKey = utils_1.zoneSymbol('unconfigurables');
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
	exports.propertyPatch = propertyPatch;
	;
	function _redefineProperty(obj, prop, desc) {
	    var originalConfigurableFlag = desc.configurable;
	    desc = rewriteDescriptor(obj, prop, desc);
	    return _tryDefineProperty(obj, prop, desc, originalConfigurableFlag);
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
	function _tryDefineProperty(obj, prop, desc, originalConfigurableFlag) {
	    try {
	        return _defineProperty(obj, prop, desc);
	    }
	    catch (e) {
	        if (desc.configurable) {
	            // In case of errors, when the configurable flag was likely set by rewriteDescriptor(), let's retry with the original flag value
	            if (typeof originalConfigurableFlag == 'undefined') {
	                delete desc.configurable;
	            }
	            else {
	                desc.configurable = originalConfigurableFlag;
	            }
	            return _defineProperty(obj, prop, desc);
	        }
	        else {
	            throw e;
	        }
	    }
	}


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var define_property_1 = __webpack_require__(4);
	var utils_1 = __webpack_require__(3);
	function registerElementPatch(_global) {
	    if (!utils_1.isBrowser || !('registerElement' in _global.document)) {
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
	                var source = 'Document.registerElement::' + callback;
	                if (opts.prototype.hasOwnProperty(callback)) {
	                    var descriptor = Object.getOwnPropertyDescriptor(opts.prototype, callback);
	                    if (descriptor && descriptor.value) {
	                        descriptor.value = Zone.current.wrap(descriptor.value, source);
	                        define_property_1._redefineProperty(opts.prototype, callback, descriptor);
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
	}
	exports.registerElementPatch = registerElementPatch;


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var webSocketPatch = __webpack_require__(7);
	var utils_1 = __webpack_require__(3);
	var eventNames = 'copy cut paste abort blur focus canplay canplaythrough change click contextmenu dblclick drag dragend dragenter dragleave dragover dragstart drop durationchange emptied ended input invalid keydown keypress keyup load loadeddata loadedmetadata loadstart message mousedown mouseenter mouseleave mousemove mouseout mouseover mouseup pause play playing progress ratechange reset scroll seeked seeking select show stalled submit suspend timeupdate volumechange waiting mozfullscreenchange mozfullscreenerror mozpointerlockchange mozpointerlockerror error webglcontextrestored webglcontextlost webglcontextcreationerror'.split(' ');
	function propertyDescriptorPatch(_global) {
	    if (utils_1.isNode) {
	        return;
	    }
	    var supportsWebSocket = typeof WebSocket !== 'undefined';
	    if (canPatchViaPropertyDescriptor()) {
	        // for browsers that we can patch the descriptor:  Chrome & Firefox
	        if (utils_1.isBrowser) {
	            utils_1.patchOnProperties(HTMLElement.prototype, eventNames);
	        }
	        utils_1.patchOnProperties(XMLHttpRequest.prototype, null);
	        if (typeof IDBIndex !== 'undefined') {
	            utils_1.patchOnProperties(IDBIndex.prototype, null);
	            utils_1.patchOnProperties(IDBRequest.prototype, null);
	            utils_1.patchOnProperties(IDBOpenDBRequest.prototype, null);
	            utils_1.patchOnProperties(IDBDatabase.prototype, null);
	            utils_1.patchOnProperties(IDBTransaction.prototype, null);
	            utils_1.patchOnProperties(IDBCursor.prototype, null);
	        }
	        if (supportsWebSocket) {
	            utils_1.patchOnProperties(WebSocket.prototype, null);
	        }
	    }
	    else {
	        // Safari, Android browsers (Jelly Bean)
	        patchViaCapturingAllTheEvents();
	        utils_1.patchClass('XMLHttpRequest');
	        if (supportsWebSocket) {
	            webSocketPatch.apply(_global);
	        }
	    }
	}
	exports.propertyDescriptorPatch = propertyDescriptorPatch;
	function canPatchViaPropertyDescriptor() {
	    if (utils_1.isBrowser && !Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'onclick')
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
	var unboundKey = utils_1.zoneSymbol('unbound');
	// Whenever any eventListener fires, we check the eventListener target and all parents
	// for `onwhatever` properties and replace them with zone-bound functions
	// - Chrome (for now)
	function patchViaCapturingAllTheEvents() {
	    var _loop_1 = function(i) {
	        var property = eventNames[i];
	        var onproperty = 'on' + property;
	        document.addEventListener(property, function (event) {
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
	    ;
	}
	;


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var utils_1 = __webpack_require__(3);
	// we have to patch the instance since the proto is non-configurable
	function apply(_global) {
	    var WS = _global.WebSocket;
	    // On Safari window.EventTarget doesn't exist so need to patch WS add/removeEventListener
	    // On older Chrome, no need since EventTarget was already patched
	    if (!_global.EventTarget) {
	        utils_1.patchEventTargetMethods(WS.prototype);
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
	        utils_1.patchOnProperties(proxySocket, ['close', 'error', 'message', 'open']);
	        return proxySocket;
	    };
	    for (var prop in WS) {
	        _global.WebSocket[prop] = WS[prop];
	    }
	}
	exports.apply = apply;


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";
	var utils_1 = __webpack_require__(3);
	function patchTimer(window, setName, cancelName, nameSuffix) {
	    var setNative = null;
	    var clearNative = null;
	    setName += nameSuffix;
	    cancelName += nameSuffix;
	    function scheduleTask(task) {
	        var data = task.data;
	        data.args[0] = task.invoke;
	        data.handleId = setNative.apply(window, data.args);
	        return task;
	    }
	    function clearTask(task) {
	        return clearNative(task.data.handleId);
	    }
	    setNative = utils_1.patchMethod(window, setName, function (delegate) { return function (self, args) {
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
	            if (handle.ref && handle.unref) {
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
	    clearNative = utils_1.patchMethod(window, cancelName, function (delegate) { return function (self, args) {
	        var task = args[0];
	        if (task && typeof task.type === 'string') {
	            if (task.cancelFn && task.data.isPeriodic || task.runCount === 0) {
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
	exports.patchTimer = patchTimer;


/***/ }
/******/ ]);
}).call(this,undefined)
},{}],2:[function(_dereq_,module,exports){
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

  function beforeBootstrap (modules) {
    if (!alreadyRegistered) {
      alreadyRegistered = registerOpbeatModule(services)
    }
  }

  services.exceptionHandler = serviceFactory.getExceptionHandler()
  services.exceptionHandler.install()
  alreadyRegistered = registerOpbeatModule(services)
  patchAngularBootstrap(services.zoneService, beforeBootstrap)
}

function registerOpbeatModule (services) {
  return ngOpbeat(services.transactionService, services.logger, services.configService, services.exceptionHandler)
}

module.exports = initialize

},{"./ngOpbeat":3,"./patches/bootstrapPatch":5,"opbeat-js-core":33}],3:[function(_dereq_,module,exports){
var patchController = _dereq_('./patches/controllerPatch')
var patchCompile = _dereq_('./patches/compilePatch')
var patchRootScope = _dereq_('./patches/rootScopePatch')
var patchDirectives = _dereq_('./patches/directivesPatch')
var patchExceptionHandler = _dereq_('./patches/exceptionHandlerPatch')
var patchInteractions = _dereq_('./patches/interactionsPatch')

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

function noop () {}

function registerOpbeatModule (transactionService, logger, configService, exceptionHandler) {
  function moduleRun ($rootScope) {
    configService.set('isInstalled', true)
    configService.set('opbeatAgentName', 'opbeat-angular')
    configService.set('platform.framework', 'angular/' + window.angular.version.full)

    var platform = getPlatform()
    if (platform) {
      configService.set('platform.platform', platform)
    }

    logger.debug('Agent:', configService.getAgentName())

    // onRouteChangeStart
    function onRouteChangeStart (event, current) {
      if (!configService.get('performance.enable')) {
        logger.debug('Performance monitoring is disable')
        return
      }
      logger.debug('Route change started')
      var transactionName
      if (current.$$route) { // ngRoute
        // ignoring redirects since we will get another event
        if (typeof current.$$route.redirectTo !== 'undefined') {
          return
        }
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
        .run(['$rootScope', moduleRun])
    }
    window.angular.module('opbeat-angular', ['ngOpbeat'])
    return true
  }
}

module.exports = registerOpbeatModule

},{"./patches/compilePatch":6,"./patches/controllerPatch":7,"./patches/directivesPatch":8,"./patches/exceptionHandlerPatch":9,"./patches/interactionsPatch":10,"./patches/rootScopePatch":11}],4:[function(_dereq_,module,exports){
var opbeatCore = _dereq_('opbeat-js-core')
var ServiceFactory = opbeatCore.ServiceFactory
var angularInitializer = _dereq_('./angularInitializer')

_dereq_('zone.js')
function init () {
  var serviceFactory = new ServiceFactory()
  if (window.opbeatApi && window.opbeatApi.serviceFactory) {
    serviceFactory = window.opbeatApi.serviceFactory
  }
  angularInitializer(serviceFactory)
}

init()

},{"./angularInitializer":2,"opbeat-js-core":33,"zone.js":1}],5:[function(_dereq_,module,exports){
var DEFER_LABEL = 'NG_DEFER_BOOTSTRAP!'
var deferRegex = new RegExp('^' + DEFER_LABEL + '.*')

function patchMainBootstrap (zoneService, beforeBootstrap, weDeferred) {
  if (typeof window.angular === 'undefined') {
    return
  }
  var originalBootstrapFn = window.angular.bootstrap

  function bootstrap (element, modules) {
    beforeBootstrap(modules)
    if (weDeferred && deferRegex.test(window.name)) {
      window.name = window.name.substring(DEFER_LABEL.length)
    }
    return zoneService.runInOpbeatZone(originalBootstrapFn, window.angular, arguments)
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

function patchDeferredBootstrap (zoneService, beforeBootstrap) {
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
            beforeBootstrap(modules)
            return zoneService.runInOpbeatZone(originalResumeBootstrap, window.angular, arguments)
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
      beforeBootstrap(modules)
      return zoneService.runInOpbeatZone(window.angular.resumeBootstrap, window.angular, [modules])
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

function createAngular (zoneService, beforeBootstrap) {
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
        patchAll(zoneService, beforeBootstrap)
      }
    },
    enumerable: true,
    configurable: true
  })
}

function noop () {}

function patchAll (zoneService, beforeBootstrap) {
  var weDeferred = patchDeferredBootstrap(zoneService, beforeBootstrap)
  patchMainBootstrap(zoneService, beforeBootstrap, weDeferred)
}

function patchAngularBootstrap (zoneService, beforeBootstrap) {
  if (typeof beforeBootstrap !== 'function') {
    beforeBootstrap = noop
  }

  if (window.angular) {
    patchAll(zoneService, beforeBootstrap)
  } else {
    createAngular(zoneService, beforeBootstrap)
  }
}

module.exports = patchAngularBootstrap

},{}],6:[function(_dereq_,module,exports){
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

},{"opbeat-js-core":33}],7:[function(_dereq_,module,exports){
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

},{"opbeat-js-core":33}],8:[function(_dereq_,module,exports){
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

},{"opbeat-js-core":33}],9:[function(_dereq_,module,exports){

module.exports = function patchExceptionHandler ($provide) {
  $provide.decorator('$exceptionHandler', ['$delegate', '$opbeat', function $ExceptionHandlerDecorator ($delegate, $opbeat) {
    return function $ExceptionHandler (exception, cause) {
      $opbeat.captureException(exception)
      return $delegate(exception, cause)
    }
  }])
}

},{}],10:[function(_dereq_,module,exports){
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

},{}],11:[function(_dereq_,module,exports){
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

},{}],12:[function(_dereq_,module,exports){
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
},{"stackframe":19}],13:[function(_dereq_,module,exports){
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
},{}],14:[function(_dereq_,module,exports){
'use strict';

var has = Object.prototype.hasOwnProperty;

/**
 * Simple query string parser.
 *
 * @param {String} query The query string that needs to be parsed.
 * @returns {Object}
 * @api public
 */
function querystring(query) {
  var parser = /([^=?&]+)=?([^&]*)/g
    , result = {}
    , part;

  //
  // Little nifty parsing hack, leverage the fact that RegExp.exec increments
  // the lastIndex property so we can continue executing this loop until we've
  // parsed all results.
  //
  for (;
    part = parser.exec(query);
    result[decodeURIComponent(part[1])] = decodeURIComponent(part[2])
  );

  return result;
}

/**
 * Transform a query string to an object.
 *
 * @param {Object} obj Object that should be transformed.
 * @param {String} prefix Optional prefix.
 * @returns {String}
 * @api public
 */
function querystringify(obj, prefix) {
  prefix = prefix || '';

  var pairs = [];

  //
  // Optionally prefix with a '?' if needed
  //
  if ('string' !== typeof prefix) prefix = '?';

  for (var key in obj) {
    if (has.call(obj, key)) {
      pairs.push(encodeURIComponent(key) +'='+ encodeURIComponent(obj[key]));
    }
  }

  return pairs.length ? prefix + pairs.join('&') : '';
}

//
// Expose the module.
//
exports.stringify = querystringify;
exports.parse = querystring;

},{}],15:[function(_dereq_,module,exports){
'use strict';

/**
 * Check if we're required to add a port number.
 *
 * @see https://url.spec.whatwg.org/#default-port
 * @param {Number|String} port Port number we need to check
 * @param {String} protocol Protocol we need to check against.
 * @returns {Boolean} Is it a default port for the given protocol
 * @api private
 */
module.exports = function required(port, protocol) {
  protocol = protocol.split(':')[0];
  port = +port;

  if (!port) return false;

  switch (protocol) {
    case 'http':
    case 'ws':
    return port !== 80;

    case 'https':
    case 'wss':
    return port !== 443;

    case 'ftp':
    return port !== 21;

    case 'gopher':
    return port !== 70;

    case 'file':
    return false;
  }

  return port !== 0;
};

},{}],16:[function(_dereq_,module,exports){
module.exports = _dereq_('./lib/simple_lru.js');

},{"./lib/simple_lru.js":17}],17:[function(_dereq_,module,exports){
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

},{}],18:[function(_dereq_,module,exports){
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
},{"stackframe":19}],19:[function(_dereq_,module,exports){
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
},{}],20:[function(_dereq_,module,exports){
'use strict';

var required = _dereq_('requires-port')
  , lolcation = _dereq_('./lolcation')
  , qs = _dereq_('querystringify')
  , protocolre = /^([a-z][a-z0-9.+-]*:)?(\/\/)?([\S\s]*)/i;

/**
 * These are the parse rules for the URL parser, it informs the parser
 * about:
 *
 * 0. The char it Needs to parse, if it's a string it should be done using
 *    indexOf, RegExp using exec and NaN means set as current value.
 * 1. The property we should set when parsing this value.
 * 2. Indication if it's backwards or forward parsing, when set as number it's
 *    the value of extra chars that should be split off.
 * 3. Inherit from location if non existing in the parser.
 * 4. `toLowerCase` the resulting value.
 */
var rules = [
  ['#', 'hash'],                        // Extract from the back.
  ['?', 'query'],                       // Extract from the back.
  ['/', 'pathname'],                    // Extract from the back.
  ['@', 'auth', 1],                     // Extract from the front.
  [NaN, 'host', undefined, 1, 1],       // Set left over value.
  [/:(\d+)$/, 'port', undefined, 1],    // RegExp the back.
  [NaN, 'hostname', undefined, 1, 1]    // Set left over.
];

/**
 * @typedef ProtocolExtract
 * @type Object
 * @property {String} protocol Protocol matched in the URL, in lowercase.
 * @property {Boolean} slashes `true` if protocol is followed by "//", else `false`.
 * @property {String} rest Rest of the URL that is not part of the protocol.
 */

/**
 * Extract protocol information from a URL with/without double slash ("//").
 *
 * @param {String} address URL we want to extract from.
 * @return {ProtocolExtract} Extracted information.
 * @api private
 */
function extractProtocol(address) {
  var match = protocolre.exec(address);

  return {
    protocol: match[1] ? match[1].toLowerCase() : '',
    slashes: !!match[2],
    rest: match[3]
  };
}

/**
 * Resolve a relative URL pathname against a base URL pathname.
 *
 * @param {String} relative Pathname of the relative URL.
 * @param {String} base Pathname of the base URL.
 * @return {String} Resolved pathname.
 * @api private
 */
function resolve(relative, base) {
  var path = (base || '/').split('/').slice(0, -1).concat(relative.split('/'))
    , i = path.length
    , last = path[i - 1]
    , unshift = false
    , up = 0;

  while (i--) {
    if (path[i] === '.') {
      path.splice(i, 1);
    } else if (path[i] === '..') {
      path.splice(i, 1);
      up++;
    } else if (up) {
      if (i === 0) unshift = true;
      path.splice(i, 1);
      up--;
    }
  }

  if (unshift) path.unshift('');
  if (last === '.' || last === '..') path.push('');

  return path.join('/');
}

/**
 * The actual URL instance. Instead of returning an object we've opted-in to
 * create an actual constructor as it's much more memory efficient and
 * faster and it pleases my OCD.
 *
 * @constructor
 * @param {String} address URL we want to parse.
 * @param {Object|String} location Location defaults for relative paths.
 * @param {Boolean|Function} parser Parser for the query string.
 * @api public
 */
function URL(address, location, parser) {
  if (!(this instanceof URL)) {
    return new URL(address, location, parser);
  }

  var relative, extracted, parse, instruction, index, key
    , instructions = rules.slice()
    , type = typeof location
    , url = this
    , i = 0;

  //
  // The following if statements allows this module two have compatibility with
  // 2 different API:
  //
  // 1. Node.js's `url.parse` api which accepts a URL, boolean as arguments
  //    where the boolean indicates that the query string should also be parsed.
  //
  // 2. The `URL` interface of the browser which accepts a URL, object as
  //    arguments. The supplied object will be used as default values / fall-back
  //    for relative paths.
  //
  if ('object' !== type && 'string' !== type) {
    parser = location;
    location = null;
  }

  if (parser && 'function' !== typeof parser) parser = qs.parse;

  location = lolcation(location);

  //
  // Extract protocol information before running the instructions.
  //
  extracted = extractProtocol(address || '');
  relative = !extracted.protocol && !extracted.slashes;
  url.slashes = extracted.slashes || relative && location.slashes;
  url.protocol = extracted.protocol || location.protocol || '';
  address = extracted.rest;

  //
  // When the authority component is absent the URL starts with a path
  // component.
  //
  if (!extracted.slashes) instructions[2] = [/(.*)/, 'pathname'];

  for (; i < instructions.length; i++) {
    instruction = instructions[i];
    parse = instruction[0];
    key = instruction[1];

    if (parse !== parse) {
      url[key] = address;
    } else if ('string' === typeof parse) {
      if (~(index = address.indexOf(parse))) {
        if ('number' === typeof instruction[2]) {
          url[key] = address.slice(0, index);
          address = address.slice(index + instruction[2]);
        } else {
          url[key] = address.slice(index);
          address = address.slice(0, index);
        }
      }
    } else if (index = parse.exec(address)) {
      url[key] = index[1];
      address = address.slice(0, index.index);
    }

    url[key] = url[key] || (
      relative && instruction[3] ? location[key] || '' : ''
    );

    //
    // Hostname, host and protocol should be lowercased so they can be used to
    // create a proper `origin`.
    //
    if (instruction[4]) url[key] = url[key].toLowerCase();
  }

  //
  // Also parse the supplied query string in to an object. If we're supplied
  // with a custom parser as function use that instead of the default build-in
  // parser.
  //
  if (parser) url.query = parser(url.query);

  //
  // If the URL is relative, resolve the pathname against the base URL.
  //
  if (
      relative
    && location.slashes
    && url.pathname.charAt(0) !== '/'
    && (url.pathname !== '' || location.pathname !== '')
  ) {
    url.pathname = resolve(url.pathname, location.pathname);
  }

  //
  // We should not add port numbers if they are already the default port number
  // for a given protocol. As the host also contains the port number we're going
  // override it with the hostname which contains no port number.
  //
  if (!required(url.port, url.protocol)) {
    url.host = url.hostname;
    url.port = '';
  }

  //
  // Parse down the `auth` for the username and password.
  //
  url.username = url.password = '';
  if (url.auth) {
    instruction = url.auth.split(':');
    url.username = instruction[0] || '';
    url.password = instruction[1] || '';
  }

  url.origin = url.protocol && url.host && url.protocol !== 'file:'
    ? url.protocol +'//'+ url.host
    : 'null';

  //
  // The href is just the compiled result.
  //
  url.href = url.toString();
}

/**
 * This is convenience method for changing properties in the URL instance to
 * insure that they all propagate correctly.
 *
 * @param {String} part          Property we need to adjust.
 * @param {Mixed} value          The newly assigned value.
 * @param {Boolean|Function} fn  When setting the query, it will be the function
 *                               used to parse the query.
 *                               When setting the protocol, double slash will be
 *                               removed from the final url if it is true.
 * @returns {URL}
 * @api public
 */
URL.prototype.set = function set(part, value, fn) {
  var url = this;

  switch (part) {
    case 'query':
      if ('string' === typeof value && value.length) {
        value = (fn || qs.parse)(value);
      }

      url[part] = value;
      break;

    case 'port':
      url[part] = value;

      if (!required(value, url.protocol)) {
        url.host = url.hostname;
        url[part] = '';
      } else if (value) {
        url.host = url.hostname +':'+ value;
      }

      break;

    case 'hostname':
      url[part] = value;

      if (url.port) value += ':'+ url.port;
      url.host = value;
      break;

    case 'host':
      url[part] = value;

      if (/:\d+$/.test(value)) {
        value = value.split(':');
        url.port = value.pop();
        url.hostname = value.join(':');
      } else {
        url.hostname = value;
        url.port = '';
      }

      break;

    case 'protocol':
      url.protocol = value.toLowerCase();
      url.slashes = !fn;
      break;

    case 'pathname':
      url.pathname = value.length && value.charAt(0) !== '/' ? '/' + value : value;

      break;

    default:
      url[part] = value;
  }

  for (var i = 0; i < rules.length; i++) {
    var ins = rules[i];

    if (ins[4]) url[ins[1]] = url[ins[1]].toLowerCase();
  }

  url.origin = url.protocol && url.host && url.protocol !== 'file:'
    ? url.protocol +'//'+ url.host
    : 'null';

  url.href = url.toString();

  return url;
};

/**
 * Transform the properties back in to a valid and full URL string.
 *
 * @param {Function} stringify Optional query stringify function.
 * @returns {String}
 * @api public
 */
URL.prototype.toString = function toString(stringify) {
  if (!stringify || 'function' !== typeof stringify) stringify = qs.stringify;

  var query
    , url = this
    , protocol = url.protocol;

  if (protocol && protocol.charAt(protocol.length - 1) !== ':') protocol += ':';

  var result = protocol + (url.slashes ? '//' : '');

  if (url.username) {
    result += url.username;
    if (url.password) result += ':'+ url.password;
    result += '@';
  }

  result += url.host + url.pathname;

  query = 'object' === typeof url.query ? stringify(url.query) : url.query;
  if (query) result += '?' !== query.charAt(0) ? '?'+ query : query;

  if (url.hash) result += url.hash;

  return result;
};

//
// Expose the URL parser and some additional properties that might be useful for
// others or testing.
//
URL.extractProtocol = extractProtocol;
URL.location = lolcation;
URL.qs = qs;

module.exports = URL;

},{"./lolcation":21,"querystringify":14,"requires-port":15}],21:[function(_dereq_,module,exports){
(function (global){
'use strict';

var slashes = /^[A-Za-z][A-Za-z0-9+-.]*:\/\//;

/**
 * These properties should not be copied or inherited from. This is only needed
 * for all non blob URL's as a blob URL does not include a hash, only the
 * origin.
 *
 * @type {Object}
 * @private
 */
var ignore = { hash: 1, query: 1 }
  , URL;

/**
 * The location object differs when your code is loaded through a normal page,
 * Worker or through a worker using a blob. And with the blobble begins the
 * trouble as the location object will contain the URL of the blob, not the
 * location of the page where our code is loaded in. The actual origin is
 * encoded in the `pathname` so we can thankfully generate a good "default"
 * location from it so we can generate proper relative URL's again.
 *
 * @param {Object|String} loc Optional default location object.
 * @returns {Object} lolcation object.
 * @api public
 */
module.exports = function lolcation(loc) {
  loc = loc || global.location || {};
  URL = URL || _dereq_('./');

  var finaldestination = {}
    , type = typeof loc
    , key;

  if ('blob:' === loc.protocol) {
    finaldestination = new URL(unescape(loc.pathname), {});
  } else if ('string' === type) {
    finaldestination = new URL(loc, {});
    for (key in ignore) delete finaldestination[key];
  } else if ('object' === type) {
    for (key in loc) {
      if (key in ignore) continue;
      finaldestination[key] = loc[key];
    }

    if (finaldestination.slashes === undefined) {
      finaldestination.slashes = slashes.test(loc.href);
    }
  }

  return finaldestination;
};

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./":20}],22:[function(_dereq_,module,exports){
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

},{}],23:[function(_dereq_,module,exports){
var backendUtils = _dereq_('./backend_utils')
var utils = _dereq_('../lib/utils')
var URL = _dereq_('url-parse')

module.exports = OpbeatBackend
function OpbeatBackend (transport, logger, config) {
  this._logger = logger
  this._transport = transport
  this._config = config
}
OpbeatBackend.prototype.sendError = function (errorData) {
  if (this._config.isValid()) {
    errorData.stacktrace.frames = backendUtils.createValidFrames(errorData.stacktrace.frames)
    var headers = this.getHeaders()
    this._transport.sendError(errorData, headers)
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
      var context = opbeatBackend._config.get('context')
      if (context) {
        transaction.contextInfo = utils.merge(transaction.contextInfo || {}, context)
      }

      var ctx = transaction.contextInfo
      if (ctx.browser && ctx.browser.location) {
        ctx.browser.location = ctx.browser.location.substring(0, 511)

        var parsed = new URL(ctx.browser.location, true)

        var protocol = parsed.protocol
        var acceptedProtocols = ['http:', 'https:', 'file:']
        if (acceptedProtocols.indexOf(protocol) < 0) {
          delete ctx.browser.location
        } else {
          var url = {protocol: parsed.protocol, host: parsed.host}
          ctx.browser.url = url
          if (parsed.pathname) {
            url.pathname = parsed.pathname
          }
          if (Object.keys(parsed.query).length > 0) {
            url.query = parsed.query
          }
          if (parsed.hash) {
            url.hash = parsed.hash
          }
        }
      }
      if (checkBrowserResponsiveness) {
        if (!ctx.debug) {
          ctx.debug = {}
        }
        ctx.debug.browserResponsivenessCounter = transaction.browserResponsivenessCounter
        ctx.debug.browserResponsivenessInterval = browserResponsivenessInterval
      }
    })

    var filterTransactions = transactionList.filter(function (tr) {
      if (checkBrowserResponsiveness) {
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

},{"../lib/utils":38,"./backend_utils":22,"url-parse":20}],24:[function(_dereq_,module,exports){
var patchXMLHttpRequest = _dereq_('./patches/xhrPatch')

function patchCommon (serviceContainer) {
  patchXMLHttpRequest(serviceContainer)
}

module.exports = patchCommon

},{"./patches/xhrPatch":26}],25:[function(_dereq_,module,exports){
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

},{}],26:[function(_dereq_,module,exports){
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

},{"../patchUtils":25}],27:[function(_dereq_,module,exports){
var OpbeatBackend = _dereq_('../backend/opbeat_backend')
var Logger = _dereq_('loglevel')
var Config = _dereq_('../lib/config')

var utils = _dereq_('../lib/utils')
var transport = _dereq_('../lib/transport')
var ExceptionHandler = _dereq_('../exceptions/exceptionHandler')
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
    this.services['Transport'] = transport
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
    Config.init()
    this.services['ConfigService'] = Config
  }
  return this.services['ConfigService']
}

ServiceFactory.prototype.getExceptionHandler = function () {
  if (utils.isUndefined(this.services['ExceptionHandler'])) {
    var logger = this.getLogger()
    var configService = this.getConfigService()
    var exceptionHandler = new ExceptionHandler(this.getOpbeatBackend(), configService, logger)
    this.services['ExceptionHandler'] = exceptionHandler
  }
  return this.services['ExceptionHandler']
}

ServiceFactory.prototype.getPerformanceServiceContainer = function () {
  if (utils.isUndefined(this.services['PerformanceServiceContainer'])) {
    this.services['PerformanceServiceContainer'] = new PerformanceServiceContainer(this)
  }
  return this.services['PerformanceServiceContainer']
}

module.exports = ServiceFactory

},{"../backend/opbeat_backend":23,"../exceptions/exceptionHandler":30,"../lib/config":34,"../lib/transport":37,"../lib/utils":38,"../performance/serviceContainer":39,"loglevel":13}],28:[function(_dereq_,module,exports){
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

},{}],29:[function(_dereq_,module,exports){
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

},{"../lib/fileFetcher":35,"../lib/utils":38}],30:[function(_dereq_,module,exports){
var stackTrace = _dereq_('./stacktrace')
var frames = _dereq_('./frames')

var ExceptionHandler = function (opbeatBackend, config, logger) {
  this._opbeatBackend = opbeatBackend
  this._config = config
  this._logger = logger
}

ExceptionHandler.prototype.install = function () {
  window.onerror = function (msg, file, line, col, error) {
    this._processError(error, msg, file, line, col)
  }.bind(this)
}

ExceptionHandler.prototype.uninstall = function () {
  window.onerror = null
}

ExceptionHandler.prototype.processError = function (err) {
  return this._processError(err)
}

ExceptionHandler.prototype._processError = function processError (error, msg, file, line, col) {
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

  var exceptionHandler = this
  return resolveStackFrames.then(function (stackFrames) {
    exception.stack = stackFrames || []
    return frames.stackInfoToOpbeatException(exception).then(function (exception) {
      var data = frames.processOpbeatException(exception, exceptionHandler._config.get('context.user'), exceptionHandler._config.get('context.extra'))
      exceptionHandler._opbeatBackend.sendError(data)
    })
  })['catch'](function (error) {
    exceptionHandler._logger.debug(error)
  })
}

module.exports = ExceptionHandler

},{"./frames":31,"./stacktrace":32}],31:[function(_dereq_,module,exports){
var logger = _dereq_('../lib/logger')
var config = _dereq_('../lib/config')
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

  processOpbeatException: function (exception, userContext, extraContext) {
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
      user: userContext || {},
      level: null,
      logger: null,
      machine: null
    }

    data.extra = this.getBrowserSpecificMetadata()

    if (extraContext) {
      data.extra = utils.mergeObject(data.extra, extraContext)
    }

    logger.log('opbeat.exceptions.processOpbeatException', data)
    return data
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

},{"../lib/config":34,"../lib/logger":36,"../lib/utils":38,"./context":29,"./stacktrace":32}],32:[function(_dereq_,module,exports){
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

},{"../lib/utils":38,"error-stack-parser":12,"stack-generator":18}],33:[function(_dereq_,module,exports){
// export public core APIs.

module.exports['ServiceFactory'] = _dereq_('./common/serviceFactory')
module.exports['ServiceContainer'] = _dereq_('./performance/serviceContainer')
module.exports['ConfigService'] = _dereq_('./lib/config')
module.exports['TransactionService'] = _dereq_('./performance/transactionService')
module.exports['Subscription'] = _dereq_('./common/subscription')

module.exports['patchUtils'] = _dereq_('./common/patchUtils')
module.exports['patchCommon'] = _dereq_('./common/patchCommon')
module.exports['utils'] = _dereq_('./lib/utils')

var test = module.exports['test'] = {}
test.ZoneServiceMock = _dereq_('../test/performance/zoneServiceMock')

},{"../test/performance/zoneServiceMock":45,"./common/patchCommon":24,"./common/patchUtils":25,"./common/serviceFactory":27,"./common/subscription":28,"./lib/config":34,"./lib/utils":38,"./performance/serviceContainer":39,"./performance/transactionService":43}],34:[function(_dereq_,module,exports){
var utils = _dereq_('./utils')
var Subscription = _dereq_('../common/subscription')

function Config () {
  this.config = {}
  this.defaults = {
    opbeatAgentName: 'opbeat-js',
    VERSION: 'v3.6.1',
    apiHost: 'intake.opbeat.com',
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
      includeXHRQueryString: false
    },
    libraryPathPattern: '(node_modules|bower_components|webpack)',
    context: {},
    platform: {}
  }

  this._changeSubscription = new Subscription()
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

Config.prototype.VERSION = 'v3.6.1'

Config.prototype.isPlatformSupported = function () {
  return typeof Array.prototype.forEach === 'function' &&
    typeof JSON.stringify === 'function' &&
    typeof Function.bind === 'function' &&
    window.performance &&
    typeof window.performance.now === 'function' &&
    utils.isCORSSupported()
}

module.exports = new Config()

},{"../common/subscription":28,"./utils":38}],35:[function(_dereq_,module,exports){
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

},{"./transport":37,"simple-lru-cache":16}],36:[function(_dereq_,module,exports){
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

},{"./config":34}],37:[function(_dereq_,module,exports){
var logger = _dereq_('./logger')
var config = _dereq_('./config')

module.exports = {
  sendError: function (data, headers) {
    return _sendToOpbeat('errors', data, headers)
  },

  sendTransaction: function (data, headers) {
    return _sendToOpbeat('transactions', data, headers)
  },

  getFile: function (fileUrl) {
    return _makeRequest(fileUrl, 'GET', '', {})
  }
}

function _sendToOpbeat (endpoint, data, headers) {
  logger.log('opbeat.transport.sendToOpbeat', data)

  var url = 'https://' + config.get('apiHost') + '/api/v1/organizations/' + config.get('orgId') + '/apps/' + config.get('appId') + '/client-side/' + endpoint + '/'

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

},{"./config":34,"./logger":36}],38:[function(_dereq_,module,exports){
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

  getCurrentScript: function () {
    // Source http://www.2ality.com/2014/05/current-script.html
    var currentScript = document.currentScript
    if (!currentScript) {
      var scripts = document.getElementsByTagName('script')
      currentScript = scripts[scripts.length - 1]
    }
    return currentScript
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
    var hash = match[5] || ''

    var protocol = ''
    if (url.indexOf('://') > -1) {
      protocol = url.split('://')[0]
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

},{}],39:[function(_dereq_,module,exports){
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
  var zoneService = this.services.zoneService

  var opbeatBackend = this.services.opbeatBackend = this.serviceFactory.getOpbeatBackend()
  var transactionService = this.services.transactionService = this.services.transactionService = new TransactionService(zoneService, this.services.logger, configService, opbeatBackend)
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

  return new ZoneService(window.Zone.current, logger, this.services.configService)
}

module.exports = ServiceContainer

},{"../lib/utils":38,"./transactionService":43,"./zoneService":44}],40:[function(_dereq_,module,exports){
var frames = _dereq_('../exceptions/frames')
var traceCache = _dereq_('./traceCache')
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
  if (!this.ended || !this._start) {
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

},{"../exceptions/frames":31,"../lib/utils":38,"./traceCache":41}],41:[function(_dereq_,module,exports){
var SimpleCache = _dereq_('simple-lru-cache')

module.exports = new SimpleCache({
  'maxSize': 5000
})

},{"simple-lru-cache":16}],42:[function(_dereq_,module,exports){
var Trace = _dereq_('./trace')
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

  this.contextInfo = {
    debug: {},
    browser: {
      location: window.location.href
    }
  }
  if (this._options.sendVerboseDebugInfo) {
    this.contextInfo.debug.log = []
    this.debugLog('Transaction', name, type)
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
  this._startStamp = new Date()
  this._start = this._rootTrace._start

  this.duration = this._rootTrace.duration.bind(this._rootTrace)
  this.nextId = 0
}

Transaction.prototype.debugLog = function () {
  if (this._options.sendVerboseDebugInfo) {
    var messages = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))
    messages.unshift(Date.now().toString())
    this.contextInfo.debug.log.push(messages.join(' - '))
  }
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
  this.debugLog('isFinished scheduledTasks.length', scheduledTasks.length)
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
  this._rootTrace.end()

  if (this.isFinished() === true) {
    this._finish()
  }
  return this.donePromise
}

Transaction.prototype.addTask = function (taskId) {
  // todo: should not accept more tasks if the transaction is alreadyFinished]
  this.debugLog('addTask', taskId)
  this._scheduledTasks[taskId] = taskId
}

Transaction.prototype.removeTask = function (taskId) {
  this.debugLog('removeTask', taskId)
  this.contextInfo.debug.lastRemovedTask = taskId
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
    this._rootTrace.calcDiff()
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

},{"../lib/utils":38,"./trace":40}],43:[function(_dereq_,module,exports){
var Transaction = _dereq_('./transaction')
var utils = _dereq_('../lib/utils')
var Subscription = _dereq_('../common/subscription')

function TransactionService (zoneService, logger, config, opbeatBackend) {
  this._config = config
  if (typeof config === 'undefined') {
    logger.debug('TransactionService: config is not provided')
  }
  this._queue = []
  this._logger = logger
  this._opbeatBackend = opbeatBackend
  this._zoneService = zoneService

  this.transactions = []
  this.nextId = 1

  this.taskMap = {}

  this._queue = []

  this._subscription = new Subscription()

  var transactionService = this

  function onBeforeInvokeTask (task) {
    if (task.source === 'XMLHttpRequest.send' && task.trace && !task.trace.ended) {
      task.trace.end()
    }
    transactionService.logInTransaction('Executing', task.taskId)
  }
  zoneService.spec.onBeforeInvokeTask = onBeforeInvokeTask
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
    }
    transactionService.addTask(task.taskId)
  }
  zoneService.spec.onScheduleTask = onScheduleTask

  function onInvokeTask (task) {
    transactionService.removeTask(task.taskId)
    transactionService.detectFinish()
  }
  zoneService.spec.onInvokeTask = onInvokeTask

  function onCancelTask (task) {
    transactionService.removeTask(task.taskId)
    transactionService.detectFinish()
  }
  zoneService.spec.onCancelTask = onCancelTask
}

TransactionService.prototype.getTransaction = function (id) {
  return this.transactions[id]
}

TransactionService.prototype.createTransaction = function (name, type, options) {
  var tr = new Transaction(name, type, options)
  tr.contextInfo.debug.zone = this._zoneService.getCurrentZone().name
  this._zoneService.set('transaction', tr)
  if (this._config.get('performance.checkBrowserResponsiveness')) {
    this.startCounter(tr)
  }
  return tr
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

TransactionService.prototype.getCurrentTransaction = function () {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    return tr
  }
}

TransactionService.prototype.startTransaction = function (name, type) {
  var self = this

  var perfOptions = this._config.get('performance')
  if (!perfOptions.enable || !this._zoneService.isOpbeatZone()) {
    return
  }

  if (type === 'interaction' && !perfOptions.captureInteractions) {
    return
  }

  var tr = this.getCurrentTransaction()

  if (tr) {
    if (tr.name !== 'ZoneTransaction') {
      // todo: need to handle cases in which the transaction has active traces and/or scheduled tasks
      this.logInTransaction('Ending early to start a new transaction:', name, type)
      this._logger.debug('Ending old transaction', tr)
      tr.end()
      tr = this.createTransaction(name, type, perfOptions)
    } else {
      tr.redefine(name, type, perfOptions)
    }
  } else {
    tr = this.createTransaction(name, type, perfOptions)
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
  if (!perfOptions.enable || !this._zoneService.isOpbeatZone()) {
    return
  }

  var trans = this.getCurrentTransaction()

  if (trans) {
    this._logger.debug('TransactionService.startTrace', signature, type)
  } else {
    trans = this.createTransaction('ZoneTransaction', 'transaction', perfOptions)
    this._logger.debug('TransactionService.startTrace - ZoneTransaction', signature, type)
  }

  var trace = trans.startTrace(signature, type, options)
  // var zone = this._zoneService.getCurrentZone()
  // trace._zone = 'Zone(' + zone.$id + ') ' // parent(' + zone.parent.$id + ') '
  return trace
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
TransactionService.prototype.logInTransaction = function () {
  var tr = this._zoneService.get('transaction')
  if (!utils.isUndefined(tr) && !tr.ended) {
    tr.debugLog.apply(tr, arguments)
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
    opbeatBackend.sendTransactions(transactions)
    self.clearTransactions()
  }, 5000)
}

module.exports = TransactionService

},{"../common/subscription":28,"../lib/utils":38,"./transaction":42}],44:[function(_dereq_,module,exports){
var Subscription = _dereq_('../common/subscription')
var patchUtils = _dereq_('../common/patchUtils')
var opbeatTaskSymbol = patchUtils.opbeatSymbol('taskData')

var urlSympbol = patchUtils.opbeatSymbol('url')
var methodSymbol = patchUtils.opbeatSymbol('method')

var XMLHttpRequest_send = 'XMLHttpRequest.send'

var opbeatDataSymbol = patchUtils.opbeatSymbol('opbeatData')

function ZoneService (zone, logger, config) {
  this.events = new Subscription()

  var nextId = 0

  this.events = new Subscription()
  // var zoneService = this
  function noop () { }
  var spec = this.spec = {
    onScheduleTask: noop,
    onBeforeInvokeTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop,
    onHandleError: noop
  }

  var zoneConfig = {
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
          if (task.data.args[1] === 0) {
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
      }

      var delegateTask = parentZoneDelegate.scheduleTask(targetZone, task)
      return delegateTask
    },
    onInvokeTask: function (parentZoneDelegate, currentZone, targetZone, task, applyThis, applyArgs) {
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
      } else if (task[opbeatTaskSymbol] && (task.source === 'setTimeout')) {
        spec.onBeforeInvokeTask(task[opbeatTaskSymbol])
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
        spec.onInvokeTask(task[opbeatTaskSymbol])
      } else {
        result = parentZoneDelegate.invokeTask(targetZone, task, applyThis, applyArgs)
      }
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
  this.outer = zone
  this.zone = zone.fork(zoneConfig)
}

ZoneService.prototype.set = function (key, value) {
  window.Zone.current._properties[key] = value
}
ZoneService.prototype.get = function (key) {
  return window.Zone.current.get(key)
}

ZoneService.prototype.getCurrentZone = function () {
  return window.Zone.current
}

ZoneService.prototype.isOpbeatZone = function () {
  return this.zone.name === window.Zone.current.name
}

ZoneService.prototype.runOuter = function (fn) {
  return this.outer.run(fn)
}

ZoneService.prototype.runInOpbeatZone = function runInOpbeatZone (fn, applyThis, applyArgs) {
  if (this.zone.name === window.Zone.current.name) {
    return fn.apply(applyThis, applyArgs)
  } else {
    return this.zone.run(fn, applyThis, applyArgs)
  }
}

module.exports = ZoneService

},{"../common/patchUtils":25,"../common/subscription":28}],45:[function(_dereq_,module,exports){
function ZoneServiceMock () {
  function noop () { }

  this.spec = {
    onScheduleTask: noop,
    onInvokeTask: noop,
    onCancelTask: noop
  }

  this.zone = {name: 'opbeatMockZone'}
  this.get = function (key) {
    return this.zone[key]
  }
  this.set = function (key, value) {
    this.zone[key] = value
  }
  this.runOuter = function (fn) {
    return fn()
  }
  this.zone.run = function (callback, applyThis, applyArgs, source) {
    return callback.apply(applyThis, applyArgs)
  }

  this.runInOpbeatZone = function (fn, applyThis, applyArgs) {
    return fn.apply(applyThis, applyArgs)
  }

  this.isOpbeatZone = function () {
    return true
  }

  this.getCurrentZone = function () {
    return this.zone
  }
}
module.exports = ZoneServiceMock

},{}]},{},[4]);
