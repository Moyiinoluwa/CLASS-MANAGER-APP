const mongoose = require('mongoose')

const teacherSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    isVerified : {
        type: Boolean,
        default: false
    },

    isLoggedIn: {
        type: Boolean,
        default: false
    },

    isLoggedOut: {
        type: Boolean,
        default: false
    },

    isResetPasswordLinkSent: {
        type: Boolean,
        default: false
    },

    resetLink: {
        type: String,
        default: ''
    }, 

    resetLinkExpirationTime: {
        type: Date,
       // required: true
    },

    profilepic: {
        type: String,
        data: Buffer,
        default: ''
    }

}, {
    timestamps: true
});

module.exports = mongoose.model('Teachers', teacherSchema)