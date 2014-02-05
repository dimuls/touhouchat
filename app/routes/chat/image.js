module.exports = function(app, cfg, m, l) {

  app.post('/image/', function(req, res) {
    var userId = req.body.userId;
    var token = req.body.token;
    if( !userId || !token || !userId.toString().match(/^\w{128}$/) || !token.toString().match(/^\w{256}$/) ) {
      res.json({ err: { type: 'authorization', msg: 'нет доступа' } }); return;
    }
    m.token.check(userId, token, function(err, ok) {
      if( err ) { res.json({ err: { type: 'db', msg: 'не удалось проверить токен' } }); return; }
      if( !ok ) { res.json({ err: { type: 'token', msg: 'не верный токен' } }); return; }
      var uploader, file;
      if( req.body.url ) {
        file = req.body.url;
        uploader = l.image.download;
      } else if( req.files && req.files.image ) {
        file = req.files.image.path;
        uploader = l.image.upload;
      } else {
        res.json({ err: { type: 'image', msg: 'отсутствует изображение' }});
        return;
      }
      uploader(file, cfg.paths.messageImages, function(err, id) {
        if( err ) { res.json({ err: err }); return; }
        res.json({ ok: 'ok', data: id });
      });
    });
  });

};

