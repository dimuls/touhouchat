module.exports = function(app, cfg, m, l) {

  app.io.route('token create', function(req) {
    var userId = req.socket.chatUserId;
    if( !userId ) {
      req.io.emit('err', l.error.token.create('отсутствует или неверный формат UID', 'validation'));
      l.log.fwarn(req.headers['x-real-ip'] || '127.0.0.1', 'token get', 'user init without UID');
      return;
    }
    m.token.create(userId, function(err, token) {
      if( err ) {
        req.io.emit('err', l.error.token.create());
        l.log.fwarn(req.headers['x-real-ip'] || '127.0.0.1', 'token get', 'db error');
        return;
      }
      req.io.emit('token create', token);
    });
  });

}
