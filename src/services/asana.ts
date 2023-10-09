import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dotenv = require('dotenv');

dotenv.config();

export const generateAuthorizationURL = () => {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_URI;

  const responseType = 'code';
  const state = 'thisIsARandomString';
  const scope = 'default';

  const authorizationUrl = `https://app.asana.com/-/oauth_authorize
    ?client_id=${clientId}
    &redirect_uri=${redirectUri}
    &response_type=${responseType}
    &state=${state}
    &scope=${scope}`;

  return authorizationUrl;
};

export const handleOAuthCallback = async (code) => {
  const clientId = process.env.CLIENT_ID;
  const clientSecret = process.env.CLIENT_SECRET;
  const redirectUri = process.env.REDIRECT_URI;

  const tokenUrl = 'https://app.asana.com/-/oauth_token';
  const data = {
    grant_type: 'refresh_token',
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uri: redirectUri,
    code,
  };

  try {
    const response = await axios.post(tokenUrl, data);
    const accessToken = response.data.access_token;

    // TODO.
    // Store the accessToken in the database for the user
    // You should associate it with the user who initiated the OAuth flow
  } catch (error) {
    console.error('Error handling OAuth callback:', error);
  }
};

export const fetchAndSaveTasks = async (accessToken) => {
  //TODO.
  // Make a request to Asana API to fetch tasks
  // Iterate through the tasks and save them to database using Prisma.
};

export const fetchAndSaveStories = async (accessToken) => {
  // TODO.
  // Make a request to the Asana API to fetch user-generated stories
  // Iterate through the stories and save them to your database using Prisma
  // Don't forget to associate the story with the task and author
};

export const handleWebhooks = (payload) => {
  // TODO
  // Handle incoming webhook payloads
  // Validate the data and save it to your database accordingly
};
