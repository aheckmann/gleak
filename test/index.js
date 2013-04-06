var mod = require('./tests')
var tests = Object.keys(mod);
var total = tests.length;
var failed = [];

;(function run () {
  var desc = tests.shift();
  if (!desc) return report();
  var fn = mod[desc];
  runTest(desc, fn, run);
})()

function runTest (desc, test, done) {
  function complete () {
    if (complete.ran) {
      failed.push([desc, new Error('done called more than once')])
      return;
    }
    complete.ran = true;
    done();
  }
  if (test.length) {
    runTestAsync(desc, test, complete);
  } else {
    runTestSync(desc, test);
    process.nextTick(complete);
  }
}

function runTestAsync (desc, test, done) {
  var start = new Date;
  var e;

  function handleError (err) {
    failed.push([desc, e = err]);
    fail(desc, start);
  }

  function handleUncaught (err) {
    handleError(err);
    complete();
  }

  function complete () {
    process.removeListener('uncaughtException', handleUncaught);
    done();
  }

  process.on('uncaughtException', handleUncaught);

  try {
    test(function (err) {
      if (e) return;
      if (err) {
        handleError(err);
        complete();
        return;
      }
      pass(desc, start);
      complete();
    });
  } catch (err) {
    handleError(err);
    process.nextTick(complete)
  }
}

function fail (desc, start) {
  console.log('\x1b[31mx ' + desc + ':\x1b[30m ' + (Date.now() - start) + 'ms\x1b[0m');
}

function pass (desc, start) {
  console.log('\x1b[32m√\x1b[30m ' + desc + ': ' + (Date.now() - start) + 'ms\x1b[0m');
}

function runTestSync (desc, test) {
  var start = new Date;
  var e;

  try {
    test();
  } catch (err) {
    failed.push([desc, err]);
    fail(desc, start);
    return;
  }

  pass(desc, start);
}

function report () {
  console.log();

  if (!failed.length) {
    console.log('\x1b[32m%d tests complete\x1b[0m', total);
  } else {
    console.log('\x1b[31m%d failed\x1b[0m', failed.length);
    console.error();

    failed.forEach(function (failure, i) {
      console.error((i+1) + ') ' + failure[0], failure[1].stack);
      console.error();
    })
  }

  process.exit(failed.length);
}
