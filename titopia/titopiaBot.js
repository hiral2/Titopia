var { 
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler
} = require('./handlers');

var EventEmitter = require('events');

const events = {
    SEND_MESSAGE:"sendMessage",
    RESTRICT_USERS: "RESTRICT_USERS"
}

class TitopiaBot {
    constructor(repository){
        this.repository = repository;
        this.handlers = [];
        this.emitter = new EventEmitter();
        this.config = {
            statusRegex: /\/status/
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
        this.addCommand((text, chat) => chat.getConfig().takeOutRegex.test(text), takeOutHandler);
        this.addCommand((text, chat) => chat.getConfig().voteRegex.test(text), buildVoteHandler(true));
        this.addCommand((text, chat) => chat.getConfig().unvoteRegex.test(text), buildVoteHandler(false));
        this.addCommand((text) => this.config.statusRegex.test(text), statusHandler);
        this.addCommand((text, chat) => chat.getConfig().cancelRegex.test(text), cancelHandler);
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

    async handle(req, res) {
        const {message} = req.body;

        if(!message){
            return false;
        }

        const { chat, text, from } = message;

        if (!text){
            return false;
        }

        if (!chat){
            return false;
        }

        if (!from){
            return false;
        }

        const chatRecord = await this.repository.findChat(chat.id);
        const handler = this.handlers.find(t=>t.match(text, chatRecord));
        const messages = [];

        if(handler){
            const body = req.body;    
            const result = await handler.handle({body, chatRecord, from, __: req.__});
            if (result.takeOut) {
                this.restrictUsers(chat.id, result.users, result.untilTime);
            }
            
            if(result.message){
                messages.push(result);
            }
        }

        if(messages.length){
            const msj = messages.map(m => m.message).join(',');
            this.sendSimpleMessageToChat(chat.id, msj);
        }
        res.end();

        return true;
    }
}


module.exports = {
    TitopiaBot
}