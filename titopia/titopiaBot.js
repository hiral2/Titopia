var { 
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler,
    setLangHandler,
    startHandler,
    stopHandler
} = require('./handlers');

var EventEmitter = require('events');

const events = {
    SEND_MESSAGE:"sendMessage",
    RESTRICT_USERS: "restrictUsers"
}

class TitopiaBot {
    constructor(repository, i18n){
        this.i18n = i18n;
        this.repository = repository;
        this.handlers = [];
        this.emitter = new EventEmitter();
        this.config = {
            statusRegex: /\/status/,
            cancelRegex: /\/cancel/,
            startRegex: /\/start/,
            stopRegex: /\/stop/,
            langRegex: /^\/lang/
        }

        this.init();
    }

    onSendMessage(eventHandler) {
        this.emitter.on(events.SEND_MESSAGE, eventHandler);
    }

    onRestrictUsers(eventHandler) {
        this.emitter.on(events.RESTRICT_USERS, eventHandler);
    }

    init(){
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().takeOutRegex.test(text), takeOutHandler);
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().votePatterns.some(p=> text.indexOf(p)>=0), buildVoteHandler(true));
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().unvotePatterns.some(p=> text.indexOf(p)>=0), buildVoteHandler(false));
        this.addCommand((text, chat) => chat.isEnabled() && this.config.statusRegex.test(text), statusHandler);
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().cancelRegex.test(text), cancelHandler);
        this.addCommand((text)       => this.config.startRegex.test(text), startHandler);
        this.addCommand((text, chat) => chat.isEnabled() && this.config.stopRegex.test(text), stopHandler);
        this.addCommand((text, chat) => chat.isEnabled() && this.config.langRegex.test(text), setLangHandler);
    }

    sendSimpleMessageToChat(chatId, message) {
        this.emitter.emit(events.SEND_MESSAGE, chatId, message);
    }

    restrictUsers(chatId, users, untilTime) {
        this.emitter.emit(events.RESTRICT_USERS, chatId, users, untilTime);
    }

    addCommand(match, handle){
        this.handlers.push({
            match: match,
            handle: handle
        });
    }

    async handle(body) {
        const {message} = body;

        if(!message){
            return;
        }

        const { chat, text, from } = message;

        if (!text || !chat || !from){
            return;
        }

        const chatRecord = await this.repository.findChat(chat.id);

        console.log('locale', chatRecord.getConfig().lang);
        this.i18n.setLocale(chatRecord.getConfig().lang);
        const handler = this.handlers.find(t=>t.match(text, chatRecord));

        let response;
        if(handler){
            const result = await handler.handle({
                body, 
                text, 
                chatRecord, 
                from, 
                i18n: this.i18n
            });

            if(result){
                if (result.takeOut) {
                    this.restrictUsers(chat.id, result.users, result.untilTime);
                }
                response = result.message;
            }
        }

        if (response){
            this.sendSimpleMessageToChat(chat.id, response);
        }
    }
}


module.exports = {
    TitopiaBot
}