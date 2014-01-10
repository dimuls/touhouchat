local uid = ARGV[1]
local userKey = '@' .. uid

if redis.call('exists', userKey) == 0 then
  return redis.error_reply('Uid '..uid..' doesn\'t exists')
end

redis.call('hset', userKey, 'login', 0)
