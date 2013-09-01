var m = require('../app/model')
  , cfg = require('../app/config')
  , fs = require('fs');

var room = process.argv[2];
var post = process.argv[3];

console.log(post);
console.log(room);

m.init(cfg.model, cfg.predefinedRooms);

function unlinkFile(path) {
  try {
    fs.unlinkSync(path);
    console.log(path+' deleted.')
  } catch(e) {
    console.log('Can\'t delete '+path+'. Error:'+e)
  }
}

m.room(room).msg.del(post, function(err, msgJson) {
  if( err ) {
    console.warn('Can\'t delete message #/'+room+'/'+post+'/');
  } else if( msgJson ) {
    var msg = JSON.parse(msgJson);
    console.log('Message #/'+room+'/'+post+'/ deleted');
    if( msg.image ) {
      var imagePath = cfg.paths.messageImages+'/'+msg.image;
      var imageThumbPath = imagePath.replace(/(\.\w+)$/, '_thumb$1');
      console.log('Found 2 images: '+imagePath+', '+imageThumbPath+'.');
      unlinkFile(imagePath);
      unlinkFile(imageThumbPath);
    }
    m.c.quit();
  }
});
