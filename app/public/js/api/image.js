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
        upload: function(token, image, cb) {
          var data = new FormData();
          dara.append('token', token);
          data.append('image', image);
          $.ajax({
            url: app.urls.image.upload,
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
        download: function(token, url, cb) {
          var data = new FormData();
          dara.append('token', token);
          data.append('url', url);
          $.ajax({
            url: app.urls.image.download,
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
