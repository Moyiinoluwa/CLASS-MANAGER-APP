const mongoose = require('mongoose')

const studentSchema = mongoose.Schema({
    username: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    password: {
        type: String,
        require: true
    },

    isVerified: {
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

    reSetLink: {
        type: String,
        default: ''
    },

    resetLinkExpirationTime: {
        type: Date
    },

    profilePicture: {
        type: String,
        data: Buffer,
        default: ''
    },

    role: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        default: 'student'
    },

        timestamps: true,
    
    });

module.exports = mongoose.model('Student', studentSchema)