const { expect } = require('chai')

const { TitopiaBot, commandKeys } = require('../titopia/titopiaBot');
const { MemoryChatRecord, buildChat } = require('../titopia/repositories');

const messageTemplate = ({text}) => {
    return {
        "message": {
            "text": text,
            "from": {
                "id": 1,
                "first_name": "roberto",
                "last_name": "hiraldo"
            },
            "chat":{
                "id":1
            },
            "entities":[
                {
                    "type":"text_mention",
                    "user":{
                        "id": 203,
                        "username": "pepe",
                        "first_name": "Pepe",
                        "last_name": "pantoja"
                    }
                }
            ]
        }
    }
}

const titopiaBot = new TitopiaBot({}, {});
const chatRecord = new MemoryChatRecord(buildChat(1))

chatRecord.start()

const findCommandKeys = (text) => {
    return titopiaBot.findCommands({text, chatRecord}).map(c=>c.key)
}

describe('TitopiaBot', () => {
    context('Validations', () => {
        it('Is body valid', () => {
            expect(titopiaBot.isValidBody(messageTemplate({
                text: "random message"
            }))).to.be.true    
        });

        it('Is message valid', () => {
            expect(titopiaBot.isValidMessage(messageTemplate({
                text: "random message"
            }).message)).to.be.true         
        });

        it('Is invalid body', () => {
            expect(titopiaBot.isValidBody({})).to.be.false    
        });

        it('Is message', () => {
            expect(titopiaBot.isValidMessage({"message":{}})).to.be.false         
        });
    })

    context('Find commands', () => {

        it('Find start', () => {
            expect(findCommandKeys("/start")).be.an('array').that.include(commandKeys.START);
        });
        
        it('Find status', () => {
            expect(findCommandKeys("/status")).be.an('array').that.include(commandKeys.STATUS);
        });

        it('Find out', () => {
            expect(findCommandKeys("/out")).be.an('array').that.include(commandKeys.TAKE_OUT);
        });

        it('Find stop', () => {
            expect(findCommandKeys("/stop")).be.an('array').that.include(commandKeys.STOP);
        });

        it('Find lang', () => {
            expect(findCommandKeys("/lang")).be.an('array').that.include(commandKeys.SET_LANG);
        });

    })
})