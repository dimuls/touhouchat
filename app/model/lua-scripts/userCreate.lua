local uid = ARGV[1]
local userKey = '@' .. uid

if redis.call('exists', userKey) == 1 then
  return redis.error_reply('Dublicated uid '..uid..' generated')
end

redis.call('hset', userKey, 'login', 0);
