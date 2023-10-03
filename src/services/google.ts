import { google, drive_v3 } from "googleapis";

import prisma from "loaders/prisma";
import { User, File } from "@prisma/client";

const BASE_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

const SCOPES = [
  "https://www.googleapis.com/auth/drive",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/userinfo.email",
];

const oAuthClient = () => {
  return new google.auth.OAuth2({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI,
    forceRefreshOnFailure: true,
  });
};

export const oAuthClientWithCredentials = (credentials: {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiryDate: number;
}) => {
  const oAuth2Client = oAuthClient();
  oAuth2Client.setCredentials(credentials);
  return oAuth2Client;
};

export const getAccessTokenUrl = () => {
  const oAuth2Client = oAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: BASE_SCOPES,
    include_granted_scopes: true,
  });
  return authUrl;
};

export const getAdditionalScopesUrl = () => {
  const oAuth2Client = oAuthClient();
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    state: "FULL",
    include_granted_scopes: true,
  });
  return authUrl;
};

export const authorize = (code: string, state = undefined) => {
  return new Promise((resolve, reject) => {
    const oAuth2Client = oAuthClient();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        reject(err);
      }
      if (token) {
        oAuth2Client.setCredentials(token);
      } else {
        reject("No token returned");
      }

      const oauth2 = google.oauth2({
        auth: oAuth2Client,
        version: "v2",
      });
      oauth2.userinfo.get(async (err, res) => {
        if (err) {
          return reject(err);
        } else if (res) {
          const data = res.data;
          let user = await prisma.user.findUnique({
            where: {
              email: data.email,
            },
          });
          if (!user) {
            user = await prisma.user.create({
              data: {
                email: data.email,
                name: data.name,
                gAuthCredentials: {
                  create: {
                    googleId: data.id,
                    accessToken: token.access_token,
                    refreshToken: token?.refresh_token || "",
                    scope: token.scope,
                    tokenType: token.token_type,
                    expiryDate: token.expiry_date,
                    handle: data.email,
                  },
                },
              },
            });
          } else {
            // Does the user have a GAuthCredentials?
            const gAuthCredentials = await prisma.gAuthCredentials.findUnique({
              where: {
                userId: user.id,
              },
            });
            if (!gAuthCredentials) {
              user = await prisma.user.update({
                where: {
                  id: user.id,
                },
                data: {
                  name: data.name,
                  gAuthCredentials: {
                    create: {
                      googleId: data.id,
                      accessToken: token.access_token,
                      refreshToken: token.refresh_token,
                      scope: token.scope,
                      tokenType: token.token_type,
                      expiryDate: token.expiry_date,
                    },
                  },
                },
              });
            } else {
              user = await prisma.user.update({
                where: {
                  id: user.id,
                },
                data: {
                  name: data.name,
                  gAuthCredentials: {
                    update: {
                      googleId: data.id,
                      accessToken: token.access_token,
                      refreshToken: token.refresh_token,
                      scope: token.scope,
                      tokenType: token.token_type,
                      expiryDate: token.expiry_date,
                    },
                  },
                },
              });
            }
          }
          return resolve(user);
        }
      });
    });
  });
};

export const ingestFiles = async (
  user: User,
  cursor: string,
  recentOnly: boolean = true,
): Promise<void> => {
  const gAuthCredentials = await prisma.gAuthCredentials.findUnique({
    where: {
      userId: user.id,
    },
  });

  if (!gAuthCredentials) {
    return;
  }

  const oAuth2Client = oAuthClientWithCredentials({
    access_token: gAuthCredentials.accessToken,
    refresh_token: gAuthCredentials.refreshToken,
    scope: gAuthCredentials.scope,
    token_type: gAuthCredentials.tokenType,
    expiryDate: gAuthCredentials.expiryDate as unknown as number,
  });
  const drive = google.drive({ version: "v3", auth: oAuth2Client });

  const request: drive_v3.Params$Resource$Files$List = {
    pageSize: 1000,
    fields:
      "nextPageToken, files(id, name, createdTime, modifiedTime, mimeType, ownedByMe)",
  };

  if (recentOnly) {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14); // Subtract 14 days from the current date
    const rfc3339Date = twoWeeksAgo.toISOString();
    request.q = `(mimeType="application/vnd.google-apps.document" or mimeType="application/vnd.google-apps.spreadsheet" or mimeType="application/vnd.google-apps.presentation") and modifiedTime >= "${rfc3339Date}"`;
  } else {
    request.q = `mimeType="application/vnd.google-apps.document" or mimeType="application/vnd.google-apps.spreadsheet" or mimeType="application/vnd.google-apps.presentation"`;
  }

  if (cursor) {
    request.pageToken = cursor;
  }
  drive.files.list(request, async (err, res) => {
    if (err) {
      return;
    }
    if (res.data.nextPageToken) {
        // Call the function again with the nextPageToken  
    }
    const files = res.data.files;

    const operations = [];
    const fileOnUsersOperations = [];

    for (const file of files) {
      const existingFile = await prisma.googleDriveFile.findFirst({
        where: {
          googleId: file.id,
        },
      });
      if (!existingFile) {
        const platform = file.mimeType.includes("document")
          ? 'GOOGLE_DOC'
          : file.mimeType.includes("spreadsheet")
          ? 'GOOGLE_SHEET'
          : 'GOOGLE_SLIDE';
        operations.push(
          prisma.file.create({
            data: {
              name: file.name,
              platform,
              createdAt: file.createdTime,
              updatedAt: file.modifiedTime,
              googleDriveFile: {
                create: {
                  googleId: file.id,
                  name: file.name,
                  mimeType: file.mimeType,
                  createdAt: file.createdTime,
                  updatedAt: file.modifiedTime,
                },
              },
              usersWhoHaveAccess: {
                connect: {
                    id: user.id
                }
              }
            }}),
        );
      } else {
        const existingFileDate = new Date(existingFile.updatedAt);
        const fileDate = new Date(file.modifiedTime);

        const isSameDay =
          existingFileDate.getUTCFullYear() === fileDate.getUTCFullYear() &&
          existingFileDate.getUTCMonth() === fileDate.getUTCMonth() &&
          existingFileDate.getUTCDate() === fileDate.getUTCDate();

        if (!isSameDay) {
          operations.push(
            prisma.file.update({
              where: {
                id: existingFile.fileId,
              },
              data: {
                name: file.name,
                googleDriveFile: {
                  update: {
                    name: file.name,
                    updatedAt: file.modifiedTime,
                  },
                },
              },
            }),
          );
        }
      }
    }

    await prisma.$transaction(operations);
  });
};


const commentCreateUpdate = async (
  comment: drive_v3.Schema$Comment,
  user,
  file,
  platform,
) => {
  const existingComment = await prisma.comment.findFirst({
    where: {
      platformId: comment.id,
    },
  });

  const isAuthorAUser = comment?.author?.me
    ? await prisma.user.findFirst({ where: { id: user.userId } })
    : null;

  if (existingComment) {
    if (
      existingComment.content !== comment.content ||
      existingComment.resolved !== comment.resolved
    ) {
      await prisma.comment.update({
        where: {
          id: existingComment.id,
        },
        data: {
          content: comment.content,
          createdAt: comment.createdTime,
          updatedAt: comment.modifiedTime,
          platform,
          resolved: comment.resolved,
          author: isAuthorAUser
            ? {
                create: {
                  user: {
                    connect: { id: isAuthorAUser.id },
                  },
                },
              }
            : {
                create: {
                  platformName: comment?.author?.displayName,
                },
              },
        },
      });
    }
  } else {
    if (!comment.author) {
      return null;
    }
    await prisma.comment.create({
      data: {
        file: {
          connect: {
            id: file.id,
          },
        },
        platform,
        platformId: comment.id,
        content: comment.content,
        createdAt: comment.createdTime,
        updatedAt: comment.modifiedTime,
        resolved: comment.resolved,
        author: isAuthorAUser
          ? {
              create: {
                user: {
                  connect: { id: isAuthorAUser.id },
                },
              },
            }
          : {
              create: {
                platformName: comment.author.displayName,
              },
            },
      },
    });
  }
};

export const getComments = async (
  fileId: number,
  cursor = undefined,
): Promise<void> => {
  const [googleDriveFile, file] = await prisma.$transaction([
    prisma.googleDriveFile.findFirst({
      where: {
        fileId: fileId,
      },
    }),
    prisma.file.findFirst({
      where: {
        id: fileId,
      },
      include: {
        usersWhoHaveAccess: true,
      }
    }),
  ]);

  if (file.usersWhoHaveAccess.length === 0) {
    throw new Error("No users found for file");
  }

  const user = file.usersWhoHaveAccess[0];

  const gAuthCredentials = await prisma.gAuthCredentials.findUnique({
    where: {
      userId: user.id,
    },
  });
  const oAuth2Client = oAuthClientWithCredentials({
    access_token: gAuthCredentials.accessToken,
    refresh_token: gAuthCredentials.refreshToken,
    scope: gAuthCredentials.scope,
    token_type: gAuthCredentials.tokenType,
    expiryDate: gAuthCredentials.expiryDate as unknown as number,
  });
  const drive = google.drive({ version: "v3", auth: oAuth2Client });
  const request: drive_v3.Params$Resource$Comments$List = {
    fileId: googleDriveFile.googleId,
    pageSize: 100,
    includeDeleted: true,
    fields:
      "comments(id, content, createdTime, modifiedTime, author, quotedFileContent)",
  };

  if (cursor) {
    request.pageToken = cursor;
  }

  try {
    const res = await drive.comments.list(request);
    if (res.data.nextPageToken) {
        // Call the function again with the nextPageToken   
    }
    const comments = res.data.comments;
    for (const comment of comments) {
      const replies = comment.replies;
      await commentCreateUpdate(comment, user, file, file.platform);
      if (comment.replies) {
        for (const reply of replies) {
          await commentCreateUpdate(reply, user, file, file.platform);
        }
      }
    }
  } catch (err) {
    throw err;
  }
};
