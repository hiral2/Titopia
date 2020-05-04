var express = require('express')
var app = express()
var bodyParser = require('body-parser')

var i18n = require('i18n');
var path = require('path');

var TelegramBotApiClient = require('./telegram/telegramBotApiClient')

i18n.configure({
    locales:['es', 'en'],
    directory: path.join('./', 'locales'),
})

var {TitopiaBot} = require('./titopia/titopiaBot')
var { MemoryRepository } = require('./titopia/repositories');

var repository = new MemoryRepository();
var bot = new TitopiaBot(repository, i18n);

const token = process.env.TELEGRAM_TOKEN;

if(token) {
    console.log("Start mode telegram.");
    const apiClient = new TelegramBotApiClient(token);
    bot.onSendMessage(async (chatId, message)=>{
        try {
            await apiClient.sendMessage(chatId, message);
        } catch (e) {
            console.error(e);
        }
    });

    bot.onRestrictUsers(async (chatId, users, untilTime)=>{
        const tasks = users.map(user => apiClient.restrictChatMember(chatId, user.id, untilTime));
        try {
            await Promise.all(tasks);
        } catch (e) {
            console.error(e);
        }
    });
}else{
    console.log("Start mode console.");
    bot.onSendMessage((chatId, message)=>{
        console.log('onSendMessage:', chatId, message);
    });

    bot.onRestrictUsers((chatId, users, untilTime)=>{
        console.log('onRestrictUsers:', chatId, users, untilTime);
    });
}

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

var router = express.Router();
router.post('/new-message', async function(req,res) {
    const body = req.body;
    console.log(JSON.stringify(body||{}));

    if(body){
        await bot.handle(body);
    }

    res.end();
});


const apiToken = process.env.API_TOKEN || 'test-token';

app.use('/'+apiToken, router);

var PORT = process.env.PORT || 5000;
app.listen(PORT, function(){
    console.log(`Titopia bot listening on port ${PORT}!`);
});