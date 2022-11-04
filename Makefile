MIN := dist/lztp-std.min.js dist/lztp-lite.min.js
ALT := build/LztpStd.ts build/LztpLite.ts

TSC_FLAGS := --target es5 --lib es2015,dom --module system

.PHONY: all clean _clean _nop

all: $(MIN)

lztp.js: Lztp.ts
	tsc $< $(TSC_FLAGS) --outFile $@

build/LztpStd.ts: Lztp.ts
	@mkdir -p $(@D)
	sed '/BEGIN_ANALYZE/,/END_ANALYZE/d' < $< > $@

build/LztpLite.ts: Lztp.ts
	@mkdir -p $(@D)
	sed '/BEGIN_DECODE/,/END_DECODE/d' < $< > $@

build/lztp-std.js: build/LztpStd.ts
	@mkdir -p $(@D)
	tsc $< $(TSC_FLAGS) --outFile $@

build/lztp-lite.js: build/LztpLite.ts
	@mkdir -p $(@D)
	tsc $< $(TSC_FLAGS) --outFile $@

dist/%.min.js: build/%.js
	@mkdir -p $(@D)
	terser -c -m toplevel --mangle-props 'reserved=[LZTP]' < $< > $@

# hack to force clean to run first *to completion* even for parallel builds
# note that $(info ...) prints everything on one line
clean: _nop $(foreach _,$(filter clean,$(MAKECMDGOALS)),$(info $(shell $(MAKE) _clean)))
_clean:
	rm -rf lztp.js $(wildcard build/*) $(wildcard dist/*) || /bin/true
_nop:
	@true
