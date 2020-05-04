var moment = require('moment');

const getStatusMessage = async (__,chatRecord) => {
    const takeOut = await chatRecord.getCurrentTakeOut();
    const config = chatRecord.getConfig();

    const values = Object.values(takeOut.votes);
    const takeOutVotes = values.filter(v => v);
    const userNames = takeOut.users.map(u => u.firstName).join(', ');

    const voteStatusTitle = __('voting_status_title_users_%s', userNames);
    const voteStatusBody = __('voting_status_body_votes_{{votes}}_{{maxVoteToTakeOut}}_totals_{{totals}}_{{maxVoteToFinish}}', {
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
        __
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();

    if(!takeOut) {
        return {
            message: __("voting_not_started")
        }
    }

    return await getStatusMessage(__, chatRecord);
}

const takeOutHandler = async ({
    body,
    __, 
    chatRecord, 
    from
}) => {
    const { message: { entities } } = body;

    if(from.is_bot) {
        return false;
    }

    if(!entities) {
        return false;    
    }

    const users = entities.map(a => a.user).filter(a => a);

    if(!users.length) {
        return { message: __("user_required_to_voting") };
    }

    const usersInfo = users.map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name
    }))

    const takeOut = await chatRecord.startNewTakeOut(usersInfo, from);
    const config = chatRecord.getConfig();
    
    let votePattern = config.votePatterns.join(' ');
    let unvotePattern = config.unvotePatterns.join(' ');

    let cancelPattern = config.cancelRegex.toString();
    cancelPattern = cancelPattern.substring(3, cancelPattern.length - 1);

    if(takeOut.isStarted) {
        const userNames = usersInfo.map(u => u.firstName).join(', ');
        return {
            message: __('vote_started_from_{{fromName}}_to_{{users}}_votes_{{votes}}_vote_using_{{votePattern}}_unvote_using_{{unvotePattern}}_totals_{{totals}}_cancel_using_{{cancelPattern}}', { 
                users: userNames, 
                fromName: ((from.firstName || '') + ' ' + (from.lastName || '')).trim(),
                cancelPattern: cancelPattern,
                votes: chatRecord.getConfig().maxVoteToTakeOut, 
                votePattern: votePattern,
                unvoteOattern: unvotePattern,
                totals: chatRecord.getConfig().maxVoteToFinish 
            })
        };
    }else{
        return {
            message: __('voting_alredy_exists')
        }
    }
}
const buildVoteHandler = (vote) => async ({
        __, 
        chatRecord, 
        from
    }) => {
        const voteResult = await chatRecord.vote(from.id,vote); 

        if(!voteResult.done) {
            return false;
        }

        const config = chatRecord.getConfig();
        if(!voteResult.finished) {
            if (voteResult.changed && config.showStatusEveryVote) {
                return getStatusMessage(__, chatRecord);
            }else{
                return false;
            }
        }

        const userNames = voteResult.users.map(u => u.firstName).join(', ');
        if (voteResult.takeOut) {
            const untilTime = moment().utc()
.add(config.bannedDays, 'days')
.valueOf()
            await chatRecord.clearCurrentTakeOut(untilTime);
            return {
                ...voteResult,
                untilTime,
                message: __('users_{{users}}_muted_by_{{days}}', { users: userNames, days: config.bannedDays })
            };
        }else{
            await chatRecord.clearCurrentTakeOut();
            return {
                ...voteResult,
                message: __('voting_finished')
            };
        }
    }

const cancelHandler = async ({
    __, 
    chatRecord, 
    from
}) => {
    const takeOut = await chatRecord.getCurrentTakeOut();

    if(!takeOut) {
        return false;
    }

    if(from.id != takeOut.from.id) {
        return {
            message: __('you_cannot_cancel_the_current_vote')
        }

    }else{
        await chatRecord.clearCurrentTakeOut();

        return {
            message: __('vote_canceled')
        }
    }
}

module.exports = {
    takeOutHandler,
    buildVoteHandler,
    statusHandler,
    cancelHandler
};
