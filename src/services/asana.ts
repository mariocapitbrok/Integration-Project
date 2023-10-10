import axios from 'axios';
import { PrismaClient, AsanaAuthCredentials } from '@prisma/client';
import asana from 'asana';

const prisma = new PrismaClient();
const dotenv = require('dotenv');

dotenv.config();

export const generateAuthorizationURL = (generatedState) => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;

  const responseType = 'code';
  const state = generatedState;
  const scopes = 'default'; // default openid email profile

  const authorizationUrl = `https://app.asana.com/-/oauth_authorize
    ?client_id=${clientId}
    &redirect_uri=${redirectUri}
    &response_type=${responseType}
    &state=${state}
    &scope=${scopes}`;

  return authorizationUrl;
};

export const handleOAuthCallback = async (code) => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URI;

  const tokenUrl = 'https://app.asana.com/-/oauth_token';
  const payload = {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  };

  try {
    const response = await axios.post(tokenUrl, payload);

    console.log('---Response from the token exchange request:\n');
    console.log(response.data);

    const accessToken = response.data.access_token;

    const user = await prisma.user.findUnique({
      where: { email: response.data.user.email },
    });

    if (user) {
      await prisma.asanaAuthCredentials.create({
        data: {
          user: {
            connect: { id: user.id },
          },
          accessToken,
          refreshToken: response.data.refresh_token,
          expiresAt: new Date(response.data.expires_in * 1000),
        },
      });

      return response;
    } else {
      console.log('User not found for email:', response.data.user.email);
    }
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
  }
};

export const fetchAndSaveAllUserTasks = async (
  accessToken,
  assignee,
  workspace,
  offset = null,
) => {
  const client = asana.Client.create().useAccessToken(accessToken);

  try {
    const response = await client.tasks.getTasks({
      limit: 100, // Adjust the limit as needed
      assignee,
      workspace,
      offset,
    });

    const tasks = response.data;

    for (const task of tasks) {
      // Check if the task exists in the database by its GID
      const existingTask = await prisma.task.findUnique({
        where: { gid: task.gid },
      });

      if (existingTask) {
        // If the task exists, update it
        await prisma.task.update({
          where: { gid: task.gid },
          data: {
            name: task.name,
            resource_type: task.resource_type,
            resource_subtype: task.resource_subtype,
          },
        });
      } else {
        // If the task doesn't exist, create it
        await prisma.task.create({
          data: {
            gid: task.gid,
            name: task.name,
            resource_type: task.resource_type,
            resource_subtype: task.resource_subtype,
          },
        });
      }
    }

    if (response.next_page) {
      const nextPageOffset = response.next_page.offset;
      await fetchAndSaveAllUserTasks(
        accessToken,
        assignee,
        workspace,
        nextPageOffset,
      );
    }
  } catch (error) {
    console.error(error);
  }
};

export const fetchAndSaveAllTaskStories = async (
  accessToken,
  taskGID,
  offset = null,
) => {
  const client = asana.Client.create().useAccessToken(accessToken);

  try {
    const response = await client.tasks.getTaskStories(taskGID, {
      limit: 100, // Adjust the limit as needed
      offset,
    });

    const stories = response.data;

    for (const story of stories) {
      // Check if the story exists in the database by its GID
      const existingStory = await prisma.story.findUnique({
        where: { gid: story.gid },
      });

      if (existingStory) {
        // If the story exists, update it
        await prisma.story.update({
          where: { gid: story.gid },
          data: {
            created_at: new Date(story.created_at),
            created_by_gid: story.created_by.gid,
            created_by_name: story.created_by.name,
            resource_type: story.resource_type,
            text: story.text,
            type: story.type,
            resource_subtype: story.resource_subtype,
          },
        });
      } else {
        // If the story doesn't exist, create it
        await prisma.story.create({
          data: {
            gid: story.gid,
            created_at: new Date(story.created_at),
            created_by_gid: story.created_by.gid,
            created_by_name: story.created_by.name,
            resource_type: story.resource_type,
            text: story.text,
            type: story.type,
            resource_subtype: story.resource_subtype,
          },
        });
      }
    }

    if (response.next_page) {
      const nextPageOffset = response.next_page.offset;
      await fetchAndSaveAllTaskStories(taskGID, nextPageOffset);
    }
  } catch (error) {
    console.error(error);
  }
};

export const handleWebhooks = (payload) => {
  // TODO
  // Handle incoming webhook payloads
  // Validate the data and save it to your database accordingly
};
