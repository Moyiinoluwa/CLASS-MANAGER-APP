const mongoose = require('mongoose')

const assignmentSchema = mongoose.Schema({
    subject: {
        type: String,
        required: true
    },

    class: {
        type: String,
        required: true
    },

    score: {
        type: String,
        default: ''
    },

    student_id: {
        type: String,
        required: true
    },
    
    date: {
        type: Date,
        required: true
    }
}, {
    timestamp: true
});

module.exports = mongoose.model('Assignment', assignmentSchema)