const mongoose = require('mongoose')

const assignmentSchema = mongoose.Schema({
    subject: {
        type: String,
        required: true
    },

    klass: {
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
    
    assignment: {
        type: String,
        default: ''
    },

}, {
    timestamps: true
});

module.exports = mongoose.model('Assignment', assignmentSchema)