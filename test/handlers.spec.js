const { expect } = require('chai')

const { 
    startHandler,
    stopHandler,
    statusHandler,
    codes
} = require('../titopia/handlers')
const { MemoryChatRecord, buildChat } = require('../titopia/repositories');

const fromA = {
    id: 1,
    first_name:'A',
    last_name:'A',
};

const fromB = {
    id: 2,
    first_name:'B',
    last_name:'B',
};

const fromC = {
    id: 3,
    first_name:'C',
    last_name:'C',
};

describe('Handlers', () => {
    it('Has to start', async () => {
        const chatRecord = new MemoryChatRecord(buildChat(1))
        expect(chatRecord.isEnabled()).to.be.false;
        await startHandler({
            chatRecord
        })
        expect(chatRecord.isEnabled()).to.be.true;
    })

    context('Stop handler', async () => {
        it('Has to throw exception if from is null', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await stopHandler({
                chatRecord
            })
            .catch((err)=>{
                expect(() => {
                   throw err
                }).to.throw(/from/);
            });
        })
        
        it('Has to stop', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await startHandler({
                chatRecord
            })
            await stopHandler({
                from: {
                    id: 1,
                    first_name: 'first_name',
                    last_name: 'last_name',
                    username: 'username'
                },
                chatRecord
            })
            expect(chatRecord.isEnabled()).to.be.false;
        })

        it('Start new take out', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            const startNewResult = await chatRecord.startNewTakeOut([fromB], fromA);
            expect(startNewResult).to.have.property('isStarted', true);
        });

        it('Cant stop when take out already exist', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await chatRecord.startNewTakeOut([fromB], fromA);
            
            const startNewResult = await chatRecord.startNewTakeOut([fromB], fromA);
            expect(startNewResult).to.have.property('isStarted', false);
        });

        it('Not stop if is not the same person how start', async ()=> {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await chatRecord.startNewTakeOut([fromB], fromA);
          
            const result = await stopHandler({
                from: fromC,
                chatRecord
            });
            expect(result).to.have.property('code', codes.CANT_CLOSE_IN_CURRENT_TAKE_OUT);
        });

        it('Return nice try code when is the same person to take out', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await chatRecord.startNewTakeOut([fromB], fromA);
          
            const result = await stopHandler({
                from: fromB,
                chatRecord
            });
            expect(result).to.have.property('code', codes.NICE_TRY_BUT_NOT);        
        });
    });

    context('Status handler', async () => {
        it('Voting not started code', async () => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            const result = await statusHandler({
                chatRecord
            });

            expect(result).to.have.property('code', codes.VOTING_NOT_STARTED);
        });

        it('Show status code', async() => {
            const chatRecord = new MemoryChatRecord(buildChat(1))
            await chatRecord.startNewTakeOut([fromB], fromA);
                    
            const result = await statusHandler({
                chatRecord
            });

            expect(result).to.have.property('code', codes.STATUS);
        });
    });
})
