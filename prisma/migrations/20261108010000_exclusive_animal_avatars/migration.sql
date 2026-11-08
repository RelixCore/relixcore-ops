-- Legacy photos may be shared. Collection characters are exclusive, including
-- simultaneous requests from different sessions. NULL/initials remain unlimited.
CREATE UNIQUE INDEX "User_collection_avatar_key" ON "User" ("avatarUrl")
WHERE "avatarUrl" LIKE '/images/avatars/%';
