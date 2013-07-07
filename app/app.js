/*
var connect = require('connect')
  , m = require('moment');

var app = connect()
  .use(function(req, res, next) {
    if( req.url === '/' ) { req.url = '/index.html' }
    next();
  })
  .use(connect.static('public'));

var io = require('socket.io').listen(app.listen(8081));

*/

var escapeHtml = require('escape-html')
  , gruff = require('./lib/gruff')
  , m = require('moment')
  , io = require('socket.io').listen(8081);

io.configure('production', function() {
  io.enable('browser client etag');
  io.set('log level', 1);
  io.set('transports', [ 'websocket', 'htmlfile', 'xhr-polling', 'jsonp-polling' ]);
});

//var validMsgRegexp = /^[\w!@#$%^&*()\-=_+{}\[\]\|:";'<>?,.\/~`]{1, 600}$/;

var predefinedRooms = {
  b: 1, rm: 1, to: 1
};

var msgs = {
  b: [], rm: [], to: []
};

function leaveRoom(c) {
  if( c.chatRoom === undefined ) {
    return;
  }
  c.leave(c.chatRoom);
  var clientsCount = io.of('/chat').clients(c.chatRoom).length;
  if( clientsCount > 0 ) {
    io.of('/chat').in(c.chatRoom).emit('set clients count', clientsCount);
  } else if( predefinedRooms[c.chatRoom] == undefined ) {
    delete msgs[c.chatRoom];
  }
  delete c.chatRoom;
}

function joinRoom(c, room) {
  if( !room.match(/^\w+$/) ) {
    c.emit('error msg', 'Имя комнаты может содержать только символы алфавита');
    return;
  } else if( c.chatRoom !== undefined ) {
    leaveRoom(c);
  }
  c.join(room);
  c.chatRoom = room;
  io.of('/chat').in(room).emit('set clients count', io.of('/chat').clients(room).length);
  if( msgs[room] === undefined ) {
    msgs[room] = [];
  }
  c.emit('set msgs',  msgs[room]);
}

function writeMsg(c, text) {
  if( c.chatRoom === undefined ) {
    c.emit('error msg', 'Неизвестная комната. Попробуйте обновить страницу');
    return;
  }

  text.replace(/(^\s+|\s+$)/, '');
  if( text.length < 1 || text.length > 5000 ) {
    c.emit('error msg', 'Сообщение может содержать от 1 до 5000 символов');
    return;
  }

  text = gruff(escapeHtml(text));

  /*
  text.replace(/(^\s+|\s+$)/, '');
  if( text.length < 1 || text.length > 600 ) {
    c.emit('error', 'Message length must >1 and <600.');
    return;
  }
  text.replace(/\n+/, '<br/>');
  text.replace(/\s+/, ' ');
  */

  var msg = {
    text: text,
    dt: m().format('DD.MM.YYYY HH:mm:ss'),
  };
  if( msgs[c.chatRoom].length >= 100 ) {
    msgs[c.chatRoom].shift();
  }
  msgs[c.chatRoom].push(msg);
  
  msg.author = false;
  c.broadcast.to(c.chatRoom).emit('chat msg', msg);

  msg.author = true;
  c.emit('chat msg', msg);
}

io
  .of('/chat')
  .on('connection', function (c) {
    c.on('join room', function(room) {
      joinRoom(c, room);
    });
    c.on('leave room', function() {
      leaveRoom(c);
    });
    c.on('write msg', function(msg) {
      writeMsg(c, msg);
    });
    c.on('disconnect', function() {
      console.log('disconnected');
      leaveRoom(c);
    });
  });
