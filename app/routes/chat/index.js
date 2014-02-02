var _ = require('underscore');

module.exports = function(app, cfg, m, l) {

  require('./image')(app, cfg, m, l);
  require('./token')(app, cfg, m, l);
  require('./user')(app, cfg, m, l);
  require('./room')(app, cfg, m, l);
  require('./message')(app, cfg, m, l);
};
