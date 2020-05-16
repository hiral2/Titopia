var moment = require('moment');

const codes = {
    NICE_TRY_BUT_NOT: 1,
    CANT_CLOSE_IN_CURRENT_TAKE_OUT: 2,
    STOPPED: 3,
    VOTING_NOT_STARTED: 4,
    STARTED: 5,
    LANG_REQUIRED: 6,
    LANG_NOT_FOUND: 7,
    VOTE_CANCELED: 8,
    LANG_CHANGED: 9,
    VOTING_STATUS_TITLE_USERS: 10,
    STATUS: 11,
    USER_REQUIRED_TO_VOTING: 12,
    VOTE_STARTED: 13,
    VOTING_ALREDY_EXISTS: 14,
    USERS_MUTED: 15,
    VOTING_FINISHED: 16,
    YOU_CANNOT_CANCEL_THE_CURRENT_VOTE: 17,
    USERS_NOT_FOUND: 18
}

const startHandler = async({ 
    chatRecord
}) => {
    chatRecord.start();
    return {
        code: codes.STARTED
    }
}

const getFullName = (from) => {
    return  ((from.first_name || '') + ' ' + (from.last_name || '')).trim();
}

const stopHandler = async({ 
    from,
    chatRecord
}) => {
    const current = await chatRecord.getCurrentTakeOut();

    if (current) {
        if( current.users.some(u=>u.id==from.id)) {
            return {
                code: codes.NICE_TRY_BUT_NOT,
                metadata: { 
                    name: getFullName(from) 
                },
            }
        }else{
            return {
                code: codes.CANT_CLOSE_IN_CURRENT_TAKE_OUT,
            }
        }
    } else {
        chatRecord.stop();
        return {
            code: codes.STOPPED,
        }
    }
}

const setLangHandler = (messageService) => async({ 
        text,
        chatRecord
    }) => {
    const lang = (text.split(' ')[1] || '').trim();

    if(!lang){
        return {
            code: codes.LANG_REQUIRED
        }
    }

    const langFound = messageService.contains(lang); 
    if(!langFound){
        return {
            code: codes.LANG_NOT_FOUND
        }
    }

    chatRecord.setLang(lang);
    return {
        code: codes.LANG_CHANGED
    }
}


const getStatusMessage = async (chatRecord) => {
    const takeOut = await chatRecord.getCurrentTakeOut();
    const config = chatRecord.getConfig();

    const values = Object.values(takeOut.votes);
    const takeOutVotes = values.filter(v=>v);
    const userNames = takeOut.users.map(u=>u.first_name).join(', ');

    return {
        code: codes.STATUS,
        metadata: {
            usernames: userNames,
            votes: takeOutVotes.length,
            maxVoteToTakeOut: config.maxVoteToTakeOut,
            totals: values.length,
            maxVoteToFinish: config.maxVoteToFinish
        },
        message: [voteStatusTitle, voteStatusBody].join('\n')
    }
}

const statusHandler = async ({
        chatRecord
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();
    if(!takeOut){
        return {
            code: codes.VOTING_NOT_STARTED
        }
    }

    return await getStatusMessage(chatRecord);
}

const takeOutHandler = async ({
    body,
    chatRecord, 
    from
}) => {
    const { message: { entities, text } } = body;

    if(from.is_bot){
        return false;
    }

    if(!entities){
        return false;    
    }

    const users = entities.filter(a=>a.type=='text_mention' && a.user).map(a=>a.user);
    chatRecord.setUsers(users);

    const username_mentions = entities.filter(a=>a.type=='mention').map(t=> text.substr(t.offset+1, t.length-1));

    if(username_mentions.length){
        const chatUsers = chatRecord.getUsers();
        const userFounds = chatUsers.filter(cu => username_mentions.some(um => um == cu.username));

        const usernameNotFounds = username_mentions.filter(um => !userFounds.some(uf => uf.username == um));
        if(usernameNotFounds.length){
            return {
                code: codes.USERS_NOT_FOUND,
                metadata: {
                    usernames: usernameNotFounds.join(', ')
                }
            }
        }

        users.push(...userFounds);
    }

    if(!users.length){
        return {
            code: codes.USER_REQUIRED_TO_VOTING
        };
    }

    const user_infos = users.map(u=>({
            id: u.id,
            first_name: u.first_name,
            last_name: u.last_name
        }))

    const takeOut = await chatRecord.startNewTakeOut(user_infos, from);
    const config = chatRecord.getConfig();
    
    let votePattern = config.votePatterns.join(' ');
    let unvotePattern = config.unvotePatterns.join(' ');

    let cancelPattern = config.cancelRegex.toString();
    cancelPattern = cancelPattern.substring(3, cancelPattern.length - 1);

    if(takeOut.isStarted){
        const userNames = user_infos.map(u=>u.first_name).join(', ');
        return {
            code: codes.VOTE_STARTED,
            metadata: {
                users:userNames, 
                fromName: getFullName(from),
                cancelPattern: cancelPattern,
                votes:chatRecord.getConfig().maxVoteToTakeOut, 
                votePattern: votePattern,
                unvoteOattern: unvotePattern,
                totals: chatRecord.getConfig().maxVoteToFinish 
            }
        };
    }else{
        return {
            code: codes.VOTING_ALREDY_EXISTS
        }
    }
}

const buildVoteHandler = (vote) => async ({
        chatRecord, 
        from
    }) => {
        const voteResult = await chatRecord.vote(from.id,vote); 

        if(!voteResult.done){
            return;
        }

        const config = chatRecord.getConfig();
        if(!voteResult.finished){
            if (voteResult.changed && config.showStatusEveryVote) {
                return getStatusMessage(chatRecord);
            }else{
                return;
            }
        }

        const userNames = voteResult.users.map(u=>u.first_name).join(', ');
        if (voteResult.takeOut) {
            const untilTime = moment().utc().add(config.bannedDays, 'days').valueOf()
            await chatRecord.clearCurrentTakeOut(untilTime);
            return {
                ...voteResult,
                untilTime,
                code: codes.USERS_MUTED,
                metadata: { users:userNames, days: config.bannedDays },
            };
        }else{
            await chatRecord.clearCurrentTakeOut();
            return {
                ...voteResult,
                code: codes.VOTING_FINISHED,
            };
        }
    }

const cancelHandler = async ({
    chatRecord, 
    from
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();

    if(!takeOut){
        return false;
    }

    if(from.id!=takeOut.from.id){
        return {
            code: codes.YOU_CANNOT_CANCEL_THE_CURRENT_VOTE,
        }

    }else{
        await chatRecord.clearCurrentTakeOut();

        return {
            code: codes.VOTE_CANCELED
        }
    }
}

const setUserHandler = async ({
    chatRecord, 
    from
}) => {
    await chatRecord.setUsers([from]);

    console.log('Set user', from);
}

module.exports = {
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler,
    setLangHandler,
    stopHandler,
    startHandler,
    setUserHandler,
    codes
};