var moment = require('moment')
  , fs = require('fs')
  , Scripto = require('redis-scripto')
  , crypto = require('crypto')
  , uuid = require('node-uuid');

var c = require('redis').createClient()
  , clua = new Scripto(c);

clua.loadFromDir(__dirname + '/lua-scripts/');

exports.c = c;
exports.clua = clua;

var config;

exports.init = function(_config, predefinedRooms) {
  config = _config;
  c.multi()
    .hmset('config', _config)
    .hmset('predefined_rooms', predefinedRooms)
    .exec(function(err) {
      if( err ) {
        console.error('Can\'t init room model');
        process.exit(1);
      }
    });
};

exports.user = {
  create: function(cb) {
    crypto.randomBytes(64, function(err, buf) {
      if( err ) { cb(err); return; }
      var uid = buf.toString('hex');
      clua.run('userCreate', [], [uid], function(err) {
        if( err ) { cb(err); return; }
        cb(null, uid);
      });
    });
  },
  login: function(uid, cb) {
    clua.run('userLogin', [], [uid], cb)
  },
  logout: function(uid, cb) {
    clua.run('userLogout', [], [uid], cb);
  },
  remove: function(uid, cb) {
    c.del('users/'+uid, cb)
  }
}

exports.extension = {
  create: function(cb) {
    crypto.randomBytes(128, function(err, buf) {
      if( err ) { cb(err); return; }
      var code = buf.toString('hex');
      c.hset('extensions', code, '', function(err) {
        cb(err, err ? undefined : code);
      });
    });
  },
  check: function(uid, code, cb) {
    c.hget('extensions', code, function(err, ownerUid) {
      if( err ) { cb(err); return }
      ownerUid === uid
        ? cb(null, true)
        : cb(null, false, 'Extension code used by user '+uid+' activate by another user');
    });
  },
  activate: function(uid, code, cb) {
    clua.run('extensionActivate', [], [uid, code], function(err, res) {
      cb(err, res[0], res[1]);
    });
  },
  remove: function(code, cb) {
    c.hdel('extensions', code, cb);
  }
}

exports.rateLimit = {
  check: function(cfg, ip, cb) {
    var now = (new Date()).getTime();
    clua.run('rateLimit', ['rl/'+cfg.path+'/'+ip], [cfg.time, cfg.count, now], cb);
  }
}

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
        cb(null, msgs ? msgs.filter(function(msg) { return msg.length > 0 }).map(JSON.parse) : []);
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
      m.clua.run('roomClearIfCustom', [room], cb);
      return m;
    },
    msg: function(id, cb) {
      m.clua.run('messageGet', [room], [id], function(err, msg) {
        if( err ) { cb(err); return; }
        cb(null, JSON.parse(msg));
      });
      return m;
    }
  };

  m.msgs.count = function(cb) {
    m.c.hget('rooms_counters', room, function(err, cnt) {
      if( err ) { cb(err); return; }
      cb(null, cnt || 0);
    });
    return m;
  };

  m.msg.add = function(msg, cb) {
    msg.dt = moment().format('DD.MM.YYYY HH:mm:ss');
    m.clua.run('messageAdd', [room], [JSON.stringify(msg)], function(err, id) {
      if( err ) { cb(err); return }
      msg.id = id;
      cb(null, msg);
    });
    return m;
  };

  m.msg.del = function(id, cb) {
    m.clua.run('messageDel', [room], [id], cb);
    return m;
  };

  return m;
}
