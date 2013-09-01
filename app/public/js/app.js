$(document).ready(function() {

var app;

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   External modules initialization
*/

$.cookie.defaults.expires = 30;
$.cookie.json = true;
var s = $.cookie('session');
if( !s ) {
  s = {
    predefinedRooms: ['b'],
    showHelp: true,
    extCode: '',
    uid: ''
  };
  $.cookie('session', s);
}

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   App initialization
*/

// App scope
app = {
  conf: {
    logSize: 100,
    chatWsUrl: 'http://anonchat.pw/chat',
    imageSizeLimit: 3 * 1024 * 1024,
    requestRetryCount: 30
  }
};

var windowURL = window.URL || window.webkitURL;

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
  if( msg.image === undefined ) { msg.image = null }
  ko.mapping.fromJS(msg, {}, this);
  var self = this;
  self.link = ko.computed(function() {
    return '/' + self.id();
  }, self);
  self.linkLong = ko.computed(function() {
    return '#' + app.model.room() + '/' + self.id();
  }, self);
  self.active = ko.computed(function() {
    return app.model.post() == self.id();
  }, self);
  self.imageThumbSrc = ko.computed(function() {
    var image = self.image();
    return image === null ? '' : '/img/msg/' + image.replace(/(\.\w+)$/, '_thumb$1');
  });
  self.imageSrc = ko.computed(function() {
    var image = self.image();
    return image === null ? '' : '/img/msg/' + image;
  });
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   Custom bindings
*/

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

ko.bindingHandlers.file = {
  init: function(element, valueAccessor) {
    $(element).change(function() {
      var file = this.files[0];
      if (ko.isObservable(valueAccessor())) {
        valueAccessor()(file);
      }
    });
  },

  update: function(element, valueAccessor, allBindingsAccessor) {
    var file = ko.utils.unwrapObservable(valueAccessor());
    var bindings = allBindingsAccessor();

    if (bindings.fileObjectURL && ko.isObservable(bindings.fileObjectURL) && windowURL ) {
      var oldUrl = bindings.fileObjectURL();
      if (oldUrl) {
        windowURL.revokeObjectURL(oldUrl);
      }
      bindings.fileObjectURL(file && windowURL.createObjectURL(file));
    }

    if (bindings.fileBinaryData && ko.isObservable(bindings.fileBinaryData)) {
      if (!file) {
        bindings.fileBinaryData(null);
      } else {
        var reader = new FileReader();
        reader.onload = function(e) {
          bindings.fileBinaryData(e.target.result);
        };
        reader.readAsArrayBuffer(file);
      }
    }
  }
};

/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*  Knockout some hacks: allow virtual element html binding
*/

(function() {
  var overridden = ko.bindingHandlers['html'].update;
  
  ko.bindingHandlers['html'].update = function (element, valueAccessor) {
    if (element.nodeType === 8) {
      var html = ko.utils.unwrapObservable(valueAccessor());

      ko.virtualElements.emptyNode(element);
      if ((html !== null) && (html !== undefined)) {
        if (typeof html !== 'string') {
          html = html.toString();
        }

        var parsedNodes = ko.utils.parseHtmlFragment(html);
        if (parsedNodes) {
           var endCommentNode = element.nextSibling;
           for (var i = 0, j = parsedNodes.length; i < j; i++)
            endCommentNode.parentNode.insertBefore(parsedNodes[i], endCommentNode);
        }
      }
    } else { // plain node
      overridden(element, valueAccessor);
    }
  };
})();

ko.virtualElements.allowedBindings['html'] = true;

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
  self.predefinedRooms = ko.observable(s.predefinedRooms);
  self.predefinedRoomsChanged = ko.computed(self.predefinedRooms).extend({ throttle: 100 });
  self.predefinedRoomsChanged.subscribe(function(newPredefinedRooms) {
    s.predefinedRooms = newPredefinedRooms;
    $.cookie('session', s);
    //self.customRoom.valueHasMutated();
    self.page.valueHasMutated();
  });
  self.extCode = ko.observable();
  self.extCodeChanged = ko.computed(self.extCode).extend({ throttle: 100 });
  self.extCodeChanged.subscribe(function(extCode) {
    if( extCode !== s.extCode ) {
      self.ws.emit('extension activate', extCode);
    }
  });
  self.msgImageEnabled = ko.observable(false);

  /* Other buttons */
  self.showSettings = ko.observable(false);
  self.toggleSettings = function() {
    self.showHelp(false);
    self.showSettings(!self.showSettings());
  };
  ko.computed(function() {
    if( self.showSettings() ) {
      $('#rooms-list').focus().caretToEnd();
    }
  }).extend({ throttle: 100 });
  self.showHelp = ko.observable(s.showHelp);
  self.showHelpChanged = self.showHelp.subscribe(function(newState) {
    s.showHelp = newState;
    $.cookie('session', s);
  });
  self.toggleHelp = function() {
    self.showSettings(false)
    self.showHelp(!self.showHelp());
  };

  /* Other event handlers */
  self.writeMsg = function() {
    var msg = { text: self.msgText() };
    var image = self.msgImageBinary();
    if( image ) {
      msg.image = base32k.encode(new Uint8Array(image));
    }
    self.ws.emit('message write', msg);
    self.clearMsg();
  };
  self.clearMsg = function() {
    self.msgText('');
    self.clearMsgImage();

    $('#msg-text').trigger('autosize.resize');
    $('#msg-text').focus();
    return false;
  };
  self.msgTextKeyPressed = function(data, e) {
    if( (e.keyCode == 13 || e.keyCode == 10) && (e.ctrlKey || e.metaKey) ) {
      self.writeMsg();
      return false;
    }
    return true;
  };
  self.inputRoomKeyPressed = function(date, e) {
    if( e.keyCode == 13 || e.keyCode == 10 ) {
      $('#msg-text').focus();
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
    $('#msg-text').trigger('autosize.resize').focus().caretToEnd();
  };
  self.answerMsgQuoted = function(msg) {
    var text = msg.text();
    var quotedText = $(text).text().replace(/(\r?\n)\1+/gm, '$1').replace(/^/gm, '>');
    var oldText = self.msgText();
    if( oldText && oldText.length && !oldText.match(/\n$/) ) {
      oldText += '\n'
    }
    self.msgText(oldText + '>' + msg.link() + '\n' + quotedText + '\n');
    $('#msg-text').trigger('autosize.resize').focus().caretToEnd();
  };
  self.quoteMsg = function(msg) {
    var text = msg.text();
    var quotedText = $(text).text().replace(/(\r?\n)\1+/gm, '$1').replace(/^/gm, '>');
    var oldText = self.msgText();
    if( oldText && oldText.length && !oldText.match(/\n$/) ) {
      oldText += '\n'
    }
    self.msgText(oldText + quotedText + '\n');
    $('#msg-text').trigger('autosize.resize').focus().caretToEnd();
  };


  /* Init controls */
  $('#msg-text').autosize();

  /* Init image button */
  self.msgImageObjectURL = ko.observable();
  self.msgImageBinary = ko.observable();
  self.msgImageFile = ko.observable();
  self.msgImageFile.subscribe(function(image) {
    if( !image || !image.size ) {
    } else if( image.size > app.conf.imageSizeLimit ) {
      alert('Максимальный размер картинки - 3 Мб.');
      self.clearMsgImage();
      self.addOrRemoveMsgImage();
    } else if( !image.type.match('^image/(jpeg|png|gif)$') ) {
      alert('Поддерживаемы ТОЛЬКО следующие форматы картинок: JPEG, PNG, GIF.');
      self.clearMsgImage();
      self.addOrRemoveMsgImage();
    }
  });
  self.clearMsgImage = function() {
    self.msgImageFile(null);
    self.msgImageObjectURL(null);
    self.msgImageBinary(null);
  }
  self.addOrRemoveMsgImageText = ko.computed(function() {
    return self.msgImageFile() ? 'удалить картинку' : 'добавить картинку';
  });
  self.addOrRemoveMsgImage = function(e) {
    if( self.msgImageFile() ) {
      self.clearMsgImage();
    } else {
      $('#msg-image-input').trigger('click');
    }
    return false;
  }

  /* Scrolling magic */
  self.scrollOnBottom = true;
  $(window).scroll($.debounce(250, false, function () {
    self.scrollOnBottom = $(window).scrollTop() > $(document).height() - $(window).height() - 10;
  }));
  self.scrollToBottom = function() {
    $(document).scrollTop($(document).height() + 300);
    self.scrollOnImageLoad();
  };
  self.scrollOnImageLoad = function() {
    var msgs = self.msgs();
    if( msgs.length === 0 ) { return; }
    var lastMsgId = self.msgs().slice(-1)[0].id();
    $('#msg-'+lastMsgId+' img').load(function() {
      $(window)._scrollable();
      $(document).scrollTop($(document).height() + 300);
    })
  }

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
  self.ws = io.connect(app.conf.chatWsUrl);
  self.ws.on('set predefined rooms', self.predefinedRooms);
  self.ws.on('chat msg', function(msg) {
    if( self.msgs().length >= app.conf.logSize) {
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
    var post = self.post();
    if( post ) {
      $(window).scrollTo($('#msg-' + post), 100);
    } else {
      self.scrollToBottom();
    }
  });
  self.ws.on('set clients count', self.clientsCount);
  self.ws.on('set total clients count', self.totalClientsCount);
  self.ws.on('extension activate', function(err) {
    if( err ) {
      alert(err);
      self.extCode('');
      s.extCode = '';
      $.cookie('session', s);
      return;
    }
    self.msgImageEnabled(true);
    s.extCode = self.extCode();
    $.cookie('session', s);
  });
  self.ws.on('extension check', function(err) {
    if( err ) {
      alert(err);
      s.extCode = '';
      $.cookie('session', s);
      return;
    }
    self.msgImageEnabled(true);
    self.extCode(s.extCode);
    $.cookie('session', s);
  });
  self.ws.on('error message', function(error) { alert (error) });
  self.ws.on('set uid', function(uid) {
    if( !uid || !uid.length ) { alert('Не удалось установить соединение. Попробуйте обновить страницу. Если ошибка повторяется, обратитесь к разработчику.') }
    s.uid = uid;
    $.cookie('session', s);
    if( s.extCode ) {
      self.ws.emit('extension check', s.extCode);
    }
  });
  self.ws.on('no uid error', function(req) {
    var count = app.conf.requestRetryCount;
    setTimeout(function() {
      self.ws.emit(req.cmd, req.data);
      count--;
      if( count === 0 ) {
        alert('Не удалось установить соединение. Попробуйте обновить страницу. Если ошибка повторяется, обратитесь к разработчику.');
      }
    }, 100);
  });
  self.ws.on('connect', function() {
    if( s.uid && s.uid.length > 0 ) {
      self.ws.emit('user login', s.uid);
    } else {
      self.ws.emit('user create');
    }
  });

  /* Init pages routing */
  self.page = ko.observable();
  self.page.subscribe(function(newPage) {
    if( newPage !== location.hash ) {
      location.hash = newPage;
    }
  });

  function roomIsPredefined(room) {
    return $.inArray(room, self.predefinedRooms()) != -1;
  }

  self.room = ko.computed(function() {
    var page = self.page();
    return page ? page.replace(/^#\/(\w+).+/, '$1') : '';
  });
  self.room.subscribe(function(newRoom) {
    self.ws.emit('room leave');
    if( newRoom !== undefined ) {
      self.ws.emit('room join', newRoom);
    }
    /*
    if( roomIsPredefined(newRoom) ) {
      self.customRoom('');
    } else {
      self.customRoom(newRoom);
    }
    */
    $('#msg-text').focus();
  });

  /*
  function autoresizeCustomRoomInput() {
    $('#input-room').trigger(jQuery.Event( "input" ));
  }
  self.customRoom = ko.observable('');
  self.afterCustomRoomChanged = ko.computed(self.customRoom).extend({ throttle: 100 });
  self.afterCustomRoomChanged.subscribe(function(room) {
    autoresizeCustomRoomInput();
    if( room.length === 0 ) { return; }
    if( roomIsPredefined(room) ) {
      self.customRoom('');
    }
    self.page(room);
  });
  */
  self.post = ko.computed(function() {
    var page = self.page();
    return page ? page.replace(/^#\/\w+\/((\d+)\/)?$/, '$2') : '';
  });
  self.post.subscribe(function(newPost) {
    if( newPost ) {
      $('#msg-' + newPost).first(function() {
        $(window).scrollTo(this, 100);
      });
    }
  });

  self.clearPost = function() {
    self.page(location.hash.replace(/(\/)\d+\/$/, '$1'));
  }

  /* Init router */
  Sammy(function() {

    this.get(/^\/#\/\w*[A-Za-z]\w*\/(\d+\/)?$/, function() {
      self.page(location.hash);
    });

    this.get(/^\/$/, function() {
      self.page('#/b/');
    });

  }).run();
}

$(document).ready(function() {
  app.model = new app.Model();
  ko.applyBindings(app.model);
});

});
