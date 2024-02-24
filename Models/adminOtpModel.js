const mongoose = require('mongoose')

const adminOtp = mongoose.Schema({
    otp: {
        type: String,
        required: true
    },

    expirationTime: {
        type: Date,
        required: true
    },

    email: {
        type: String,
        required: true
    },

    isVerified: {
        type: Boolean,
        default: false
    },
}, {
    timestamps: true
});


module.exports = mongoose.model('Adminotp', adminOtp)