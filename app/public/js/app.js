/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   External modules initialization
*/

$.cookie.json = true;
if( !$.cookie('predefinedRooms') ) {
  $.cookie('predefinedRooms', ['b']);
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   App initialization
*/

// App scope
var app = {
  LOG_SIZE: 100,
  CHAT_WS_URL: 'http://anonchat.pw/chat',
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   Msg Model
*/
app.MsgsMapping = {
  create: function(opt) {
    return new app.MsgModel(opt.data);
  },
  key: function(msg) {
    return ko.utils.unwrapObservable(msg.id);
  }
};

app.MsgModel = function(msg) {
  ko.mapping.fromJS(msg, {}, this);
  var self = this;
  self.link = ko.computed(function() {
    return '&' + self.id();
  }, self);
  self.linkLong = ko.computed(function() {
    return '#' + app.model.room() + '&' + self.id();
  }, self);
  self.active = ko.computed(function() {
    return app.model.post() == self.id();
  }, self);
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   Custom bindings
*/

ko.bindingHandlers.arrayValue = {
  init: function (element, valueAccessor) {
    var observableArray = valueAccessor();
    var interceptor = ko.computed({
      read: function () {
        return observableArray().join(', ');
      },
      write: function (arrayStr) {
        var array = arrayStr.split(/\s*,\s*/).filter(function(val) { return val.match(/^\w+$/) });
        observableArray(array);
      }
    });
    ko.applyBindingsToNode(element, { value: interceptor });
  }
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   App Model
*/

app.Model = function() {
  var self = this;

  /* Init data */
  self.clientsCount = ko.observable('');
  self.totalClientsCount = ko.observable('');
  self.msgText = ko.observable('');
  self.msgs = ko.mapping.fromJS([], app.MsgsMapping);
  self.afterMsgsRender = ko.computed(self.msgs).extend({ throttle: 100 });
  self.afterMsgsRender.subscribe(function() {
    $(window)._scrollable(); 
  });

  /* Settings data */
  self.predefinedRooms = ko.observable($.cookie('predefinedRooms'));
  self.predefinedRoomsChanged = ko.computed(self.predefinedRooms).extend({ throttle: 500 });
  self.predefinedRoomsChanged.subscribe(function(newPredefinedRooms) {
    $.cookie('predefinedRooms', newPredefinedRooms);
  });
  self.showSettings = ko.observable(false);
  self.toggleSettings = function() {
    self.showSettings(!self.showSettings());
  };

  /* Event handlers */
  self.writeMsg = function() {
    self.ws.emit('write msg', self.msgText());
    self.clearMsg();
  };
  self.clearMsg = function() {
    self.msgText('');
    $('#input-msg').trigger('autosize.resize');
    $('#input-msg').focus();
    return false;
  };
  self.msgTextKeyPressed = function(data, e) {
    if( (e.keyCode == 13 || e.keyCode == 10) && e.ctrlKey ) {
      self.writeMsg();
    }
    return true;
  };
  self.inputRoomKeyPressed = function(date, e) {
    if( e.keyCode == 13 ) {
      $('#input-msg').focus();
      return false;
    }
    return /^\w$/.test(String.fromCharCode(e.charCode)) || e.keyCode != 0;
  };
  self.answerMsg = function(msg) {
    var oldText = self.msgText();
    if( oldText && oldText.length && !oldText.match(/\n$/) ) {
      oldText += '\n'
    }
    self.msgText(oldText + '>' + msg.link() + '\n');
    $('#input-msg').trigger('autosize.resize').focus().caretToEnd();
  };
  self.answerMsgQuoted = function(msg) {
    var text = msg.text();
    var quotedText = $(text).text().replace(/^/gm, '>');
    var oldText = self.msgText();
    if( oldText && oldText.length && !oldText.match(/\n$/) ) {
      oldText += '\n'
    }
    self.msgText(oldText + '>' + msg.link() + '\n' + quotedText + '\n');
    $('#input-msg').trigger('autosize.resize').focus().caretToEnd();
  };

  /* Init controls */
  $('#input-msg').autosize();

  /* Scrolling magic */
  self.scrollOnBottom = true;
  $(window).scroll($.debounce(250, false, function () {
    self.scrollOnBottom = $(window).scrollTop() > $(document).height() - $(window).height() - 10;
  }));
  self.scrollToBottom = function() {
    //$(window).scrollTo($('#msgs .msg').last());
    $(document).scrollTop($(document).height());
  };

  /* Init sound system */
  self.soundEnabled = ko.observable(true);
  self.toggleSound = function() {
    self.soundEnabled(!self.soundEnabled());
  }
  self.playMessageSound = function () {};
  soundManager.setup({
    url: '/swf/soundmanager.swf',
    preferFlash: false,
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

  /* Init websockets */
  self.ws = io.connect(app.CHAT_WS_URL);
  self.ws.on('set predefined rooms', self.predefinedRooms);
  self.ws.on('chat msg', function(msg) {
    if( self.msgs().length >= app.LOG_SIZE) {
      self.msgs.shift();
    }
    self.msgs.push(new app.MsgModel(msg));
    if( self.scrollOnBottom ) {
      self.scrollToBottom();
    }
    if( !msg.author ) {
      self.playMessageSound();
      $.titleAlert('Новое сообщение', { requireBlur: true  });//stopOnMouseMove: true });
    }
  });
  self.ws.on('set msgs', function(msgs) {
    ko.mapping.fromJS(msgs, self.msgs);
    if( self.post() ) {
      $(window).scrollTo($('#msg-' + self.post()), 100);
    } else {
      self.scrollToBottom();
    }
  });
  self.ws.on('set clients count', self.clientsCount);
  self.ws.on('set total clients count', self.totalClientsCount);
  self.ws.on('error msg', function(error) { alert (error) });

  /* Init pages routing */
  self.page = ko.observable();
  self.page.subscribe(function(newPage) {
    if( newPage !== location.hash ) {
      location.hash = newPage;
    }
  });

  self.room = ko.observable('');
  self.room.subscribe(function(newRoom) {
    self.ws.emit('leave room');
    if( newRoom !== undefined ) {
      self.ws.emit('join room', newRoom);
    }
    if( $.inArray(newRoom, self.predefinedRooms()) == -1 ) {
      self.customRoom(newRoom);
    } else {
      self.customRoom('');
    }
    $('#input-msg').focus();
  });

  self.customRoom = ko.observable('');
  self.afterCustomRoomChanged = ko.computed(self.customRoom).extend({ throttle: 100 });
  self.afterCustomRoomChanged.subscribe(function(room) {
    if( $.inArray(room, self.predefinedRooms()) != -1 ) {
      self.customRoom('');
      self.page(room);
    }
    $('#input-room').trigger(jQuery.Event( "input" ));
    if( room && room.length > 0 ) {
      self.page(room);
    }
  });

  self.post = ko.observable('');

  self.clearPost = function() {
    self.page(location.hash.replace(/\&\d+$/, ''));
  }

  /* Init router */
  Sammy(function() {

    this.get(/^\/?#(\w+)(&(\d+))?$/, function() {
      var room = this.params['splat'][0]
        , post = this.params['splat'][2] || '';
      if( room !== self.room() ) {
        self.room(room);
      }
      self.post(post);
      if( post ) {
        try { $(window).scrollTo($('#msg-' + self.post()), 100); } catch(e) {}
      }
      self.page(location.hash);
    });

    this.get("", function() {
      self.page('b');
    });

  }).run();
}

$(document).ready(function() {
  app.model = new app.Model();
  ko.applyBindings(app.model);
});
