# LZTP

Lempel-Ziv Text/Plain (LZTP) is a “format preserving” text compression
algorithm.

## Description

Most compression algorithms generate a bitstream which is then output as a
series of bytes. In order to use the data somewhere that cannot handle raw
bytes, it must be encoded, typically as base64 or occasionally base85.

LZTP instead encodes data directly as printable ASCII with no intermediate
binary representation. It is optimized for speed over compression ratio.
With a pre-generated initial dictionary, even very short strings can be
compressed. The included dictionary was generated based on a corpus of
messages taken from IRC logs, using an included tool.

Input is expected to be a series of 16 bit characters (UTF-16 or UCS-2). The
encoder reserves two symbols, one that causes the next character to be treated
as literal, and one that is used to encode arbitrary unicode characters.

Dictionary entries may be represented as one or two characters depending on
when they were added (earlier entries are assumed to be more frequent, and
should use only one character if possible) and how many total entries there
are. Essentially, an adaptive non-binary prefix code.

### Design Goals

* Be able to encode “[potentially ill-formed UTF-16](https://simonsapin.github.io/wtf-8/#potentially-ill-formed-utf-16)”
  (aka WTF-16) strings

* Able to output to a constrained character set (effectively, an arbitrary
  base) in order to avoid encoding issues. The most useful configurations are
  expected to be base127 (7 bit ascii without null bytes), base95 (printable
  ascii), and base93 (printable ascii excluding characters requiring quoting
  in JSON strings). The code could be modified to address various situations
  where data should be encoded for part of a URL.

* Small TypeScript/JavaScript compressor implementation.

* High compression performance in browsers

### Design Inspirations

* lz-string: https://pieroxy.net/blog/pages/lz-string/index.html

* LZW: https://en.wikipedia.org/wiki/Lempel-Ziv-Welch

* LZ78: https://en.wikipedia.org/wiki/LZ77_and_LZ78

* http://www.mattmahoney.net/dc/dce.html#Section_53

## History

LZTP was originally written at Human Security (f/k/a White Ops). For various
reasons, it never made it into production. It has now been released, with
permission, in the hopes that it may be useful and/or interesting.

## License

BSD 3-Clause

## Author

Ryan Castellucci
