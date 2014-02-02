var _ = require('underscore');

module.exports = function(app, cfg, m, l) {

  app.io.route('user register', function(req) {
    m.rateLimit.check(cfg.rateLimit.userRegister, req.headers['x-real-ip'] || '127.0.0.1', function(err, limitExceed) {
      if( err ) { req.io.emit('err', l.error.user.register()); return; }
      if( limitExceed ) { req.io.emit('err', l.error.user.register('cлишком частая регистрация. Подождите 1 минуту', 'rate limit')); return; }
    m.user.create(function(err, userId) {
      req.socket.chatUserId = userId;
      req.io.emit('user register', userId);
  });});}); 

  app.io.route('user login', function(req) {
    var userId = req.data.uid;
    if( !userId || !userId.match(/^\w{128}$/) ) { req.io.emit('err', l.error.user.login('не верный UID', 'validation')); return; }
    m.rateLimit.check(cfg.rateLimit.userLogin, req.headers['x-real-ip'] || '127.0.0.1', function(err, limitExceed) {
      if( err ) { req.io.emit('err', l.error.user.login()); return; }
      if( limitExceed ) { req.io.emit('err', l.error.user.login('слишком частый логин. Подождите 1 минуту', 'rate limit')); return; }
    m.user.login(userId, function(err) {
      if( err ) { req.io.emit('err', l.error.user.login()); return; }
      req.socket.chatUserId = userId;
      req.io.emit('user login');
  });});});   

  app.io.route('user init', function(req) {
    var userId = req.socket.chatUserId;
    if( !userId ) { l.log.fwarn(req.headers['x-real-ip'] || '127.0.0.1', 'user init', 'user init without UID'); return; }
    var joinRoom = req.data.currentRoom;
    var listenRooms = _.uniq(req.data.subscribedRooms);
    var allRooms = _.uniq(listenRooms.concat(joinRoom));
    if( _.some(allRooms, function(room) { return typeof room != 'string' || !room.match(/^\w+$/);  }) ) {
      req.io.emit('err', l.error.user.init('имя комнаты может содержать только символы алфавита.', 'validation'));
      return;
    }
    var chatUser = new l.ChatUser(req.socket.chatUserId, listenRooms, joinRoom);
    chatUser.init(req, app, m, l);
    req.io.emit('user init');
  });

  app.io.route('disconnect', function(req) {
    if( req.socket.chatUser ) {
      req.socket.chatUser.disconnect(req);
    }
  });

}
