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

const commands = {
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

class TitopiaBot {
    constructor(repository, messageService){
        this.messageService = messageService;
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

        this.commandKeys = [];

        this.init();
    }

    onSendMessage(eventHandler) {
        this.emitter.on(events.SEND_MESSAGE, eventHandler);
    }

    onRestrictUsers(eventHandler) {
        this.emitter.on(events.RESTRICT_USERS, eventHandler);
    }

    init(){
        this.commands = {
            [commands.TAKE_OUT]: takeOutHandler,
            [commands.VOTE_FOR]: buildVoteHandler(true),
            [commands.VOTE_AGAINST]: buildVoteHandler(false),
            [commands.STATUS]: statusHandler,
            [commands.CANCEL]: cancelHandler,
            [commands.START]: startHandler,
            [commands.STOP]: stopHandler,
            [commands.SET_LANG]: setLangHandler(this.messageService),
            [commands.SET_USER]: setUserHandler
        };

        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().takeOutRegex.test(text), commands.TAKE_OUT);
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().votePatterns.some(p=> text.indexOf(p)>=0), commands.VOTE_FOR);
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().unvotePatterns.some(p=> text.indexOf(p)>=0), commands.VOTE_AGAINST);
        this.addCommand((text, chat) => chat.isEnabled() && this.config.statusRegex.test(text), commands.STATUS);
        this.addCommand((text, chat) => chat.isEnabled() && chat.getConfig().cancelRegex.test(text), commands.CANCEL);
        this.addCommand((text)       => this.config.startRegex.test(text), commands.START);
        this.addCommand((text, chat) => chat.isEnabled() && this.config.stopRegex.test(text), commands.STOP);
        this.addCommand((text, chat) => chat.isEnabled() && this.config.langRegex.test(text), commands.SET_LANG);
        this.addCommand(() => true, commands.SET_USER);
    }

    sendSimpleMessageToChat(chatId, message) {
        this.emitter.emit(events.SEND_MESSAGE, chatId, message);
    }

    restrictUsers(chatId, users, untilTime) {
        this.emitter.emit(events.RESTRICT_USERS, chatId, users, untilTime);
    }

    addCommand(match, commandKey){
        this.commandKeys.push({
            match: match,
            commandKey: commandKey
        });
    }

    findCommandKey(text, chatRecord){
        return this.commandKeys.filter(ck => ck.match(text, chatRecord));
    }

    async handle(body) {

        if(!body){
            throw new Error("The body can't be empty");
        }

        const {message} = body;

        if(!message){
            return;
        }

        const { chat, text, from } = message;

        if (!text || !chat || !from){
            return;
        }

        const chatRecord = await this.repository.findChat(chat.id);
        const cmds = this.findCommandKey(text, chatRecord);

        let responses = [];
        
        for(let cmd of cmds){
            const command = this.commands[cmd.commandKey];
    
            if(!command){
                console.log(`Command: ${cmd.commandKey} not found.`);
                return;
            }
    
            const result = await command({
                body, 
                text, 
                chatRecord, 
                from
            });
    
            console.log(result);
            if (result) {
                if (result.takeOut) {
                    this.restrictUsers(chat.id, result.users, result.untilTime);
                }
    
                if(result.code){
                    const lang = chatRecord.getConfig().lang;
                    const message = this.messageService.getMessage(lang, result.code, result.metadata); 
                    responses.push(message);
                }
            }
        }

        if (responses.length>0){
            this.sendSimpleMessageToChat(chat.id, responses.join('\n'));
        }
    }
}


module.exports = {
    TitopiaBot
}