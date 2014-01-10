var _ = require('underscore');


/* chat user controller class */

var ChatUser = function(userId, listenRooms, joinRoom) {
  this.userId = userId;
  this.listenRooms = listenRooms;
  if( joinRoom ) {
    this.joinRoom = joinRoom;
  }

};

ChatUser.prototype.init = function(req, model, lib) {
  this.ip = req.headers['x-real-ip'] || '127.0.0.1';
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
  return _.contains(this.listenRooms, this.joinRoom);
};

ChatUser.prototype.roomPath = function(room) {
  return 'room/listen/'+room;
};

ChatUser.prototype.listenPath = function(room) {
  return 'room/listen/'+room;
};

ChatUser.prototype.joinRoomListenPath = function() {
  return this.listenPath(this.joinRoom);
};

ChatUser.prototype.joinRoomPath = function() {
  return this.roomPath(this.joinRoom);
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
  this.room.clearIfCustom(function(err) {
    if( err ) { self.lib.log.fwarn(self.ip, 'room leave', '[uid:'+self.userId+'] failed to clear room'); }
  });
  delete this.joinRoom;
  delete this.room;
};

ChatUser.prototype.join = function(req, room) {
  this.leave();
  if( this.isListenRoom(room) ) {
    req.io.leave(this.listenPath(room));
  };
  this.joinRoom = room;
  this.room = this.model.room(room);
  req.io.join(this.joinRoomPath());
};

ChatUser.prototype.logMessage = function(message) {
  this.lib.log.flog(
    this.ip,
    'message write',
    '[uid:'+this.userId+'] wrote message #/'+this.joinRoom+'/'+message.id+'/'+(
      message.images.length  > 0 ? ' with images '+message.images.join(', ') : ''
    )
  );
};

ChatUser.prototype.writeMessage = function(req, message) {
  if( !this.isJoined() ) { req.io.emit('err', this.lib.error.message.write('отсутствует открытый чат', 'controller')); return; }

  var text = this.lib.text.prepare(message.text, this.joinRoom);
  var images = _.filter(message.images, function(image) { return image.match(/^\/img\/message\/\w+.(?:jpg|gif)$/) });

  if( ( !images && text.length < 1) || text.length > 5000 ) {
    req.io.emit('err', this.lib.error.message.write('cообщение может содержать от 1 до 5000 символов без картинки и до 5000 символов с картинкой', 'validation'));
    return;
  }

  var message = { text: text, images: images };
  
  var self = this;
  this.room.msg.add(message, function(err, message) {
    if( err ) { req.io.emit('err', self.lib.error.message.write()); return; }
    message.author = false;
    req.io.room(self.joinRoomPath()).broadcast('message write', { message: message });
    req.io.room(self.joinRoomListenPath()).broadcast('message write', { room: self.joinRoom });
    message.author = true;
    req.io.emit('message write', { message: message });
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
    self.room.clearIfCustom(function(err) {
      if( err ) { self.lib.log.fwarn(self.ip, 'disconnect', '[uid:'+self.userId+'] failed to clear room'); }
      delete req.socket.chatUser;
      delete req.socket.chatUserId;
    });
  });
};

module.exports = ChatUser;
