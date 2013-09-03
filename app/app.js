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
  , io = require('socket.io').listen(8081)
  , gm = require('gm')
  , m = require('./model')
  , gruff = require('./lib/gruff')
  , b32k = require('./lib/base32k')
  , cfg = require('./config');

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

process.on('uncaughtException', function (err) {
  console.error(err.stack);
});

m.init(cfg.model, cfg.predefinedRooms);

function processImage(image, cb) {
  gm(image).identify(function(err, info) {
    if( err ) { cb(err); return; }
    if( !info.format.match(/^(JPEG|PNG|GIF)$/) ) { cb('wrong format!'); return; }
    var ext = info.format === 'JPEG' ? 'jpg' : info.format.toLowerCase();
    this.write(cfg.paths.messageImages + '/' + info.Signature + '.' + ext, function(err) {
      if( err ) { cb(err); return; }
      this
        .thumbnail(100, 100)
        .write(cfg.paths.messageImages + '/' + info.Signature + '_thumb.' + ext, function(err) {
          if( err ) { cb(err); return; }
          cb(null, info.Signature + '.' + ext);
        });
    });
  });
}

function extensionActivate(c, code) {
  m.extension.activate(c.uid, code, function(err, ok, warn) {
    if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
    if( ok ) {
      c.imageEnabled = true;
      c.emit('extension activate');
    } else {
      c.emit('extension activate', 'Не верный код расширения.');
    }
  });
}

function extensionCheck(c, code) {
  m.extension.check(c.uid, code, function(err, ok, warn) {
    if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
    if( ok ) {
      c.imageEnabled = true;
      c.emit('extension check');
    } else {
      c.emit('extension check', 'Не верный код расширения.');
    }
  });
}


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
    c.emit('error message', 'Имя комнаты может содержать только символы алфавита.');
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
      c.emit('error message', 'Проблема с БД. Попробуйте обновить страницу.')
    } else {
      c.emit('set msgs',  msgs);
    }
  });
}

function logMsg(c, msg) {
  var logMsg = '['+msg.dt+'] ['+c.ip+'] ['+c.uid+'] wrote message #/'+c.room.name+'/'+msg.id+'/';
  if( msg.image ) { logMsg += ' with image '+ msg.image }
  console.log(logMsg);
}

function newMsg(c, msg) {
   c.room.msg.add(msg, function(err, msg) {
    if( err ) {
      c.emit('error message', 'Проблемы с БД. Попробуйте отправить сообщение позже.');
    } else {
      msg.author = false;
      c.broadcast.to(c.room.name).emit('chat msg', msg);
      msg.author = true;
      c.emit('chat msg', msg);
      logMsg(c, msg);
    }
  });
}

function writeMsg(c, msg) {
  if( c.room === undefined ) {
    c.emit('room rejoin');
    return;
  }

  msg.text.replace(/(^\s+|\s+$)/, '');

  var text = gruff(escapeHtml(msg.text), c.room.name);
  var image;
  if( msg.image ) {
    if( !c.imageEnabled ) {
      c.emit('error message', 'Вы не можете прикреплять изображения.');
      return;
    }
    image = new Buffer(new Uint8Array(b32k.decode(msg.image)));
  }

  if( ( !image && msg.text.length < 1) || msg.text.length > 5000 ) {
    c.emit('error message', 'Сообщение может содержать от 1 до 5000 символов без картинки и до 5000 символов с картинкой.');
    return;
  }


  var msg = { text: text };

  if( c.imageEnabled && image ) {
    processImage(image, function(err, imageName) {
      if( err ) {
        console.error("Image processing error: ", err);
        c.emit('error message', 'Проблемы с обработкой изображения. Попробуйте отправить сообщение ещё раз.');
      } else {
        msg.image = imageName;
        newMsg(c, msg);
      }
    });
  } else {
    newMsg(c, msg);
  }
}

function getMsg(c, data) {
  if( !data.room.match(/^\w+$/) || !data.id.toString().match(/^\d+$/) ) {
    c.emit('error message', 'Неверные данные');
    return;
  }
  m.room(data.room).msg(data.id, function(err, msg) {
    if( err ) {
      c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.');
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

    /* Init client */
    c.ip = c.handshake.headers['x-real-ip'];
    c.deferredRequests = [];
    c.imageEnabled = false;

    /* User actions */
    c.on('user create', function() {
      m.rateLimit.check(cfg.rateLimit.userCreate, c.ip, function(err, limitExceed) {
        if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
        if( limitExceed ) { c.emit('error message', 'Слишком частая регистрация. Подождите 1 минуту.'); return; }
      m.user.create(function(err, uid) {
        c.uid = uid;
        c.emit('set uid', uid);
    });});});

    c.on('user login', function(uid) {
      m.rateLimit.check(cfg.rateLimit.userLogin, c.ip, function(err, limitExceed) {
        if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
        if( limitExceed ) { c.emit('error message', 'Слишком частый логин. Подождите 1 минуту.'); return; }
      m.user.login(uid, function(err) {
        c.uid = uid;
        c.emit('set uid', uid);
    });});});

    /* Extension actions */
    c.on('extension activate', function(code) {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'extension activate', data: code }); return; }
      m.rateLimit.check(cfg.rateLimit.activateExtension, c.ip, function(err, limitExceed) {
        if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
        if( limitExceed ) { c.emit('error message', 'Слишком частая активация кода расширения. Подождите 1 минуту.'); return; }
        extensionActivate(c, code);
      });
    });
    c.on('extension check', function(code) {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'extension check', data: code }); return; }
      m.rateLimit.check(cfg.rateLimit.activateExtension, c.ip, function(err, limitExceed) {
        if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
        if( limitExceed ) { c.emit('error message', 'Слишком частая проверка кода расширения. Подождите 1 минуту.'); return; }
        extensionCheck(c, code);
      });
    });

    /* Room actions */
    c.on('room join', function(room) {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'room join', data: room }); return; }
      joinRoom(c, room);
    });
    c.on('room leave', function() {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'room leave' }); return; }
      leaveRoom(c);
    });

    /* Message actions */
    c.on('message write', function(msg) {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'message write', data: msg }); return; }
      m.rateLimit.check(cfg.rateLimit.writeMessage, c.ip, function(err, limitExceed) {
        if( err ) { c.emit('error message', 'Проблема с БД. Попробуйте повторить операцию позже.'); return; }
        if( limitExceed ) { c.emit('error message', 'Слишком много сообщений. Подождите 10 секунд.'); return; }
        writeMsg(c, msg);
    });});
    c.on('message get', function(data) {
      if( !c.uid ) { c.emit('no uid error', { cmd: 'message get', data: data }); return; }
      getMsg(c, data);
    });


    /* Connection actions */
    c.on('disconnect', function() {
      leaveRoom(c);
      if( c.uid ) {
        m.user.logout(c.uid, function(err) {
          if( err ) { console.warn('Can\'t logout user '+c.uid) }
        });
      }
    });});
