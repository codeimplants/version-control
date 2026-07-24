-- Base path for deleting a user on each app's own backend, invoked as
-- DELETE {backendBaseUrl}{backendDeleteUserPath}/{externalUserId}. The app runs
-- its own deletion process there (cascade + retention of basic details).
-- e.g. sonebill: '/api/dukandar'

ALTER TABLE "App" ADD COLUMN "backendDeleteUserPath" TEXT;
