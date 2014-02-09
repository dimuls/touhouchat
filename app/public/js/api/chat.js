$(document).ready(function() {

  window.app = $.extend(true, {
    api: {
      chat: {
        _io_tmp: { },
        _init: function() {
          $.each(app.api.chat._io_cb, function(route, cb) {
            app.io.on(route, cb);
          });
        },

        err: function(cb, once) {
          if( cb ) {
            if( once ) { cb.once = once; }
            app.api.chat._io_tmp['err'] = cb;
          }
        },
        user: {
          login: function(user, cb, once) {
            app.io.emit('user login', user);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['user login'] = cb;
            }
          },
          init: function(params, cb, once) {
            app.io.emit('user init', params);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['user init'] = cb;
            }
          },
          register: function(cb, once) {
            app.io.emit('user register');
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['user register'] = cb;
            }
          }
        },
        room: {
          join: function(room, cb, once) {
            app.io.emit('room join', room);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['room join'] = cb;
            }
          },
          leave: function(room, cb, once) {
            app.io.emit('room leave', room);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['room leave'] = cb;
            }
          },
          message: function(cb, once) {
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['room message'] = cb;
            }
          },
          listen: {
            stop: function(room) { app.io.emit('room listen stop', room); },
            start: function(room) { app.io.emit('room listen start', room); }
          }
        },
        message: {
          get: function(messageId, cb, once) {
            app.io.emit('message get', messageId);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['message get'] = cb;
            }
          },
          write: function(message, cb, once) {
            app.io.emit('message write', message);
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['message write'] = cb;
            }
          }
        },
        messages: {
          get: function(cb, once) {
            app.io.emit('messages get');
            if( cb ) {
              if( once ) { cb.once = once; }
              app.api.chat._io_tmp['messages get'] = cb;
            }
          }
        },
        token: {
          get: function(cb, once) {
            app.io.emit('token get');
            if( cb ) {
              cb.once = once;
              cb.withError = true;
              app.api.chat._io_tmp['token get'] = cb;
            }
          }
        },



        _io_cb: {

          'err': function(err) {
            var cb = app.api.chat._io_tmp['err'];
            if( cb ) {
              cb(err);
              if( cb.once ) { delete app.api.chat._io_tmp['err']; }
            } else {
              console.warn(err);
              alert(err.msg);
            }
            var req = err.req;
            if( req ) {
              var cb = app.api.chat._io_tmp[req];
              if( cb && cb.withError ) {
                cb(err);
                if( cb.once ) { delete app.api.chat._io_tmp[req]; }
              }
            }
          },

          'user register': function(id) {
            var cb = app.api.chat._io_tmp['user register'];
            if( cb ) { cb(id); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['user register']; }
          },
          'user login': function() {
            var cb = app.api.chat._io_tmp['user login'];
            if( cb ) { cb(); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['user login']; }
          },
          'user init': function() {
            var cb = app.api.chat._io_tmp['user init'];
            if( cb ) { cb(); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['user init']; }
          },

          'token get': function(token) {
            var cb = app.api.chat._io_tmp['token get'];
            if( cb ) { cb(null, token); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['token get']; }
          },

          'room join': function() {
            var cb = app.api.chat._io_tmp['room join'];
            if( cb ) { cb(); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['room join']; }
          },
          'room leave': function() {
            var cb = app.api.chat._io_tmp['room leave'];
            if( cb ) { cb(); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['room leave']; }
          },
          'room message': function(room) {
            var cb = app.api.chat._io_tmp['room message'];
            if( cb ) { cb(room); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['room message']; }
          },

          'messages get': function(messages) {
            var cb = app.api.chat._io_tmp['messages get'];
            if( cb ) { cb(messages); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['messages get']; }
          },

          'message write': function(message) {
            var cb = app.api.chat._io_tmp['message write'];
            if( cb ) { cb(message); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['message write']; }
          },
          'message get': function(message) {
            var cb = app.api.chat._io_tmp['message get'];
            if( cb ) { cb(message); }
            if( cb && cb.once ) { delete app.api.chat._io_tmp['message get']; }
          }
        }

      },
    }
  }, window.app);
});
