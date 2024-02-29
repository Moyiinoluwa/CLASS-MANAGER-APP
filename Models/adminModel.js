const mongoose = require('mongoose')

const adminSchema = mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },

    email: {
        type: String,
        unique: true,
        required: true
    },

    password: {
        type: String,
        required: true
    },
     
    isLoggedIn: {
        type: Boolean,
        default: false
    },

    idLoggedOut: {
        type: Boolean,
        default: false
    },

    resetLink: {
        type: String,
        default: ''
    },

    isResetPasswordLinkSent: {
        type: Boolean,
        default: false
    },

    resetPasswordLinkExpirationTime: {
        type: Date
    },

    role: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        default: 'admin'
    }
    

}, {
    timestamps: true
});

module.exports = mongoose.model('Admin', adminSchema)