TSC=tsc
LIBS=built/knockout-latest.js built/require.js
FILES=built/index.html built/inoutboard.css
SRC=build/src/inoutboard.ts build/src/require-config.ts

all: build

build: built/inoutboard.js $(LIBS) $(FILES) $(SRC)

$(SRC):
	mkdir -p built/src
	cp src/*.ts built/src

$(LIBS): node_modules/knockout/build/output/knockout-latest.js node_modules/requirejs/require.js
	cp node_modules/knockout/build/output/knockout-latest.js built
	cp node_modules/requirejs/require.js built
	
$(FILES): index.html inoutboard.css
	cp index.html built
	cp inoutboard.css built

built/inoutboard.js: src/inoutboard.ts
	$(TSC)
	cp index.html inoutboard.css built

static: $(LIBS) $(FILES)

clean:
	-rm built/*.css built/inoutboard.js built/*.html

test:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive --reporter $(REPORTER) --timeout 3000

jshint:
	jshint lib examples test index.js

tests: test

tap:
	@NODE_ENV=test ./node_modules/.bin/mocha -R tap > results.tap

unit:
	@NODE_ENV=test ./node_modules/.bin/mocha --recursive -R xunit > results.xml --timeout 3000

skel:
	mkdir examples lib test
	touch index.js
	npm install mocha chai --save-dev

.PHONY: build clean
