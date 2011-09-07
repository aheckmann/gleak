
var assert = require('assert')
var express = require('express')
var gleak = require('../index')

exports['default format is correct'] = function () {
  assert.equal('\x1b[31mGleak!:\x1b[0m %s', gleak.format);
}

exports['whitelist is an array'] = function () {
  assert.ok(Array.isArray(gleak.whitelist));
}

exports['setTimeout is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(setTimeout));
};

exports['setInterval is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(setInterval));
};
exports['clearTimeout is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(clearTimeout));
};
exports['clearInterval is a default'] = function () {
assert.ok(~gleak.whitelist.indexOf(clearInterval));
};
exports['console is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(console));
};
exports['Buffer is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(Buffer));
};
exports['process is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(process));
};
exports['global is a default'] = function () {
  assert.ok(~gleak.whitelist.indexOf(global));
};

exports['whitelist is mutable'] = function () {
  var i = gleak.whitelist.push(assert);
  assert.ok(~gleak.whitelist.indexOf(assert));
  gleak.whitelist.splice(i-1, 1);
  assert.ok(!~gleak.whitelist.indexOf(assert));
}

exports['gleak.detect is a function'] = function () {
  assert.ok('function' === typeof gleak.detect);
}

exports['detect()'] = function () {
  var found = gleak.detect();
  assert.ok(Array.isArray(found));
  assert.ok(0 === found.length);
  haha = "lol"
  assert.ok(1 === gleak.detect().length);
  assert.equal("haha", gleak.detect()[0]);
}

exports['unknown values can be whitelisted by passing strings'] = function () {
  ignoreme = 1;
  assert.ok(~gleak.detect().indexOf('ignoreme'));
  gleak.whitelist.push('ignoreme');
  assert.ok(!~gleak.detect().indexOf('ignoreme'));
  delete global.ignoreme;
}

exports['print()'] = function () {
  var write = console.error;
  var times = 0;
  haha = "heh";
  console.error = function (format, item) {
    assert.equal(gleak.format, format);
    assert.equal("haha", item);
    ++times;
  }
  gleak.print();
  console.error = write;
  assert.equal(1, times);
}

exports['test middleware'] = function (beforeExit) {
  var called = false;
  var req = {};
  var res = { send: function (x) { assert.equal(x, 'yes'); called = true; }};
  var m = gleak.middleware();
  m(req, res, function(){});
  assert.equal(res._gleak, true);
  res.send('yes');
  assert.equal(true, called);

  // another leak
  meToo = 47;

  // mock stream
  function makeStream (tests) {
    return {
        i: 0
      , write: function (data) {
          assert.equal(tests[this.i], data);
          ++this.i;
        }
    }
  }

  var app = express.createServer();

  var sout = [
      '\x1b[31mGleak!:\x1b[0m haha\n'
    , '\x1b[31mGleak!:\x1b[0m meToo\n'
  ];
  var stream1 = makeStream(sout);

  app.get('/stream', gleak.middleware(stream1), function (req, res, next) {
    res.send('passed a stream');
  });

  var both = [
      'yes : haha\n'
    , 'yes : meToo\n'
  ];
  var stream2 = makeStream(both);

  app.get('/formatstream', gleak.middleware(stream2, 'yes : %s'), function (req, res, next) {
    res.send('passed format and stream');
  });

  assert.response(app,
      { url: '/stream' }
    , { status: 200
      , body: 'passed a stream' })

  assert.response(app,
      { url: '/formatstream' }
    , { status: 200
      , body: 'passed format and stream' })

  beforeExit(function () {
    assert.equal(stream1.i, 2);
    assert.equal(stream2.i, 2);
  });
}

