
test:
	@NODE_ENV=test \
		./node_modules/expresso/bin/expresso \
		$(TESTFLAGS) \
		test/index.js

.PHONY: test
