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
      rooms: ['b', 'a', 'rm', 'to', 'c'],
      soundEnabled: false,
      writeShortcut: 'ce', // e - enter || ce - ctrl+enter
      backgroundImage: ''
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

  ko.bindingHandlers.arrayValue = {
    init: function (element, valueAccessor, allBindingsAccessor) {
      var observableArray = valueAccessor();
      var allBindings = allBindingsAccessor();
      var arrayValueRegexp = new RegExp(allBindings.arrayValueRegexp || '^\\w+$');
      var interceptor = ko.computed({
        read: function () {
          return observableArray().join(', ');
        },
        write: function (arrayStr) {
          var array = arrayStr.split(/\s*,\s*/).filter(function(val) { return val.match(arrayValueRegexp) });
          observableArray(array);
        }
      });
      ko.applyBindingsToNode(element, { value: interceptor });
    }
  };



  app.User = function(data) {
    var self = this;
    ko.mapping.fromJS(data, {}, self);
    self.save = function() {
      $.cookie('user', ko.mapping.toJS(self));
    }
    $.each(data, function(key) {
      self[key].subscribe(function(nv) {
        self.save();
      });
    });

    self.changingBackground = ko.observable(false);

    self.setBackgroundImage = function() {
      $('body').css({ 'background-image': 'url('+self.backgroundImage()+')' });
    };

    self.uploadBackgroundImage = function() {
      if( !self.changingBackground() ) {
        $('#inp-params-bkg-img').click();
      }
    };

    self.clearBackgroundImage = function() {
      if( !self.changingBackground() ) {
        self.backgroundImage('');
      }
    }

    self.downloadBackgroundImage = function(url) {
      self.changingBackground(true);
      app.api.chat.token.get(function(err, token) {
        if( err ) { self.changingBackground(false); alert('Не удалось получить токен для загрузки изображения: '+err.msg+'.'); return; }
        app.api.image.download(self.id(), token, url, function(err, imageData) {
          self.changingBackground(false); 
          if( err ) { alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
          var image = new app.Image(imageData);
          self.backgroundImage(image.path());
          self.setBackgroundImage();
        }, true);
      }); 
    }

    self.backgroundImage.subscribe(function(url) {
      if( url.match(/^http:\/\//) ) {
        self.downloadBackgroundImage(url);
      } else {
        self.setBackgroundImage();
      }
    });

    if( self.backgroundImage() ) {
      self.setBackgroundImage();
    }

    $('#inp-params-bkg-img').change(function() {
      var file = this.files[0];
      if( !file || !file.size ) {
      } else if( file.size > app.conf.imageSizeLimit ) {
        alert('Максимальный размер картинки - 3 Мб.');
      } else if( !file.type.match('^image/(jpeg|png|gif)$') ) {
        alert('Поддерживаемы ТОЛЬКО следующие форматы картинок: JPEG, PNG, GIF.');
      } else {
        self.changingBackground(true);
        app.api.chat.token.get(function(err, token) {
          if( err ) { self.changingBackground(false); alert('Не удалось получить токен для загрузки изображения: '+err.msg+'.'); return; } 
          app.api.image.upload(self.id(), token, file, function(err, imageData) {
            self.changingBackground(false); 
            if( err ) { alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
            var image = new app.Image(imageData);
            self.backgroundImage(image.path());
            self.setBackgroundImage();
          });
        }, true);   
      }
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
      var text = self.text();
      var quotedText = $(text).text().replace(/(\r?\n)\1+/gm, '$1').replace(/^/gm, '>');
      var oldText = editor.text();
      if( oldText && oldText.length && !oldText.match(/\n$/) ) {
        oldText += '\n'
      }
      editor.text(oldText + quotedText + '\n');
      editor.focusTextEnd();
    };
    self.quoteAnswer = function() {
      var text = self.text();
      var quotedText = $(text).text().replace(/(\r?\n)\1+/gm, '$1').replace(/^/gm, '>');
      var oldText = editor.text();
      if( oldText && oldText.length && !oldText.match(/\n$/) ) {
        oldText += '\n'
      }
      editor.text(oldText + '>' + self.linkShort() + '\n' + quotedText + '\n');
      editor.focusTextEnd();
    };
    self.answer = function() {
      var oldText = editor.text();
      if( oldText && oldText.length && !oldText.match(/\n$/) ) {
        oldText += '\n';
      }
      editor.text(oldText + '>' + self.linkShort() + '\n');
      editor.focusTextEnd();
    };
    self.linkShort = ko.computed(function() {
      return '/' + self.id() + '/';
    });
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
    
    if( editor ) {
      self.remove = function() {
        editor.removeImage(self);
      };
    }

    self.path = ko.computed(function() {
      var id = self.id();
      return '/img/'+id[0]+'/'+id[1]+'/'+id+'.'+self.ext();
    });

    self.thumbnailPath = ko.computed(function() {
      return self.path().replace(/(\.\w+)$/, '_thumbnail$1');
    });
  };





  app.Imager = function(editor, user) {
    var self = this;

    self.run = function() {
      if( !user.changingBackground() ) {
        $('#inp-imgs').click();
      }
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
        app.api.image.download(user.id(), token, url, function(err, imageData) {
          if( err ) { self.added(); alert('Не удалось загрузить изображение: '+err.msg+'.'); return; }
          self.added();
          editor.images.push(new app.Image(imageData, editor));
        }, true);
      });
    };

    self.addByUpload = function(file) {
      app.api.chat.token.get(function(err, token) {
        if( err ) { self.added(); alert('Не удалось получить токен для загрузки изображения: '+err.msg+'.'); return; }
        app.api.image.upload(user.id(), token, file, function(err, imageData) {
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
      $.each(this.files, function(i, file) {
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

    self.addByURLs = function(urls) {
      $.each(urls, function(i, url) {
        self.addQueue.push(function() { self.addByURL(url); });
      });
      self.add();
    }

  };





  app.Editor = function(chat, user) {
    var self = this;

    self.user = user;
    self.text = ko.observable('');
    self.imager = new app.Imager(self, user);
    self.images = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Image(opt.data, self); },
      key: function(image) { return ko.unwrap(image.id) }
    });

    self.clear = function() {
      self.text('');
      self.images.removeAll();
    };

    self._textJqEl = $('#msg-text');
    self.textCaret = self._textJqEl.caret.bind(self._textJqEl);

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

    self.focusTextEnd = function() {
      self.textCaret.caret(-1);
    };



    // Shortcuts handling

    self.act = function(action) {
      switch(action) {
        case 'write':
          self.write();
          return true;
          break;
        case 'text new line':
          self.textCaret('\n');
          return true;
          break;
        default: return false; break;
      }
    };

    self._sendKeyShortcutChecker = ko.computed(function() {
      switch(user.writeShortcut()) {
        case 'e':
          return function(e) {
            if( e.keyCode == 13 || e.keyCode == 10 ) {
              if( e.ctrlKey || e.metaKey ) {
                return 'text new line';
              } else {
                return 'write';
              }
            }
            return 'pass';
          };
          break;
        case 'ce':
          return function(e) { return (e.keyCode == 13 || e.keyCode == 10) && (e.ctrlKey || e.metaKey) ? 'write' : 'pass' };
          break;
      }
    });
    self.sendKeyShortcutChecker = self._sendKeyShortcutChecker();
    self._sendKeyShortcutChecker.subscribe(function(f) {
      self.sendKeyShortcutChecker = f;
    });

    self.shortcutChecker = function(e) {
      var res = self.sendKeyShortcutChecker(e);
      if( self.act(res) ) { return; }
    }

    self.textKeyPressed = function(data, e) {
      if( self.shortcutChecker(e) ) {
        return false;
      }
      return true;
    };



    // Images URL parsing

    /* self.textThrottled = ko.computed(function() {
      return self.text();
    }).extend({ throttle: 3000 });
    self.textThrottled.subscribe(function(text) {
      self.imager.addByURLs(text.match(/http:\/\/\S+/g));
    }); */
  };





  app.Chat = function(application, user) {
    var self = this;
    self.room = application.currentRoom;
    self.activeMessageId = ko.observable();
    self.editor = new app.Editor(self, user);
    self.messages = ko.mapping.fromJS([], {
      create: function(opt) { return new app.Message(opt.data, self, self.editor, application) },
      key: function(message) { return ko.unwrap(message.id) }
    });
    self.addMessage = function(data) {
      if( data.author ) { self.editor.clear(); }
      else {
        application.playMessageSound();
        $.titleAlert("Новое сообщение!", { requireBlur:false, stopOnFocus:true, duration:0, interval:500 });
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
    self.listen = {
      start: app.api.chat.room.listen.start.bind(null, self.name()),
      stop: app.api.chat.room.listen.stop.bind(null, self.name())
    };
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
    self.chat = new app.Chat(self, self.user);

    if( app.params.message ) {
      self.chat.activeMessageId(app.params.message);
    }

    self.user.rooms.subscribe(function(newRooms) {
      self.rooms.removeAll($.grep(self.rooms(), function(room) {
        if( newRooms.indexOf(room.name()) === -1 && !room.current() ) { room.listen.stop(); return true; }
        return false;
      }));
      $.each(newRooms, function(i, name) {
        if( self.rooms.mappedIndexOf({ name: name }) === -1 ) {
          if( self.currentRoom().name() == name ) {
            self.rooms.push(self.currentRoom());
          } else {
            var room = new app.Room(name, self);
            room.listen.start();
            self.rooms.push(new app.Room(name, self));
          }
        }
      });
    });





    // Additional forms
      
    self.additionalForm = ko.observable(0);

    self.settingsVisible = ko.computed(function() { return self.additionalForm() === 2; });
    self.helpVisible = ko.computed(function() { return self.additionalForm() === 1; });

    self.toggleSettings = function() { self.settingsVisible() ? self.additionalForm(0) : self.additionalForm(2); };
    self.toggleHelp = function() { self.helpVisible() ? self.additionalForm(0) : self.additionalForm(1); };

    self.toggleSound = function() { self.soundEnabled(!self.soundEnabled()) };




    // Init sound system

    self.soundEnabled = ko.observable(true);
    self.toggleSound = function() {
      self.soundEnabled(!self.soundEnabled());
    }
    self.playMessageSound = function () {};
    soundManager.setup({
      url: '/swf/soundmanager/',
      preferFlash: false,
      debugMode: false,
      onready: function() {
        var messageSound = soundManager.createSound({
          id: 'message',
          url: '/sfx/message.ogg',
          autoLoad: true,
          autoPlay: false,
          volume: 50
        }); 
        self.playMessageSound = function () {
          self.soundEnabled() && messageSound.play();
        };
      }
    });




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
