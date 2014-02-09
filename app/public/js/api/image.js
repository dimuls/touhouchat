$(document).ready(function() {
  window.app = $.extend(true, {
    url: {
      image: {
        upload: '/image/',
        download: '/image/'
      }
    },
    api: {
      image: {
        upload: function(userId, token, image, cb) {
          var data = new FormData();
          data.append('userId', userId);
          data.append('token', token);
          data.append('image', image);
          $.ajax({
            url: app.url.image.upload,
            cache: false,
            processData: false,
            contentType: false,
            type: 'POST',
            data: data
          }).done(function(res) {
              if( res && res.ok ) {
                cb(null, res.data);
              } else if( res && res.err ) {
                cb(res.err);
              } else {
                cb({ err:{ type: 'api', msg: 'неизвестный формат ответа' } });
              }
            })
            .fail(function() {
              cb({ err:{ type: 'api', msg: 'нет доступа или ошибка доступа' } });
            });
        },
        download: function(userId, token, url, cb) {
          var data = new FormData();
          data.append('userId', userId);
          data.append('token', token);
          data.append('url', url);
          $.ajax({
            url: app.url.image.download,
            cache: false,
            processData: false,
            contentType: false,
            type: 'POST',
            data: data
          }).done(function(res) {
              if( res && res.ok ) {
                cb(null, res.data);
              } else if( res && res.err ) {
                cb(res.err);
              } else {
                cb({ err:{ type: 'api', msg: 'неизвестный формат ответа' } });
              }
            })
            .fail(function() {
              cb({ err:{ type: 'api', msg: 'нет доступа или ошибка доступа' } });
            });         
        }
      }
    }
  }, window.app);
});
