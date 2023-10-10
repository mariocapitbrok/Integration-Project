-- CreateTable
CREATE TABLE "Story" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gid" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL,
    "created_by_gid" TEXT NOT NULL,
    "created_by_name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "resource_subtype" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "Story_gid_key" ON "Story"("gid");
