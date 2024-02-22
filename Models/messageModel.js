const mongoose = require('mongoose')


 const messageSchema = mongoose.Schema({
 
    sender: {
        type: String,
        required: true
    },

    receiver: {
        type: String,
        required: true
    },

    teacher_id: {
        type: String,
        required: true
    },

    student_id: {
        type: String,
        required: true
    },
     
     
    content: {
        type: String,
        default: ' '
    }
    
}, {
    timestamps: true
});


module.exports = mongoose.model('Message', messageSchema)