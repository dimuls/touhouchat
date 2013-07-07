/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   App initialization
*/

// App scope
var app = {};


/* * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
*   App Model
*/

app.Model = function() {
  var self = this;

  /* Init data */
  self.room = ko.observable('');
  self.clientsCount = ko.observable('');
  self.msgText = ko.observable('');
  self.msgs = ko.observableArray();
  self.predefinedRooms = ko.observableArray(['b', 'rm', 'to']);

  /* Websocket configuration */
  self.ws = io.connect('http://touhouchat.tomago.ru/chat');
  self.ws.on('set predefined rooms', self.predefinedRooms);
  self.ws.on('chat msg', function(msg) {
    if( self.msgs().length >= 100) {
      self.msgs.shift();
    }
    self.msgs.push(msg);
    if( self.scrollOnBottom ) {
      self.scrollToBottom();
    }
    if( !msg.author ) {
      self.playMessageSound();
      $.titleAlert('Новое сообщение', { requireBlur: true  });//stopOnMouseMove: true });
    }
  });
  self.ws.on('set msgs', function(msgs) {
    self.msgs(msgs);
    self.scrollToBottom();
  });
  self.ws.on('set clients count', self.clientsCount);
  self.ws.on('error msg', function(error) { alert (error) });

  self.changeRoom = function(room) {
    if( self.room() === room ) {
      return;
    }
    self.ws.emit('leave room', self.room());
    self.ws.emit('join room', room);
    self.room(room);
  }

  /* Event handlers */
  self.writeMsg = function() {
    self.ws.emit('write msg', self.msgText());
    self.msgText('');
  };
  self.msgTextKeyPressed = function(data, e) {
    if( e.keyCode == 13 && e.ctrlKey ) {
      self.writeMsg();
    }
    return true;
  };

  /* Scrolling magic */
  self.scrollOnBottom = true;
  $(window).scroll($.debounce(250, false, function () {
    scrollOnBottom = $(window).scrollTop() == $(document).height() - $(window).height();
  }));
  self.scrollToBottom = function() {
    $(document).scrollTop($(document).height());
  };

  /* Init sound system */
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
        messageSound.play();
      };
    }
  });

  /* Init pages routing */
  self.page = ko.observable();
  
  self.changePage = function(page) {
    self.page(page);
    location.hash = page;
  };
 
  /* Init router */
  Sammy(function() {
    this.get("#:room", function() {
      self.changeRoom(this.params['room']);
    });
  }).run();
  
  self.changePage('b');
}

$(document).ready(function() {
  app.model = new app.Model();
  ko.applyBindings(app.model);
});
