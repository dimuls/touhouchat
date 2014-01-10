module.exports = { 

  user: {
    init: function(cause, type, req) {
      return {
        msg: 'Не удалось инициализировать пользователя: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'user init'
      };
    },

    register: function(cause, type, req) {
      return {
        msg: 'Не удалось зарегистрироваться: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'user register'
      };
    },
    login: function(cause, type, req) {
      return {
        msg: 'Не удалось залогинеться: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'user login'
      };
    }

  },

  token: {
    create: function(cause, type, req) {
      return {
        msg: 'Не удалось сгенерировать токен: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'token create'
      };
    }
  },

  messages: {
    create: function(cause, type, req) {
      return {
        msg: 'Не получить сообщения: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'messages get'
      };
    }
  },

  message: {
    write: function(cause, type, req) {
      return {
        msg: 'Не удалось написать сообщение: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'message write'
      };
    },
    get: function(cause, type, req) {
      return {
        msg: 'Не удалось получить сообщение: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'message get'
      };
    }
  },

  room: {
    join: function(cause, type, req) {
      return {
        msg: 'Не удалось войти в комнату: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'room join'
      };
    },
    leave: function(cause, type, req) {
      return {
        msg: 'Не удалось покинуть комнату: '+( cause || 'ошибка БД' )+'.',
        type: type || 'db',
        req: req || 'room leave'
      };
    }
  }
};
