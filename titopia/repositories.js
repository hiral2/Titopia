
function fixedFromCharCode (codePt) {
    if (codePt > 0xFFFF) {
        codePt -= 0x10000;
        return String.fromCharCode(0xD800 + (codePt >> 10), 0xDC00 + (codePt & 0x3FF));
    }
    else {
        return String.fromCharCode(codePt);
    }
}

class MemoryRepository {
    constructor(){
        this.chats = {};
        this.defaultChatConfig = {
            enabled: false,
            maxVoteToTakeOut:5,
            maxVoteToFinish: 10,
            bannedDays: 2,
            showStatusEveryVote: true,
            votePatterns: [0x270B].map(e=> fixedFromCharCode(e)),
            unvotePatterns: [0x1F44E].map(e=> fixedFromCharCode(e)),
            takeOutRegex: /\/out/,
            cancelRegex: /\/cancel/,
            lang: 'en'
        }
    }

    findChat(chatId){
        let chat = this.chats[chatId];
        if(!chat){
            chat = {
                users: [],
                id: chatId,
                config: {...this.defaultChatConfig}
            };
            this.chats[chatId] = chat;
        }
        return Promise.resolve(new MemoryChatRecord(chat));
    }
}

class MemoryChatRecord {
    constructor(chat){
        this.chat = chat;
    }

    getCurrentTakeOut() {
        let currentTakeOut;
        if(this.chat.takeOut) {
            currentTakeOut = this.chat.takeOut.current;
        }
        return Promise.resolve(currentTakeOut);
    }

    getConfig(){
        return this.chat.config;
    }

    isEnabled(){
        return this.chat.enabled;
    }

    start(){
        this.chat.enabled = true;
    }

    stop(){
        this.chat.enabled = false;
    }

    setLang(lang) {
        this.chat.config.lang = lang;
    }

    getLang(){
        return this.getConfig().lang;
    }

    setUsers(users) {
        const updateUsers = this.chat.users.filter(u=> !users.some(us => us.id == u.id));
        updateUsers.push(...users);
        this.chat.users = updateUsers;
    }

    getUsers(){
        return this.chat.users;
    }

    clearCurrentTakeOut(until) {
        if(this.chat.takeOut && this.chat.takeOut.current){
            this.chat.takeOut.current.finished_at = new Date().getUTCDate();
            this.chat.takeOut.current.banned_at = until;
            (this.chat.takeOut.histories = (this.chat.takeOut.histories || [])).splice(0,0, this.chat.takeOut.current);
            this.chat.takeOut.current=undefined;
        }
        return Promise.resolve();
    }

    isAnyVotation(){
        return this.chat.takeOut && this.chat.takeOut.current; 
    }

    getCurrentTekeOut() {
        let to;
        if (this.isAnyVotation()){
            to = this.chat.takeOut.current;
        }

        return Promise.resolve(to);
    }

    startNewTakeOut(users, from) {
        if(this.isAnyVotation()){
            return Promise.resolve({isStarted: false});
        } else {
            if (!this.chat.takeOut){
                this.chat.takeOut = {};
            }
            this.chat.takeOut.current = {
                users: users,
                from: from,
                votes: {}
            }
            return Promise.resolve({isStarted: true});
        }
    }

    vote(userId, tod) {
        if(this.isAnyVotation()) {
            const takeObjectObj = this.chat.takeOut.current;
            const changed = takeObjectObj.votes[userId] !== tod;
            takeObjectObj.votes[userId] = tod;

            const votes = Object.values(takeObjectObj.votes);
            const voteTakeOut = votes.filter(v=>v).length;
            
            const takeOut = voteTakeOut >= this.chat.config.maxVoteToTakeOut;
            const finished = takeOut || votes.length >= this.chat.config.maxVoteToFinish;

            return Promise.resolve({
                changed,
                takeOut,
                users: takeObjectObj.users,
                finished,
                done: true
            });
        }else{
            return Promise.resolve({
                done: false,
            }); 
        }
    }
}

module.exports = {
    MemoryRepository
}