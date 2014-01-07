local uid = ARGV[1]
local code = ARGV[2]

local user_ext_store = 'extension/code'
local user_key = 'users/' .. uid

if redis.call('hexists', user_key, user_ext_store) == 1 then
  return {0, 'Uid '..uid..' already activated extension'}
end

if redis.call('hget', 'extensions', code) ~= '' then
  return {0, 'Extension code '..code..' already activated'}
end

redis.call('hset', user_key, user_ext_store, code);
redis.call('hset', 'extensions', code, uid);

return {1}
