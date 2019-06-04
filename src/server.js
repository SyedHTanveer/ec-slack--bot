import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import morgan from 'morgan';
import dotenv from 'dotenv';
import botkit from 'botkit';
import yelp from 'yelp-fusion';

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

// prepare webhook
// for now we won't use this but feel free to look up slack webhooks
controller.setupWebserver(process.env.PORT || 3001, (err, webserver) => {
  controller.createWebhookEndpoints(webserver, slackbot, () => {
    if (err) { throw new Error(err); }
  });
});

controller.hears(['hungry'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Would you like food reccomendations near you?');
});

controller.hears(['Yes'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Great, what would you like to eat?');
});

controller.hears(['sushi'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Tell me where you are located so i can find some places near you!');
});

controller.hears(['hanover, NH'], ['direct_message', 'direct_mention', 'mention'], (bot, message) => {
  bot.reply(message, 'Ok, these are some businesses that sell Sushi near you: ');
  yelpClient.search({
    term: 'Sushi',
    location: 'hanover, nh',
  }).then((response) => {
    response.jsonBody.businesses.forEach((business) => {
      bot.reply(message, `${business.name}, ${business.display_phone}, ${business.price}`);
    });
  }).catch((e) => {
    console.log(e);
  });
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
  bot.reply(message, 'I can help you with finding places to eat if you are hungry and i can give you motivation.');
  bot.reply(message, 'If you are hungry, just type "im hungry');
  bot.reply(message, 'If you need motivation, just type "i need motivation');
});

// default index route
app.get('/', (req, res) => {
  res.send('hi');
});

// START THE SERVER
// =============================================================================
const port = process.env.PORT || 9090;
app.listen(port);

console.log(`listening on: ${port}`);
