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
  self.msgText = ko.observable('');
  self.msgs = ko.observableArray();


  /* Websocket connection */
  self.connectApp = function() {
    self.ws = new WebSocket('ws://touhouchat.tomago.ru/app/' + __ROOM__);
  }
  self.connectApp();
  self.ws.onopen = function() {};
  self.ws.onclose = self.onerror = self.connectApp;
  self.ws.onmessage = function (e) {
    var msg = ko.utils.parseJson(e.data);
    switch(msg.cmd) {
      case 'chat message':
        if( self.msgs().length >= 100) {
          self.msgs.shift();
        }
        self.msgs.push(msg.data);
        if( self.scrollOnBottom ) {
          $(document).scrollTop($(document).height());
        }
        break;
      case 'set msgs':
        self.msgs(msg.data);
        break;
      case 'error':
        alert(msg.data);
      break;
    }
  };

  /* Event handlers */
  self.writeMsg = function() {
    self.ws.send(ko.utils.stringifyJson({ cmd: 'write', data: self.msgText() }));
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
}

app.model = new app.Model();

ko.applyBindings(app.model);
