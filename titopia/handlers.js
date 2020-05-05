var moment = require('moment');

const startHandler = async({ 
    i18n,
    chatRecord
}) => {
    chatRecord.start();
    return {
        message: i18n.__('started')
    }
}

const getFullName = (from) => {
    return  ((from.first_name || '') + ' ' + (from.last_name || '')).trim();
}

const stopHandler = async({ 
    i18n,
    from,
    chatRecord
}) => {

    chatRecord.stop();
    const current = await chatRecord.getCurrentTakeOut();

    if (current) {
        if( current.users.some(u=>u.id==from.id)) {
            return {
                message: i18n.__('%s nice_try_but_no', getFullName(from))
            }
        }else{
            return {
                message: i18n.__('cant_close_in_current_take_out')
            }
        }
    } else {
        return {
            message: i18n.__('stopped')
        }
    }
}

const setLangHandler = async({ 
    i18n,
    text,
    chatRecord
}) => {
    
    const lang = (text.split(' ')[1] || '').trim();

    if(!lang){
        return {
            message: i18n.__('lang_required %s', i18n.getLocales().join(', '))
        }
    }

    if(!i18n.getLocales().some(l => l==lang)){
        return {
            message: i18n.__('lang_not_found')
        }
    }

    chatRecord.setLang(lang);
    i18n.setLocale(lang);

    return {
        message: i18n.__('lang_changed')
    }
}

const getStatusMessage = async (i18n,chatRecord) => {
    const takeOut = await chatRecord.getCurrentTakeOut();
    const config = chatRecord.getConfig();

    const values = Object.values(takeOut.votes);
    const takeOutVotes = values.filter(v=>v);
    const userNames = takeOut.users.map(u=>u.first_name).join(', ');

    const voteStatusTitle = i18n.__('voting_status_title_users_%s', userNames);
    const voteStatusBody = i18n.__('voting_status_body_votes_{{votes}}_{{maxVoteToTakeOut}}_totals_{{totals}}_{{maxVoteToFinish}}', {
        votes: takeOutVotes.length,
        maxVoteToTakeOut: config.maxVoteToTakeOut,
        totals: values.length,
        maxVoteToFinish: config.maxVoteToFinish
    });
    return {
        message: [voteStatusTitle, voteStatusBody].join('\n')
    }
}

const statusHandler = async ({
        chatRecord,
        i18n
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();

    if(!takeOut){
        return {
            message: i18n.__("voting_not_started")
        }
    }

    return await getStatusMessage(i18n, chatRecord);
}

const takeOutHandler = async ({
    body,
    i18n, 
    chatRecord, 
    from
}) => {
    const { message: { entities } } = body;

    if(from.is_bot){
        return false;
    }

    if(!entities){
        return false;    
    }

    const users = entities.map(a=>a.user).filter(a=>a);

    if(!users.length){
        return {message: i18n.__("user_required_to_voting") };
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
            message: i18n.__('vote_started_from_{{fromName}}_to_{{users}}_votes_{{votes}}_vote_using_{{votePattern}}_unvote_using_{{unvotePattern}}_totals_{{totals}}_cancel_using_{{cancelPattern}}', { 
                users:userNames, 
                fromName: getFullName(from),
                cancelPattern: cancelPattern,
                votes:chatRecord.getConfig().maxVoteToTakeOut, 
                votePattern: votePattern,
                unvoteOattern: unvotePattern,
                totals: chatRecord.getConfig().maxVoteToFinish 
            })
        };
    }else{
        return {
            message: i18n.__('voting_alredy_exists')
        }
    }
}
const buildVoteHandler = (vote) => async ({
        i18n, 
        chatRecord, 
        from
    }) => {
        const voteResult = await chatRecord.vote(from.id,vote); 

        if(!voteResult.done){
            return false;
        }

        const config = chatRecord.getConfig();
        if(!voteResult.finished){
            if (voteResult.changed && config.showStatusEveryVote) {
                return getStatusMessage(i18n, chatRecord);
            }else{
                return false;
            }
        }

        const userNames = voteResult.users.map(u=>u.first_name).join(', ');
        if (voteResult.takeOut) {
            const untilTime = moment().utc().add(config.bannedDays, 'days').valueOf()
            await chatRecord.clearCurrentTakeOut(untilTime);
            return {
                ...voteResult,
                untilTime,
                message: i18n.__('users_{{users}}_muted_by_{{days}}', { users:userNames, days: config.bannedDays })
            };
        }else{
            await chatRecord.clearCurrentTakeOut();
            return {
                ...voteResult,
                message: i18n.__('voting_finished')
            };
        }
    }

const cancelHandler = async ({
    i18n, 
    chatRecord, 
    from
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();

    if(!takeOut){
        return false;
    }

    if(from.id!=takeOut.from.id){
        return {
            message: i18n.__('you_cannot_cancel_the_current_vote')
        }

    }else{
        await chatRecord.clearCurrentTakeOut();

        return {
            message: i18n.__('vote_canceled')
        }
    }
}

module.exports = {
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler,
    setLangHandler,
    stopHandler,
    startHandler
};