-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "GAuthCredentials" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "googleId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "expiryDate" BIGINT NOT NULL,
    "webhookChannelId" TEXT,
    "webhookChannelExpiration" DATETIME,
    "webhookResourceId" TEXT,
    "changesPageToken" TEXT,
    "handle" TEXT,
    "dbCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GAuthCredentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "File" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "platform" TEXT,
    "dbCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME,
    "updatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "GoogleDriveFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileId" INTEGER NOT NULL,
    "googleId" TEXT,
    "name" TEXT,
    "mimeType" TEXT,
    "createdAt" DATETIME,
    "updatedAt" DATETIME,
    "dbCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GoogleDriveFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fileId" INTEGER NOT NULL,
    "authorId" INTEGER NOT NULL,
    "platform" TEXT,
    "platformId" TEXT,
    "platformDiscussionId" TEXT,
    "content" TEXT NOT NULL,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" DATETIME,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "doneAt" DATETIME,
    "createdAt" DATETIME,
    "updatedAt" DATETIME,
    "dbCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "CommentAuthor" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CommentAuthor" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER,
    "platformId" TEXT,
    "platformName" TEXT,
    "platformEmail" TEXT,
    "dbCreatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dbUpdatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CommentAuthor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_FileToUser" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_FileToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "File" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_FileToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "GAuthCredentials_userId_key" ON "GAuthCredentials"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "GoogleDriveFile_fileId_key" ON "GoogleDriveFile"("fileId");

-- CreateIndex
CREATE INDEX "GoogleDriveFile_googleId_idx" ON "GoogleDriveFile"("googleId");

-- CreateIndex
CREATE INDEX "Comment_platformId_idx" ON "Comment"("platformId");

-- CreateIndex
CREATE INDEX "Comment_platformDiscussionId_idx" ON "Comment"("platformDiscussionId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "CommentAuthor_userId_idx" ON "CommentAuthor"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "_FileToUser_AB_unique" ON "_FileToUser"("A", "B");

-- CreateIndex
CREATE INDEX "_FileToUser_B_index" ON "_FileToUser"("B");
