var _ = require('underscore')
  , fs = require('fs')
  , path = require('path')
  , gm = require('gm')
  , http = require('./http');

function processImage(gm, targetPath, cb) {
  gm.identify(function(err, info) {
    var gm = this;
    if( err ) { cb({ type: 'image', msg: 'отсутствует файл или файл не является изображением' }); return; }
    if( !info.format.match(/^(JPEG|PNG|GIF)$/) ) { cb({ type: 'image', msg: 'не поддерживаемый формат изображения' }); return; }
    var ext = info.format === 'JPEG' ? 'jpg' : info.format.toLowerCase();
    var id = info.Signature;
    var target = path.join(targetPath, id[0], id[1], id+'.'+ext);
    gm.write(target, function(err) {
      if( err ) { cb({ type: 'server', msg: 'не удалось сохранить файл. Попробуйте загрузить ещё раз' }); return; }
      gm.thumbnail(100, 100).write(target.replace(/(\.\w+)$/, '_thumbnail$1'), function(err) {
        if( err ) { cb({ type: 'server', msg: 'не удалось создать миниатюру. Попробуйте загрузить ещё раз' }); return; }
          cb(null, { id: id, ext: ext });
      });
    });
  });
}

exports.download = function(url, targetPath, cb) {
  try {
    http.get(url, function(err, buffer) {
      if( err ) { cb({ type: 'server', msg: err }); return; }
      processImage(gm(buffer, 'image'), targetPath, cb);
    });
  } catch(err) {
    cb({ type: 'server', msg: 'неожиданная ошибка('+err+')', data: err });
  }
};

exports.upload = function(sourcePath, targetPath, cb) {
  try {
    processImage(gm(sourcePath), targetPath, cb);
  } catch(err) {
    cb({ type: 'server', msg: 'неожиданная ошибка('+err+')', data: err });
  }
};
