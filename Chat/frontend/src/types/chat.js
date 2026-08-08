/**
 * @typedef {'personal'|'groups'|'channels'} ConversationType
 */

/**
 * @typedef {Object} Conversation
 * @property {string} id
 * @property {string} name
 * @property {string} lastMessage
 * @property {string} date
 * @property {number} unread
 * @property {boolean} online
 * @property {ConversationType} type
 * @property {string} avatar
 * @property {number} [memberCount]
 * @property {number} [subscriberCount]
 * @property {string} [description]
 * @property {string[]} [memberIds]
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} name
 * @property {string} phone
 * @property {string} [email]
 * @property {string} [username]
 * @property {boolean} online
 * @property {boolean} blocked
 * @property {string} [avatar]
 */

/**
 * @typedef {Object} CreateGroupPayload
 * @property {string} name
 * @property {string} [description]
 * @property {string[]} memberIds
 */

/**
 * @typedef {Object} CreateChannelPayload
 * @property {string} name
 * @property {string} [description]
 * @property {boolean} [isPublic]
 */

/**
 * @typedef {Object} Message
 * @property {string} id
 * @property {string} text
 * @property {string} senderId
 * @property {Date|string} createdAt
 * @property {boolean} read
 */

export {};
