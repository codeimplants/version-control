-- Path on each app's own backend that lists its users (id + phone + registration
-- date). Lets the console resolve pseudonymous engagement ids to real contacts
-- for subscription outreach, without centralizing PII.
-- e.g. sonebill: '/api/dukandar/stats'

ALTER TABLE "App" ADD COLUMN "backendUsersPath" TEXT;
