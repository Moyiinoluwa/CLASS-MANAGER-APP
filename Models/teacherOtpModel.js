const mongoose = require('mongoose')

const otpTeacher = mongoose.Schema({
    otp: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },
    
    expirationTime: {
        type: Date,
        required: true
    },

    isVerified: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('teachOtp', otpTeacher)