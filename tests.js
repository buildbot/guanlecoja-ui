/**
 * @license AngularJS v1.5.11
 * (c) 2010-2017 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function (window, angular) {
  'use strict';
  /**
   * @ngdoc object
   * @name angular.mock
   * @description
   *
   * Namespace from 'angular-mocks.js' which contains testing related code.
   *
   */

  angular.mock = {};
  /**
   * ! This is a private undocumented service !
   *
   * @name $browser
   *
   * @description
   * This service is a mock implementation of {@link ng.$browser}. It provides fake
   * implementation for commonly used browser apis that are hard to test, e.g. setTimeout, xhr,
   * cookies, etc.
   *
   * The api of this service is the same as that of the real {@link ng.$browser $browser}, except
   * that there are several helper methods available which can be used in tests.
   */

  angular.mock.$BrowserProvider = function () {
    this.$get = function () {
      return new angular.mock.$Browser();
    };
  };

  angular.mock.$Browser = function () {
    var self = this;
    this.isMock = true;
    self.$$url = 'http://server/';
    self.$$lastUrl = self.$$url; // used by url polling fn

    self.pollFns = []; // TODO(vojta): remove this temporary api

    self.$$completeOutstandingRequest = angular.noop;
    self.$$incOutstandingRequestCount = angular.noop; // register url polling fn

    self.onUrlChange = function (listener) {
      self.pollFns.push(function () {
        if (self.$$lastUrl !== self.$$url || self.$$state !== self.$$lastState) {
          self.$$lastUrl = self.$$url;
          self.$$lastState = self.$$state;
          listener(self.$$url, self.$$state);
        }
      });
      return listener;
    };

    self.$$applicationDestroyed = angular.noop;
    self.$$checkUrlChange = angular.noop;
    self.deferredFns = [];
    self.deferredNextId = 0;

    self.defer = function (fn, delay) {
      delay = delay || 0;
      self.deferredFns.push({
        time: self.defer.now + delay,
        fn: fn,
        id: self.deferredNextId
      });
      self.deferredFns.sort(function (a, b) {
        return a.time - b.time;
      });
      return self.deferredNextId++;
    };
    /**
     * @name $browser#defer.now
     *
     * @description
     * Current milliseconds mock time.
     */


    self.defer.now = 0;

    self.defer.cancel = function (deferId) {
      var fnIndex;
      angular.forEach(self.deferredFns, function (fn, index) {
        if (fn.id === deferId) fnIndex = index;
      });

      if (angular.isDefined(fnIndex)) {
        self.deferredFns.splice(fnIndex, 1);
        return true;
      }

      return false;
    };
    /**
     * @name $browser#defer.flush
     *
     * @description
     * Flushes all pending requests and executes the defer callbacks.
     *
     * @param {number=} number of milliseconds to flush. See {@link #defer.now}
     */


    self.defer.flush = function (delay) {
      var nextTime;

      if (angular.isDefined(delay)) {
        // A delay was passed so compute the next time
        nextTime = self.defer.now + delay;
      } else {
        if (self.deferredFns.length) {
          // No delay was passed so set the next time so that it clears the deferred queue
          nextTime = self.deferredFns[self.deferredFns.length - 1].time;
        } else {
          // No delay passed, but there are no deferred tasks so flush - indicates an error!
          throw new Error('No deferred tasks to be flushed');
        }
      }

      while (self.deferredFns.length && self.deferredFns[0].time <= nextTime) {
        // Increment the time and call the next deferred function
        self.defer.now = self.deferredFns[0].time;
        self.deferredFns.shift().fn();
      } // Ensure that the current time is correct


      self.defer.now = nextTime;
    };

    self.$$baseHref = '/';

    self.baseHref = function () {
      return this.$$baseHref;
    };
  };

  angular.mock.$Browser.prototype = {
    /**
     * @name $browser#poll
     *
     * @description
     * run all fns in pollFns
     */
    poll: function poll() {
      angular.forEach(this.pollFns, function (pollFn) {
        pollFn();
      });
    },
    url: function url(_url, replace, state) {
      if (angular.isUndefined(state)) {
        state = null;
      }

      if (_url) {
        this.$$url = _url; // Native pushState serializes & copies the object; simulate it.

        this.$$state = angular.copy(state);
        return this;
      }

      return this.$$url;
    },
    state: function state() {
      return this.$$state;
    },
    notifyWhenNoOutstandingRequests: function notifyWhenNoOutstandingRequests(fn) {
      fn();
    }
  };
  /**
   * @ngdoc provider
   * @name $exceptionHandlerProvider
   *
   * @description
   * Configures the mock implementation of {@link ng.$exceptionHandler} to rethrow or to log errors
   * passed to the `$exceptionHandler`.
   */

  /**
   * @ngdoc service
   * @name $exceptionHandler
   *
   * @description
   * Mock implementation of {@link ng.$exceptionHandler} that rethrows or logs errors passed
   * to it. See {@link ngMock.$exceptionHandlerProvider $exceptionHandlerProvider} for configuration
   * information.
   *
   *
   * ```js
   *   describe('$exceptionHandlerProvider', function() {
   *
   *     it('should capture log messages and exceptions', function() {
   *
   *       module(function($exceptionHandlerProvider) {
   *         $exceptionHandlerProvider.mode('log');
   *       });
   *
   *       inject(function($log, $exceptionHandler, $timeout) {
   *         $timeout(function() { $log.log(1); });
   *         $timeout(function() { $log.log(2); throw 'banana peel'; });
   *         $timeout(function() { $log.log(3); });
   *         expect($exceptionHandler.errors).toEqual([]);
   *         expect($log.assertEmpty());
   *         $timeout.flush();
   *         expect($exceptionHandler.errors).toEqual(['banana peel']);
   *         expect($log.log.logs).toEqual([[1], [2], [3]]);
   *       });
   *     });
   *   });
   * ```
   */

  angular.mock.$ExceptionHandlerProvider = function () {
    var handler;
    /**
     * @ngdoc method
     * @name $exceptionHandlerProvider#mode
     *
     * @description
     * Sets the logging mode.
     *
     * @param {string} mode Mode of operation, defaults to `rethrow`.
     *
     *   - `log`: Sometimes it is desirable to test that an error is thrown, for this case the `log`
     *     mode stores an array of errors in `$exceptionHandler.errors`, to allow later assertion of
     *     them. See {@link ngMock.$log#assertEmpty assertEmpty()} and
     *     {@link ngMock.$log#reset reset()}.
     *   - `rethrow`: If any errors are passed to the handler in tests, it typically means that there
     *     is a bug in the application or test, so this mock will make these tests fail. For any
     *     implementations that expect exceptions to be thrown, the `rethrow` mode will also maintain
     *     a log of thrown errors in `$exceptionHandler.errors`.
     */

    this.mode = function (mode) {
      switch (mode) {
        case 'log':
        case 'rethrow':
          var errors = [];

          handler = function handler(e) {
            if (arguments.length === 1) {
              errors.push(e);
            } else {
              errors.push([].slice.call(arguments, 0));
            }

            if (mode === 'rethrow') {
              throw e;
            }
          };

          handler.errors = errors;
          break;

        default:
          throw new Error('Unknown mode \'' + mode + '\', only \'log\'/\'rethrow\' modes are allowed!');
      }
    };

    this.$get = function () {
      return handler;
    };

    this.mode('rethrow');
  };
  /**
   * @ngdoc service
   * @name $log
   *
   * @description
   * Mock implementation of {@link ng.$log} that gathers all logged messages in arrays
   * (one array per logging level). These arrays are exposed as `logs` property of each of the
   * level-specific log function, e.g. for level `error` the array is exposed as `$log.error.logs`.
   *
   */


  angular.mock.$LogProvider = function () {
    var _debug = true;

    function concat(array1, array2, index) {
      return array1.concat(Array.prototype.slice.call(array2, index));
    }

    this.debugEnabled = function (flag) {
      if (angular.isDefined(flag)) {
        _debug = flag;
        return this;
      } else {
        return _debug;
      }
    };

    this.$get = function () {
      var $log = {
        log: function log() {
          $log.log.logs.push(concat([], arguments, 0));
        },
        warn: function warn() {
          $log.warn.logs.push(concat([], arguments, 0));
        },
        info: function info() {
          $log.info.logs.push(concat([], arguments, 0));
        },
        error: function error() {
          $log.error.logs.push(concat([], arguments, 0));
        },
        debug: function debug() {
          if (_debug) {
            $log.debug.logs.push(concat([], arguments, 0));
          }
        }
      };
      /**
       * @ngdoc method
       * @name $log#reset
       *
       * @description
       * Reset all of the logging arrays to empty.
       */

      $log.reset = function () {
        /**
         * @ngdoc property
         * @name $log#log.logs
         *
         * @description
         * Array of messages logged using {@link ng.$log#log `log()`}.
         *
         * @example
         * ```js
         * $log.log('Some Log');
         * var first = $log.log.logs.unshift();
         * ```
         */
        $log.log.logs = [];
        /**
         * @ngdoc property
         * @name $log#info.logs
         *
         * @description
         * Array of messages logged using {@link ng.$log#info `info()`}.
         *
         * @example
         * ```js
         * $log.info('Some Info');
         * var first = $log.info.logs.unshift();
         * ```
         */

        $log.info.logs = [];
        /**
         * @ngdoc property
         * @name $log#warn.logs
         *
         * @description
         * Array of messages logged using {@link ng.$log#warn `warn()`}.
         *
         * @example
         * ```js
         * $log.warn('Some Warning');
         * var first = $log.warn.logs.unshift();
         * ```
         */

        $log.warn.logs = [];
        /**
         * @ngdoc property
         * @name $log#error.logs
         *
         * @description
         * Array of messages logged using {@link ng.$log#error `error()`}.
         *
         * @example
         * ```js
         * $log.error('Some Error');
         * var first = $log.error.logs.unshift();
         * ```
         */

        $log.error.logs = [];
        /**
        * @ngdoc property
        * @name $log#debug.logs
        *
        * @description
        * Array of messages logged using {@link ng.$log#debug `debug()`}.
        *
        * @example
        * ```js
        * $log.debug('Some Error');
        * var first = $log.debug.logs.unshift();
        * ```
        */

        $log.debug.logs = [];
      };
      /**
       * @ngdoc method
       * @name $log#assertEmpty
       *
       * @description
       * Assert that all of the logging methods have no logged messages. If any messages are present,
       * an exception is thrown.
       */


      $log.assertEmpty = function () {
        var errors = [];
        angular.forEach(['error', 'warn', 'info', 'log', 'debug'], function (logLevel) {
          angular.forEach($log[logLevel].logs, function (log) {
            angular.forEach(log, function (logItem) {
              errors.push('MOCK $log (' + logLevel + '): ' + String(logItem) + '\n' + (logItem.stack || ''));
            });
          });
        });

        if (errors.length) {
          errors.unshift('Expected $log to be empty! Either a message was logged unexpectedly, or ' + 'an expected log message was not checked and removed:');
          errors.push('');
          throw new Error(errors.join('\n---------\n'));
        }
      };

      $log.reset();
      return $log;
    };
  };
  /**
   * @ngdoc service
   * @name $interval
   *
   * @description
   * Mock implementation of the $interval service.
   *
   * Use {@link ngMock.$interval#flush `$interval.flush(millis)`} to
   * move forward by `millis` milliseconds and trigger any functions scheduled to run in that
   * time.
   *
   * @param {function()} fn A function that should be called repeatedly.
   * @param {number} delay Number of milliseconds between each function call.
   * @param {number=} [count=0] Number of times to repeat. If not set, or 0, will repeat
   *   indefinitely.
   * @param {boolean=} [invokeApply=true] If set to `false` skips model dirty checking, otherwise
   *   will invoke `fn` within the {@link ng.$rootScope.Scope#$apply $apply} block.
   * @param {...*=} Pass additional parameters to the executed function.
   * @returns {promise} A promise which will be notified on each iteration.
   */


  angular.mock.$IntervalProvider = function () {
    this.$get = ['$browser', '$rootScope', '$q', '$$q', function ($browser, $rootScope, $q, $$q) {
      var repeatFns = [],
          nextRepeatId = 0,
          now = 0;

      var $interval = function $interval(fn, delay, count, invokeApply) {
        var hasParams = arguments.length > 4,
            args = hasParams ? Array.prototype.slice.call(arguments, 4) : [],
            iteration = 0,
            skipApply = angular.isDefined(invokeApply) && !invokeApply,
            deferred = (skipApply ? $$q : $q).defer(),
            promise = deferred.promise;
        count = angular.isDefined(count) ? count : 0;
        promise.then(null, null, !hasParams ? fn : function () {
          fn.apply(null, args);
        });
        promise.$$intervalId = nextRepeatId;

        function tick() {
          deferred.notify(iteration++);

          if (count > 0 && iteration >= count) {
            var fnIndex;
            deferred.resolve(iteration);
            angular.forEach(repeatFns, function (fn, index) {
              if (fn.id === promise.$$intervalId) fnIndex = index;
            });

            if (angular.isDefined(fnIndex)) {
              repeatFns.splice(fnIndex, 1);
            }
          }

          if (skipApply) {
            $browser.defer.flush();
          } else {
            $rootScope.$apply();
          }
        }

        repeatFns.push({
          nextTime: now + delay,
          delay: delay,
          fn: tick,
          id: nextRepeatId,
          deferred: deferred
        });
        repeatFns.sort(function (a, b) {
          return a.nextTime - b.nextTime;
        });
        nextRepeatId++;
        return promise;
      };
      /**
       * @ngdoc method
       * @name $interval#cancel
       *
       * @description
       * Cancels a task associated with the `promise`.
       *
       * @param {promise} promise A promise from calling the `$interval` function.
       * @returns {boolean} Returns `true` if the task was successfully cancelled.
       */


      $interval.cancel = function (promise) {
        if (!promise) return false;
        var fnIndex;
        angular.forEach(repeatFns, function (fn, index) {
          if (fn.id === promise.$$intervalId) fnIndex = index;
        });

        if (angular.isDefined(fnIndex)) {
          repeatFns[fnIndex].deferred.reject('canceled');
          repeatFns.splice(fnIndex, 1);
          return true;
        }

        return false;
      };
      /**
       * @ngdoc method
       * @name $interval#flush
       * @description
       *
       * Runs interval tasks scheduled to be run in the next `millis` milliseconds.
       *
       * @param {number=} millis maximum timeout amount to flush up until.
       *
       * @return {number} The amount of time moved forward.
       */


      $interval.flush = function (millis) {
        now += millis;

        while (repeatFns.length && repeatFns[0].nextTime <= now) {
          var task = repeatFns[0];
          task.fn();
          task.nextTime += task.delay;
          repeatFns.sort(function (a, b) {
            return a.nextTime - b.nextTime;
          });
        }

        return millis;
      };

      return $interval;
    }];
  };

  function jsonStringToDate(string) {
    // The R_ISO8061_STR regex is never going to fit into the 100 char limit!
    // eslit-disable-next-line max-len
    var R_ISO8061_STR = /^(-?\d{4})-?(\d\d)-?(\d\d)(?:T(\d\d)(?::?(\d\d)(?::?(\d\d)(?:\.(\d{3}))?)?)?(Z|([+-])(\d\d):?(\d\d)))?$/;
    var match;

    if (match = string.match(R_ISO8061_STR)) {
      var date = new Date(0),
          tzHour = 0,
          tzMin = 0;

      if (match[9]) {
        tzHour = toInt(match[9] + match[10]);
        tzMin = toInt(match[9] + match[11]);
      }

      date.setUTCFullYear(toInt(match[1]), toInt(match[2]) - 1, toInt(match[3]));
      date.setUTCHours(toInt(match[4] || 0) - tzHour, toInt(match[5] || 0) - tzMin, toInt(match[6] || 0), toInt(match[7] || 0));
      return date;
    }

    return string;
  }

  function toInt(str) {
    return parseInt(str, 10);
  }

  function padNumberInMock(num, digits, trim) {
    var neg = '';

    if (num < 0) {
      neg = '-';
      num = -num;
    }

    num = '' + num;

    while (num.length < digits) {
      num = '0' + num;
    }

    if (trim) {
      num = num.substr(num.length - digits);
    }

    return neg + num;
  }
  /**
   * @ngdoc type
   * @name angular.mock.TzDate
   * @description
   *
   * *NOTE*: this is not an injectable instance, just a globally available mock class of `Date`.
   *
   * Mock of the Date type which has its timezone specified via constructor arg.
   *
   * The main purpose is to create Date-like instances with timezone fixed to the specified timezone
   * offset, so that we can test code that depends on local timezone settings without dependency on
   * the time zone settings of the machine where the code is running.
   *
   * @param {number} offset Offset of the *desired* timezone in hours (fractions will be honored)
   * @param {(number|string)} timestamp Timestamp representing the desired time in *UTC*
   *
   * @example
   * !!!! WARNING !!!!!
   * This is not a complete Date object so only methods that were implemented can be called safely.
   * To make matters worse, TzDate instances inherit stuff from Date via a prototype.
   *
   * We do our best to intercept calls to "unimplemented" methods, but since the list of methods is
   * incomplete we might be missing some non-standard methods. This can result in errors like:
   * "Date.prototype.foo called on incompatible Object".
   *
   * ```js
   * var newYearInBratislava = new TzDate(-1, '2009-12-31T23:00:00Z');
   * newYearInBratislava.getTimezoneOffset() => -60;
   * newYearInBratislava.getFullYear() => 2010;
   * newYearInBratislava.getMonth() => 0;
   * newYearInBratislava.getDate() => 1;
   * newYearInBratislava.getHours() => 0;
   * newYearInBratislava.getMinutes() => 0;
   * newYearInBratislava.getSeconds() => 0;
   * ```
   *
   */


  angular.mock.TzDate = function (offset, timestamp) {
    var self = new Date(0);

    if (angular.isString(timestamp)) {
      var tsStr = timestamp;
      self.origDate = jsonStringToDate(timestamp);
      timestamp = self.origDate.getTime();

      if (isNaN(timestamp)) {
        // eslint-disable-next-line no-throw-literal
        throw {
          name: 'Illegal Argument',
          message: 'Arg \'' + tsStr + '\' passed into TzDate constructor is not a valid date string'
        };
      }
    } else {
      self.origDate = new Date(timestamp);
    }

    var localOffset = new Date(timestamp).getTimezoneOffset();
    self.offsetDiff = localOffset * 60 * 1000 - offset * 1000 * 60 * 60;
    self.date = new Date(timestamp + self.offsetDiff);

    self.getTime = function () {
      return self.date.getTime() - self.offsetDiff;
    };

    self.toLocaleDateString = function () {
      return self.date.toLocaleDateString();
    };

    self.getFullYear = function () {
      return self.date.getFullYear();
    };

    self.getMonth = function () {
      return self.date.getMonth();
    };

    self.getDate = function () {
      return self.date.getDate();
    };

    self.getHours = function () {
      return self.date.getHours();
    };

    self.getMinutes = function () {
      return self.date.getMinutes();
    };

    self.getSeconds = function () {
      return self.date.getSeconds();
    };

    self.getMilliseconds = function () {
      return self.date.getMilliseconds();
    };

    self.getTimezoneOffset = function () {
      return offset * 60;
    };

    self.getUTCFullYear = function () {
      return self.origDate.getUTCFullYear();
    };

    self.getUTCMonth = function () {
      return self.origDate.getUTCMonth();
    };

    self.getUTCDate = function () {
      return self.origDate.getUTCDate();
    };

    self.getUTCHours = function () {
      return self.origDate.getUTCHours();
    };

    self.getUTCMinutes = function () {
      return self.origDate.getUTCMinutes();
    };

    self.getUTCSeconds = function () {
      return self.origDate.getUTCSeconds();
    };

    self.getUTCMilliseconds = function () {
      return self.origDate.getUTCMilliseconds();
    };

    self.getDay = function () {
      return self.date.getDay();
    }; // provide this method only on browsers that already have it


    if (self.toISOString) {
      self.toISOString = function () {
        return padNumberInMock(self.origDate.getUTCFullYear(), 4) + '-' + padNumberInMock(self.origDate.getUTCMonth() + 1, 2) + '-' + padNumberInMock(self.origDate.getUTCDate(), 2) + 'T' + padNumberInMock(self.origDate.getUTCHours(), 2) + ':' + padNumberInMock(self.origDate.getUTCMinutes(), 2) + ':' + padNumberInMock(self.origDate.getUTCSeconds(), 2) + '.' + padNumberInMock(self.origDate.getUTCMilliseconds(), 3) + 'Z';
      };
    } //hide all methods not implemented in this mock that the Date prototype exposes


    var unimplementedMethods = ['getUTCDay', 'getYear', 'setDate', 'setFullYear', 'setHours', 'setMilliseconds', 'setMinutes', 'setMonth', 'setSeconds', 'setTime', 'setUTCDate', 'setUTCFullYear', 'setUTCHours', 'setUTCMilliseconds', 'setUTCMinutes', 'setUTCMonth', 'setUTCSeconds', 'setYear', 'toDateString', 'toGMTString', 'toJSON', 'toLocaleFormat', 'toLocaleString', 'toLocaleTimeString', 'toSource', 'toString', 'toTimeString', 'toUTCString', 'valueOf'];
    angular.forEach(unimplementedMethods, function (methodName) {
      self[methodName] = function () {
        throw new Error('Method \'' + methodName + '\' is not implemented in the TzDate mock');
      };
    });
    return self;
  }; //make "tzDateInstance instanceof Date" return true


  angular.mock.TzDate.prototype = Date.prototype;
  /**
   * @ngdoc service
   * @name $animate
   *
   * @description
   * Mock implementation of the {@link ng.$animate `$animate`} service. Exposes two additional methods
   * for testing animations.
   *
   * You need to require the `ngAnimateMock` module in your test suite for instance `beforeEach(module('ngAnimateMock'))`
   */

  angular.mock.animate = angular.module('ngAnimateMock', ['ng']).config(['$provide', function ($provide) {
    $provide.factory('$$forceReflow', function () {
      function reflowFn() {
        reflowFn.totalReflows++;
      }

      reflowFn.totalReflows = 0;
      return reflowFn;
    });
    $provide.factory('$$animateAsyncRun', function () {
      var queue = [];

      var queueFn = function queueFn() {
        return function (fn) {
          queue.push(fn);
        };
      };

      queueFn.flush = function () {
        if (queue.length === 0) return false;

        for (var i = 0; i < queue.length; i++) {
          queue[i]();
        }

        queue = [];
        return true;
      };

      return queueFn;
    });
    $provide.decorator('$$animateJs', ['$delegate', function ($delegate) {
      var runners = [];

      var animateJsConstructor = function animateJsConstructor() {
        var animator = $delegate.apply($delegate, arguments); // If no javascript animation is found, animator is undefined

        if (animator) {
          runners.push(animator);
        }

        return animator;
      };

      animateJsConstructor.$closeAndFlush = function () {
        runners.forEach(function (runner) {
          runner.end();
        });
        runners = [];
      };

      return animateJsConstructor;
    }]);
    $provide.decorator('$animateCss', ['$delegate', function ($delegate) {
      var runners = [];

      var animateCssConstructor = function animateCssConstructor(element, options) {
        var animator = $delegate(element, options);
        runners.push(animator);
        return animator;
      };

      animateCssConstructor.$closeAndFlush = function () {
        runners.forEach(function (runner) {
          runner.end();
        });
        runners = [];
      };

      return animateCssConstructor;
    }]);
    $provide.decorator('$animate', ['$delegate', '$timeout', '$browser', '$$rAF', '$animateCss', '$$animateJs', '$$forceReflow', '$$animateAsyncRun', '$rootScope', function ($delegate, $timeout, $browser, $$rAF, $animateCss, $$animateJs, $$forceReflow, $$animateAsyncRun, $rootScope) {
      var animate = {
        queue: [],
        cancel: $delegate.cancel,
        on: $delegate.on,
        off: $delegate.off,
        pin: $delegate.pin,

        get reflows() {
          return $$forceReflow.totalReflows;
        },

        enabled: $delegate.enabled,

        /**
         * @ngdoc method
         * @name $animate#closeAndFlush
         * @description
         *
         * This method will close all pending animations (both {@link ngAnimate#javascript-based-animations Javascript}
         * and {@link ngAnimate.$animateCss CSS}) and it will also flush any remaining animation frames and/or callbacks.
         */
        closeAndFlush: function closeAndFlush() {
          // we allow the flush command to swallow the errors
          // because depending on whether CSS or JS animations are
          // used, there may not be a RAF flush. The primary flush
          // at the end of this function must throw an exception
          // because it will track if there were pending animations
          this.flush(true);
          $animateCss.$closeAndFlush();
          $$animateJs.$closeAndFlush();
          this.flush();
        },

        /**
         * @ngdoc method
         * @name $animate#flush
         * @description
         *
         * This method is used to flush the pending callbacks and animation frames to either start
         * an animation or conclude an animation. Note that this will not actually close an
         * actively running animation (see {@link ngMock.$animate#closeAndFlush `closeAndFlush()`} for that).
         */
        flush: function flush(hideErrors) {
          $rootScope.$digest();
          var doNextRun,
              somethingFlushed = false;

          do {
            doNextRun = false;

            if ($$rAF.queue.length) {
              $$rAF.flush();
              doNextRun = somethingFlushed = true;
            }

            if ($$animateAsyncRun.flush()) {
              doNextRun = somethingFlushed = true;
            }
          } while (doNextRun);

          if (!somethingFlushed && !hideErrors) {
            throw new Error('No pending animations ready to be closed or flushed');
          }

          $rootScope.$digest();
        }
      };
      angular.forEach(['animate', 'enter', 'leave', 'move', 'addClass', 'removeClass', 'setClass'], function (method) {
        animate[method] = function () {
          animate.queue.push({
            event: method,
            element: arguments[0],
            options: arguments[arguments.length - 1],
            args: arguments
          });
          return $delegate[method].apply($delegate, arguments);
        };
      });
      return animate;
    }]);
  }]);
  /**
   * @ngdoc function
   * @name angular.mock.dump
   * @description
   *
   * *NOTE*: This is not an injectable instance, just a globally available function.
   *
   * Method for serializing common angular objects (scope, elements, etc..) into strings.
   * It is useful for logging objects to the console when debugging.
   *
   * @param {*} object - any object to turn into string.
   * @return {string} a serialized string of the argument
   */

  angular.mock.dump = function (object) {
    return serialize(object);

    function serialize(object) {
      var out;

      if (angular.isElement(object)) {
        object = angular.element(object);
        out = angular.element('<div></div>');
        angular.forEach(object, function (element) {
          out.append(angular.element(element).clone());
        });
        out = out.html();
      } else if (angular.isArray(object)) {
        out = [];
        angular.forEach(object, function (o) {
          out.push(serialize(o));
        });
        out = '[ ' + out.join(', ') + ' ]';
      } else if (angular.isObject(object)) {
        if (angular.isFunction(object.$eval) && angular.isFunction(object.$apply)) {
          out = serializeScope(object);
        } else if (object instanceof Error) {
          out = object.stack || '' + object.name + ': ' + object.message;
        } else {
          // TODO(i): this prevents methods being logged,
          // we should have a better way to serialize objects
          out = angular.toJson(object, true);
        }
      } else {
        out = String(object);
      }

      return out;
    }

    function serializeScope(scope, offset) {
      offset = offset || '  ';
      var log = [offset + 'Scope(' + scope.$id + '): {'];

      for (var key in scope) {
        if (Object.prototype.hasOwnProperty.call(scope, key) && !key.match(/^(\$|this)/)) {
          log.push('  ' + key + ': ' + angular.toJson(scope[key]));
        }
      }

      var child = scope.$$childHead;

      while (child) {
        log.push(serializeScope(child, offset + '  '));
        child = child.$$nextSibling;
      }

      log.push('}');
      return log.join('\n' + offset);
    }
  };
  /**
   * @ngdoc service
   * @name $httpBackend
   * @description
   * Fake HTTP backend implementation suitable for unit testing applications that use the
   * {@link ng.$http $http service}.
   *
   * <div class="alert alert-info">
   * **Note**: For fake HTTP backend implementation suitable for end-to-end testing or backend-less
   * development please see {@link ngMockE2E.$httpBackend e2e $httpBackend mock}.
   * </div>
   *
   * During unit testing, we want our unit tests to run quickly and have no external dependencies so
   * we don’t want to send [XHR](https://developer.mozilla.org/en/xmlhttprequest) or
   * [JSONP](http://en.wikipedia.org/wiki/JSONP) requests to a real server. All we really need is
   * to verify whether a certain request has been sent or not, or alternatively just let the
   * application make requests, respond with pre-trained responses and assert that the end result is
   * what we expect it to be.
   *
   * This mock implementation can be used to respond with static or dynamic responses via the
   * `expect` and `when` apis and their shortcuts (`expectGET`, `whenPOST`, etc).
   *
   * When an Angular application needs some data from a server, it calls the $http service, which
   * sends the request to a real server using $httpBackend service. With dependency injection, it is
   * easy to inject $httpBackend mock (which has the same API as $httpBackend) and use it to verify
   * the requests and respond with some testing data without sending a request to a real server.
   *
   * There are two ways to specify what test data should be returned as http responses by the mock
   * backend when the code under test makes http requests:
   *
   * - `$httpBackend.expect` - specifies a request expectation
   * - `$httpBackend.when` - specifies a backend definition
   *
   *
   * ## Request Expectations vs Backend Definitions
   *
   * Request expectations provide a way to make assertions about requests made by the application and
   * to define responses for those requests. The test will fail if the expected requests are not made
   * or they are made in the wrong order.
   *
   * Backend definitions allow you to define a fake backend for your application which doesn't assert
   * if a particular request was made or not, it just returns a trained response if a request is made.
   * The test will pass whether or not the request gets made during testing.
   *
   *
   * <table class="table">
   *   <tr><th width="220px"></th><th>Request expectations</th><th>Backend definitions</th></tr>
   *   <tr>
   *     <th>Syntax</th>
   *     <td>.expect(...).respond(...)</td>
   *     <td>.when(...).respond(...)</td>
   *   </tr>
   *   <tr>
   *     <th>Typical usage</th>
   *     <td>strict unit tests</td>
   *     <td>loose (black-box) unit testing</td>
   *   </tr>
   *   <tr>
   *     <th>Fulfills multiple requests</th>
   *     <td>NO</td>
   *     <td>YES</td>
   *   </tr>
   *   <tr>
   *     <th>Order of requests matters</th>
   *     <td>YES</td>
   *     <td>NO</td>
   *   </tr>
   *   <tr>
   *     <th>Request required</th>
   *     <td>YES</td>
   *     <td>NO</td>
   *   </tr>
   *   <tr>
   *     <th>Response required</th>
   *     <td>optional (see below)</td>
   *     <td>YES</td>
   *   </tr>
   * </table>
   *
   * In cases where both backend definitions and request expectations are specified during unit
   * testing, the request expectations are evaluated first.
   *
   * If a request expectation has no response specified, the algorithm will search your backend
   * definitions for an appropriate response.
   *
   * If a request didn't match any expectation or if the expectation doesn't have the response
   * defined, the backend definitions are evaluated in sequential order to see if any of them match
   * the request. The response from the first matched definition is returned.
   *
   *
   * ## Flushing HTTP requests
   *
   * The $httpBackend used in production always responds to requests asynchronously. If we preserved
   * this behavior in unit testing, we'd have to create async unit tests, which are hard to write,
   * to follow and to maintain. But neither can the testing mock respond synchronously; that would
   * change the execution of the code under test. For this reason, the mock $httpBackend has a
   * `flush()` method, which allows the test to explicitly flush pending requests. This preserves
   * the async api of the backend, while allowing the test to execute synchronously.
   *
   *
   * ## Unit testing with mock $httpBackend
   * The following code shows how to setup and use the mock backend when unit testing a controller.
   * First we create the controller under test:
   *
    ```js
    // The module code
    angular
      .module('MyApp', [])
      .controller('MyController', MyController);
  
    // The controller code
    function MyController($scope, $http) {
      var authToken;
  
      $http.get('/auth.py').then(function(response) {
        authToken = response.headers('A-Token');
        $scope.user = response.data;
      });
  
      $scope.saveMessage = function(message) {
        var headers = { 'Authorization': authToken };
        $scope.status = 'Saving...';
  
        $http.post('/add-msg.py', message, { headers: headers } ).then(function(response) {
          $scope.status = '';
        })['catch'](function() {
          $scope.status = 'Failed...';
        });
      };
    }
    ```
   *
   * Now we setup the mock backend and create the test specs:
   *
    ```js
      // testing controller
      describe('MyController', function() {
         var $httpBackend, $rootScope, createController, authRequestHandler;
  
         // Set up the module
         beforeEach(module('MyApp'));
  
         beforeEach(inject(function($injector) {
           // Set up the mock http service responses
           $httpBackend = $injector.get('$httpBackend');
           // backend definition common for all tests
           authRequestHandler = $httpBackend.when('GET', '/auth.py')
                                  .respond({userId: 'userX'}, {'A-Token': 'xxx'});
  
           // Get hold of a scope (i.e. the root scope)
           $rootScope = $injector.get('$rootScope');
           // The $controller service is used to create instances of controllers
           var $controller = $injector.get('$controller');
  
           createController = function() {
             return $controller('MyController', {'$scope' : $rootScope });
           };
         }));
  
  
         afterEach(function() {
           $httpBackend.verifyNoOutstandingExpectation();
           $httpBackend.verifyNoOutstandingRequest();
         });
  
  
         it('should fetch authentication token', function() {
           $httpBackend.expectGET('/auth.py');
           var controller = createController();
           $httpBackend.flush();
         });
  
  
         it('should fail authentication', function() {
  
           // Notice how you can change the response even after it was set
           authRequestHandler.respond(401, '');
  
           $httpBackend.expectGET('/auth.py');
           var controller = createController();
           $httpBackend.flush();
           expect($rootScope.status).toBe('Failed...');
         });
  
  
         it('should send msg to server', function() {
           var controller = createController();
           $httpBackend.flush();
  
           // now you don’t care about the authentication, but
           // the controller will still send the request and
           // $httpBackend will respond without you having to
           // specify the expectation and response for this request
  
           $httpBackend.expectPOST('/add-msg.py', 'message content').respond(201, '');
           $rootScope.saveMessage('message content');
           expect($rootScope.status).toBe('Saving...');
           $httpBackend.flush();
           expect($rootScope.status).toBe('');
         });
  
  
         it('should send auth header', function() {
           var controller = createController();
           $httpBackend.flush();
  
           $httpBackend.expectPOST('/add-msg.py', undefined, function(headers) {
             // check if the header was sent, if it wasn't the expectation won't
             // match the request and the test will fail
             return headers['Authorization'] === 'xxx';
           }).respond(201, '');
  
           $rootScope.saveMessage('whatever');
           $httpBackend.flush();
         });
      });
    ```
   *
   * ## Dynamic responses
   *
   * You define a response to a request by chaining a call to `respond()` onto a definition or expectation.
   * If you provide a **callback** as the first parameter to `respond(callback)` then you can dynamically generate
   * a response based on the properties of the request.
   *
   * The `callback` function should be of the form `function(method, url, data, headers, params)`.
   *
   * ### Query parameters
   *
   * By default, query parameters on request URLs are parsed into the `params` object. So a request URL
   * of `/list?q=searchstr&orderby=-name` would set `params` to be `{q: 'searchstr', orderby: '-name'}`.
   *
   * ### Regex parameter matching
   *
   * If an expectation or definition uses a **regex** to match the URL, you can provide an array of **keys** via a
   * `params` argument. The index of each **key** in the array will match the index of a **group** in the
   * **regex**.
   *
   * The `params` object in the **callback** will now have properties with these keys, which hold the value of the
   * corresponding **group** in the **regex**.
   *
   * This also applies to the `when` and `expect` shortcut methods.
   *
   *
   * ```js
   *   $httpBackend.expect('GET', /\/user\/(.+)/, undefined, undefined, ['id'])
   *     .respond(function(method, url, data, headers, params) {
   *       // for requested url of '/user/1234' params is {id: '1234'}
   *     });
   *
   *   $httpBackend.whenPATCH(/\/user\/(.+)\/article\/(.+)/, undefined, undefined, ['user', 'article'])
   *     .respond(function(method, url, data, headers, params) {
   *       // for url of '/user/1234/article/567' params is {user: '1234', article: '567'}
   *     });
   * ```
   *
   * ## Matching route requests
   *
   * For extra convenience, `whenRoute` and `expectRoute` shortcuts are available. These methods offer colon
   * delimited matching of the url path, ignoring the query string. This allows declarations
   * similar to how application routes are configured with `$routeProvider`. Because these methods convert
   * the definition url to regex, declaration order is important. Combined with query parameter parsing,
   * the following is possible:
   *
    ```js
      $httpBackend.whenRoute('GET', '/users/:id')
        .respond(function(method, url, data, headers, params) {
          return [200, MockUserList[Number(params.id)]];
        });
  
      $httpBackend.whenRoute('GET', '/users')
        .respond(function(method, url, data, headers, params) {
          var userList = angular.copy(MockUserList),
            defaultSort = 'lastName',
            count, pages, isPrevious, isNext;
  
          // paged api response '/v1/users?page=2'
          params.page = Number(params.page) || 1;
  
          // query for last names '/v1/users?q=Archer'
          if (params.q) {
            userList = $filter('filter')({lastName: params.q});
          }
  
          pages = Math.ceil(userList.length / pagingLength);
          isPrevious = params.page > 1;
          isNext = params.page < pages;
  
          return [200, {
            count:    userList.length,
            previous: isPrevious,
            next:     isNext,
            // sort field -> '/v1/users?sortBy=firstName'
            results:  $filter('orderBy')(userList, params.sortBy || defaultSort)
                        .splice((params.page - 1) * pagingLength, pagingLength)
          }];
        });
    ```
   */


  angular.mock.$HttpBackendProvider = function () {
    this.$get = ['$rootScope', '$timeout', createHttpBackendMock];
  };
  /**
   * General factory function for $httpBackend mock.
   * Returns instance for unit testing (when no arguments specified):
   *   - passing through is disabled
   *   - auto flushing is disabled
   *
   * Returns instance for e2e testing (when `$delegate` and `$browser` specified):
   *   - passing through (delegating request to real backend) is enabled
   *   - auto flushing is enabled
   *
   * @param {Object=} $delegate Real $httpBackend instance (allow passing through if specified)
   * @param {Object=} $browser Auto-flushing enabled if specified
   * @return {Object} Instance of $httpBackend mock
   */


  function createHttpBackendMock($rootScope, $timeout, $delegate, $browser) {
    var definitions = [],
        expectations = [],
        responses = [],
        responsesPush = angular.bind(responses, responses.push),
        copy = angular.copy;

    function createResponse(status, data, headers, statusText) {
      if (angular.isFunction(status)) return status;
      return function () {
        return angular.isNumber(status) ? [status, data, headers, statusText] : [200, status, data, headers];
      };
    } // TODO(vojta): change params to: method, url, data, headers, callback


    function $httpBackend(method, url, data, callback, headers, timeout, withCredentials, responseType, eventHandlers, uploadEventHandlers) {
      var xhr = new MockXhr(),
          expectation = expectations[0],
          wasExpected = false;
      xhr.$$events = eventHandlers;
      xhr.upload.$$events = uploadEventHandlers;

      function prettyPrint(data) {
        return angular.isString(data) || angular.isFunction(data) || data instanceof RegExp ? data : angular.toJson(data);
      }

      function wrapResponse(wrapped) {
        if (!$browser && timeout) {
          if (timeout.then) {
            timeout.then(handleTimeout);
          } else {
            $timeout(handleTimeout, timeout);
          }
        }

        return handleResponse;

        function handleResponse() {
          var response = wrapped.response(method, url, data, headers, wrapped.params(url));
          xhr.$$respHeaders = response[2];
          callback(copy(response[0]), copy(response[1]), xhr.getAllResponseHeaders(), copy(response[3] || ''));
        }

        function handleTimeout() {
          for (var i = 0, ii = responses.length; i < ii; i++) {
            if (responses[i] === handleResponse) {
              responses.splice(i, 1);
              callback(-1, undefined, '');
              break;
            }
          }
        }
      }

      if (expectation && expectation.match(method, url)) {
        if (!expectation.matchData(data)) {
          throw new Error('Expected ' + expectation + ' with different data\n' + 'EXPECTED: ' + prettyPrint(expectation.data) + '\nGOT:      ' + data);
        }

        if (!expectation.matchHeaders(headers)) {
          throw new Error('Expected ' + expectation + ' with different headers\n' + 'EXPECTED: ' + prettyPrint(expectation.headers) + '\nGOT:      ' + prettyPrint(headers));
        }

        expectations.shift();

        if (expectation.response) {
          responses.push(wrapResponse(expectation));
          return;
        }

        wasExpected = true;
      }

      var i = -1,
          definition;

      while (definition = definitions[++i]) {
        if (definition.match(method, url, data, headers || {})) {
          if (definition.response) {
            // if $browser specified, we do auto flush all requests
            ($browser ? $browser.defer : responsesPush)(wrapResponse(definition));
          } else if (definition.passThrough) {
            $delegate(method, url, data, callback, headers, timeout, withCredentials, responseType, eventHandlers, uploadEventHandlers);
          } else throw new Error('No response defined !');

          return;
        }
      }

      throw wasExpected ? new Error('No response defined !') : new Error('Unexpected request: ' + method + ' ' + url + '\n' + (expectation ? 'Expected ' + expectation : 'No more request expected'));
    }
    /**
     * @ngdoc method
     * @name $httpBackend#when
     * @description
     * Creates a new backend definition.
     *
     * @param {string} method HTTP method.
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
     *   data string and returns true if the data is as expected.
     * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
     *   object and returns true if the headers match the current definition.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     *
     *  - respond –
     *      ```js
     *      {function([status,] data[, headers, statusText])
     *      | function(function(method, url, data, headers, params)}
     *      ```
     *    – The respond method takes a set of static data to be returned or a function that can
     *    return an array containing response status (number), response data (Array|Object|string),
     *    response headers (Object), and the text for the status (string). The respond method returns
     *    the `requestHandler` object for possible overrides.
     */


    $httpBackend.when = function (method, url, data, headers, keys) {
      var definition = new MockHttpExpectation(method, url, data, headers, keys),
          chain = {
        respond: function respond(status, data, headers, statusText) {
          definition.passThrough = undefined;
          definition.response = createResponse(status, data, headers, statusText);
          return chain;
        }
      };

      if ($browser) {
        chain.passThrough = function () {
          definition.response = undefined;
          definition.passThrough = true;
          return chain;
        };
      }

      definitions.push(definition);
      return chain;
    };
    /**
     * @ngdoc method
     * @name $httpBackend#whenGET
     * @description
     * Creates a new backend definition for GET requests. For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#whenHEAD
     * @description
     * Creates a new backend definition for HEAD requests. For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#whenDELETE
     * @description
     * Creates a new backend definition for DELETE requests. For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#whenPOST
     * @description
     * Creates a new backend definition for POST requests. For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
     *   data string and returns true if the data is as expected.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#whenPUT
     * @description
     * Creates a new backend definition for PUT requests.  For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
     *   data string and returns true if the data is as expected.
     * @param {(Object|function(Object))=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#whenJSONP
     * @description
     * Creates a new backend definition for JSONP requests. For more info see `when()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled.
     */


    createShortMethods('when');
    /**
     * @ngdoc method
     * @name $httpBackend#whenRoute
     * @description
     * Creates a new backend definition that compares only with the requested route.
     *
     * @param {string} method HTTP method.
     * @param {string} url HTTP url string that supports colon param matching.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled. See #when for more info.
     */

    $httpBackend.whenRoute = function (method, url) {
      var pathObj = parseRoute(url);
      return $httpBackend.when(method, pathObj.regexp, undefined, undefined, pathObj.keys);
    };

    function parseRoute(url) {
      var ret = {
        regexp: url
      },
          keys = ret.keys = [];
      if (!url || !angular.isString(url)) return ret;
      url = url.replace(/([().])/g, '\\$1').replace(/(\/)?:(\w+)([?*])?/g, function (_, slash, key, option) {
        var optional = option === '?' ? option : null;
        var star = option === '*' ? option : null;
        keys.push({
          name: key,
          optional: !!optional
        });
        slash = slash || '';
        return '' + (optional ? '' : slash) + '(?:' + (optional ? slash : '') + (star && '(.+?)' || '([^/]+)') + (optional || '') + ')' + (optional || '');
      }).replace(/([/$*])/g, '\\$1');
      ret.regexp = new RegExp('^' + url, 'i');
      return ret;
    }
    /**
     * @ngdoc method
     * @name $httpBackend#expect
     * @description
     * Creates a new request expectation.
     *
     * @param {string} method HTTP method.
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
     *  receives data string and returns true if the data is as expected, or Object if request body
     *  is in JSON format.
     * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
     *   object and returns true if the headers match the current expectation.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *  request is handled. You can save this object for later use and invoke `respond` again in
     *  order to change how a matched request is handled.
     *
     *  - respond –
     *    ```
     *    { function([status,] data[, headers, statusText])
     *    | function(function(method, url, data, headers, params)}
     *    ```
     *    – The respond method takes a set of static data to be returned or a function that can
     *    return an array containing response status (number), response data (Array|Object|string),
     *    response headers (Object), and the text for the status (string). The respond method returns
     *    the `requestHandler` object for possible overrides.
     */


    $httpBackend.expect = function (method, url, data, headers, keys) {
      var expectation = new MockHttpExpectation(method, url, data, headers, keys),
          chain = {
        respond: function respond(status, data, headers, statusText) {
          expectation.response = createResponse(status, data, headers, statusText);
          return chain;
        }
      };
      expectations.push(expectation);
      return chain;
    };
    /**
     * @ngdoc method
     * @name $httpBackend#expectGET
     * @description
     * Creates a new request expectation for GET requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled. See #expect for more info.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectHEAD
     * @description
     * Creates a new request expectation for HEAD requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectDELETE
     * @description
     * Creates a new request expectation for DELETE requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectPOST
     * @description
     * Creates a new request expectation for POST requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
     *  receives data string and returns true if the data is as expected, or Object if request body
     *  is in JSON format.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectPUT
     * @description
     * Creates a new request expectation for PUT requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
     *  receives data string and returns true if the data is as expected, or Object if request body
     *  is in JSON format.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectPATCH
     * @description
     * Creates a new request expectation for PATCH requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
     *   and returns true if the url matches the current definition.
     * @param {(string|RegExp|function(string)|Object)=} data HTTP request body or function that
     *  receives data string and returns true if the data is as expected, or Object if request body
     *  is in JSON format.
     * @param {Object=} headers HTTP headers.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */

    /**
     * @ngdoc method
     * @name $httpBackend#expectJSONP
     * @description
     * Creates a new request expectation for JSONP requests. For more info see `expect()`.
     *
     * @param {string|RegExp|function(string)} url HTTP url or function that receives an url
     *   and returns true if the url matches the current definition.
     * @param {(Array)=} keys Array of keys to assign to regex matches in request url described above.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     *   request is handled. You can save this object for later use and invoke `respond` again in
     *   order to change how a matched request is handled.
     */


    createShortMethods('expect');
    /**
     * @ngdoc method
     * @name $httpBackend#expectRoute
     * @description
     * Creates a new request expectation that compares only with the requested route.
     *
     * @param {string} method HTTP method.
     * @param {string} url HTTP url string that supports colon param matching.
     * @returns {requestHandler} Returns an object with `respond` method that controls how a matched
     * request is handled. You can save this object for later use and invoke `respond` again in
     * order to change how a matched request is handled. See #expect for more info.
     */

    $httpBackend.expectRoute = function (method, url) {
      var pathObj = parseRoute(url);
      return $httpBackend.expect(method, pathObj.regexp, undefined, undefined, pathObj.keys);
    };
    /**
     * @ngdoc method
     * @name $httpBackend#flush
     * @description
     * Flushes pending requests using the trained responses. Requests are flushed in the order they
     * were made, but it is also possible to skip one or more requests (for example to have them
     * flushed later). This is useful for simulating scenarios where responses arrive from the server
     * in any order.
     *
     * If there are no pending requests to flush when the method is called, an exception is thrown (as
     * this is typically a sign of programming error).
     *
     * @param {number=} count - Number of responses to flush. If undefined/null, all pending requests
     *     (starting after `skip`) will be flushed.
     * @param {number=} [skip=0] - Number of pending requests to skip. For example, a value of `5`
     *     would skip the first 5 pending requests and start flushing from the 6th onwards.
     */


    $httpBackend.flush = function (count, skip, digest) {
      if (digest !== false) $rootScope.$digest();
      skip = skip || 0;
      if (skip >= responses.length) throw new Error('No pending request to flush !');

      if (angular.isDefined(count) && count !== null) {
        while (count--) {
          var part = responses.splice(skip, 1);
          if (!part.length) throw new Error('No more pending request to flush !');
          part[0]();
        }
      } else {
        while (responses.length > skip) {
          responses.splice(skip, 1)[0]();
        }
      }

      $httpBackend.verifyNoOutstandingExpectation(digest);
    };
    /**
     * @ngdoc method
     * @name $httpBackend#verifyNoOutstandingExpectation
     * @description
     * Verifies that all of the requests defined via the `expect` api were made. If any of the
     * requests were not made, verifyNoOutstandingExpectation throws an exception.
     *
     * Typically, you would call this method following each test case that asserts requests using an
     * "afterEach" clause.
     *
     * ```js
     *   afterEach($httpBackend.verifyNoOutstandingExpectation);
     * ```
     */


    $httpBackend.verifyNoOutstandingExpectation = function (digest) {
      if (digest !== false) $rootScope.$digest();

      if (expectations.length) {
        throw new Error('Unsatisfied requests: ' + expectations.join(', '));
      }
    };
    /**
     * @ngdoc method
     * @name $httpBackend#verifyNoOutstandingRequest
     * @description
     * Verifies that there are no outstanding requests that need to be flushed.
     *
     * Typically, you would call this method following each test case that asserts requests using an
     * "afterEach" clause.
     *
     * ```js
     *   afterEach($httpBackend.verifyNoOutstandingRequest);
     * ```
     */


    $httpBackend.verifyNoOutstandingRequest = function () {
      if (responses.length) {
        throw new Error('Unflushed requests: ' + responses.length);
      }
    };
    /**
     * @ngdoc method
     * @name $httpBackend#resetExpectations
     * @description
     * Resets all request expectations, but preserves all backend definitions. Typically, you would
     * call resetExpectations during a multiple-phase test when you want to reuse the same instance of
     * $httpBackend mock.
     */


    $httpBackend.resetExpectations = function () {
      expectations.length = 0;
      responses.length = 0;
    };

    return $httpBackend;

    function createShortMethods(prefix) {
      angular.forEach(['GET', 'DELETE', 'JSONP', 'HEAD'], function (method) {
        $httpBackend[prefix + method] = function (url, headers, keys) {
          return $httpBackend[prefix](method, url, undefined, headers, keys);
        };
      });
      angular.forEach(['PUT', 'POST', 'PATCH'], function (method) {
        $httpBackend[prefix + method] = function (url, data, headers, keys) {
          return $httpBackend[prefix](method, url, data, headers, keys);
        };
      });
    }
  }

  function MockHttpExpectation(method, url, data, headers, keys) {
    function getUrlParams(u) {
      var params = u.slice(u.indexOf('?') + 1).split('&');
      return params.sort();
    }

    function compareUrl(u) {
      return url.slice(0, url.indexOf('?')) === u.slice(0, u.indexOf('?')) && getUrlParams(url).join() === getUrlParams(u).join();
    }

    this.data = data;
    this.headers = headers;

    this.match = function (m, u, d, h) {
      if (method !== m) return false;
      if (!this.matchUrl(u)) return false;
      if (angular.isDefined(d) && !this.matchData(d)) return false;
      if (angular.isDefined(h) && !this.matchHeaders(h)) return false;
      return true;
    };

    this.matchUrl = function (u) {
      if (!url) return true;
      if (angular.isFunction(url.test)) return url.test(u);
      if (angular.isFunction(url)) return url(u);
      return url === u || compareUrl(u);
    };

    this.matchHeaders = function (h) {
      if (angular.isUndefined(headers)) return true;
      if (angular.isFunction(headers)) return headers(h);
      return angular.equals(headers, h);
    };

    this.matchData = function (d) {
      if (angular.isUndefined(data)) return true;
      if (data && angular.isFunction(data.test)) return data.test(d);
      if (data && angular.isFunction(data)) return data(d);

      if (data && !angular.isString(data)) {
        return angular.equals(angular.fromJson(angular.toJson(data)), angular.fromJson(d));
      } // eslint-disable-next-line eqeqeq


      return data == d;
    };

    this.toString = function () {
      return method + ' ' + url;
    };

    this.params = function (u) {
      return angular.extend(parseQuery(), pathParams());

      function pathParams() {
        var keyObj = {};
        if (!url || !angular.isFunction(url.test) || !keys || keys.length === 0) return keyObj;
        var m = url.exec(u);
        if (!m) return keyObj;

        for (var i = 1, len = m.length; i < len; ++i) {
          var key = keys[i - 1];
          var val = m[i];

          if (key && val) {
            keyObj[key.name || key] = val;
          }
        }

        return keyObj;
      }

      function parseQuery() {
        var obj = {},
            key_value,
            key,
            queryStr = u.indexOf('?') > -1 ? u.substring(u.indexOf('?') + 1) : '';
        angular.forEach(queryStr.split('&'), function (keyValue) {
          if (keyValue) {
            key_value = keyValue.replace(/\+/g, '%20').split('=');
            key = tryDecodeURIComponent(key_value[0]);

            if (angular.isDefined(key)) {
              var val = angular.isDefined(key_value[1]) ? tryDecodeURIComponent(key_value[1]) : true;

              if (!hasOwnProperty.call(obj, key)) {
                obj[key] = val;
              } else if (angular.isArray(obj[key])) {
                obj[key].push(val);
              } else {
                obj[key] = [obj[key], val];
              }
            }
          }
        });
        return obj;
      }

      function tryDecodeURIComponent(value) {
        try {
          return decodeURIComponent(value);
        } catch (e) {// Ignore any invalid uri component
        }
      }
    };
  }

  function createMockXhr() {
    return new MockXhr();
  }

  function MockXhr() {
    // hack for testing $http, $httpBackend
    MockXhr.$$lastInstance = this;

    this.open = function (method, url, async) {
      this.$$method = method;
      this.$$url = url;
      this.$$async = async;
      this.$$reqHeaders = {};
      this.$$respHeaders = {};
    };

    this.send = function (data) {
      this.$$data = data;
    };

    this.setRequestHeader = function (key, value) {
      this.$$reqHeaders[key] = value;
    };

    this.getResponseHeader = function (name) {
      // the lookup must be case insensitive,
      // that's why we try two quick lookups first and full scan last
      var header = this.$$respHeaders[name];
      if (header) return header;
      name = angular.lowercase(name);
      header = this.$$respHeaders[name];
      if (header) return header;
      header = undefined;
      angular.forEach(this.$$respHeaders, function (headerVal, headerName) {
        if (!header && angular.lowercase(headerName) === name) header = headerVal;
      });
      return header;
    };

    this.getAllResponseHeaders = function () {
      var lines = [];
      angular.forEach(this.$$respHeaders, function (value, key) {
        lines.push(key + ': ' + value);
      });
      return lines.join('\n');
    };

    this.abort = angular.noop; // This section simulates the events on a real XHR object (and the upload object)
    // When we are testing $httpBackend (inside the angular project) we make partial use of this
    // but store the events directly ourselves on `$$events`, instead of going through the `addEventListener`

    this.$$events = {};

    this.addEventListener = function (name, listener) {
      if (angular.isUndefined(this.$$events[name])) this.$$events[name] = [];
      this.$$events[name].push(listener);
    };

    this.upload = {
      $$events: {},
      addEventListener: this.addEventListener
    };
  }
  /**
   * @ngdoc service
   * @name $timeout
   * @description
   *
   * This service is just a simple decorator for {@link ng.$timeout $timeout} service
   * that adds a "flush" and "verifyNoPendingTasks" methods.
   */


  angular.mock.$TimeoutDecorator = ['$delegate', '$browser', function ($delegate, $browser) {
    /**
     * @ngdoc method
     * @name $timeout#flush
     * @description
     *
     * Flushes the queue of pending tasks.
     *
     * @param {number=} delay maximum timeout amount to flush up until
     */
    $delegate.flush = function (delay) {
      $browser.defer.flush(delay);
    };
    /**
     * @ngdoc method
     * @name $timeout#verifyNoPendingTasks
     * @description
     *
     * Verifies that there are no pending tasks that need to be flushed.
     */


    $delegate.verifyNoPendingTasks = function () {
      if ($browser.deferredFns.length) {
        throw new Error('Deferred tasks to flush (' + $browser.deferredFns.length + '): ' + formatPendingTasksAsString($browser.deferredFns));
      }
    };

    function formatPendingTasksAsString(tasks) {
      var result = [];
      angular.forEach(tasks, function (task) {
        result.push('{id: ' + task.id + ', time: ' + task.time + '}');
      });
      return result.join(', ');
    }

    return $delegate;
  }];
  angular.mock.$RAFDecorator = ['$delegate', function ($delegate) {
    var rafFn = function rafFn(fn) {
      var index = rafFn.queue.length;
      rafFn.queue.push(fn);
      return function () {
        rafFn.queue.splice(index, 1);
      };
    };

    rafFn.queue = [];
    rafFn.supported = $delegate.supported;

    rafFn.flush = function () {
      if (rafFn.queue.length === 0) {
        throw new Error('No rAF callbacks present');
      }

      var length = rafFn.queue.length;

      for (var i = 0; i < length; i++) {
        rafFn.queue[i]();
      }

      rafFn.queue = rafFn.queue.slice(i);
    };

    return rafFn;
  }];
  /**
   *
   */

  var originalRootElement;

  angular.mock.$RootElementProvider = function () {
    this.$get = ['$injector', function ($injector) {
      originalRootElement = angular.element('<div ng-app></div>').data('$injector', $injector);
      return originalRootElement;
    }];
  };
  /**
   * @ngdoc service
   * @name $controller
   * @description
   * A decorator for {@link ng.$controller} with additional `bindings` parameter, useful when testing
   * controllers of directives that use {@link $compile#-bindtocontroller- `bindToController`}.
   *
   * Depending on the value of
   * {@link ng.$compileProvider#preAssignBindingsEnabled `preAssignBindingsEnabled()`}, the properties
   * will be bound before or after invoking the constructor.
   *
   *
   * ## Example
   *
   * ```js
   *
   * // Directive definition ...
   *
   * myMod.directive('myDirective', {
   *   controller: 'MyDirectiveController',
   *   bindToController: {
   *     name: '@'
   *   }
   * });
   *
   *
   * // Controller definition ...
   *
   * myMod.controller('MyDirectiveController', ['$log', function($log) {
   *   this.log = function() {
   *     $log.info(this.name);
   *   };
   * }]);
   *
   *
   * // In a test ...
   *
   * describe('myDirectiveController', function() {
   *   describe('log()', function() {
   *     it('should write the bound name to the log', inject(function($controller, $log) {
   *       var ctrl = $controller('MyDirectiveController', { /* no locals &#42;/ }, { name: 'Clark Kent' });
   *       ctrl.log();
   *
   *       expect(ctrl.name).toEqual('Clark Kent');
   *       expect($log.info.logs).toEqual(['Clark Kent']);
   *     }));
   *   });
   * });
   *
   * ```
   *
   * @param {Function|string} constructor If called with a function then it's considered to be the
   *    controller constructor function. Otherwise it's considered to be a string which is used
   *    to retrieve the controller constructor using the following steps:
   *
   *    * check if a controller with given name is registered via `$controllerProvider`
   *    * check if evaluating the string on the current scope returns a constructor
   *    * if $controllerProvider#allowGlobals, check `window[constructor]` on the global
   *      `window` object (not recommended)
   *
   *    The string can use the `controller as property` syntax, where the controller instance is published
   *    as the specified property on the `scope`; the `scope` must be injected into `locals` param for this
   *    to work correctly.
   *
   * @param {Object} locals Injection locals for Controller.
   * @param {Object=} bindings Properties to add to the controller instance. This is used to simulate
   *                           the `bindToController` feature and simplify certain kinds of tests.
   * @return {Object} Instance of given controller.
   */


  function createControllerDecorator(compileProvider) {
    angular.mock.$ControllerDecorator = ['$delegate', function ($delegate) {
      return function (expression, locals, later, ident) {
        if (later && typeof later === 'object') {
          var preAssignBindingsEnabled = compileProvider.preAssignBindingsEnabled();
          var instantiate = $delegate(expression, locals, true, ident);

          if (preAssignBindingsEnabled) {
            angular.extend(instantiate.instance, later);
          }

          var instance = instantiate();

          if (!preAssignBindingsEnabled || instance !== instantiate.instance) {
            angular.extend(instance, later);
          }

          return instance;
        }

        return $delegate(expression, locals, later, ident);
      };
    }];
    return angular.mock.$ControllerDecorator;
  }
  /**
   * @ngdoc service
   * @name $componentController
   * @description
   * A service that can be used to create instances of component controllers. Useful for unit-testing.
   *
   * Be aware that the controller will be instantiated and attached to the scope as specified in
   * the component definition object. If you do not provide a `$scope` object in the `locals` param
   * then the helper will create a new isolated scope as a child of `$rootScope`.
   *
   * If you are using `$element` or `$attrs` in the controller, make sure to provide them as `locals`.
   * The `$element` must be a jqLite-wrapped DOM element, and `$attrs` should be an object that
   * has all properties / functions that you are using in the controller. If this is getting too complex,
   * you should compile the component instead and access the component's controller via the
   * {@link angular.element#methods `controller`} function.
   *
   * See also the section on {@link guide/component#unit-testing-component-controllers unit-testing component controllers}
   * in the guide.
   *
   * @param {string} componentName the name of the component whose controller we want to instantiate
   * @param {Object} locals Injection locals for Controller.
   * @param {Object=} bindings Properties to add to the controller before invoking the constructor. This is used
   *                           to simulate the `bindToController` feature and simplify certain kinds of tests.
   * @param {string=} ident Override the property name to use when attaching the controller to the scope.
   * @return {Object} Instance of requested controller.
   */


  angular.mock.$ComponentControllerProvider = ['$compileProvider', function ComponentControllerProvider($compileProvider) {
    this.$get = ['$controller', '$injector', '$rootScope', function ($controller, $injector, $rootScope) {
      return function $componentController(componentName, locals, bindings, ident) {
        // get all directives associated to the component name
        var directives = $injector.get(componentName + 'Directive'); // look for those directives that are components

        var candidateDirectives = directives.filter(function (directiveInfo) {
          // components have controller, controllerAs and restrict:'E'
          return directiveInfo.controller && directiveInfo.controllerAs && directiveInfo.restrict === 'E';
        }); // check if valid directives found

        if (candidateDirectives.length === 0) {
          throw new Error('No component found');
        }

        if (candidateDirectives.length > 1) {
          throw new Error('Too many components found');
        } // get the info of the component


        var directiveInfo = candidateDirectives[0]; // create a scope if needed

        locals = locals || {};
        locals.$scope = locals.$scope || $rootScope.$new(true);
        return $controller(directiveInfo.controller, locals, bindings, ident || directiveInfo.controllerAs);
      };
    }];
  }];
  /**
   * @ngdoc module
   * @name ngMock
   * @packageName angular-mocks
   * @description
   *
   * # ngMock
   *
   * The `ngMock` module provides support to inject and mock Angular services into unit tests.
   * In addition, ngMock also extends various core ng services such that they can be
   * inspected and controlled in a synchronous manner within test code.
   *
   *
   * <div doc-module-components="ngMock"></div>
   *
   * @installation
   *
   *  First, download the file:
   *  * [Google CDN](https://developers.google.com/speed/libraries/devguide#angularjs) e.g.
   *    `"//ajax.googleapis.com/ajax/libs/angularjs/X.Y.Z/angular-mocks.js"`
   *  * [NPM](https://www.npmjs.com/) e.g. `npm install angular-mocks@X.Y.Z`
   *  * [Yarn](https://yarnpkg.com) e.g. `yarn add angular-mocks@X.Y.Z`
   *  * [Bower](http://bower.io) e.g. `bower install angular-mocks#X.Y.Z`
   *  * [code.angularjs.org](https://code.angularjs.org/) (discouraged for production use)  e.g.
   *    `"//code.angularjs.org/X.Y.Z/angular-mocks.js"`
   *
   * where X.Y.Z is the AngularJS version you are running.
   *
   * Then, configure your test runner to load `angular-mocks.js` after `angular.js`.
   * This example uses <a href="http://karma-runner.github.io/">Karma</a>:
   *
   * ```
   * config.set({
   *   files: [
   *     'build/angular.js', // and other module files you need
   *     'build/angular-mocks.js',
   *     '<path/to/application/files>',
   *     '<path/to/spec/files>'
   *   ]
   * });
   * ```
   *
   * Including the `angular-mocks.js` file automatically adds the `ngMock` module, so your tests
   *  are ready to go!
   */

  angular.module('ngMock', ['ng']).provider({
    $browser: angular.mock.$BrowserProvider,
    $exceptionHandler: angular.mock.$ExceptionHandlerProvider,
    $log: angular.mock.$LogProvider,
    $interval: angular.mock.$IntervalProvider,
    $httpBackend: angular.mock.$HttpBackendProvider,
    $rootElement: angular.mock.$RootElementProvider,
    $componentController: angular.mock.$ComponentControllerProvider
  }).config(['$provide', '$compileProvider', function ($provide, $compileProvider) {
    $provide.decorator('$timeout', angular.mock.$TimeoutDecorator);
    $provide.decorator('$$rAF', angular.mock.$RAFDecorator);
    $provide.decorator('$rootScope', angular.mock.$RootScopeDecorator);
    $provide.decorator('$controller', createControllerDecorator($compileProvider));
  }]);
  /**
   * @ngdoc module
   * @name ngMockE2E
   * @module ngMockE2E
   * @packageName angular-mocks
   * @description
   *
   * The `ngMockE2E` is an angular module which contains mocks suitable for end-to-end testing.
   * Currently there is only one mock present in this module -
   * the {@link ngMockE2E.$httpBackend e2e $httpBackend} mock.
   */

  angular.module('ngMockE2E', ['ng']).config(['$provide', function ($provide) {
    $provide.value('$httpBackend', angular.injector(['ng']).get('$httpBackend'));
    $provide.decorator('$httpBackend', angular.mock.e2e.$httpBackendDecorator);
  }]);
  /**
   * @ngdoc service
   * @name $httpBackend
   * @module ngMockE2E
   * @description
   * Fake HTTP backend implementation suitable for end-to-end testing or backend-less development of
   * applications that use the {@link ng.$http $http service}.
   *
   * <div class="alert alert-info">
   * **Note**: For fake http backend implementation suitable for unit testing please see
   * {@link ngMock.$httpBackend unit-testing $httpBackend mock}.
   * </div>
   *
   * This implementation can be used to respond with static or dynamic responses via the `when` api
   * and its shortcuts (`whenGET`, `whenPOST`, etc) and optionally pass through requests to the
   * real $httpBackend for specific requests (e.g. to interact with certain remote apis or to fetch
   * templates from a webserver).
   *
   * As opposed to unit-testing, in an end-to-end testing scenario or in scenario when an application
   * is being developed with the real backend api replaced with a mock, it is often desirable for
   * certain category of requests to bypass the mock and issue a real http request (e.g. to fetch
   * templates or static files from the webserver). To configure the backend with this behavior
   * use the `passThrough` request handler of `when` instead of `respond`.
   *
   * Additionally, we don't want to manually have to flush mocked out requests like we do during unit
   * testing. For this reason the e2e $httpBackend flushes mocked out requests
   * automatically, closely simulating the behavior of the XMLHttpRequest object.
   *
   * To setup the application to run with this http backend, you have to create a module that depends
   * on the `ngMockE2E` and your application modules and defines the fake backend:
   *
   * ```js
   *   var myAppDev = angular.module('myAppDev', ['myApp', 'ngMockE2E']);
   *   myAppDev.run(function($httpBackend) {
   *     var phones = [{name: 'phone1'}, {name: 'phone2'}];
   *
   *     // returns the current list of phones
   *     $httpBackend.whenGET('/phones').respond(phones);
   *
   *     // adds a new phone to the phones array
   *     $httpBackend.whenPOST('/phones').respond(function(method, url, data) {
   *       var phone = angular.fromJson(data);
   *       phones.push(phone);
   *       return [200, phone, {}];
   *     });
   *     $httpBackend.whenGET(/^\/templates\//).passThrough(); // Requests for templare are handled by the real server
   *     //...
   *   });
   * ```
   *
   * Afterwards, bootstrap your app with this new module.
   *
   * ## Example
   * <example name="httpbackend-e2e-testing" module="myAppE2E" deps="angular-mocks.js">
   * <file name="app.js">
   *   var myApp = angular.module('myApp', []);
   *
   *   myApp.controller('MainCtrl', function MainCtrl($http) {
   *     var ctrl = this;
   *
   *     ctrl.phones = [];
   *     ctrl.newPhone = {
   *       name: ''
   *     };
   *
   *     ctrl.getPhones = function() {
   *       $http.get('/phones').then(function(response) {
   *         ctrl.phones = response.data;
   *       });
   *     };
   *
   *     ctrl.addPhone = function(phone) {
   *       $http.post('/phones', phone).then(function() {
   *         ctrl.newPhone = {name: ''};
   *         return ctrl.getPhones();
   *       });
   *     };
   *
   *     ctrl.getPhones();
   *   });
   * </file>
   * <file name="e2e.js">
   *   var myAppDev = angular.module('myAppE2E', ['myApp', 'ngMockE2E']);
   *
   *   myAppDev.run(function($httpBackend) {
   *     var phones = [{name: 'phone1'}, {name: 'phone2'}];
   *
   *     // returns the current list of phones
   *     $httpBackend.whenGET('/phones').respond(phones);
   *
   *     // adds a new phone to the phones array
   *     $httpBackend.whenPOST('/phones').respond(function(method, url, data) {
   *       var phone = angular.fromJson(data);
   *       phones.push(phone);
   *       return [200, phone, {}];
   *     });
   *   });
   * </file>
   * <file name="index.html">
   *   <div ng-controller="MainCtrl as $ctrl">
   *   <form name="newPhoneForm" ng-submit="$ctrl.addPhone($ctrl.newPhone)">
   *     <input type="text" ng-model="$ctrl.newPhone.name">
   *     <input type="submit" value="Add Phone">
   *   </form>
   *   <h1>Phones</h1>
   *   <ul>
   *     <li ng-repeat="phone in $ctrl.phones">{{phone.name}}</li>
   *   </ul>
   *   </div>
   * </file>
   * </example>
   *
   *
   */

  /**
   * @ngdoc method
   * @name $httpBackend#when
   * @module ngMockE2E
   * @description
   * Creates a new backend definition.
   *
   * @param {string} method HTTP method.
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers or function that receives http header
   *   object and returns true if the headers match the current definition.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   *
   *  - respond –
   *    ```
   *    { function([status,] data[, headers, statusText])
   *    | function(function(method, url, data, headers, params)}
   *    ```
   *    – The respond method takes a set of static data to be returned or a function that can return
   *    an array containing response status (number), response data (Array|Object|string), response
   *    headers (Object), and the text for the status (string).
   *  - passThrough – `{function()}` – Any request matching a backend definition with
   *    `passThrough` handler will be passed through to the real backend (an XHR request will be made
   *    to the server.)
   *  - Both methods return the `requestHandler` object for possible overrides.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenGET
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for GET requests. For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenHEAD
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for HEAD requests. For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenDELETE
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for DELETE requests. For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenPOST
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for POST requests. For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenPUT
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for PUT requests.  For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenPATCH
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for PATCH requests.  For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(string|RegExp|function(string))=} data HTTP request body or function that receives
   *   data string and returns true if the data is as expected.
   * @param {(Object|function(Object))=} headers HTTP headers.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenJSONP
   * @module ngMockE2E
   * @description
   * Creates a new backend definition for JSONP requests. For more info see `when()`.
   *
   * @param {string|RegExp|function(string)} url HTTP url or function that receives a url
   *   and returns true if the url matches the current definition.
   * @param {(Array)=} keys Array of keys to assign to regex matches in request url described on
   *   {@link ngMock.$httpBackend $httpBackend mock}.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  /**
   * @ngdoc method
   * @name $httpBackend#whenRoute
   * @module ngMockE2E
   * @description
   * Creates a new backend definition that compares only with the requested route.
   *
   * @param {string} method HTTP method.
   * @param {string} url HTTP url string that supports colon param matching.
   * @returns {requestHandler} Returns an object with `respond` and `passThrough` methods that
   *   control how a matched request is handled. You can save this object for later use and invoke
   *   `respond` or `passThrough` again in order to change how a matched request is handled.
   */

  angular.mock.e2e = {};
  angular.mock.e2e.$httpBackendDecorator = ['$rootScope', '$timeout', '$delegate', '$browser', createHttpBackendMock];
  /**
   * @ngdoc type
   * @name $rootScope.Scope
   * @module ngMock
   * @description
   * {@link ng.$rootScope.Scope Scope} type decorated with helper methods useful for testing. These
   * methods are automatically available on any {@link ng.$rootScope.Scope Scope} instance when
   * `ngMock` module is loaded.
   *
   * In addition to all the regular `Scope` methods, the following helper methods are available:
   */

  angular.mock.$RootScopeDecorator = ['$delegate', function ($delegate) {
    var $rootScopePrototype = Object.getPrototypeOf($delegate);
    $rootScopePrototype.$countChildScopes = countChildScopes;
    $rootScopePrototype.$countWatchers = countWatchers;
    return $delegate; // ------------------------------------------------------------------------------------------ //

    /**
     * @ngdoc method
     * @name $rootScope.Scope#$countChildScopes
     * @module ngMock
     * @this $rootScope.Scope
     * @description
     * Counts all the direct and indirect child scopes of the current scope.
     *
     * The current scope is excluded from the count. The count includes all isolate child scopes.
     *
     * @returns {number} Total number of child scopes.
     */

    function countChildScopes() {
      var count = 0; // exclude the current scope

      var pendingChildHeads = [this.$$childHead];
      var currentScope;

      while (pendingChildHeads.length) {
        currentScope = pendingChildHeads.shift();

        while (currentScope) {
          count += 1;
          pendingChildHeads.push(currentScope.$$childHead);
          currentScope = currentScope.$$nextSibling;
        }
      }

      return count;
    }
    /**
     * @ngdoc method
     * @name $rootScope.Scope#$countWatchers
     * @this $rootScope.Scope
     * @module ngMock
     * @description
     * Counts all the watchers of direct and indirect child scopes of the current scope.
     *
     * The watchers of the current scope are included in the count and so are all the watchers of
     * isolate child scopes.
     *
     * @returns {number} Total number of watchers.
     */


    function countWatchers() {
      var count = this.$$watchers ? this.$$watchers.length : 0; // include the current scope

      var pendingChildHeads = [this.$$childHead];
      var currentScope;

      while (pendingChildHeads.length) {
        currentScope = pendingChildHeads.shift();

        while (currentScope) {
          count += currentScope.$$watchers ? currentScope.$$watchers.length : 0;
          pendingChildHeads.push(currentScope.$$childHead);
          currentScope = currentScope.$$nextSibling;
        }
      }

      return count;
    }
  }];

  (function (jasmineOrMocha) {
    if (!jasmineOrMocha) {
      return;
    }

    var currentSpec = null,
        injectorState = new InjectorState(),
        annotatedFunctions = [],
        wasInjectorCreated = function wasInjectorCreated() {
      return !!currentSpec;
    };

    angular.mock.$$annotate = angular.injector.$$annotate;

    angular.injector.$$annotate = function (fn) {
      if (typeof fn === 'function' && !fn.$inject) {
        annotatedFunctions.push(fn);
      }

      return angular.mock.$$annotate.apply(this, arguments);
    };
    /**
     * @ngdoc function
     * @name angular.mock.module
     * @description
     *
     * *NOTE*: This function is also published on window for easy access.<br>
     * *NOTE*: This function is declared ONLY WHEN running tests with jasmine or mocha
     *
     * This function registers a module configuration code. It collects the configuration information
     * which will be used when the injector is created by {@link angular.mock.inject inject}.
     *
     * See {@link angular.mock.inject inject} for usage example
     *
     * @param {...(string|Function|Object)} fns any number of modules which are represented as string
     *        aliases or as anonymous module initialization functions. The modules are used to
     *        configure the injector. The 'ng' and 'ngMock' modules are automatically loaded. If an
     *        object literal is passed each key-value pair will be registered on the module via
     *        {@link auto.$provide $provide}.value, the key being the string name (or token) to associate
     *        with the value on the injector.
     */


    var module = window.module = angular.mock.module = function () {
      var moduleFns = Array.prototype.slice.call(arguments, 0);
      return wasInjectorCreated() ? workFn() : workFn; /////////////////////

      function workFn() {
        if (currentSpec.$injector) {
          throw new Error('Injector already created, can not register a module!');
        } else {
          var fn,
              modules = currentSpec.$modules || (currentSpec.$modules = []);
          angular.forEach(moduleFns, function (module) {
            if (angular.isObject(module) && !angular.isArray(module)) {
              fn = ['$provide', function ($provide) {
                angular.forEach(module, function (value, key) {
                  $provide.value(key, value);
                });
              }];
            } else {
              fn = module;
            }

            if (currentSpec.$providerInjector) {
              currentSpec.$providerInjector.invoke(fn);
            } else {
              modules.push(fn);
            }
          });
        }
      }
    };

    module.$$beforeAllHook = window.before || window.beforeAll;
    module.$$afterAllHook = window.after || window.afterAll; // purely for testing ngMock itself

    module.$$currentSpec = function (to) {
      if (arguments.length === 0) return to;
      currentSpec = to;
    };
    /**
     * @ngdoc function
     * @name angular.mock.module.sharedInjector
     * @description
     *
     * *NOTE*: This function is declared ONLY WHEN running tests with jasmine or mocha
     *
     * This function ensures a single injector will be used for all tests in a given describe context.
     * This contrasts with the default behaviour where a new injector is created per test case.
     *
     * Use sharedInjector when you want to take advantage of Jasmine's `beforeAll()`, or mocha's
     * `before()` methods. Call `module.sharedInjector()` before you setup any other hooks that
     * will create (i.e call `module()`) or use (i.e call `inject()`) the injector.
     *
     * You cannot call `sharedInjector()` from within a context already using `sharedInjector()`.
     *
     * ## Example
     *
     * Typically beforeAll is used to make many assertions about a single operation. This can
     * cut down test run-time as the test setup doesn't need to be re-run, and enabling focussed
     * tests each with a single assertion.
     *
     * ```js
     * describe("Deep Thought", function() {
     *
     *   module.sharedInjector();
     *
     *   beforeAll(module("UltimateQuestion"));
     *
     *   beforeAll(inject(function(DeepThought) {
     *     expect(DeepThought.answer).toBeUndefined();
     *     DeepThought.generateAnswer();
     *   }));
     *
     *   it("has calculated the answer correctly", inject(function(DeepThought) {
     *     // Because of sharedInjector, we have access to the instance of the DeepThought service
     *     // that was provided to the beforeAll() hook. Therefore we can test the generated answer
     *     expect(DeepThought.answer).toBe(42);
     *   }));
     *
     *   it("has calculated the answer within the expected time", inject(function(DeepThought) {
     *     expect(DeepThought.runTimeMillennia).toBeLessThan(8000);
     *   }));
     *
     *   it("has double checked the answer", inject(function(DeepThought) {
     *     expect(DeepThought.absolutelySureItIsTheRightAnswer).toBe(true);
     *   }));
     *
     * });
     *
     * ```
     */


    module.sharedInjector = function () {
      if (!(module.$$beforeAllHook && module.$$afterAllHook)) {
        throw Error('sharedInjector() cannot be used unless your test runner defines beforeAll/afterAll');
      }

      var initialized = false;
      module.$$beforeAllHook(
      /** @this */
      function () {
        if (injectorState.shared) {
          injectorState.sharedError = Error('sharedInjector() cannot be called inside a context that has already called sharedInjector()');
          throw injectorState.sharedError;
        }

        initialized = true;
        currentSpec = this;
        injectorState.shared = true;
      });
      module.$$afterAllHook(function () {
        if (initialized) {
          injectorState = new InjectorState();
          module.$$cleanup();
        } else {
          injectorState.sharedError = null;
        }
      });
    };

    module.$$beforeEach = function () {
      if (injectorState.shared && currentSpec && currentSpec !== this) {
        var state = currentSpec;
        currentSpec = this;
        angular.forEach(['$injector', '$modules', '$providerInjector', '$injectorStrict'], function (k) {
          currentSpec[k] = state[k];
          state[k] = null;
        });
      } else {
        currentSpec = this;
        originalRootElement = null;
        annotatedFunctions = [];
      }
    };

    module.$$afterEach = function () {
      if (injectorState.cleanupAfterEach()) {
        module.$$cleanup();
      }
    };

    module.$$cleanup = function () {
      var injector = currentSpec.$injector;
      annotatedFunctions.forEach(function (fn) {
        delete fn.$inject;
      });
      angular.forEach(currentSpec.$modules, function (module) {
        if (module && module.$$hashKey) {
          module.$$hashKey = undefined;
        }
      });
      currentSpec.$injector = null;
      currentSpec.$modules = null;
      currentSpec.$providerInjector = null;
      currentSpec = null;

      if (injector) {
        // Ensure `$rootElement` is instantiated, before checking `originalRootElement`
        var $rootElement = injector.get('$rootElement');
        var rootNode = $rootElement && $rootElement[0];
        var cleanUpNodes = !originalRootElement ? [] : [originalRootElement[0]];

        if (rootNode && (!originalRootElement || rootNode !== originalRootElement[0])) {
          cleanUpNodes.push(rootNode);
        }

        angular.element.cleanData(cleanUpNodes); // Ensure `$destroy()` is available, before calling it
        // (a mocked `$rootScope` might not implement it (or not even be an object at all))

        var $rootScope = injector.get('$rootScope');
        if ($rootScope && $rootScope.$destroy) $rootScope.$destroy();
      } // clean up jquery's fragment cache


      angular.forEach(angular.element.fragments, function (val, key) {
        delete angular.element.fragments[key];
      });
      MockXhr.$$lastInstance = null;
      angular.forEach(angular.callbacks, function (val, key) {
        delete angular.callbacks[key];
      });
      angular.callbacks.$$counter = 0;
    };

    (window.beforeEach || window.setup)(module.$$beforeEach);
    (window.afterEach || window.teardown)(module.$$afterEach);
    /**
     * @ngdoc function
     * @name angular.mock.inject
     * @description
     *
     * *NOTE*: This function is also published on window for easy access.<br>
     * *NOTE*: This function is declared ONLY WHEN running tests with jasmine or mocha
     *
     * The inject function wraps a function into an injectable function. The inject() creates new
     * instance of {@link auto.$injector $injector} per test, which is then used for
     * resolving references.
     *
     *
     * ## Resolving References (Underscore Wrapping)
     * Often, we would like to inject a reference once, in a `beforeEach()` block and reuse this
     * in multiple `it()` clauses. To be able to do this we must assign the reference to a variable
     * that is declared in the scope of the `describe()` block. Since we would, most likely, want
     * the variable to have the same name of the reference we have a problem, since the parameter
     * to the `inject()` function would hide the outer variable.
     *
     * To help with this, the injected parameters can, optionally, be enclosed with underscores.
     * These are ignored by the injector when the reference name is resolved.
     *
     * For example, the parameter `_myService_` would be resolved as the reference `myService`.
     * Since it is available in the function body as `_myService_`, we can then assign it to a variable
     * defined in an outer scope.
     *
     * ```
     * // Defined out reference variable outside
     * var myService;
     *
     * // Wrap the parameter in underscores
     * beforeEach( inject( function(_myService_){
     *   myService = _myService_;
     * }));
     *
     * // Use myService in a series of tests.
     * it('makes use of myService', function() {
     *   myService.doStuff();
     * });
     *
     * ```
     *
     * See also {@link angular.mock.module angular.mock.module}
     *
     * ## Example
     * Example of what a typical jasmine tests looks like with the inject method.
     * ```js
     *
     *   angular.module('myApplicationModule', [])
     *       .value('mode', 'app')
     *       .value('version', 'v1.0.1');
     *
     *
     *   describe('MyApp', function() {
     *
     *     // You need to load modules that you want to test,
     *     // it loads only the "ng" module by default.
     *     beforeEach(module('myApplicationModule'));
     *
     *
     *     // inject() is used to inject arguments of all given functions
     *     it('should provide a version', inject(function(mode, version) {
     *       expect(version).toEqual('v1.0.1');
     *       expect(mode).toEqual('app');
     *     }));
     *
     *
     *     // The inject and module method can also be used inside of the it or beforeEach
     *     it('should override a version and test the new version is injected', function() {
     *       // module() takes functions or strings (module aliases)
     *       module(function($provide) {
     *         $provide.value('version', 'overridden'); // override version here
     *       });
     *
     *       inject(function(version) {
     *         expect(version).toEqual('overridden');
     *       });
     *     });
     *   });
     *
     * ```
     *
     * @param {...Function} fns any number of functions which will be injected using the injector.
     */

    var ErrorAddingDeclarationLocationStack = function ErrorAddingDeclarationLocationStack(e, errorForStack) {
      this.message = e.message;
      this.name = e.name;
      if (e.line) this.line = e.line;
      if (e.sourceId) this.sourceId = e.sourceId;
      if (e.stack && errorForStack) this.stack = e.stack + '\n' + errorForStack.stack;
      if (e.stackArray) this.stackArray = e.stackArray;
    };

    ErrorAddingDeclarationLocationStack.prototype = Error.prototype;

    window.inject = angular.mock.inject = function () {
      var blockFns = Array.prototype.slice.call(arguments, 0);
      var errorForStack = new Error('Declaration Location'); // IE10+ and PhanthomJS do not set stack trace information, until the error is thrown

      if (!errorForStack.stack) {
        try {
          throw errorForStack;
        } catch (e) {
          /* empty */
        }
      }

      return wasInjectorCreated() ? WorkFn.call(currentSpec) : WorkFn; /////////////////////

      function WorkFn() {
        var modules = currentSpec.$modules || [];
        var strictDi = !!currentSpec.$injectorStrict;
        modules.unshift(['$injector', function ($injector) {
          currentSpec.$providerInjector = $injector;
        }]);
        modules.unshift('ngMock');
        modules.unshift('ng');
        var injector = currentSpec.$injector;

        if (!injector) {
          if (strictDi) {
            // If strictDi is enabled, annotate the providerInjector blocks
            angular.forEach(modules, function (moduleFn) {
              if (typeof moduleFn === 'function') {
                angular.injector.$$annotate(moduleFn);
              }
            });
          }

          injector = currentSpec.$injector = angular.injector(modules, strictDi);
          currentSpec.$injectorStrict = strictDi;
        }

        for (var i = 0, ii = blockFns.length; i < ii; i++) {
          if (currentSpec.$injectorStrict) {
            // If the injector is strict / strictDi, and the spec wants to inject using automatic
            // annotation, then annotate the function here.
            injector.annotate(blockFns[i]);
          }

          try {
            injector.invoke(blockFns[i] || angular.noop, this);
          } catch (e) {
            if (e.stack && errorForStack) {
              throw new ErrorAddingDeclarationLocationStack(e, errorForStack);
            }

            throw e;
          } finally {
            errorForStack = null;
          }
        }
      }
    };

    angular.mock.inject.strictDi = function (value) {
      value = arguments.length ? !!value : true;
      return wasInjectorCreated() ? workFn() : workFn;

      function workFn() {
        if (value !== currentSpec.$injectorStrict) {
          if (currentSpec.$injector) {
            throw new Error('Injector already created, can not modify strict annotations');
          } else {
            currentSpec.$injectorStrict = value;
          }
        }
      }
    };

    function InjectorState() {
      this.shared = false;
      this.sharedError = null;

      this.cleanupAfterEach = function () {
        return !this.shared || this.sharedError;
      };
    }
  })(window.jasmine || window.mocha);
})(window, window.angular);
/**
 * @license AngularJS v1.5.11
 * (c) 2010-2017 Google, Inc. http://angularjs.org
 * License: MIT
 */
(function (window, angular) {
  'use strict';
  /* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
   *     Any commits to this file should be reviewed with security in mind.  *
   *   Changes to this file can potentially create security vulnerabilities. *
   *          An approval from 2 Core members with history of modifying      *
   *                         this file is required.                          *
   *                                                                         *
   *  Does the change somehow allow for arbitrary javascript to be executed? *
   *    Or allows for someone to change the prototype of built-in objects?   *
   *     Or gives undesired access to variables likes document or window?    *
   * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * */

  var $sanitizeMinErr = angular.$$minErr('$sanitize');
  var bind;
  var extend;
  var forEach;
  var isDefined;
  var lowercase;
  var noop;
  var htmlParser;
  var htmlSanitizeWriter;
  /**
   * @ngdoc module
   * @name ngSanitize
   * @description
   *
   * # ngSanitize
   *
   * The `ngSanitize` module provides functionality to sanitize HTML.
   *
   *
   * <div doc-module-components="ngSanitize"></div>
   *
   * See {@link ngSanitize.$sanitize `$sanitize`} for usage.
   */

  /**
   * @ngdoc service
   * @name $sanitize
   * @kind function
   *
   * @description
   *   Sanitizes an html string by stripping all potentially dangerous tokens.
   *
   *   The input is sanitized by parsing the HTML into tokens. All safe tokens (from a whitelist) are
   *   then serialized back to properly escaped html string. This means that no unsafe input can make
   *   it into the returned string.
   *
   *   The whitelist for URL sanitization of attribute values is configured using the functions
   *   `aHrefSanitizationWhitelist` and `imgSrcSanitizationWhitelist` of {@link ng.$compileProvider
   *   `$compileProvider`}.
   *
   *   The input may also contain SVG markup if this is enabled via {@link $sanitizeProvider}.
   *
   * @param {string} html HTML input.
   * @returns {string} Sanitized HTML.
   *
   * @example
     <example module="sanitizeExample" deps="angular-sanitize.js" name="sanitize-service">
     <file name="index.html">
       <script>
           angular.module('sanitizeExample', ['ngSanitize'])
             .controller('ExampleController', ['$scope', '$sce', function($scope, $sce) {
               $scope.snippet =
                 '<p style="color:blue">an html\n' +
                 '<em onmouseover="this.textContent=\'PWN3D!\'">click here</em>\n' +
                 'snippet</p>';
               $scope.deliberatelyTrustDangerousSnippet = function() {
                 return $sce.trustAsHtml($scope.snippet);
               };
             }]);
       </script>
       <div ng-controller="ExampleController">
          Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <td>Directive</td>
             <td>How</td>
             <td>Source</td>
             <td>Rendered</td>
           </tr>
           <tr id="bind-html-with-sanitize">
             <td>ng-bind-html</td>
             <td>Automatically uses $sanitize</td>
             <td><pre>&lt;div ng-bind-html="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind-html="snippet"></div></td>
           </tr>
           <tr id="bind-html-with-trust">
             <td>ng-bind-html</td>
             <td>Bypass $sanitize by explicitly trusting the dangerous value</td>
             <td>
             <pre>&lt;div ng-bind-html="deliberatelyTrustDangerousSnippet()"&gt;
  &lt;/div&gt;</pre>
             </td>
             <td><div ng-bind-html="deliberatelyTrustDangerousSnippet()"></div></td>
           </tr>
           <tr id="bind-default">
             <td>ng-bind</td>
             <td>Automatically escapes</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br/>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
         </div>
     </file>
     <file name="protractor.js" type="protractor">
       it('should sanitize the html snippet by default', function() {
         expect(element(by.css('#bind-html-with-sanitize div')).getAttribute('innerHTML')).
           toBe('<p>an html\n<em>click here</em>\nsnippet</p>');
       });
  
       it('should inline raw snippet if bound to a trusted value', function() {
         expect(element(by.css('#bind-html-with-trust div')).getAttribute('innerHTML')).
           toBe("<p style=\"color:blue\">an html\n" +
                "<em onmouseover=\"this.textContent='PWN3D!'\">click here</em>\n" +
                "snippet</p>");
       });
  
       it('should escape snippet without any filter', function() {
         expect(element(by.css('#bind-default div')).getAttribute('innerHTML')).
           toBe("&lt;p style=\"color:blue\"&gt;an html\n" +
                "&lt;em onmouseover=\"this.textContent='PWN3D!'\"&gt;click here&lt;/em&gt;\n" +
                "snippet&lt;/p&gt;");
       });
  
       it('should update', function() {
         element(by.model('snippet')).clear();
         element(by.model('snippet')).sendKeys('new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-html-with-sanitize div')).getAttribute('innerHTML')).
           toBe('new <b>text</b>');
         expect(element(by.css('#bind-html-with-trust div')).getAttribute('innerHTML')).toBe(
           'new <b onclick="alert(1)">text</b>');
         expect(element(by.css('#bind-default div')).getAttribute('innerHTML')).toBe(
           "new &lt;b onclick=\"alert(1)\"&gt;text&lt;/b&gt;");
       });
     </file>
     </example>
   */

  /**
   * @ngdoc provider
   * @name $sanitizeProvider
   * @this
   *
   * @description
   * Creates and configures {@link $sanitize} instance.
   */

  function $SanitizeProvider() {
    var svgEnabled = false;
    this.$get = ['$$sanitizeUri', function ($$sanitizeUri) {
      if (svgEnabled) {
        extend(validElements, svgElements);
      }

      return function (html) {
        var buf = [];
        htmlParser(html, htmlSanitizeWriter(buf, function (uri, isImage) {
          return !/^unsafe:/.test($$sanitizeUri(uri, isImage));
        }));
        return buf.join('');
      };
    }];
    /**
     * @ngdoc method
     * @name $sanitizeProvider#enableSvg
     * @kind function
     *
     * @description
     * Enables a subset of svg to be supported by the sanitizer.
     *
     * <div class="alert alert-warning">
     *   <p>By enabling this setting without taking other precautions, you might expose your
     *   application to click-hijacking attacks. In these attacks, sanitized svg elements could be positioned
     *   outside of the containing element and be rendered over other elements on the page (e.g. a login
     *   link). Such behavior can then result in phishing incidents.</p>
     *
     *   <p>To protect against these, explicitly setup `overflow: hidden` css rule for all potential svg
     *   tags within the sanitized content:</p>
     *
     *   <br>
     *
     *   <pre><code>
     *   .rootOfTheIncludedContent svg {
     *     overflow: hidden !important;
     *   }
     *   </code></pre>
     * </div>
     *
     * @param {boolean=} flag Enable or disable SVG support in the sanitizer.
     * @returns {boolean|ng.$sanitizeProvider} Returns the currently configured value if called
     *    without an argument or self for chaining otherwise.
     */

    this.enableSvg = function (enableSvg) {
      if (isDefined(enableSvg)) {
        svgEnabled = enableSvg;
        return this;
      } else {
        return svgEnabled;
      }
    }; //////////////////////////////////////////////////////////////////////////////////////////////////
    // Private stuff
    //////////////////////////////////////////////////////////////////////////////////////////////////


    bind = angular.bind;
    extend = angular.extend;
    forEach = angular.forEach;
    isDefined = angular.isDefined;
    lowercase = angular.lowercase;
    noop = angular.noop;
    htmlParser = htmlParserImpl;
    htmlSanitizeWriter = htmlSanitizeWriterImpl; // Regular Expressions for parsing tags and attributes

    var SURROGATE_PAIR_REGEXP = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g,
        // Match everything outside of normal chars and " (quote character)
    NON_ALPHANUMERIC_REGEXP = /([^#-~ |!])/g; // Good source of info about elements and attributes
    // http://dev.w3.org/html5/spec/Overview.html#semantics
    // http://simon.html5.org/html-elements
    // Safe Void Elements - HTML5
    // http://dev.w3.org/html5/spec/Overview.html#void-elements

    var voidElements = toMap('area,br,col,hr,img,wbr'); // Elements that you can, intentionally, leave open (and which close themselves)
    // http://dev.w3.org/html5/spec/Overview.html#optional-tags

    var optionalEndTagBlockElements = toMap('colgroup,dd,dt,li,p,tbody,td,tfoot,th,thead,tr'),
        optionalEndTagInlineElements = toMap('rp,rt'),
        optionalEndTagElements = extend({}, optionalEndTagInlineElements, optionalEndTagBlockElements); // Safe Block Elements - HTML5

    var blockElements = extend({}, optionalEndTagBlockElements, toMap('address,article,' + 'aside,blockquote,caption,center,del,dir,div,dl,figure,figcaption,footer,h1,h2,h3,h4,h5,' + 'h6,header,hgroup,hr,ins,map,menu,nav,ol,pre,section,table,ul')); // Inline Elements - HTML5

    var inlineElements = extend({}, optionalEndTagInlineElements, toMap('a,abbr,acronym,b,' + 'bdi,bdo,big,br,cite,code,del,dfn,em,font,i,img,ins,kbd,label,map,mark,q,ruby,rp,rt,s,' + 'samp,small,span,strike,strong,sub,sup,time,tt,u,var')); // SVG Elements
    // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Elements
    // Note: the elements animate,animateColor,animateMotion,animateTransform,set are intentionally omitted.
    // They can potentially allow for arbitrary javascript to be executed. See #11290

    var svgElements = toMap('circle,defs,desc,ellipse,font-face,font-face-name,font-face-src,g,glyph,' + 'hkern,image,linearGradient,line,marker,metadata,missing-glyph,mpath,path,polygon,polyline,' + 'radialGradient,rect,stop,svg,switch,text,title,tspan'); // Blocked Elements (will be stripped)

    var blockedElements = toMap('script,style');
    var validElements = extend({}, voidElements, blockElements, inlineElements, optionalEndTagElements); //Attributes that have href and hence need to be sanitized

    var uriAttrs = toMap('background,cite,href,longdesc,src,xlink:href');
    var htmlAttrs = toMap('abbr,align,alt,axis,bgcolor,border,cellpadding,cellspacing,class,clear,' + 'color,cols,colspan,compact,coords,dir,face,headers,height,hreflang,hspace,' + 'ismap,lang,language,nohref,nowrap,rel,rev,rows,rowspan,rules,' + 'scope,scrolling,shape,size,span,start,summary,tabindex,target,title,type,' + 'valign,value,vspace,width'); // SVG attributes (without "id" and "name" attributes)
    // https://wiki.whatwg.org/wiki/Sanitization_rules#svg_Attributes

    var svgAttrs = toMap('accent-height,accumulate,additive,alphabetic,arabic-form,ascent,' + 'baseProfile,bbox,begin,by,calcMode,cap-height,class,color,color-rendering,content,' + 'cx,cy,d,dx,dy,descent,display,dur,end,fill,fill-rule,font-family,font-size,font-stretch,' + 'font-style,font-variant,font-weight,from,fx,fy,g1,g2,glyph-name,gradientUnits,hanging,' + 'height,horiz-adv-x,horiz-origin-x,ideographic,k,keyPoints,keySplines,keyTimes,lang,' + 'marker-end,marker-mid,marker-start,markerHeight,markerUnits,markerWidth,mathematical,' + 'max,min,offset,opacity,orient,origin,overline-position,overline-thickness,panose-1,' + 'path,pathLength,points,preserveAspectRatio,r,refX,refY,repeatCount,repeatDur,' + 'requiredExtensions,requiredFeatures,restart,rotate,rx,ry,slope,stemh,stemv,stop-color,' + 'stop-opacity,strikethrough-position,strikethrough-thickness,stroke,stroke-dasharray,' + 'stroke-dashoffset,stroke-linecap,stroke-linejoin,stroke-miterlimit,stroke-opacity,' + 'stroke-width,systemLanguage,target,text-anchor,to,transform,type,u1,u2,underline-position,' + 'underline-thickness,unicode,unicode-range,units-per-em,values,version,viewBox,visibility,' + 'width,widths,x,x-height,x1,x2,xlink:actuate,xlink:arcrole,xlink:role,xlink:show,xlink:title,' + 'xlink:type,xml:base,xml:lang,xml:space,xmlns,xmlns:xlink,y,y1,y2,zoomAndPan', true);
    var validAttrs = extend({}, uriAttrs, svgAttrs, htmlAttrs);

    function toMap(str, lowercaseKeys) {
      var obj = {},
          items = str.split(','),
          i;

      for (i = 0; i < items.length; i++) {
        obj[lowercaseKeys ? lowercase(items[i]) : items[i]] = true;
      }

      return obj;
    }

    var inertBodyElement;

    (function (window) {
      var doc;

      if (window.document && window.document.implementation) {
        doc = window.document.implementation.createHTMLDocument('inert');
      } else {
        throw $sanitizeMinErr('noinert', 'Can\'t create an inert html document');
      }

      var docElement = doc.documentElement || doc.getDocumentElement();
      var bodyElements = docElement.getElementsByTagName('body'); // usually there should be only one body element in the document, but IE doesn't have any, so we need to create one

      if (bodyElements.length === 1) {
        inertBodyElement = bodyElements[0];
      } else {
        var html = doc.createElement('html');
        inertBodyElement = doc.createElement('body');
        html.appendChild(inertBodyElement);
        doc.appendChild(html);
      }
    })(window);
    /**
     * @example
     * htmlParser(htmlString, {
     *     start: function(tag, attrs) {},
     *     end: function(tag) {},
     *     chars: function(text) {},
     *     comment: function(text) {}
     * });
     *
     * @param {string} html string
     * @param {object} handler
     */


    function htmlParserImpl(html, handler) {
      if (html === null || html === undefined) {
        html = '';
      } else if (typeof html !== 'string') {
        html = '' + html;
      }

      inertBodyElement.innerHTML = html; //mXSS protection

      var mXSSAttempts = 5;

      do {
        if (mXSSAttempts === 0) {
          throw $sanitizeMinErr('uinput', 'Failed to sanitize html because the input is unstable');
        }

        mXSSAttempts--; // strip custom-namespaced attributes on IE<=11

        if (window.document.documentMode) {
          stripCustomNsAttrs(inertBodyElement);
        }

        html = inertBodyElement.innerHTML; //trigger mXSS

        inertBodyElement.innerHTML = html;
      } while (html !== inertBodyElement.innerHTML);

      var node = inertBodyElement.firstChild;

      while (node) {
        switch (node.nodeType) {
          case 1:
            // ELEMENT_NODE
            handler.start(node.nodeName.toLowerCase(), attrToMap(node.attributes));
            break;

          case 3:
            // TEXT NODE
            handler.chars(node.textContent);
            break;
        }

        var nextNode;

        if (!(nextNode = node.firstChild)) {
          if (node.nodeType === 1) {
            handler.end(node.nodeName.toLowerCase());
          }

          nextNode = node.nextSibling;

          if (!nextNode) {
            while (nextNode == null) {
              node = node.parentNode;
              if (node === inertBodyElement) break;
              nextNode = node.nextSibling;

              if (node.nodeType === 1) {
                handler.end(node.nodeName.toLowerCase());
              }
            }
          }
        }

        node = nextNode;
      }

      while (node = inertBodyElement.firstChild) {
        inertBodyElement.removeChild(node);
      }
    }

    function attrToMap(attrs) {
      var map = {};

      for (var i = 0, ii = attrs.length; i < ii; i++) {
        var attr = attrs[i];
        map[attr.name] = attr.value;
      }

      return map;
    }
    /**
     * Escapes all potentially dangerous characters, so that the
     * resulting string can be safely inserted into attribute or
     * element text.
     * @param value
     * @returns {string} escaped text
     */


    function encodeEntities(value) {
      return value.replace(/&/g, '&amp;').replace(SURROGATE_PAIR_REGEXP, function (value) {
        var hi = value.charCodeAt(0);
        var low = value.charCodeAt(1);
        return '&#' + ((hi - 0xD800) * 0x400 + (low - 0xDC00) + 0x10000) + ';';
      }).replace(NON_ALPHANUMERIC_REGEXP, function (value) {
        return '&#' + value.charCodeAt(0) + ';';
      }).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }
    /**
     * create an HTML/XML writer which writes to buffer
     * @param {Array} buf use buf.join('') to get out sanitized html string
     * @returns {object} in the form of {
     *     start: function(tag, attrs) {},
     *     end: function(tag) {},
     *     chars: function(text) {},
     *     comment: function(text) {}
     * }
     */


    function htmlSanitizeWriterImpl(buf, uriValidator) {
      var ignoreCurrentElement = false;
      var out = bind(buf, buf.push);
      return {
        start: function start(tag, attrs) {
          tag = lowercase(tag);

          if (!ignoreCurrentElement && blockedElements[tag]) {
            ignoreCurrentElement = tag;
          }

          if (!ignoreCurrentElement && validElements[tag] === true) {
            out('<');
            out(tag);
            forEach(attrs, function (value, key) {
              var lkey = lowercase(key);
              var isImage = tag === 'img' && lkey === 'src' || lkey === 'background';

              if (validAttrs[lkey] === true && (uriAttrs[lkey] !== true || uriValidator(value, isImage))) {
                out(' ');
                out(key);
                out('="');
                out(encodeEntities(value));
                out('"');
              }
            });
            out('>');
          }
        },
        end: function end(tag) {
          tag = lowercase(tag);

          if (!ignoreCurrentElement && validElements[tag] === true && voidElements[tag] !== true) {
            out('</');
            out(tag);
            out('>');
          } // eslint-disable-next-line eqeqeq


          if (tag == ignoreCurrentElement) {
            ignoreCurrentElement = false;
          }
        },
        chars: function chars(_chars) {
          if (!ignoreCurrentElement) {
            out(encodeEntities(_chars));
          }
        }
      };
    }
    /**
     * When IE9-11 comes across an unknown namespaced attribute e.g. 'xlink:foo' it adds 'xmlns:ns1' attribute to declare
     * ns1 namespace and prefixes the attribute with 'ns1' (e.g. 'ns1:xlink:foo'). This is undesirable since we don't want
     * to allow any of these custom attributes. This method strips them all.
     *
     * @param node Root element to process
     */


    function stripCustomNsAttrs(node) {
      while (node) {
        if (node.nodeType === window.Node.ELEMENT_NODE) {
          var attrs = node.attributes;

          for (var i = 0, l = attrs.length; i < l; i++) {
            var attrNode = attrs[i];
            var attrName = attrNode.name.toLowerCase();

            if (attrName === 'xmlns:ns1' || attrName.lastIndexOf('ns1:', 0) === 0) {
              node.removeAttributeNode(attrNode);
              i--;
              l--;
            }
          }
        }

        var nextNode = node.firstChild;

        if (nextNode) {
          stripCustomNsAttrs(nextNode);
        }

        node = node.nextSibling;
      }
    }
  }

  function sanitizeText(chars) {
    var buf = [];
    var writer = htmlSanitizeWriter(buf, noop);
    writer.chars(chars);
    return buf.join('');
  } // define ngSanitize module and register $sanitize service


  angular.module('ngSanitize', []).provider('$sanitize', $SanitizeProvider);
  /**
   * @ngdoc filter
   * @name linky
   * @kind function
   *
   * @description
   * Finds links in text input and turns them into html links. Supports `http/https/ftp/mailto` and
   * plain email address links.
   *
   * Requires the {@link ngSanitize `ngSanitize`} module to be installed.
   *
   * @param {string} text Input text.
   * @param {string} target Window (`_blank|_self|_parent|_top`) or named frame to open links in.
   * @param {object|function(url)} [attributes] Add custom attributes to the link element.
   *
   *    Can be one of:
   *
   *    - `object`: A map of attributes
   *    - `function`: Takes the url as a parameter and returns a map of attributes
   *
   *    If the map of attributes contains a value for `target`, it overrides the value of
   *    the target parameter.
   *
   *
   * @returns {string} Html-linkified and {@link $sanitize sanitized} text.
   *
   * @usage
     <span ng-bind-html="linky_expression | linky"></span>
   *
   * @example
     <example module="linkyExample" deps="angular-sanitize.js" name="linky-filter">
       <file name="index.html">
         <div ng-controller="ExampleController">
         Snippet: <textarea ng-model="snippet" cols="60" rows="3"></textarea>
         <table>
           <tr>
             <th>Filter</th>
             <th>Source</th>
             <th>Rendered</th>
           </tr>
           <tr id="linky-filter">
             <td>linky filter</td>
             <td>
               <pre>&lt;div ng-bind-html="snippet | linky"&gt;<br>&lt;/div&gt;</pre>
             </td>
             <td>
               <div ng-bind-html="snippet | linky"></div>
             </td>
           </tr>
           <tr id="linky-target">
            <td>linky target</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_blank'"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_blank'"></div>
            </td>
           </tr>
           <tr id="linky-custom-attributes">
            <td>linky custom attributes</td>
            <td>
              <pre>&lt;div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"&gt;<br>&lt;/div&gt;</pre>
            </td>
            <td>
              <div ng-bind-html="snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}"></div>
            </td>
           </tr>
           <tr id="escaped-html">
             <td>no filter</td>
             <td><pre>&lt;div ng-bind="snippet"&gt;<br>&lt;/div&gt;</pre></td>
             <td><div ng-bind="snippet"></div></td>
           </tr>
         </table>
       </file>
       <file name="script.js">
         angular.module('linkyExample', ['ngSanitize'])
           .controller('ExampleController', ['$scope', function($scope) {
             $scope.snippet =
               'Pretty text with some links:\n' +
               'http://angularjs.org/,\n' +
               'mailto:us@somewhere.org,\n' +
               'another@somewhere.org,\n' +
               'and one more: ftp://127.0.0.1/.';
             $scope.snippetWithSingleURL = 'http://angularjs.org/';
           }]);
       </file>
       <file name="protractor.js" type="protractor">
         it('should linkify the snippet with urls', function() {
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(4);
         });
  
         it('should not linkify snippet without the linky filter', function() {
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText()).
               toBe('Pretty text with some links: http://angularjs.org/, mailto:us@somewhere.org, ' +
                    'another@somewhere.org, and one more: ftp://127.0.0.1/.');
           expect(element.all(by.css('#escaped-html a')).count()).toEqual(0);
         });
  
         it('should update', function() {
           element(by.model('snippet')).clear();
           element(by.model('snippet')).sendKeys('new http://link.');
           expect(element(by.id('linky-filter')).element(by.binding('snippet | linky')).getText()).
               toBe('new http://link.');
           expect(element.all(by.css('#linky-filter a')).count()).toEqual(1);
           expect(element(by.id('escaped-html')).element(by.binding('snippet')).getText())
               .toBe('new http://link.');
         });
  
         it('should work with the target property', function() {
          expect(element(by.id('linky-target')).
              element(by.binding("snippetWithSingleURL | linky:'_blank'")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-target a')).getAttribute('target')).toEqual('_blank');
         });
  
         it('should optionally add custom attributes', function() {
          expect(element(by.id('linky-custom-attributes')).
              element(by.binding("snippetWithSingleURL | linky:'_self':{rel: 'nofollow'}")).getText()).
              toBe('http://angularjs.org/');
          expect(element(by.css('#linky-custom-attributes a')).getAttribute('rel')).toEqual('nofollow');
         });
       </file>
     </example>
   */

  angular.module('ngSanitize').filter('linky', ['$sanitize', function ($sanitize) {
    var LINKY_URL_REGEXP = /((ftp|https?):\/\/|(www\.)|(mailto:)?[A-Za-z0-9._%+-]+@)\S*[^\s.;,(){}<>"\u201d\u2019]/i,
        MAILTO_REGEXP = /^mailto:/i;
    var linkyMinErr = angular.$$minErr('linky');
    var isDefined = angular.isDefined;
    var isFunction = angular.isFunction;
    var isObject = angular.isObject;
    var isString = angular.isString;
    return function (text, target, attributes) {
      if (text == null || text === '') return text;
      if (!isString(text)) throw linkyMinErr('notstring', 'Expected string but received: {0}', text);
      var attributesFn = isFunction(attributes) ? attributes : isObject(attributes) ? function getAttributesObject() {
        return attributes;
      } : function getEmptyAttributesObject() {
        return {};
      };
      var match;
      var raw = text;
      var html = [];
      var url;
      var i;

      while (match = raw.match(LINKY_URL_REGEXP)) {
        // We can not end in these as they are sometimes found at the end of the sentence
        url = match[0]; // if we did not match ftp/http/www/mailto then assume mailto

        if (!match[2] && !match[4]) {
          url = (match[3] ? 'http://' : 'mailto:') + url;
        }

        i = match.index;
        addText(raw.substr(0, i));
        addLink(url, match[0].replace(MAILTO_REGEXP, ''));
        raw = raw.substring(i + match[0].length);
      }

      addText(raw);
      return $sanitize(html.join(''));

      function addText(text) {
        if (!text) {
          return;
        }

        html.push(sanitizeText(text));
      }

      function addLink(url, text) {
        var key,
            linkAttributes = attributesFn(url);
        html.push('<a ');

        for (key in linkAttributes) {
          html.push(key + '="' + linkAttributes[key] + '" ');
        }

        if (isDefined(target) && !('target' in linkAttributes)) {
          html.push('target="', target, '" ');
        }

        html.push('href="', url.replace(/"/g, '&quot;'), '">');
        addText(text);
        html.push('</a>');
      }
    };
  }]);
})(window, window.angular);
//
// showdown.js -- A javascript port of Markdown.
//
// Copyright (c) 2007 John Fraser.
//
// Original Markdown Copyright (c) 2004-2005 John Gruber
//   <http://daringfireball.net/projects/markdown/>
//
// Redistributable under a BSD-style open source license.
// See license.txt for more information.
//
// The full source distribution is at:
//
//				A A L
//				T C A
//				T K B
//
//   <http://www.attacklab.net/>
//
//
// Wherever possible, Showdown is a straight, line-by-line port
// of the Perl version of Markdown.
//
// This is not a normal parser design; it's basically just a
// series of string substitutions.  It's hard to read and
// maintain this way,  but keeping Showdown close to the original
// design makes it easier to port new features.
//
// More importantly, Showdown behaves like markdown.pl in most
// edge cases.  So web applications can do client-side preview
// in Javascript, and then build identical HTML on the server.
//
// This port needs the new RegExp functionality of ECMA 262,
// 3rd Edition (i.e. Javascript 1.5).  Most modern web browsers
// should do fine.  Even with the new regular expression features,
// We do a lot of work to emulate Perl's regex functionality.
// The tricky changes in this file mostly have the "attacklab:"
// label.  Major or self-explanatory changes don't.
//
// Smart diff tools like Araxis Merge will be able to match up
// this file with markdown.pl in a useful way.  A little tweaking
// helps: in a copy of markdown.pl, replace "#" with "//" and
// replace "$text" with "text".  Be sure to ignore whitespace
// and line endings.
//
//
// Showdown usage:
//
//   var text = "Markdown *rocks*.";
//
//   var converter = new Showdown.converter();
//   var html = converter.makeHtml(text);
//
//   alert(html);
//
// Note: move the sample code to the bottom of this
// file before uncommenting it.
//
//
// Showdown namespace
//
var Showdown = {
  extensions: {}
},
    forEach = Showdown.forEach = function (a, b) {
  if (typeof a.forEach == "function") a.forEach(b);else {
    var c,
        d = a.length;

    for (c = 0; c < d; c++) {
      b(a[c], c, a);
    }
  }
},
    stdExtName = function stdExtName(a) {
  return a.replace(/[_-]||\s/g, "").toLowerCase();
};

Showdown.converter = function (a) {
  var b,
      c,
      d,
      e = 0,
      f = [],
      g = [];

  if (typeof module != "undefind" && typeof exports != "undefined" && typeof require != "undefind") {
    var h = require("fs");

    if (h) {
      var i = h.readdirSync((__dirname || ".") + "/extensions").filter(function (a) {
        return ~a.indexOf(".js");
      }).map(function (a) {
        return a.replace(/\.js$/, "");
      });
      Showdown.forEach(i, function (a) {
        var b = stdExtName(a);
        Showdown.extensions[b] = require("./extensions/" + a);
      });
    }
  }

  a && a.extensions && Showdown.forEach(a.extensions, function (a) {
    typeof a == "string" && (a = Showdown.extensions[stdExtName(a)]);
    if (typeof a != "function") throw "Extension '" + a + "' could not be loaded.  It was either not found or is not a valid extension.";
    Showdown.forEach(a(this), function (a) {
      a.type ? a.type === "language" || a.type === "lang" ? f.push(a) : (a.type === "output" || a.type === "html") && g.push(a) : g.push(a);
    });
  }), this.makeHtml = function (a) {
    return b = {}, c = {}, d = [], a = a.replace(/~/g, "~T"), a = a.replace(/\$/g, "~D"), a = a.replace(/\r\n/g, "\n"), a = a.replace(/\r/g, "\n"), a = "\n\n" + a + "\n\n", a = L(a), a = a.replace(/^[ \t]+$/mg, ""), Showdown.forEach(f, function (b) {
      a = j(b, a);
    }), a = y(a), a = l(a), a = k(a), a = n(a), a = J(a), a = a.replace(/~D/g, "$$"), a = a.replace(/~T/g, "~"), Showdown.forEach(g, function (b) {
      a = j(b, a);
    }), a;
  };

  var j = function j(a, b) {
    if (a.regex) {
      var c = new RegExp(a.regex, "g");
      return b.replace(c, a.replace);
    }

    if (a.filter) return a.filter(b);
  },
      k = function k(a) {
    return a += "~0", a = a.replace(/^[ ]{0,3}\[(.+)\]:[ \t]*\n?[ \t]*<?(\S+?)>?[ \t]*\n?[ \t]*(?:(\n*)["(](.+?)[")][ \t]*)?(?:\n+|(?=~0))/gm, function (a, d, e, f, g) {
      return d = d.toLowerCase(), b[d] = F(e), f ? f + g : (g && (c[d] = g.replace(/"/g, "&quot;")), "");
    }), a = a.replace(/~0/, ""), a;
  },
      l = function l(a) {
    a = a.replace(/\n/g, "\n\n");
    var b = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del|style|section|header|footer|nav|article|aside",
        c = "p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside";
    return a = a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|ins|del)\b[^\r]*?\n<\/\2>[ \t]*(?=\n+))/gm, m), a = a.replace(/^(<(p|div|h[1-6]|blockquote|pre|table|dl|ol|ul|script|noscript|form|fieldset|iframe|math|style|section|header|footer|nav|article|aside)\b[^\r]*?<\/\2>[ \t]*(?=\n+)\n)/gm, m), a = a.replace(/(\n[ ]{0,3}(<(hr)\b([^<>])*?\/?>)[ \t]*(?=\n{2,}))/g, m), a = a.replace(/(\n\n[ ]{0,3}<!(--[^\r]*?--\s*)+>[ \t]*(?=\n{2,}))/g, m), a = a.replace(/(?:\n\n)([ ]{0,3}(?:<([?%])[^\r]*?\2>)[ \t]*(?=\n{2,}))/g, m), a = a.replace(/\n\n/g, "\n"), a;
  },
      m = function m(a, b) {
    var c = b;
    return c = c.replace(/\n\n/g, "\n"), c = c.replace(/^\n/, ""), c = c.replace(/\n+$/g, ""), c = "\n\n~K" + (d.push(c) - 1) + "K\n\n", c;
  },
      n = function n(a) {
    a = u(a);
    var b = z("<hr />");
    return a = a.replace(/^[ ]{0,2}([ ]?\*[ ]?){3,}[ \t]*$/gm, b), a = a.replace(/^[ ]{0,2}([ ]?\-[ ]?){3,}[ \t]*$/gm, b), a = a.replace(/^[ ]{0,2}([ ]?\_[ ]?){3,}[ \t]*$/gm, b), a = w(a), a = x(a), a = D(a), a = l(a), a = E(a), a;
  },
      o = function o(a) {
    return a = A(a), a = p(a), a = G(a), a = s(a), a = q(a), a = H(a), a = F(a), a = C(a), a = a.replace(/  +\n/g, " <br />\n"), a;
  },
      p = function p(a) {
    var b = /(<[a-z\/!$]("[^"]*"|'[^']*'|[^'">])*>|<!(--.*?--\s*)+>)/gi;
    return a = a.replace(b, function (a) {
      var b = a.replace(/(.)<\/?code>(?=.)/g, "$1`");
      return b = M(b, "\\`*_"), b;
    }), a;
  },
      q = function q(a) {
    return a = a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, r), a = a.replace(/(\[((?:\[[^\]]*\]|[^\[\]])*)\]\([ \t]*()<?(.*?(?:\(.*?\).*?)?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, r), a = a.replace(/(\[([^\[\]]+)\])()()()()()/g, r), a;
  },
      r = function r(a, d, e, f, g, h, i, j) {
    j == undefined && (j = "");
    var k = d,
        l = e,
        m = f.toLowerCase(),
        n = g,
        o = j;

    if (n == "") {
      m == "" && (m = l.toLowerCase().replace(/ ?\n/g, " ")), n = "#" + m;
      if (b[m] != undefined) n = b[m], c[m] != undefined && (o = c[m]);else {
        if (!(k.search(/\(\s*\)$/m) > -1)) return k;
        n = "";
      }
    }

    n = M(n, "*_");
    var p = '<a href="' + n + '"';
    return o != "" && (o = o.replace(/"/g, "&quot;"), o = M(o, "*_"), p += ' title="' + o + '"'), p += ">" + l + "</a>", p;
  },
      s = function s(a) {
    return a = a.replace(/(!\[(.*?)\][ ]?(?:\n[ ]*)?\[(.*?)\])()()()()/g, t), a = a.replace(/(!\[(.*?)\]\s?\([ \t]*()<?(\S+?)>?[ \t]*((['"])(.*?)\6[ \t]*)?\))/g, t), a;
  },
      t = function t(a, d, e, f, g, h, i, j) {
    var k = d,
        l = e,
        m = f.toLowerCase(),
        n = g,
        o = j;
    o || (o = "");

    if (n == "") {
      m == "" && (m = l.toLowerCase().replace(/ ?\n/g, " ")), n = "#" + m;
      if (b[m] == undefined) return k;
      n = b[m], c[m] != undefined && (o = c[m]);
    }

    l = l.replace(/"/g, "&quot;"), n = M(n, "*_");
    var p = '<img src="' + n + '" alt="' + l + '"';
    return o = o.replace(/"/g, "&quot;"), o = M(o, "*_"), p += ' title="' + o + '"', p += " />", p;
  },
      u = function u(a) {
    function b(a) {
      return a.replace(/[^\w]/g, "").toLowerCase();
    }

    return a = a.replace(/^(.+)[ \t]*\n=+[ \t]*\n+/gm, function (a, c) {
      return z('<h1 id="' + b(c) + '">' + o(c) + "</h1>");
    }), a = a.replace(/^(.+)[ \t]*\n-+[ \t]*\n+/gm, function (a, c) {
      return z('<h2 id="' + b(c) + '">' + o(c) + "</h2>");
    }), a = a.replace(/^(\#{1,6})[ \t]*(.+?)[ \t]*\#*\n+/gm, function (a, c, d) {
      var e = c.length;
      return z("<h" + e + ' id="' + b(d) + '">' + o(d) + "</h" + e + ">");
    }), a;
  },
      v,
      w = function w(a) {
    a += "~0";
    var b = /^(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/gm;
    return e ? a = a.replace(b, function (a, b, c) {
      var d = b,
          e = c.search(/[*+-]/g) > -1 ? "ul" : "ol";
      d = d.replace(/\n{2,}/g, "\n\n\n");
      var f = v(d);
      return f = f.replace(/\s+$/, ""), f = "<" + e + ">" + f + "</" + e + ">\n", f;
    }) : (b = /(\n\n|^\n?)(([ ]{0,3}([*+-]|\d+[.])[ \t]+)[^\r]+?(~0|\n{2,}(?=\S)(?![ \t]*(?:[*+-]|\d+[.])[ \t]+)))/g, a = a.replace(b, function (a, b, c, d) {
      var e = b,
          f = c,
          g = d.search(/[*+-]/g) > -1 ? "ul" : "ol",
          f = f.replace(/\n{2,}/g, "\n\n\n"),
          h = v(f);
      return h = e + "<" + g + ">\n" + h + "</" + g + ">\n", h;
    })), a = a.replace(/~0/, ""), a;
  };

  v = function v(a) {
    return e++, a = a.replace(/\n{2,}$/, "\n"), a += "~0", a = a.replace(/(\n)?(^[ \t]*)([*+-]|\d+[.])[ \t]+([^\r]+?(\n{1,2}))(?=\n*(~0|\2([*+-]|\d+[.])[ \t]+))/gm, function (a, b, c, d, e) {
      var f = e,
          g = b,
          h = c;
      return g || f.search(/\n{2,}/) > -1 ? f = n(K(f)) : (f = w(K(f)), f = f.replace(/\n$/, ""), f = o(f)), "<li>" + f + "</li>\n";
    }), a = a.replace(/~0/g, ""), e--, a;
  };

  var x = function x(a) {
    return a += "~0", a = a.replace(/(?:\n\n|^)((?:(?:[ ]{4}|\t).*\n+)+)(\n*[ ]{0,3}[^ \t\n]|(?=~0))/g, function (a, b, c) {
      var d = b,
          e = c;
      return d = B(K(d)), d = L(d), d = d.replace(/^\n+/g, ""), d = d.replace(/\n+$/g, ""), d = "<pre><code>" + d + "\n</code></pre>", z(d) + e;
    }), a = a.replace(/~0/, ""), a;
  },
      y = function y(a) {
    return a += "~0", a = a.replace(/(?:^|\n)```(.*)\n([\s\S]*?)\n```/g, function (a, b, c) {
      var d = b,
          e = c;
      return e = B(e), e = L(e), e = e.replace(/^\n+/g, ""), e = e.replace(/\n+$/g, ""), e = "<pre><code" + (d ? ' class="' + d + '"' : "") + ">" + e + "\n</code></pre>", z(e);
    }), a = a.replace(/~0/, ""), a;
  },
      z = function z(a) {
    return a = a.replace(/(^\n+|\n+$)/g, ""), "\n\n~K" + (d.push(a) - 1) + "K\n\n";
  },
      A = function A(a) {
    return a = a.replace(/(^|[^\\])(`+)([^\r]*?[^`])\2(?!`)/gm, function (a, b, c, d, e) {
      var f = d;
      return f = f.replace(/^([ \t]*)/g, ""), f = f.replace(/[ \t]*$/g, ""), f = B(f), b + "<code>" + f + "</code>";
    }), a;
  },
      B = function B(a) {
    return a = a.replace(/&/g, "&amp;"), a = a.replace(/</g, "&lt;"), a = a.replace(/>/g, "&gt;"), a = M(a, "*_{}[]\\", !1), a;
  },
      C = function C(a) {
    return a = a.replace(/(\*\*|__)(?=\S)([^\r]*?\S[*_]*)\1/g, "<strong>$2</strong>"), a = a.replace(/(\*|_)(?=\S)([^\r]*?\S)\1/g, "<em>$2</em>"), a;
  },
      D = function D(a) {
    return a = a.replace(/((^[ \t]*>[ \t]?.+\n(.+\n)*\n*)+)/gm, function (a, b) {
      var c = b;
      return c = c.replace(/^[ \t]*>[ \t]?/gm, "~0"), c = c.replace(/~0/g, ""), c = c.replace(/^[ \t]+$/gm, ""), c = n(c), c = c.replace(/(^|\n)/g, "$1  "), c = c.replace(/(\s*<pre>[^\r]+?<\/pre>)/gm, function (a, b) {
        var c = b;
        return c = c.replace(/^  /mg, "~0"), c = c.replace(/~0/g, ""), c;
      }), z("<blockquote>\n" + c + "\n</blockquote>");
    }), a;
  },
      E = function E(a) {
    a = a.replace(/^\n+/g, ""), a = a.replace(/\n+$/g, "");
    var b = a.split(/\n{2,}/g),
        c = [],
        e = b.length;

    for (var f = 0; f < e; f++) {
      var g = b[f];
      g.search(/~K(\d+)K/g) >= 0 ? c.push(g) : g.search(/\S/) >= 0 && (g = o(g), g = g.replace(/^([ \t]*)/g, "<p>"), g += "</p>", c.push(g));
    }

    e = c.length;

    for (var f = 0; f < e; f++) {
      while (c[f].search(/~K(\d+)K/) >= 0) {
        var h = d[RegExp.$1];
        h = h.replace(/\$/g, "$$$$"), c[f] = c[f].replace(/~K\d+K/, h);
      }
    }

    return c.join("\n\n");
  },
      F = function F(a) {
    return a = a.replace(/&(?!#?[xX]?(?:[0-9a-fA-F]+|\w+);)/g, "&amp;"), a = a.replace(/<(?![a-z\/?\$!])/gi, "&lt;"), a;
  },
      G = function G(a) {
    return a = a.replace(/\\(\\)/g, N), a = a.replace(/\\([`*_{}\[\]()>#+-.!])/g, N), a;
  },
      H = function H(a) {
    return a = a.replace(/<((https?|ftp|dict):[^'">\s]+)>/gi, '<a href="$1">$1</a>'), a = a.replace(/<(?:mailto:)?([-.\w]+\@[-a-z0-9]+(\.[-a-z0-9]+)*\.[a-z]+)>/gi, function (a, b) {
      return I(J(b));
    }), a;
  },
      I = function I(a) {
    var b = [function (a) {
      return "&#" + a.charCodeAt(0) + ";";
    }, function (a) {
      return "&#x" + a.charCodeAt(0).toString(16) + ";";
    }, function (a) {
      return a;
    }];
    return a = "mailto:" + a, a = a.replace(/./g, function (a) {
      if (a == "@") a = b[Math.floor(Math.random() * 2)](a);else if (a != ":") {
        var c = Math.random();
        a = c > .9 ? b[2](a) : c > .45 ? b[1](a) : b[0](a);
      }
      return a;
    }), a = '<a href="' + a + '">' + a + "</a>", a = a.replace(/">.+:/g, '">'), a;
  },
      J = function J(a) {
    return a = a.replace(/~E(\d+)E/g, function (a, b) {
      var c = parseInt(b);
      return String.fromCharCode(c);
    }), a;
  },
      K = function K(a) {
    return a = a.replace(/^(\t|[ ]{1,4})/gm, "~0"), a = a.replace(/~0/g, ""), a;
  },
      L = function L(a) {
    return a = a.replace(/\t(?=\t)/g, "    "), a = a.replace(/\t/g, "~A~B"), a = a.replace(/~B(.+?)~A/g, function (a, b, c) {
      var d = b,
          e = 4 - d.length % 4;

      for (var f = 0; f < e; f++) {
        d += " ";
      }

      return d;
    }), a = a.replace(/~A/g, "    "), a = a.replace(/~B/g, ""), a;
  },
      M = function M(a, b, c) {
    var d = "([" + b.replace(/([\[\]\\])/g, "\\$1") + "])";
    c && (d = "\\\\" + d);
    var e = new RegExp(d, "g");
    return a = a.replace(e, N), a;
  },
      N = function N(a, b) {
    var c = b.charCodeAt(0);
    return "~E" + c + "E";
  };
}, typeof module != "undefined" && (module.exports = Showdown), typeof define == "function" && define.amd && define("showdown", function () {
  return Showdown;
});
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * DS205: Consider reworking code to avoid use of IIFEs
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
if (typeof __karma__ === 'undefined' || __karma__ === null) {
  window.describe = function () {};
} // define sample application logic


var m = angular.module("app", ["guanlecoja.ui", "ngSanitize"]);
var README = "https://github.com/tardyp/guanlecoja-ui/blob/master/Readme.md";
m.config(function ($stateProvider, glMenuServiceProvider, $urlRouterProvider) {
  var group;
  $urlRouterProvider.otherwise('/bugcab');
  var groups = [];

  for (var _i = 0, _arr = ["cab", "camera", "bug", "calendar", "ban", "archive", "edit"]; _i < _arr.length; _i++) {
    var i = _arr[_i];
    group = {
      name: i,
      items: []
    };

    for (var _i4 = 0, _arr2 = ["cab", "camera", "bug", "calendar", "ban", "archive", "edit"]; _i4 < _arr2.length; _i4++) {
      var j = _arr2[_i4];
      group.items.push({
        name: i + j
      });

      if (i === "bug") {
        break;
      }
    }

    groups.push(group);
    glMenuServiceProvider.addGroup({
      name: group.name,
      caption: _.capitalize(group.name),
      icon: group.name,
      order: group.name.length
    });
  }

  glMenuServiceProvider.setFooter([{
    caption: "Github",
    href: "https://github.com/tardyp/guanlecoja-ui"
  }, {
    caption: "Help",
    href: README
  }, {
    caption: "About",
    href: README
  }]);
  glMenuServiceProvider.setAppTitle("Guanlecoja-UI");
  return (() => {
    var result = [];

    for (var _i2 = 0, _Array$from = Array.from(groups); _i2 < _Array$from.length; _i2++) {
      group = _Array$from[_i2];
      result.push((() => {
        var result1 = [];

        for (var _i3 = 0, _Array$from2 = Array.from(group.items); _i3 < _Array$from2.length; _i3++) {
          var item = _Array$from2[_i3];
          var state = {
            controller: "dummyController",
            template: "<div class='container'><div btf-markdown ng-include=\"'Readme.md'\">         </div></div>",
            name: item.name,
            url: "/".concat(item.name),
            data: {
              group: group.name,
              caption: _.capitalize(item.name)
            }
          };
          result1.push($stateProvider.state(state));
        }

        return result1;
      })());
    }

    return result;
  })();
});
m.controller("dummyController", function ($scope, $state, glBreadcrumbService, glNotificationService, glTopbarContextualActionsService) {
  // You can set different actions given the route
  glTopbarContextualActionsService.setContextualActions([{
    caption: "Download Doc",
    icon: "download",

    action() {
      return document.location = 'Readme.md';
    }

  }, {
    caption: "View on Github",
    icon: "github",
    help: "Go to the github page of guanleoja-ui",

    action() {
      return document.location = README;
    }

  }, {
    icon: "google-plus",

    action() {
      return document.location = "https://plus.google.com";
    }

  }]);
  $scope.stateName = $state.current.name;
  glNotificationService.notify({
    msg: "You just transitioned to ".concat($scope.stateName, "!")
  }, {
    title: "State transitions",
    group: "state"
  });
  return glBreadcrumbService.setBreadcrumb([{
    caption: _.capitalize($state.current.data.group)
  }, {
    caption: _.capitalize($state.current.name),
    sref: $state.current.name
  }]);
}); //
// angular-markdown-directive v0.3.0
// (c) 2013-2014 Brian Ford http://briantford.com
// License: MIT

m.provider("markdownConverter", function () {
  var opts = {};
  return {
    config(newOpts) {
      opts = newOpts;
    },

    $get() {
      return new Showdown.converter(opts);
    }

  };
}).directive("btfMarkdown", ($sanitize, markdownConverter) => ({
  restrict: "AE",

  link(scope, element, attrs) {
    if (attrs.btfMarkdown) {
      scope.$watch(attrs.btfMarkdown, function (newVal) {
        var html = newVal ? $sanitize(markdownConverter.makeHtml(newVal)) : "";
        element.html(html);
      });
    } else {
      var html = $sanitize(markdownConverter.makeHtml(element.text()));
      element.html(html);
    }
  }

}));
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('breadcrumbService', function () {
  beforeEach(module("guanlecoja.ui")); // simple test to make sure the directive loads

  return it('should forward call to setBreadcrumb via $broadcast', inject(function ($rootScope, glBreadcrumbService) {
    var gotBreadcrumb = null;
    $rootScope.$on("glBreadcrumb", (e, data) => gotBreadcrumb = data);
    glBreadcrumbService.setBreadcrumb({
      foo: "bar"
    });
    $rootScope.$digest();
    return expect(gotBreadcrumb).toEqual({
      foo: "bar"
    });
  }));
});
/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('menuService', function () {
  beforeEach(module("guanlecoja.ui", function ($stateProvider, glMenuServiceProvider) {
    var group;
    var _glMenuServiceProvider = glMenuServiceProvider;
    var stateProvider = $stateProvider;
    var groups = [];

    for (var _i = 0, _arr = ["cab", "camera", "bug", "calendar", "ban", "archive", "edit"]; _i < _arr.length; _i++) {
      var i = _arr[_i];
      group = {
        name: i,
        items: []
      };

      for (var _i3 = 0, _arr2 = ["cab", "camera", "bug", "calendar", "ban", "archive", "edit"]; _i3 < _arr2.length; _i3++) {
        var j = _arr2[_i3];
        group.items.push({
          name: i + j
        });

        if (i === "bug") {
          break;
        }
      }

      groups.push(group);

      if (i === "edit") {
        glMenuServiceProvider.addGroup({
          name: group.name
        });
      } else {
        var groupForProvider = {
          name: group.name,
          caption: _.capitalize(group.name),
          icon: group.name,
          order: i === "edit" ? undefined : group.name.length
        };
        glMenuServiceProvider.addGroup(groupForProvider);

        if (i === "cab") {
          glMenuServiceProvider.setDefaultGroup(groupForProvider);
        }
      }
    }

    glMenuServiceProvider.setFooter([{
      caption: "Github",
      href: "https://github.com/tardyp/guanlecoja-ui"
    }]);
    glMenuServiceProvider.setAppTitle("Guanlecoja-UI");

    for (var _i2 = 0, _Array$from = Array.from(groups); _i2 < _Array$from.length; _i2++) {
      group = _Array$from[_i2];

      for (var _i4 = 0, _Array$from2 = Array.from(group.items); _i4 < _Array$from2.length; _i4++) {
        var item = _Array$from2[_i4];
        var state = {
          name: item.name,
          url: "/".concat(item.name),
          data: {
            group: item.name === "banedit" ? undefined : group.name,
            caption: item.name === "editedit" ? undefined : _.capitalize(item.name)
          }
        };
        $stateProvider.state(state);
      }
    }

    return null;
  }));
  it('should generate the menu correctly', inject(function (glMenuService) {
    var groups = glMenuService.getGroups();
    var namedGroups = {};

    for (var _i5 = 0, _Array$from3 = Array.from(groups); _i5 < _Array$from3.length; _i5++) {
      var g = _Array$from3[_i5];
      namedGroups[g.name] = g;
    }

    expect(groups.length).toEqual(7);
    expect(groups[0].items.length).toEqual(7);
    expect(namedGroups['bug'].items.length).toEqual(0);
    return expect(namedGroups['bug'].caption).toEqual('Bugcab');
  }));
  it('should have the default group set', inject(function (glMenuService) {
    var defaultGroup = glMenuService.getDefaultGroup();
    var groups = glMenuService.getGroups();
    return expect(defaultGroup).toEqual(groups[0]);
  })); // simple test to make sure the directive loads

  it('should generate error if group is undefined', function () {
    // configure the menu a little bit more.. with an erronous state
    module(function ($stateProvider, glMenuServiceProvider) {
      $stateProvider.state({
        name: "foo",
        data: {
          group: "bar"
        }
      }); // not existing group!

      return null;
    });

    var run = () => inject(function (glMenuService) {
      var groups;
      return groups = glMenuService.getGroups();
    });

    return expect(run).toThrow();
  }); // simple test to make sure the directive loads

  return it('should remove empty groups', function () {
    // configure the menu a little bit more.. with an erronous state
    module(function (glMenuServiceProvider) {
      glMenuServiceProvider.addGroup({
        name: "foo"
      });
      return null;
    });
    return inject(function (glMenuService) {
      var groups = glMenuService.getGroups();
      var namedGroups = {};

      for (var _i6 = 0, _Array$from4 = Array.from(groups); _i6 < _Array$from4.length; _i6++) {
        var g = _Array$from4[_i6];
        namedGroups[g.name] = g;
      }

      return expect(namedGroups["foo"]).not.toBeDefined();
    });
  });
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('http Interceptor', function () {
  beforeEach(module("guanlecoja.ui"));
  it('should intercept errors', inject(function ($q, $rootScope, glNotificationService, $timeout, glHttpInterceptor) {
    var d = $q.defer();
    var i = glHttpInterceptor(d.promise);
    spyOn(glNotificationService, "network").and.returnValue(null);
    d.reject("oups");
    $rootScope.$digest();
    $timeout.flush();
    return expect(glNotificationService.network).toHaveBeenCalledWith("oups");
  }));
  return it('should intercept http errors', inject(function ($q, $rootScope, glNotificationService, $timeout, glHttpInterceptor) {
    var d = $q.defer();
    var i = glHttpInterceptor(d.promise);
    spyOn(glNotificationService, "network").and.returnValue(null);
    d.reject({
      status: "404",
      data: {
        error: "not found"
      },
      config: {
        method: "get",
        url: "http://foo"
      }
    });
    $rootScope.$digest();
    $timeout.flush();
    return expect(glNotificationService.network).toHaveBeenCalledWith("404:not found when:get http://foo");
  }));
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('notificationService', function () {
  beforeEach(module("guanlecoja.ui"));
  return it('should add and delete notifications', inject(function (glNotificationService, $timeout) {
    glNotificationService.notify({
      msg: "done",
      title: "finish"
    });
    expect(glNotificationService.notifications).toEqual([{
      id: 1,
      msg: 'done',
      title: 'finish'
    }]);
    glNotificationService.dismiss(1);
    expect(glNotificationService.notifications).toEqual([]);
    glNotificationService.notify({
      msg: "done",
      title: "finish",
      group: "group"
    });
    glNotificationService.notify({
      msg: "msg2",
      title: "finish",
      group: "group"
    });
    expect(glNotificationService.notifications).toEqual([{
      id: 2,
      msg: 'done\nmsg2',
      title: 'finish',
      group: "group"
    }]);
    glNotificationService.dismiss(2);
    expect(glNotificationService.notifications).toEqual([]);
    glNotificationService.network({
      msg: "404"
    });
    glNotificationService.network({
      msg: "404",
      title: "403"
    });
    glNotificationService.network({
      msg: "404",
      group: "Network"
    });
    glNotificationService.dismiss(4);
    glNotificationService.error({
      msg: "oups"
    });
    glNotificationService.error({
      msg: "oups",
      title: "error"
    });
    glNotificationService.dismiss(8);
    expect(glNotificationService.notifications[0].id).toEqual(7);
    glNotificationService.dismiss(7);
    glNotificationService.dismiss(99);
    expect(glNotificationService.notifications).toEqual([]);
    glNotificationService.notify({
      msg: "done1",
      title: "finish"
    });
    glNotificationService.notify({
      msg: "done2",
      title: "finish",
      group: "group"
    });
    glNotificationService.notify({
      msg: "done3",
      title: "finish",
      group: "group"
    });
    glNotificationService.dismiss(9);
    glNotificationService.dismiss(10);
    return expect(glNotificationService.notifications).toEqual([]);
  }));
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('notification', function () {
  var scope;
  beforeEach(module("guanlecoja.ui"));
  var elmBody = scope = null;

  var injected = function injected($rootScope, $compile) {
    elmBody = angular.element('<gl-notification></gl-notification>');
    scope = $rootScope;
    $compile(elmBody)(scope);
    return scope.$digest();
  };

  beforeEach(inject(injected)); // simple test to make sure the directive loads

  it('should load', function () {
    expect(elmBody).toBeDefined(); // if there is an ul, the sidebar has been created

    return expect(elmBody.find("ul").length).toBeGreaterThan(0);
  }); // simple test to make sure the directive loads

  return it('should dismiss pass through', inject(function (glNotificationService) {
    var called = false;
    var e = {
      stopPropagation() {
        return called = true;
      }

    };
    spyOn(glNotificationService, "dismiss").and.returnValue(null);
    scope.n.dismiss(2, e);
    expect(glNotificationService.dismiss).toHaveBeenCalledWith(2);
    return expect(called).toBe(true);
  }));
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('page with sidebar', function () {
  var rootScope, scope;
  beforeEach(module("guanlecoja.ui"));
  var elmBody = scope = rootScope = null;

  var injected = function injected($rootScope, $compile, glMenuService, $window) {
    rootScope = $rootScope;
    elmBody = angular.element('<gl-page-with-sidebar></gl-page-with-sidebar>');
    var groups = [{
      name: 'g1',
      items: [{
        name: 'i1',
        'sref': ".."
      }]
    }, {
      name: 'g2'
    }];
    $window.localStorage.sidebarPinned = "false";

    glMenuService.getGroups = () => groups;

    glMenuService.getDefaultGroup = () => groups[1];

    scope = $rootScope;
    $compile(elmBody)(scope);
    return scope.$digest();
  };

  beforeEach(inject(injected)); // simple test to make sure the directive loads

  it('should load', function () {
    expect(elmBody).toBeDefined(); // if there is an ul, the sidebar has been created

    return expect(elmBody.find("ul").length).toBeGreaterThan(0);
  });
  it('should toggle groups', function () {
    expect(elmBody).toBeDefined();
    var g = scope.page.groups[1];
    expect(scope.page.activeGroup).toBe(g);
    scope.page.toggleGroup(g);
    expect(scope.page.activeGroup).toBe(null);
    scope.page.toggleGroup(g);
    expect(scope.page.activeGroup).toBe(g);
  });
  it('should pin sidebar', inject(function ($timeout, $window) {
    expect(scope.page.sidebarPinned).toBe(false);
    $timeout.flush();

    if ($window.innerWidth > 800) {
      expect(scope.page.sidebarActive).toBe(true);
    } else {
      expect(scope.page.sidebarActive).toBe(false);
    }

    scope.page.sidebarPinned = false;
    scope.page.leaveSidebar();
    $timeout.flush();
    expect(scope.page.sidebarActive).toBe(false);
    return scope.page.sidebarPinned = false;
  }));
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('topbar', function () {
  var scope;
  beforeEach(module("guanlecoja.ui"));
  var elmBody = scope = null;

  var injected = function injected($rootScope, $compile) {
    elmBody = angular.element('<gl-topbar></gl-topbar>');
    scope = $rootScope;
    $compile(elmBody)(scope);
    return scope.$digest();
  };

  beforeEach(inject(injected)); // simple test to make sure the directive loads

  it('should load', function () {
    expect(elmBody).toBeDefined(); // if there is an ul, the sidebar has been created

    return expect(elmBody.find("ul").length).toBeGreaterThan(0);
  }); // simple test to make sure the directive loads

  return it('should update breadcrumb upon messages', inject(function ($location) {
    $location.hash = () => "bar/";

    scope.$broadcast("$stateChangeStart", {
      name: "foo"
    });
    expect(scope.breadcrumb).toEqual([{
      caption: 'Foo',
      href: '#bar/'
    }]);
    scope.$broadcast("glBreadcrumb", [{
      caption: "bar",
      sref: "foo"
    }]);
    return expect(scope.breadcrumb).toEqual([{
      caption: 'bar',
      sref: 'foo'
    }]);
  }));
});
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
describe('topbar-contextual-actions', function () {
  var scope;
  beforeEach(module("guanlecoja.ui"));
  var elmBody = scope = null;

  var injected = function injected($rootScope, $compile) {
    elmBody = angular.element('<gl-topbar-contextual-actions></gl-contextual-actions>');
    scope = $rootScope.$new();
    $compile(elmBody)(scope);
    return scope.$digest();
  };

  beforeEach(inject(injected)); // simple test to make sure the directive loads

  it('should load', function () {
    expect(elmBody).toBeDefined(); // should be empty at init

    return expect(elmBody.find("li").length).toEqual(0);
  }); // create the buttons via API

  return it('should create buttons', inject(function (glTopbarContextualActionsService) {
    expect(elmBody).toBeDefined();
    var called = 0;
    glTopbarContextualActionsService.setContextualActions([{
      caption: "foo",

      action() {
        return called++;
      }

    }, {
      caption: "bar",

      action() {
        return called++;
      }

    }], // need two digests to propagate
    scope.$digest());
    scope.$digest();
    expect(elmBody.find(".form-group").length).toEqual(2);
    expect(elmBody.find("button").text()).toEqual("foobar"); // make sure action is called on click

    elmBody.find("button").each(function () {
      return $(this).click();
    });
    scope.$digest();
    return expect(called).toEqual(2);
  }));
});