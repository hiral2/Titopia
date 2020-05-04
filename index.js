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
var bot = new TitopiaBot(repository);

const token = process.env.TELEGRAM_TOKEN;

if(token) {
    console.log("Start mode telegram.");
    const apiClient = new TelegramBotApiClient(token);
    bot.onSendMessage(async (chatId, message)=>{
        try {
            const result = await apiClient.sendMessage(chatId, message);
            console.log(result);
        } catch (e) {
            console.error(e);
        }
    });

    bot.onRestrictUsers(async (chatId, users, untilTime)=>{
        const tasks = users.map(user => apiClient.restrictChatMember(chatId, user.id, untilTime));
        try {
            const results = await Promise.all(tasks);
            console.log(results);
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



app.use(i18n.init);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));

app.post('/new-message', async function(req,res) {
    const handled = await bot.handle(req, res);
    if(!handled){
        res.end();
    }
});

var PORT = process.env.PORT || 5000;

app.listen(PORT, function(){
    console.log(`Titopia bot listening on port ${PORT}!`);
});