-- ARGS
local rate_limit_store = KEYS[1];
local rate_limit_time = tonumber(ARGV[1])
local rate_limit_count = tonumber(ARGV[2])
local now = tonumber(ARGV[3]);

-- Other
local times = redis.call('llen', rate_limit_store);

redis.call('expire', rate_limit_store, rate_limit_time);

-- Check and update user token rate limit
if times < rate_limit_count then
  redis.call('lpush', rate_limit_store, now)
else
  local time = tonumber(redis.call('lindex', rate_limit_store, -1))
  if now - time <= rate_limit_time * 1000 then
    redis.call('lset', rate_limit_store, -1, now)
    return 1
  else
    redis.call('lpush', rate_limit_store, now)
    redis.call('rpop', rate_limit_store)
  end
end

return 0
