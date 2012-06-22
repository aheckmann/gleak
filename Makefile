TESTS = test/index.js

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --ignore-leaks -u exports --reporter list $(TESTFLAGS) $(TESTS)

.PHONY: test
