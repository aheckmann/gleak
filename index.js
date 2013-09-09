/**
 * Gleak - detect global var leaks.
 * @api public
 */

module.exports = exports = function gleak () {
  return new Gleak;
}

/**
 * Version.
 * @api public
 */

exports.version = JSON.parse(
  require('fs').readFileSync(__dirname + '/package.json', 'utf8')
).version;

/**
 * Express middleware.
 * @api public
 */

exports.middleware = function gleakMiddleware (stream, format) {
  var g = new Gleak;

  if (!format) {
    switch (typeof stream) {
      case 'string':
        format = stream;
        stream = process.stderr;
        break;
      case 'undefined':
        format = g.format;
        stream = process.stderr;
        break;
      default:
        format = g.format;
    }
  }

  setTimeout(print, 1000);

  function print () {
    g.detectNew().forEach(function (leak) {
      stream.write(format.replace(/%s/, leak) + '\n');
    });
  }

  return function gleakMiddleware (req, res, next) {
    if (res._gleak) return next();
    res._gleak = true;

    var send = res.send;

    res.send = function () {
      res.send = send;
      res.send.apply(res, arguments);
      print();
    }

    next();
  }
}

/**
 * Gleak constructor
 * @api private
 */

function Gleak () {
  this.whitelist = this.whitelist.slice();
}

/**
 * Whitelisted globals.
 * @api public
 */

var dtraceLeaks = [
    'DTRACE_NET_SERVER_CONNECTION'
  , 'DTRACE_NET_STREAM_END'
  , 'DTRACE_NET_SOCKET_READ'
  , 'DTRACE_NET_SOCKET_WRITE'
  , 'DTRACE_HTTP_SERVER_REQUEST'
  , 'DTRACE_HTTP_SERVER_RESPONSE'
  , 'DTRACE_HTTP_CLIENT_REQUEST'
  , 'DTRACE_HTTP_CLIENT_RESPONSE'
]

var countersLeaks = [
    'COUNTER_NET_SERVER_CONNECTION'
  , 'COUNTER_NET_SERVER_CONNECTION_CLOSE'
  , 'COUNTER_HTTP_SERVER_REQUEST'
  , 'COUNTER_HTTP_SERVER_RESPONSE'
  , 'COUNTER_HTTP_CLIENT_REQUEST'
  , 'COUNTER_HTTP_CLIENT_RESPONSE'
]

// v0.4.x
Gleak.prototype.whitelist = [
    setTimeout
  , setInterval
  , clearTimeout
  , clearInterval
  , console
  , Buffer
  , process
  , global
  , GLOBAL
  , root
];

// check for new globals in >= v0.5x
var version = process.version.replace(/^v/, '').split('.');

if ('0' == version[0]) {
  if (version[1] > 4 && process.version != 'v0.5.0-pre') {
    Gleak.prototype.whitelist.push(
      ArrayBuffer
    , Int8Array
    , Uint8Array
    , Int16Array
    , Uint16Array
    , Int32Array
    , Uint32Array
    , Float32Array
    , Float64Array
    , DataView
    , 'errno' // node >= v0.5.x hack
    )
  }

  if (version[1] > 6) {
    Gleak.prototype.whitelist.push(Uint8ClampedArray);
  }

  if (version[1] >= 8) {
    dtraceLeaks.forEach(function (leak) {
      if ('undefined' != typeof global[leak])
        Gleak.prototype.whitelist.push(global[leak]);
    })
  }

  if (version[1] > 8) {
    Gleak.prototype.whitelist.push(setImmediate, clearImmediate);
    countersLeaks.forEach(function (leak) {
      if ('undefined' != typeof global[leak])
        Gleak.prototype.whitelist.push(global[leak]);
    })
  }
}

/**
 * Default format.
 * @api public
 */

Gleak.prototype.format = '\x1b[31mGleak!:\x1b[0m %s';

/**
 * Detects global variable leaks.
 * @api public
 */

Gleak.prototype.detect = function detect () {
  var whitelist = this.whitelist
    , ret = []

  Object.keys(global).forEach(function (key) {
    var w = whitelist.length
      , bad = true
      , white

    while (w--) {
      white = whitelist[w];
      if (global[key] === white || 'string' === typeof white && key === white) {
        bad = false;
        break;
      }
    }

    if (bad) ret.push(key);
  });

  return ret;
};

/**
 * Return only new leaks since the last time `detectNew`
 * was run.
 * @api public
 */

Gleak.prototype.detectNew = function detectNew () {
  var found = this.found || (this.found = []);
  var ret = [];

  this.detect().forEach(function (leak) {
    if (~found.indexOf(leak)) return;
    found.push(leak);
    ret.push(leak);
  });

  return ret;
}

/**
 * Prints all gleaks to stderr.
 * @api public
 */

Gleak.prototype.print = function print () {
  var format = this.format;
  this.detect().forEach(function (leak) {
    console.error(format, leak);
  });
}

/**
 * Add items to the whitelist disallowing duplicates.
 * @api public
 */

Gleak.prototype.ignore = function ignore () {
  var i = arguments.length;
  while (i--) {
    if (~this.whitelist.indexOf(arguments[i])) continue;
    this.whitelist.push(arguments[i]);
  }
  return this;
}

