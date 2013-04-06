TESTS = test/index.js

test:
	@NODE_ENV=test node $(TESTFLAGS) $(TESTS)

.PHONY: test
