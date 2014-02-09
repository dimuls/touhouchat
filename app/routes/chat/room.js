module.exports = function(app, cfg, m, l) {

  app.io.route('room join', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('init'); return; }
    var room = req.data;
    if( !room || !room.toString().match(/^\w+$/) ) {
      req.io.emit('err', l.error.room.join('имя комнаты может содержать только символы алфавита', 'validation'));
    }
    chatUser.join(req, room);
  });

  app.io.route('room leave', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('init'); return; }
    var room = req.data;
    if( !room || !room.toString().match(/^\w+$/) ) {
      req.io.emit('err', l.error.room.leave('имя комнаты может содержать только символы алфавита', 'validation'));
    }
    chatUser.leave(req, room);
  });

  app.io.route('room listen start', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('init'); return; }
    var room = req.data;
    if( !room || !room.toString().match(/^\w+$/) ) {
      req.io.emit('err', l.error.room.leave('имя комнаты может содержать только символы алфавита', 'validation'));
    }
    chatUser.startListen(req, room);
  });

  app.io.route('room listen stop', function(req) {
    var chatUser = req.socket.chatUser;
    if( !chatUser ) { req.io.emit('init'); return; }
    var room = req.data;
    if( !room || !room.toString().match(/^\w+$/) ) {
      req.io.emit('err', l.error.room.leave('имя комнаты может содержать только символы алфавита', 'validation'));
    }
    chatUser.stopListen(req, room);
  });

}
