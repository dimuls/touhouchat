var m = require('../app/model');
var count = 10;

var created = 0;
for( var i = 0; i < count; i++ ) {
  m.extension.create(function(err, code) {
    if( err ) { console.warn('Can\'t generate extension code.'); return; }
    console.log(code);
    created++;
    if( created === count ) {
      m.c.quit();
    }
  });
}
