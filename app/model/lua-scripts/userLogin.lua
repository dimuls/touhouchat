local uid = ARGV[1]
local userKey = '@' .. uid

if redis.call('exists', userKey) == 0 then
  return redis.error_reply('Uid '..uid..' doesn\'t exists')
end

local loginCount = redis.call('hincrby', userKey, 'login', 1)

if loginCount > 10 then
  return redis.error_reply('Uid'..uid..' already used')
end
