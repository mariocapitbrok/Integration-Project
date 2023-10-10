require('dotenv').config();
import express from 'express';
import { GoogleService } from 'services';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { v4 as uuidv4 } from 'uuid';
import { AsanaService } from 'services';
import { handleOAuthCallback } from 'services/asana';

const app = express();
const port = 8080;

app.use(cors());

app.use(cookieParser(process.env.COOKIE_SECRET));

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/google/auth', (req, res) => {
  res.send(GoogleService.getAccessTokenUrl());
});

app.get('/google/callback', async (req, res) => {
  const code = req.query.code;
  await GoogleService.authorize(code as string);
});

app.get('/asana/auth', (req, res) => {
  let generatedState = uuidv4();

  res.cookie('state', generatedState, {
    maxAge: 1000 * 60 * 5,
    signed: true,
  });

  res.redirect(AsanaService.generateAuthorizationURL(generatedState));
});

app.get('/asana/callback', async (req, res) => {
  if (req.query.state !== req.signedCookies.state) {
    res.status(422).send(`The "state" parameter does not match.`);
    return;
  }

  console.log(`
  --- 
  Code to be exchanged for a token and 
  state from the user authorization response:
  \n`);

  console.log(`code: ${req.query.code}`);
  console.log(`state: ${req.query.state}\n`);

  const response = await handleOAuthCallback(req.query.code);

  res.redirect(`/?access_token=${response.data.access_token}`);
});

app.listen(port, () => {
  console.log(`Listening on port ${port}...`);
});
