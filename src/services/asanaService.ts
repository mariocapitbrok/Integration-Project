import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dotenv = require('dotenv');

dotenv.config();

function generateAuthorizationURL() {
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
}

async function handleOAuthCallback(code) {
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
}

export { generateAuthorizationURL, handleOAuthCallback };
