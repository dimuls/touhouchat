module.exports = function(app, cfg, m, l) {

  app.io.route('messages get', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('err', l.error.messages.get('необходима регистрация', 'autorization')); return; }
    req.socket.chatUser.getMessages(function(err, messages) {
      if( err ) { req.io.emit('err', l.error.messages.get()); return; }
      req.io.emit('messages get', messages);
    });
  });

  app.io.route('message write', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('err', l.error.message.write('необходима регистрация', 'autorization')); return; }
    var msg = req.data || {};
    chatUser.writeMessage(req, { text: msg.text || '', images: msg.images || [] });
  });

  app.io.route('message get', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('err', l.error.message.get('необходима регистрация', 'autorization')); return; }
    var room = req.data.room;
    var id = req.data.id;
    if( !room.match(/^\w+$/) || !id.toString().match(/^\d+$/) ) {
      req.io.emit('err', l.error.message.get('неверные формат входных данных', 'validation'));
      return;
    }
    m.room(room).msg(id, function(err, msg) {
      if( err ) {
        c.emit('err', l.error.message.get());
      } else {
        if( msg ) {
          req.io.emit('message get', { status: 'found', msg: msg });
        } else {
          req.io.emit('message get', { status: 'not found' });
        }
      }
    });
  });

}
