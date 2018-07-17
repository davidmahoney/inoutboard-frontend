TSC=tsc
LIBS=built/knockout-latest.js built/require.js built/es6-promise.auto.js
FILES=built/index.html built/inoutboard.css built/loading.svg
SRC=built/src/inoutboard.ts built/src/require-config.ts
RJS=node_modules/requirejs/bin/r.js

all: build

build: built/inoutboard.js $(LIBS) $(FILES) $(SRC)

$(SRC): src/*.ts
	mkdir -p built/src
	cp src/*.ts built/src

$(LIBS): node_modules/knockout/build/output/knockout-latest.js node_modules/requirejs/require.js node_modules/es6-promise/dist/es6-promise.auto.js
	cp $^ built
#cp node_modules/knockout/build/output/knockout-latest.js built
#cp node_modules/requirejs/require.js built
	
$(FILES): $(notdir $(FILES))
	cp $(notdir $(FILES)) built

built/inoutboard.js: src/inoutboard.ts src/require-config.ts
	$(TSC)
	cp built/require-config.js built/inoutboard.built.js

static: $(LIBS) $(FILES)

clean:
	-rm $(FILES) $(LIBS) $(SRC) built/inoutboard.js built/inoutboard.built.js

bundle: built/inoutboard.js $(LIBS)
	$(RJS) -o tools/build.js baseUrl=built mainConfigFile=../built/require-config.js out=built/inoutboard.built.js
	
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
