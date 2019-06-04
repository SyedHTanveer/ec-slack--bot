import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import botkit from 'botkit';
import 'yelp-fusion';

const yelp = require('yelp-fusion');

dotenv.config({ silent: true });

// initialize
const app = express();

const yelpClient = yelp.client(process.env.YELP_API_KEY);


// enable/disable cross origin resource sharing if necessary
app.use(cors());

// enable/disable http request logging
app.use(morgan('dev'));

// enable only if you want templating
app.set('view engine', 'ejs');

// enable only if you want static assets from folder static
app.use(express.static('static'));

// this just allows us to render ejs from the ../app/views directory
app.set('views', path.join(__dirname, '../src/views'));

// enable json message body for posting data to API
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);

// botkit controller
const controller = botkit.slackbot({
  debug: false,
});

// initialize slackbot
const slackbot = controller.spawn({
  token: process.env.SLACK_BOT_TOKEN,
  // this grabs the slack token we exported earlier
}).startRTM((err) => {
  // start the real time message client
  if (err) { throw new Error(err); }
});


// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

// example hello response
controller.hears(['hello', 'hi', 'howdy'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (err, res) => {
    if (res) {
      bot.reply(message, `Hello, ${res.user.name}!`);
    } else {
      bot.reply(message, 'Hello there!');
    }
  });
});

controller.hears(['I\'m hungry', 'hungry', 'food'], ['direct_message', 'direct_mention', 'mention'], (b, m) => {
  b.reply(m, 'Where are you located? this is the area i will search for food');
  controller.hears('[a-z]*', ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
    yelpClient.search({
      term: 'food',
      location: `${message.text}`,
    }).then((response) => {
      console.log(response);
      bot.reply(message, `Have you considered ${response.jsonBody.businesses[0].name}?`);
    }).catch((e) => {
      bot.reply(message, 'Sorry I ran into a problem, try again!');
      console.log(e);
    });
  });
});

controller.on('outgoing_webhook', (bot, message) => {
  bot.replyPublic(message, 'yeah yeah');
});

controller.hears(['motivation'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  const min = 0;
  const max = 5;
  const random = Math.floor(Math.random() * (+max - +min)) + +min;
  if (random === 0) {
    bot.reply(message, 'Your limitation—it\'s only your imagination.');
  } else if (random > 3) {
    bot.reply(message, 'The harder you work for something, the greater you\'ll feel when you achieve it.');
  } else {
    bot.reply(message, 'Push yourself, because no one else is going to do it for you.');
  }
});

controller.hears(['help'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'If you are hungry, just type "im hungry"');
  bot.reply(message, 'If you need motivation, just type "i need motivation"');
});
