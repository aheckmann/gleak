
/**
 * Gleak - detect global var leaks.
 */

/**
 * Whitelisted globals.
 *
 * @api public
 */

exports.whitelist = [
    setTimeout
  , setInterval
  , clearTimeout
  , clearInterval
  , console
  , Buffer
  , process
  , global
];

/**
 * Default format.
 */

exports.format = '\x1b[31mGleak!:\x1b[0m %s';

/**
 * Detects global variable leaks.
 *
 * @api public
 */

exports.detect = function detect () {
  var whitelist = exports.whitelist
    , ret = []

  Object.keys(global).forEach(function (key) {
    var w = whitelist.length
      , bad = true

    while (w--) if (global[key] === whitelist[w]) {
      bad = false;
      break;
    }

    if (bad) ret.push(key);
  });

  return ret;
};

/**
 * Prints all gleaks to stderr.
 */

exports.print = function print () {
  exports.detect().forEach(function (leak) {
    console.error(exports.format, leak);
  });
}

/**
 * Express middleware.
 */

exports.middleware = function gleakMiddleware (stream, format) {
  if (!format) {
    switch (typeof stream) {
      case 'string':
        format = stream;
        stream = process.stderr;
        break;
      case 'undefined':
        format = exports.format;
        stream = process.stderr;
        break;
      default:
        format = exports.format;
    }
  }

  var known = [];
  setTimeout(print, 1000);

  function print () {
    exports.detect().forEach(function (leak) {
      if (~known.indexOf(leak)) return;
      known.push(leak);
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

