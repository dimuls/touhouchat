var _ = require('underscore');


/* chat user controller class */

var ChatUser = function(userId, listenRooms, joinRoom) {
  this.userId = userId;
  this.listenRooms = listenRooms;
  if( joinRoom ) {
    this.joinRoom = joinRoom;
  }

};

ChatUser.prototype.init = function(req, app, model, lib) {
  this.ip = req.headers['x-real-ip'] || '127.0.0.1';
  this.app = app;
  this.model = model;
  this.lib = lib;
  this.socket = req.socket;
  _.each(this.listenRooms, function(room) {
    if( room != this.joinRoom ) {
      req.io.join(this.listenPath(room));
    }
  }, this);
  if( this.isJoined() ) {
    this.room = model.room(this.joinRoom);
    req.io.join(this.joinRoomPath());
  }
  this.socket.chatUser = this;
};

ChatUser.prototype.isJoined = function() {
  return this.joinRoom ? true : false;
};

ChatUser.prototype.isListenRoom = function(room) {
  return _.contains(this.listenRooms, room);
};

ChatUser.prototype.listenPath = function(room) {
  return 'room/listen/'+room;
};

ChatUser.prototype.joinRoomListenPath = function() {
  return this.listenPath(this.joinRoom);
};

ChatUser.prototype.joinRoomPath = function() {
  return 'room/join/'+this.joinRoom;
};

ChatUser.prototype.leave = function(req) {
  if( !this.isJoined() ) {
    return;
  }
  req.io.leave(this.joinRoomPath());
  if( this.isListenRoom(this.joinRoom) ) {
    req.io.join(this.joinRoomListenPath());
  };
  var self = this;
  if( this.app.io.sockets.clients(this.joinRoomPath()).length === 0 ) {
    this.room.clearIfCustom(function(err) {
      if( err ) { self.lib.log.fwarn(self.ip, 'room leave', '[uid:'+self.userId+'] failed to clear room'); }
    });
  }
  delete this.joinRoom;
  delete this.room;
  req.io.emit('room leave');
};

ChatUser.prototype.join = function(req, room) {
  this.leave(req);
  if( !this.isListenRoom(room) ) {
    req.io.leave(this.listenPath(room));
  }
  this.joinRoom = room;
  this.room = this.model.room(room);
  req.io.join(this.joinRoomPath());
  req.io.emit('room join');
};

ChatUser.prototype.startListen = function(req, room) {
  if( !this.isListenRoom(room) ) {
    this.listenRooms.push(room);
    req.io.join(this.listenPath(room));
  }; 
};

ChatUser.prototype.stopListen = function(req, room) {
  if( this.isListenRoom(room) ) {
    this.listenRooms = _.without(this.listenRooms, room);
    req.io.leave(this.listenPath(room));
  };
};

ChatUser.prototype.logMessage = function(message) {
  this.lib.log.flog(
    this.ip,
    'message write',
    '[uid:'+this.userId+'] wrote message /'+this.joinRoom+'/'+message.id+'/'+(
      (message.images && message.images.length  > 0) ? ' with images '+_.map(message.images, function(image) { return image.id }).join(', ') : ''
    )
  );
};

ChatUser.prototype.writeMessage = function(req, message) {

  if( !this.isJoined() ) { req.io.emit('err', this.lib.error.message.write('отсутствует открытый чат', 'controller')); return; }

  var text = this.lib.text.prepare(message.text, this.joinRoom);
  var images = _.filter(message.images, function(image) { return image && image.id && image.ext && image.id.match(/^\w{64}$/) && image.ext.match(/^(jpg|png|gif)$/) });

  if( images.length === 0 ) {
    images = null;
    if( text.length < 1 || text.length > 5000 ) {
      req.io.emit('err', this.lib.error.message.write('cообщение без картинки может содержать от 1 до 5000 символов', 'validation'));
      return;
    }
  } else {
    if( text.length > 5000 ) {
      req.io.emit('err', this.lib.error.message.write('cообщение с картинкой может содержать до 5000 символов', 'validation'));
      return;
    }
  }

  var message = { text: text, images: images };
  
  var self = this;

  this.room.msg.add(message, function(err, message) {
    if( err ) { req.io.emit('err', self.lib.error.message.write()); return; }
    message.author = false;
    req.io.room(self.joinRoomPath()).broadcast('room message', { room: self.joinRoom, message: message });
    req.io.room(self.joinRoomListenPath()).broadcast('room message', { room: self.joinRoom });
    message.author = true;
    req.io.emit('message write', message);
    self.logMessage(message);
  });
};

ChatUser.prototype.getMessages = function(cb) {
  this.room.msgs(cb);
};

ChatUser.prototype.disconnect = function(req) {
  var self = this;
  this.model.user.logout(this.userId, function(err) {
    if( err ) { self.lib.log.fwarn(self.ip, 'disconnect', '[uid:'+self.userId+'] failed to logout user'); }
    if( this.app.io.sockets.clients(this.joinRoomPath()).length === 0 ) {
      self.room.clearIfCustom(function(err) {
        if( err ) { self.lib.log.fwarn(self.ip, 'disconnect', '[uid:'+self.userId+'] failed to clear room'); }
        delete req.socket.chatUser;
        delete req.socket.chatUserId;
      });
    }
  });
};

module.exports = ChatUser;
