module.exports = {
  model: {
    log_size_limit: 100,
    rooms_count_limit: 100,
  },
  predefinedRooms: {
    b: 1
  },
  rateLimit: {
         writeMessage: { time: 10, count: 5, path: 'message/write' },
    activateExtension: { time: 60, count: 3, path: 'extension/activate' },
           userCreate: { time: 60, count: 2, path: 'user/create' },
            userLogin: { time: 60, count: 5, path: 'user/login' }
  },
  paths: {
    messageImages: '/sites/anonchat.pw/upload/img/'
  }
};
