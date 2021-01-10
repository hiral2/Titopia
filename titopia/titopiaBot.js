var { 
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler,
    setLangHandler,
    startHandler,
    stopHandler,
    setUserHandler
} = require('./handlers');

var EventEmitter = require('events');

const events = {
    SEND_MESSAGE:"sendMessage",
    RESTRICT_USERS: "restrictUsers"
}

const commandKeys = {
    TAKE_OUT: "TAKE_OUT",
    VOTE_FOR: "VOTE_FOR",
    VOTE_AGAINST: "VOTE_AGAINST",
    STATUS: "STATUS",
    CANCEL: "CANCEL",
    START: "START",
    STOP: "STOP",
    SET_LANG: "SET_LANG",
    SET_USER: "SET_USER"
}

const defaultCommands = [
    { 
        match: ({text, chatRecord}) => chatRecord.getConfig().takeOutRegex.test(text),
        key: commandKeys.TAKE_OUT,
        handler: takeOutHandler,
    },
    { 
        match: ({text, chatRecord}) => chatRecord.isEnabled() && chatRecord.getConfig().votePatterns.some(p=> text.indexOf(p)>=0),
        key: commandKeys.VOTE_FOR,
        handler: buildVoteHandler(true),
    },
    { 
        match: ({text, chatRecord}) => chatRecord.isEnabled() && chatRecord.getConfig().unvotePatterns.some(p=> text.indexOf(p)>=0),
        key: commandKeys.VOTE_AGAINST,
        handler: buildVoteHandler(false),
    },
    { 
        match: ({text, chatRecord, config}) => chatRecord.isEnabled() && config.statusRegex.test(text),
        key: commandKeys.STATUS,
        handler: statusHandler
    },
    { 
        match: ({text, chatRecord}) => chatRecord.isEnabled() && chatRecord.getConfig().cancelRegex.test(text),
        key: commandKeys.CANCEL,
        handler: cancelHandler
    },
    { 
        match: ({text, config}) => config.startRegex.test(text),
        key: commandKeys.START,
        handler: startHandler
    },
    { 
        match: ({text, chatRecord, config}) => chatRecord.isEnabled() && config.stopRegex.test(text),
        key: commandKeys.STOP,
        handler: stopHandler    
    },
    { 
        match: ({text, chatRecord, config}) => chatRecord.isEnabled() && config.langRegex.test(text),
        key: commandKeys.SET_LANG,
        handler: setLangHandler(this.messageService)
    },
    { 
        match: () => true,
        key: commandKeys.SET_USER,
        handler: setUserHandler
    }
]

const defaultConfig = {
    statusRegex: /\/status/,
    cancelRegex: /\/cancel/,
    startRegex: /\/start/,
    stopRegex: /\/stop/,
    langRegex: /^\/lang/
}

class TitopiaBot {
    constructor(repository, messageService, commands = defaultCommands){
        this.emitter = new EventEmitter();
        this.messageService = messageService;
        this.repository = repository;
        this.config = {...defaultConfig}
        this.commands = commands;
    }

    onSendMessage(eventHandler) {
        this.emitter.on(events.SEND_MESSAGE, eventHandler);
    }

    onRestrictUsers(eventHandler) {
        this.emitter.on(events.RESTRICT_USERS, eventHandler);
    }

    sendMessage(chatId, message) {
        this.emitter.emit(events.SEND_MESSAGE, chatId, message);
    }

    restrictUsers(chatId, users, untilTime) {
        this.emitter.emit(events.RESTRICT_USERS, chatId, users, untilTime);
    }

    async handle(body) {
        if (!this.isValidBody(body)){
            return;
        }

        const { message } = (body || {});
        const { chat, text } = (message || {});
        
        const chatRecord = await this.repository.findChat(chat.id);
        const cmds = this.findCommands({text, chatRecord});

        let responses = cmds.map(cmd=> this.executeCommand(cmd, chatRecord, message))
                            .filter(message);
        
        for (const resp of responses) {
            this.sendMessage(chat.id, resp);
        }
    }

    findCommands(context){
        const fullContext = {...context, config: this.config };
        return this.commands.filter(ck => ck.match(fullContext) );
    }

    async executeCommand(
        command,  
        chatRecord, 
        message
    ){
        const { chat, text, from } = message;

        const result = await command({
            chatRecord, 
            body, 
            text, 
            from
        });

        if (result) {
            if (result.takeOut) {
                this.restrictUsers(chat.id, result.users, result.untilTime);
            }

            if(result.code){
                const lang = chatRecord.getConfig().lang;
                const message = this.messageService.getMessage(lang, result.code, result.metadata); 
                return message;
            }
        }
    }

    isValidBody(body)  {
        return body && body.message && this.isValidMessage(body.message) ? true : false;
    }

    isValidMessage(message)  {
        const { chat, text, from } = message;
        return text && chat && from ? true : false;
    }
}

module.exports = {
    TitopiaBot,
    commandKeys
}