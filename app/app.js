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
  , io = require('socket.io').listen(8081) 
  , m = require('./model');

io.configure('production', function() {
  io.enable('browser client minification');  // send minified client
//  io.enable('browser client etag');          // apply etag caching logic based on version number
//  io.enable('browser client gzip');          // gzip the file
  io.set('log level', 1);                    // reduce logging
  io.set('transports', [                     // enable all transports (optional if you want flashsocket)
      'websocket'
    , 'flashsocket'
    , 'htmlfile'
    , 'xhr-polling'
    , 'jsonp-polling'
  ]);
});

m.init({
  log_size_limit: 100,
  rooms_count_limit: 100
}, { b: 1 });

function leaveRoom(c) {
  if( c.room === undefined ) {
    return;
  }
  c.leave(c.room.name);
  var clientsCount = io.of('/chat').clients(c.room.name).length;
  if( clientsCount > 0 ) {
    io.of('/chat').in(c.room.name).emit('set clients count', clientsCount);
  } else {
    c.room.clearIfCustom(function(err) {
      if( err ) { console.error('Can\'t clear custom room') };
    });
  }
  io.of('/chat').emit('set total clients count', io.of('/chat').clients().length - 1);
  delete c.room;
}

function joinRoom(c, room) {
  if( !room.match(/^\w+$/) ) {
    c.emit('error msg', 'Имя комнаты может содержать только символы алфавита');
    return;
  } else if( c.room !== undefined ) {
    leaveRoom(c);
  }
  c.join(room);
  c.room = m.room(room);
  io.of('/chat').in(room).emit('set clients count', io.of('/chat').clients(room).length);
  io.of('/chat').emit('set total clients count', io.of('/chat').clients().length);

  c.room.msgs(function(err, msgs) {
    if( err ) {
      c.emit('error msg', 'Проблема с БД. Попробуйте обновить страницу.')
    } else {
      c.emit('set msgs',  msgs);
    }
  });
}

function writeMsg(c, text) {
  if( c.room === undefined ) {
    c.emit('error msg', 'Неизвестная комната. Попробуйте обновить страницу');
    return;
  }

  text.replace(/(^\s+|\s+$)/, '');
  if( text.length < 1 || text.length > 5000 ) {
    c.emit('error msg', 'Сообщение может содержать от 1 до 5000 символов');
    return;
  }

  text = gruff(escapeHtml(text), c.room.name);

  c.room.msg.add({ text: text }, function(err, msg) {
    if( err ) {
      c.emit('error msg', 'Проблемы с БД. Попробуйте отправить сообщение позже.');
    } else {
      msg.author = false;
      c.broadcast.to(c.room.name).emit('chat msg', msg);
      msg.author = true;
      c.emit('chat msg', msg);
    }
  });
}

function getMsg(c, data) {
  if( !data.room.match(/^\w+$/) || !data.id.toString().match(/^\d+$/) ) {
    c.emit('error msg', 'Неверные данные');
    return;
  }
  m.room(data.room).msg(data.id, function(err, msg) {
    if( err ) {
      c.emit('error msg', 'Проблемы с БД. Попробуйте повторить операцию позже.');
    } else {
      if( msg ) {
        c.emit('msg requested', { status: 'found', msg: msg });
      } else {
        c.emit('msg requested', { status: 'not found' });
      }
    }
  });
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
    c.on('get msg', function(data) {
      getMsg(c, data);
    });
    c.on('disconnect', function() {
      leaveRoom(c);
    });
  });
