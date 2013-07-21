var moment = require('moment')
  , fs = require('fs')
  , Scripto = require('redis-scripto');


var c = require('redis').createClient()
  , clua = new Scripto(c);

clua.loadFromDir(__dirname + '/lua-scripts/');

exports.c = c;
exports.clua = clua;

exports.init = function(config, predefinedRooms) {
  c.multi()
    .hmset('config', config)
    .hmset('predefined_rooms', predefinedRooms)
    .exec(function(err) {
      if( err ) {
        console.error('Can\'t init room model');
        process.exit(1);
      }
    });
};

exports.rooms = {
  count: function(cb) {
    c.hlen('rooms_counters', cb);
  }
};

exports.room = function(room) {
  var hroom = '#' + room;
  var m = {
    c: c,
    clua: clua,
    name: room, 
    hname: hroom,
    msgs: function(cb) {
      m.c.lrange(hroom, 0, -1, function(err, msgs) {
        if( err ) { cb(err); return; }
        cb(null, msgs ? msgs.map(JSON.parse) : []);
      });
      return m;
    },
    clear: function(cb) {
      m.c.multi()
         .del(hroom)
         .hdel('rooms_counters', room)
         .exec(cb);
      return m;
    },
    clearIfCustom: function(cb) {
      m.clua.run('clearIfCustom', [room], cb);
    },
    msg: function(id, cb) {
      m.clua.run('getMsg', [room], [id], function(err, msg) {
        if( err ) { cb(err); return; }
        cb(null, JSON.parse(msg));
      });
    }
  };

  m.msgs.counter = function(cb) {
    m.c.hget('rooms_counters', room, function(err, cnt) {
      if( err ) { cb(err); return; }
      cb(null, cnt || 0);
    });
    return m;
  };

  m.msg.add = function(msg, cb) {
    msg.dt = moment().format('DD.MM.YYYY HH:mm:ss');
    m.clua.run('addMsg', [room], [JSON.stringify(msg)], function(err, id) {
      if( err ) { cb(err); return }
      msg.id = id;
      cb(null, msg);
    });
  };

  return m;
}
