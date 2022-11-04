var fs = require('fs'),
    readline = require('readline'),
    LZTP = require('./lztp'),
    zlib = require('zlib'),
    msgpack = require('msgpack5')();

console.log("initializing...");

var FILENAME = 'corpus.json';

var rd = readline.createInterface({
  input: fs.createReadStream(FILENAME),
  output: process.stdout,
  terminal: false
});

var counts = {};
var messages = [];
var text_len = 0;
var lztp_len = 0;
var zlib_len = 0;

var lztp = new LZTP();

console.log("reading corpus...");
rd.on('line', function(line) { messages.push(line); });

rd.on('close', function() {
  var k, v, i, j, len, msg, enc, values, pre;
  var len = messages.length, keys = Object.keys(counts);
  var best_size = -1, best_len = 999999999999;

  console.log("computing zlib statistics...");
  zlib_len = text_len = 0;
  for (j = 0; j < len; ++j) {
    text_len += messages[j].length;
    let obj = messages[j];//JSON.parse(messages[j]);
    let mpk = msgpack.encode(obj);
    let buf = Buffer.from(mpk);//messages[j], 'utf8');
    let zip = zlib.gzipSync(buf, {level:6});
    zlib_len += zip.length;
  }
  console.log('zlib', zlib_len, Math.ceil(text_len*97/95), 100*(1-zlib_len/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/zlib_len);
  console.log('zlib (base64)', zlib_len, Math.ceil(text_len*97/95), 100*(1-(zlib_len*4/3)/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/(zlib_len*4/3));

  console.log("computing baseline seed statistics...");
  pre = lztp.getSeed();
  lztp_len = text_len = 0;
  for (j = 0; j < len; ++j) {
    text_len += messages[j].length;
    lztp_len += lztp.encode(messages[j]).length;
  }
  console.log(pre.length, pre.join('`').length, lztp_len, Math.ceil(text_len*97/95), 100*(1-lztp_len/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/lztp_len);
  console.log("var pre = ('" + pre.join('`') + "').split('`');");

  console.log("analyizing corpus...");
  for (i = 0; i < len; ++i) { lztp.analyze(messages[i], counts); }

  console.log("sorting dictionary entries...");
  keys = Object.keys(counts);
  //keys.sort(function(a,b){ return counts[b] - counts[a]; });
  //keys.sort(function(a,b){ return counts[b]*b.length - counts[a]*a.length; });
  //keys.sort(function(a,b){ return counts[b]*Math.pow(b.length,0.5) - counts[a]*Math.pow(a.length,0.5); });
  //keys.sort(function(a,b){ return counts[b]*Math.log10(9+b.length) - counts[a]*Math.log10(9+a.length); });
  //keys.sort(function(a,b){ return counts[b]*Math.log2(1+b.length) - counts[a]*Math.log2(1+a.length); });

  // logrithmic length weighted sort - the 'E' stands for 'MAGIC'
  keys.sort(function(a,b){ return counts[b]*Math.log(Math.E-1+b.length) - counts[a]*Math.log(Math.E-1+a.length); });

  pre = [];
  for (i = 0; i < 65536; ++i) {
    k = keys[i], v = counts[k];
    if (k && k.indexOf('`') == -1) {
      pre.push(k.replace("\\","\\\\").replace("'","\\'"));
    }
  }

  if (!process.argv[2]) {
    console.log("finding optimal seed dictionary size...");
    for (i = 512; i >= 2; i = Math.floor(i*.99)) {
      lztp.setSeed(pre.slice(0, i));
      lztp_len = text_len = 0;
      for (j = 0; j < len; ++j) {
        text_len += messages[j].length;
        lztp_len += lztp.encode(messages[j]).length;
      }
      if (lztp_len <= best_len) {
        console.log("better", lztp_len, '<=', best_len);
        best_len = lztp_len;
        best_size = i;
      }
      console.log(i, pre.slice(0, i).join('`').length, lztp_len, Math.ceil(text_len*97/95), 100*(1-lztp_len/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/lztp_len);
    }
    console.log(best_size, best_len, Math.ceil(text_len*97/95), 100*(1-best_len/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/best_len);
  } else {
    best_size = process.argv[2];
    lztp.setSeed(pre.slice(0, best_size));
    lztp_len = text_len = 0;
    for (j = 0; j < len; ++j) {
      text_len += messages[j].length;
      lztp_len += lztp.encode(messages[j]).length;
    }
    console.log(best_size, pre.slice(0, best_size).join('`').length, lztp_len, Math.ceil(text_len*97/95), 100*(1-lztp_len/Math.ceil(text_len*97/95)), Math.ceil(text_len*97/95)/lztp_len);
  }
  console.log("var pre = ('" + pre.slice(0, best_size).join('`') + "').split('`');");
});
