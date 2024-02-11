const mongoose = require('mongoose')

const teacherSchema = mongoose.Schema({
    surname: {
        type: String,
        required: true
    },
    
    name: {
        type: String,
        required: true
    },
    
    username: {
        type: String,
        unique: [true, 'username has been taken'],
        required: true
    },

    qualification: {
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

    subject: {
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
    },

    role: {
        type: String,
        enum: ['admin', 'teacher', 'student'],
        default: 'teacher'
    },

}, {
    timestamps: true
});

module.exports = mongoose.model('Teachers', teacherSchema)