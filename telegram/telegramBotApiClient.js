const axios = require('axios')

const defaultUrl = 'https://api.telegram.org';

class TelegramBotApiClient {
    constructor(token, apiUrl = defaultUrl){
        this.token = token;
        this.apiUrl = apiUrl;
    }

    sendMessage(chatId, text) {
        return axios.post(`${this.apiUrl}/bot${this.token}/sendMessage`,{
            chat_id: chatId,
            text: text
        })
    }

    restrictChatMember(chatId, userId, time, permissions = ['can_send_messages', 'can_send_media_messages', 'can_send_polls']) {
        return axios.post(`${this.apiUrl}/bot${this.token}/restrictChatMember`,{
            chat_id: chatId,
            user_id: userId,
            until_time: time,
            permissions: permissions,
        });
    }
}



module.exports = TelegramBotApiClient;