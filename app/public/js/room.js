$(document).ready(function() {

  $.cookie.json = true;

  window.app = $.extend(true, {
    user: $.cookie('user') || {
      id: null,
      rooms: ['b'],
      soundEnabled: false
    },
    io: io.connect()
  }, window.app);

  app.User = function(data) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    $.each(data, function(key) {
      self[key].subscribe(function() {
        $.cookie('user', ko.mapping.toJS(self));
      });
    });
  }

  app.Imager = function(application) {
    var self = this;
    self.visible = ko.observable(false);
    self.cb = null;
    self.url = ko.observable();
    self.file = ko.observable();
    self.show = function() { self.visible(true); };
    self.hide = function() { self.visible(false); };
    self.clear = function() { self.url(''); self.file(null); }
    self.run = function(cb) { self.hide(); self.clear(); self.show(); self.cb = cb; };
    self.addByURL = function() {
      application.getToken(function(err, token) {
        if( err ) { 'Не удалось получить токен для загрузки изображения: '+err.msg+'.'; return; }
        if( self.cb ) { app.api.image.download(token, self.url(), self.cb); }
      });
    };
    self.addByUpload = function() {
      application.getToken(function(err, token) {
        if( err ) { 'Не удалось получить токен для загрузки изображения: '+err.msg+'.'; return; }
        if( self.cb ) { app.api.image.upload(token, self.url(), self.cb); }
      });
    };
  };

  app.Message = function(data, chat, editor) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    self.quote = function() {
      // TODO
    };
    self.qouteAnswer = function() {
      // TODO
    };
    self.answer = function() {
      // TODO
    };
  };

  app.Image = function(id, editor) {
    var self = this;

    self.id = ko.observable(id);
    
    self.remove = function() {
      editor.removeImage(self);
    };
  };

  app.Editor = function(chat) {
    var self = this;

    self.text = ko.observable('');
    self.images = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Image(opt.data, self); },
      key: function(image) { return ko.unwrap(image.id) }
    });

    self.clear = function() {
      self.text('');
    };

    self.write = function() {
      app.io.emit('message write', { text: self.text(), images: self.images });
    };

    self.addImage = function(image) {
      chat.imager.run(function(err, id) {
        if( err ) { alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
        if( id ) { self.images.push(new app.Image(id, self)); }
      });
    };
    self.removeImage = function(image) {
      self.images.remove(image);
    }
  };

  app.Chat = function(application) {
    var self = this;
    self.room = application.currentRoom;
    self.imager = new app.Imager(application);
    self.editor = new app.Editor(self);
    self.messages = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Message(opt.data, self, self.editor) },
      key: function(message) { return ko.unwrap(message.id) }
    });
    self.addMessage = function(data) {
      self.messages.push(new app.Message(data, self, self.editor));
    },
    self.loadMessages = function() {
      app.io.emit('messages get');
    }
  };

  app.Room = function(name, application) {
    var self = this;
    self.name = ko.observable(name);
    self.current = ko.computed(function() {
      return self.name() === application.currentRoom();
    });
    self.newMessagesCount = ko.observable(0);
    self.usersCount = ko.observable(0);
    self.newMessage = function() {
      self.newMessagesCount(self.newMessagesCount()+1);
    }
    self.clearCounter = function() {
      self.newMessagesCount(0);
    }
  }

  app.App = function() {
    var self = this;

    self.currentRoom = ko.observable();
    self.rooms = ko.mapping.fromJS(app.user.rooms, {
      create: function(opt) { return new app.Room(opt.data, self); },
      key: function(room) { return ko.unwrap(room.name); }
    });
    var index = self.rooms.mappedIndexOf({ name: app.params.room });
    if( index == -1 ) {
      self.currentRoom(new app.Room(app.params.room, self));
    } else {
      self.currentRoom(self.rooms()[index]);
    }
    self.listenRooms = ko.computed(function() {
      var currentRoomName = self.currentRoom().name();
      return $.grep(self.rooms(), function(room) { return room.name() != currentRoomName; });
    });

    self.user = new app.User(app.user);
    self.chat = new app.Chat(self);

    self.helpVisible = ko.observable(false);
    self.toggleHelp = function() { self.helpVisible(!self.helpVisible()); self.settingsVisible(false); };

    self.settingsVisible = ko.observable(false);
    self.toggleSettings = function() { self.settingsVisible(!self.settingsVisible()); self.helpVisible(false); };

    self.soundEnabled = ko.observable(app.user.soundEnabled);
    self.toggleSound = function() { self.soundEnabled(!self.soundEnabled()) };

    self.getTokenCbs = [];
    self.getToken = function(cb) {
      self.getTokenCbs.push(cb);
      app.io.emit('token get');
    }

    app.io.on('token get', function(token) {
      var cb = self.getTokenCbs.shift();
      if( cb ) { cb(token); };
    });

    app.io.on('message write', function(res) {
      if( res.message ) {
        self.chat.addMessage(res.message);
      } else if( res.room ) {
        var index = self.rooms.mappedIndexOf(res.room);
        if( index > 0 ) {
          self.rooms()[index].newMessage();
        }
      }
    });

    app.io.on('messages get', function(messages) {
      ko.mapping.fromJS(messages, {}, self.chat.messages);
    });

    app.io.on('user register', function(id) {
      self.user.id(id);
      app.io.emit('user login', { uid: id });
    });

    app.io.on('user login', function() {
      app.io.emit('user init', {
        currentRoom: self.currentRoom().name(),
        listenRooms: $.map(self.listenRooms(), function(room) { return room.name(); })
      });
    });

    app.io.on('user init', function() {
      self.chat.loadMessages(); 
    });

    app.io.on('err', function(err) {
      console.warn(err);
      alert(err.msg);
    });

    if( self.user.id() ) {
      app.io.emit('user login', { uid: self.user.id() });
    } else {
      app.io.emit('user register');
    }
  };


  app.app = new app.App();
  ko.applyBindings(app.app);
});
