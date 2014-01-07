var _ = require('underscore');

/* chat user controller class */

var ChatUser = function(userId, listenRooms, joinRoom) {
  this.userId = userId;
  this.listenRooms = listenRooms;
  if( joinRoom ) {
    this.joinRoom = joinRoom;
  }

}

ChatUser.prototype.init = function(req, model) {
  this.ip = req.headers['x-real-ip'] || '127.0.0.1';
  this.model = model;
  this.socket = req.socket;
  _.each(listenRooms, function(room) {
    if( room != this.joinRoom ) {
      req.io.join(this.listenPath(room));
    }
  }, this);
  if( this.isJoined() ) {
    this.room = model.room(joinRoom);
    req.io.join(this.joinRoomPath());
  }
  this.socket.chatUser = this;
}

ChatUser.prototype.isJoined = function() {
  return this.joinRoom ? true : false;
}

ChatUser.prototype.isListenRoom = function(room) {
  return _.contains(this.listenRooms, this.joinRoom);
}

ChatUser.prototype.roomPath = function(room) {
  return 'room/listen/'+room;
}

ChatUser.prototype.listenPath = function(room) {
  return 'room/listen/'+room;
}

ChatUser.prototype.joinRoomListenPath = function() {
  return this.listenPath(this.joinRoom);
}

ChatUser.prototype.joinRoomPath = function() {
  return this.roomPath(this.joinRoom);
}

ChatUser.prototype.leave = function(req) {
  if( !this.isJoined() ) {
    return;
  }
  req.io.leave(this.joinRoomPath());
  if( this.isListenRoom(this.joinRoom) ) {
    req.io.join(this.joinRoomListenPath());
  };
  delete this.joinRoom;
  delete this.room;
}

ChatUser.prototype.join = function(req, room) {
  this.leave();
  if( this.isListenRoom(room) ) {
    req.io.leave(this.listenPath(room));
  };
  this.joinRoom = room;
  this.room = this.model.room(room);
  req.io.join(this.joinRoomPath());
}

ChatUser.prototype.logMessage = function(msg) {
  var logMsg = '['+msg.dt+'] ['+this.ip+'] ['+this.userId+'] wrote message #/'+this.joinRoom+'/'+msg.id+'/';
  if( msg.images ) { logMsg += ' with images '+msg.images.join(', '); }
  console.log(logMsg);
}

ChatUser.prototype.writeMessage = function(req, msg) {
  if( !this.isJoined() ) {
    c.emit('room rejoin');
    return;
  }

  msg.text.replace(/(^\s+|\s+$)/, '');

  var text = gruff(escapeHtml(msg.text), c.room.name);
  var images = _.filter(msg.images, function(image) { return image.match(/^\/img\/msg\/\w+.(?:jpg|gif)$/) });

  if( ( !images && text.length < 1) || text.length > 5000 ) {
    c.emit('error message', 'Сообщение может содержать от 1 до 5000 символов без картинки и до 5000 символов с картинкой.');
    return;
  }

  var msg = { text: text, images: images };

  this.room.msg.add(msg, function(err, msg) {
    if( err ) {
      c.emit('error message', 'Проблемы с БД. Попробуйте отправить сообщение позже.');
    } else {
      msg.author = false;
      req.io.room(this.joinRoomPath()).broadcast('chat msg', msg);
      req.io.room(this.joinRoomListenPath()).broadcast('chat msg');
      msg.author = true;
      c.emit('chat msg', msg);
      this.logMessage(c, msg);
    }
  });
};

ChatUser.prototype.getMessages = function(cb) {
  this.room.msgs(cb);
};

module.exports = ChatUser;
