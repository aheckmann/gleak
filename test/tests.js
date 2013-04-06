
var assert = require('assert')
var gleak = require('../index')
var request = require('./_request')
var express;

// node 4 tests?
var v = process.version.replace(/^v/,'').split('.');
if ('0' == v[0] && v[1] > 4)
  express = require('express')

exports['version exists'] = function () {
  assert.equal('string', typeof gleak.version);
}

exports['middleware exists'] = function () {
  assert.equal('function', typeof gleak.middleware);
}

exports['gleak is a function'] = function () {
  assert.equal('function', typeof gleak);
}

exports['default format is correct'] = function () {
  var g = gleak();
  assert.equal('\x1b[31mGleak!:\x1b[0m %s', g.format);
}

exports['whitelist is an array'] = function () {
  var g = gleak();
  assert.ok(Array.isArray(g.whitelist));
}

exports['setTimeout is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(setTimeout));
};

exports['setInterval is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(setInterval));
};
exports['clearTimeout is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(clearTimeout));
};
exports['clearInterval is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(clearInterval));
};
exports['console is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(console));
};
exports['Buffer is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(Buffer));
};
exports['process is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(process));
};
exports['global is a default'] = function () {
  var g = gleak();
  assert.ok(~g.whitelist.indexOf(global));
};

exports['whitelist is mutable'] = function () {
  var g = gleak();
  var i = g.whitelist.push(assert);
  assert.ok(~g.whitelist.indexOf(assert));
  g.whitelist.splice(i-1, 1);
  assert.ok(!~g.whitelist.indexOf(assert));
}

exports['#detect is a function'] = function () {
  var g = gleak();
  assert.ok('function' === typeof g.detect);
}

exports['detect()'] = function () {
  var g = gleak();
  var found = g.detect();
  assert.ok(Array.isArray(found));
  assert.ok(0 === found.length);
  haha = "lol"
  assert.equal(1, g.detect().length);
  assert.equal("haha", g.detect()[0]);
}

exports['unknown values can be whitelisted by passing strings'] = function () {
  var g = gleak();
  ignoreme = 1;
  assert.ok(~g.detect().indexOf('ignoreme'));
  g.whitelist.push('ignoreme');
  assert.ok(!~g.detect().indexOf('ignoreme'));
  delete global.ignoreme;
}

exports['#ignore'] = function () {
  var g = gleak();
  assert.equal('function', typeof g.ignore);
}

exports['ignore identical whitelisted values'] = function () {
  var g = gleak();
  var len = g.whitelist.length;
  var an = 'another';
  g.ignore('another', 'another', 'another', an);
  assert.equal(len + 1, g.whitelist.length);
}

exports['#print'] = function () {
  var write = console.error;
  try {
    var g = gleak();
    var times = 0;
    haha = "heh";
    console.error = function (format, item) {
      assert.equal(g.format, format);
      assert.equal("haha", item);
      ++times;
    }
    g.print();
    assert.equal(1, times);
  } catch (_) {
    console.error = write;
    throw _;
  }
}

exports['whitelists are seperate from other instances'] = function () {
  var g1 = gleak()
    , g2 = gleak();

  g1.ignore('the', 'bad');
  assert.ok(~g1.whitelist.indexOf('the'));
  assert.ok(!~g2.whitelist.indexOf('the'));
}

exports['formats are seperate from other instances'] = function () {
  var g1 = gleak()
    , g2 = gleak();

  g1.format = "different %s";
  assert.ok(~g1.format !== g1.format);
}

exports['#detectNew'] = function () {
  var g = gleak();
  assert.equal('function', typeof g.detectNew);
  var found = g.detectNew();
  assert.equal(true, Array.isArray(found));
  assert.equal(found.length, 1);
  assert.equal(g.detectNew().length, 0);
  zombocom = 'welcome';
  found = g.detectNew();
  assert.equal(found.length, 1);
  assert.equal(found[0], 'zombocom');
  assert.equal(g.detectNew().length, 0);
  delete global.zombocom;
}

exports['test middleware'] = function (done) {
  if ('0' == v[0] && v[1] < 5) return done();
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

  var express3 = express.version.split('.')[0] > 2;
  var app = express3
    ? express()
    : express.createServer();

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

  var pending = 2;

  var svr = app.listen(0, function () {
    request.address = svr.address();
    ready();
  });

  function ready () {
    request()
    .get('/stream')
    .end(function (res) {
      assert.equal(200, res.statusCode);
      assert.equal('passed a stream', res.body);
      assert.equal(2, stream1.i);
      finish();
    });

    request()
    .get('/formatstream')
    .end(function (res) {
      assert.equal(200, res.statusCode);
      assert.equal('passed format and stream', res.body);
      assert.equal(stream2.i, 2);
      finish();
    });
  }

  function finish () {
    if (--pending) return;
    delete global.meToo;
    delete global.haha;
    done();
  }
}

