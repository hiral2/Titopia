var {
    codes
} = require('./handlers');



const defaultCodeMapping = {
    [codes.STARTED]: 'started',
    [codes.NICE_TRY_BUT_NOT]: '{{name}} nice_try_but_no',
    [codes.CANT_CLOSE_IN_CURRENT_TAKE_OUT]: 'cant_close_in_current_take_out',
    [codes.STOPPED]: 'stopped',
    [codes.VOTING_NOT_STARTED]: 'voting_not_started',
    [codes.LANG_REQUIRED]: 'lang_required {{langs}}',
    [codes.LANG_NOT_FOUND]: 'lang_not_found',
    [codes.VOTE_CANCELED]: 'vote_canceled',
    [codes.LANG_CHANGED]: 'lang_changed',
    [codes.VOTING_STATUS_TITLE_USERS]: 10,
    [codes.STATUS]: 'vote_status {{users}} {{votes}} {{maxVoteToTakeOut}} totals {{totals}} {{maxVoteToFinish}}',
    [codes.USER_REQUIRED_TO_VOTING]: 'user_required_to_voting',
    [codes.VOTE_STARTED]: 'vote_started_from_{{fromName}}_to_{{users}}_votes_{{votes}}_vote_using_{{votePattern}}_unvote_using_{{unvotePattern}}_totals_{{totals}}_cancel_using_{{cancelPattern}}',
    [codes.VOTING_ALREDY_EXISTS]: 'voting_alredy_exists',
    [codes.USERS_MUTED]: 'users {{users}} muted_by {{days}}',
    [codes.VOTING_FINISHED]: 'voting_finished',
    [codes.YOU_CANNOT_CANCEL_THE_CURRENT_VOTE]: 'you_cannot_cancel_the_current_vote',
    [codes.USERS_NOT_FOUND]: 'users {{usernames}} not_found'
}


class MessageService {
    constructor(i18n, codeMapping = defaultCodeMapping) {
        this.i18n = i18n;
        this.codeMapping = codeMapping;
    }

    getMessage(lang, code, metadata){
        this.i18n.setLocale(lang);
        const messageKey = this.codeMapping[code];
        if(code == codes.LANG_REQUIRED){
            metadata = {
                langs:  i18n.getLocales().join(', ')
            };
        }
        return  this.i18n.__(messageKey, {...metadata})
    }

    getLangs(){
        return this.i18n.getLocales();
    }

    contains(lang) {
        return this.getLangs().some(l => l==lang);
    }
}

module.exports = {
    MessageService,
    defaultCodeMapping
};