-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_subtype" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_gid_key" ON "Task"("gid");
