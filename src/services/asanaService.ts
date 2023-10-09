import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dotenv = require('dotenv');

dotenv.config();

function generateAuthorizationURL() {
  const clientId = process.env.CLIENT_ID;
  const redirectUri = process.env.REDIRECT_ID;

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
