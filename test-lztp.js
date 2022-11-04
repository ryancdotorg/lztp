const LZTP = require('./lztp');

let lztp = new LZTP();
let messages = [
  'wtf LOLOMGBBQ ☃ 😍 {"baz":"qux","foo":"bar"}`',
  'all your base are belong to us',
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod '+
  'tempor incididunt ut labore et dolore magna aliqua.',
  'To be, or not to be, that is the question.',
  'Once upon a midnight dreary, while I pondered, weak and weary,\n'+
  'Over many a quaint and curious volume of forgotten lore—\n'+
  'While I nodded, nearly napping, suddenly there came a tapping,\n'+
  'As of some one gently rapping, rapping at my chamber door.\n'+
  '“’Tis some visitor,” I muttered, “tapping at my chamber door—\n'+
  'Only this and nothing more.”\n\n'+
  'Ah, distinctly I remember it was in the bleak December;\n'+
  'And each separate dying ember wrought its ghost upon the floor.\n'+
  'Eagerly I wished the morrow;—vainly I had sought to borrow\n'+
  'From my books surcease of sorrow—sorrow for the lost Lenore—\n'+
  'For the rare and radiant maiden whom the angels name Lenore—\n'+
  'Nameless here for evermore.\n\n'+
  'And the silken, sad, uncertain rustling of each purple curtain\n'+
  'Thrilled me—filled me with fantastic terrors never felt before;\n'+
  'So that now, to still the beating of my heart, I stood repeating\n'+
  '“’Tis some visitor entreating entrance at my chamber door—\n'+
  'Some late visitor entreating entrance at my chamber door;—\n'+
  'This it is and nothing more.”\n',
];

const u8e = (function(){const e=new TextEncoder();return s=>e.encode(s);})();

let first = true;
for (let msg of messages) {
  if (first) {
    first = false;
  } else {
    console.log('-----');
  }

  let enc = lztp.encode(msg);
  let dec = lztp.decode(enc);

  let bytes = u8e(msg).length;
  let outsz = enc.length
  console.log(msg, bytes);
  console.log(enc, outsz);
  if (dec != msg) {
    console.log(dec);
    console.log('mismatch!');
  }
  console.log(outsz/bytes);
}
