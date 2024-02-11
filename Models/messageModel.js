const mongoose = require('mongoose')


 const messageSchema = mongoose.Schema({
 
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Students',
        required: true
    },

    receiver: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Teachers',
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
        required: true
    }
    
}, {
    timestamps: true
});


module.exports = mongoose.model('Message', messageSchema)