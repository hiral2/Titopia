/* eslint-disable camelcase */
const axios = require('axios')

const defaultUrl = 'https://api.telegram.org';

const muteChatPermissions = { 'can_send_messages': false, 'can_send_media_messages': false, 'can_send_polls': false };

class TelegramBotApiClient {
    constructor(token, apiUrl = defaultUrl) {
        this.token = token;
        this.apiUrl = apiUrl;
    }

    sendMessage(chatId, text) {
        return axios.post(`${this.apiUrl}/bot${this.token}/sendMessage`,{
            chat_id: chatId,
            text: text
        })
    }

    restrictChatMember(chat_id, user_id, until_time, permissions = muteChatPermissions) {
        return axios.post(`${this.apiUrl}/bot${this.token}/restrictChatMember`,{
            chat_id,
            user_id,
            until_time,
            permissions,
        });
    }
}

module.exports = TelegramBotApiClient;
