$(document).ready(function() {

  $.cookie.json = true;
  $.cookie.defaults.path = '/';
  $.cookie.defaults.expires = 365;

  window.app = $.extend(true, {
    io: io.connect('/', {
      'reconnect': true,
      'reconnection delay': 500,
      'max reconnection attempts': 1000
    }),
    user: $.cookie('user') || {
      id: null,
      rooms: ['b'],
      soundEnabled: false
    },
  }, window.app);

  app.api.chat._init();

  ko.bindingHandlers.hscroll = {
    init: function(element, valueAccessor, allBindings, viewModel, bindingContext) {
      $(element).mousewheel(function(event) {
        this.scrollLeft -= (event.deltaY * event.deltaFactor);      
        event.preventDefault();
      });
    }
  };

  ko.bindingHandlers.applyBindings = {
    init: function(element, valueAccessor, allBindings, bindingContext) {
      $(element).children().each(function(i, child) {
        ko.applyBindings(bindingContext, child);
      });
    }
  };


  app.User = function(data) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    $.each(data, function(key) {
      self[key].subscribe(function() {
        $.cookie('user', ko.mapping.toJS(self));
      });
    });
  }





  app.Message = function(data, chat, editor, application) {
    var self = this;
    if( !data.images || data.images.length === undefined ) { data.images = []; } // этот костыль из-за lua cjson
    ko.mapping.fromJS(data, {
      images: {
        create: function(opt) { return new app.Image(opt.data, editor); },
        key: function(image) { return ko.unwrap(image.id); }
      }
    }, self);

    self.appGoTo = application.goTo;

    self.quote = function() {
      // TODO
    };
    self.quoteAnswer = function() {
      // TODO
    };
    self.answer = function() {
      // TODO
    };
    self.linkLong = ko.computed(function() {
      return '/' + chat.room().name() + '/' + self.id() + '/';
    });
    self.goTo = function() {
      application.goTo(self.linkLong());
    }
    self.active = ko.computed(function() {
      return self.id() == chat.activeMessageId();
    });
    self.unactive = function() {  
      chat.activeMessageId(null);
      application.goTo('/'+chat.room().name()+'/');
    };
    self.scrollTo = function() {
      $('.row.msgs').scrollTo('#msg-'+self.id());
    };
  };





  app.Image = function(data, editor) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    
    self.remove = function() {
      editor.removeImage(self);
    };

    self.path = ko.computed(function() {
      var id = self.id();
      return '/img/'+id[0]+'/'+id[1]+'/'+id+'.'+self.ext();
    });

    self.thumbnailPath = ko.computed(function() {
      return self.path().replace(/(\.\w+)$/, '_thumbnail$1');
    });
  };





  app.Imager = function(editor) {
    var self = this;

    self.run = function() {
      $('#inp-imgs').click();
    };

    self.adding = ko.observable(false);
    self.addQueue = ko.observableArray();
    self.addNext = function() {
      var adder = self.addQueue()[0];
      if( adder ) { adder(); }
      else { self.adding(false); }
    };
    self.added = function() { self.addQueue.shift(); self.addNext(); }
    self.add = function() { if( !self.adding() ) { self.adding(true); self.addNext(); } };

    self.addByURL = function(url) {
      app.api.chat.token.get(function(err, token) {
        if( err ) { self.added(); alert('Не удалось получить токен для загрузки изображения: '+err.msg+'.'); return; }
        app.api.image.download(app.app.user.id(), token, url, function(err, imageData) {
          if( err ) { self.added(); alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
          self.added();
          editor.images.push(new app.Image(imageData, editor));
        }, true);
      });
    };

    self.addByUpload = function(file) {
      app.api.chat.token.get(function(err, token) {
        if( err ) { self.added(); alert('Не удалось получить токен для загрузки изображения: '+err.msg+'.'); return; }
        app.api.image.upload(app.app.user.id(), token, file, function(err, imageData) {
          if( err ) { self.added(); alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
          self.added();
          editor.images.push(new app.Image(imageData, editor));
        });
      }, true);
    };

    editor.text.subscribe(function(text) {
      // TODO: add images by url in text;
    });

    $('#inp-imgs').change(function() {
      $.map(this.files, function(file) {
        if( !file || !file.size ) {
        } else if( file.size > app.conf.imageSizeLimit ) {
          alert('Максимальный размер картинки - 3 Мб.');
        } else if( !file.type.match('^image/(jpeg|png|gif)$') ) {
          alert('Поддерживаемы ТОЛЬКО следующие форматы картинок: JPEG, PNG, GIF.');
        } else {
          self.addQueue.push(function() { self.addByUpload(file); });
        }
      });
      self.add();
    });

  };





  app.Editor = function(chat) {
    var self = this;

    self.text = ko.observable('');
    self.imager = new app.Imager(self);
    self.images = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Image(opt.data, self); },
      key: function(image) { return ko.unwrap(image.id) }
    });

    self.clear = function() {
      self.text('');
      self.images.removeAll();
    };

    self.write = function() {
      app.api.chat.message.write({ text: self.text(), images: ko.mapping.toJS(self.images) }, function(message) {
        chat.addMessage(message);
      }, true);
    };

    self.addImage = function() {
      chat.imager.run();
    };

    self.removeImage = function(image) {
      self.images.remove(image);
    };
  };





  app.Chat = function(application) {
    var self = this;
    self.room = application.currentRoom;
    self.activeMessageId = ko.observable();
    self.editor = new app.Editor(self);
    self.messages = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Message(opt.data, self, self.editor, application) },
      key: function(message) { return ko.unwrap(message.id) }
    });
    self.addMessage = function(data) {
      if( data.author ) { self.editor.clear(); }
      else {
        // TODO: sound and tab-header notification
      }
      self.messages.push(new app.Message(data, self, self.editor, application));
      if( self.autoScrollEnabled() ) {
        self.scrollToBottom();
      }
      if( self.messages().length > app.conf.logLimit ) {
        self.messages.shift();
      }
    };
    self.loadMessages = function() {
      app.api.chat.messages.get(function(messages) {
        ko.mapping.fromJS(messages, {}, self.messages);
        self.scrollToAvtiveMessage();
      }, true);
    };
    self.changeRoom = function(roomName, messageId) {
      if( self.room().name() !== roomName ) {
        app.api.chat.room.join(roomName, function() {
          var room = application.getRoom(roomName);
          self.room(room);
          self.activeMessageId(messageId);
          self.messages.removeAll();
          self.loadMessages();
        });
      } else {
        self.activeMessageId(messageId);
      }
    };


    // Scroll handling
    self.autoScrollEnabled = ko.observable(true);

    self.scrollToMessage = function(id) {
      var index = self.messages.mappedIndexOf({ id: id });
      if( index > -1 ) {
        self.autoScrollEnabled(false);
        self.messages()[index].scrollTo();
      } else if( self.autoScrollEnabled() ) {
        self.scrollToBottom();
      }
    };

    self.scrollToBottom = function() {
      if( self.messages().length ) {
        self.messages().slice(-1)[0].scrollTo();
      }
    };

    self.scrollToAvtiveMessage = function() {
      var id = self.activeMessageId();
      self.scrollToMessage(id);
    };

    $('.row.msgs').scroll($.debounce(function () {
      self.autoScrollEnabled($('.row.msgs')[0].scrollTop > $('.row.msgs')[0].scrollHeight - $('.row.msgs').height() - 5);
    }, 250, false));
  };





  app.Room = function(name, application) {
    var self = this;
    self.name = ko.observable(name);
    self.nameTxt = ko.computed(function() { return '/'+self.name()+'/' });
    self.current = ko.computed(function() {
      return self === application.currentRoom();
    });
    self.newMessagesCount = ko.observable(0);
    self.usersCount = ko.observable(0);
    self.newMessage = function() {
      self.newMessagesCount(self.newMessagesCount()+1);
    }
    self.clearCounter = function() {
      self.newMessagesCount(0);
    }
    self.path = ko.computed(function() {
      return '/'+self.name()+'/';
    });
    self.goTo = function() {
      application.goTo(self.path());
    }
    self.current.subscribe(function(current) {
      if( current ) {
        self.clearCounter();
      }
    });
  }





  app.App = function() {

    var self = this;



    
    // Room handling

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

    self.allRooms = ko.computed(function() {

      var rooms = self.rooms();
      var currentRoom = self.currentRoom();
      if( rooms.indexOf(currentRoom) == -1 ) {
        return rooms.concat(currentRoom);
      } else {
        return rooms;
      }
    });

    self.listenRooms = ko.computed(function() {
      var currentRoomName = self.currentRoom().name();
      return $.grep(self.rooms(), function(room) { return room.name() != currentRoomName; });
    });

    self.getRoom = function(name) {
      var index = self.rooms.mappedIndexOf({ name: name });
      if( index !== -1 ) {
        return self.rooms()[index];
      } else {
        return new app.Room(name, self);
      }
    }





    // User and Chat initalizing

    self.user = new app.User(app.user);
    self.chat = new app.Chat(self);

    if( app.params.message ) {
      self.chat.activeMessageId(app.params.message);
    }





    // Additional forms
      
    self.additionalForm = ko.observable(0);

    self.additionalVisible = ko.computed(function() { return self.additionalForm() === 0 });
    self.helpVisible = ko.computed(function() { return self.additionalForm() === 1; });
    self.settingsVisible = ko.computed(function() { return self.additionalForm() === 2; });

    self.toggleHelp = function() { self.helpVisible() ? self.additionalForm(0) : self.additionalForm(1); };
    self.toggleSettings = function() { self.settingsVisible() ? self.additionalForm(0) : self.additionalForm(2); };

    self.toggleSound = function() { self.soundEnabled(!self.soundEnabled()) };





    // Routing

    self._loadPath = function(path) {
      if( res = path.match(/^\/([A-Za-z]\w*)\/$/) ) {
        var room = res[1];
        self.chat.changeRoom(room);
      } else if( res = path.match(/^\/([A-Za-z]\w*)\/(\d+)\/$/) ) {
        var room = res[1];
        var message = res[2];
        self.chat.changeRoom(room, message);
      }
    }

    self.goTo = function(path) {
      if( path == window.location.pathname ) { return; }
      history.pushState({}, 'anonchat.pw'+path, path);
      self._loadPath(path);
    }

    self.goBack = function() {
      history.go(-1);
    }

    window.onpopstate = function(e) {
      var path = window.location.pathname;
      self._loadPath(path);
    };


    // Initializing

    app.api.chat.room.message(function(res) {
      if( res.room == self.currentRoom().name() ) {
        self.chat.addMessage(res.message);
      } else {
        var index = self.rooms.mappedIndexOf({ name: res.room });
        if( index >= 0 ) {
          self.rooms()[index].newMessage();
        }
      }
    });

    self._login = function() {
      app.api.chat.user.login({ uid: self.user.id() }, function() {
        app.api.chat.user.init({
          currentRoom: self.currentRoom().name(),
          listenRooms: $.map(self.listenRooms(), function(room) { return room.name(); })
        }, function() {
          self.chat.loadMessages();
        });
      });
    }

    app.io.on('connect', function() {
      if( self.user.id() ) {
        self._login();
      } else {
        app.api.chat.user.register(function(userId) {
          self.user.id(userId);
          self._login();
        });
      }
    });
  };


  app.app = new app.App();
  ko.applyBindings(app.app);
});
