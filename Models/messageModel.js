const mongoose = require('mongoose')


 const messageSchema = mongoose.Schema({
 
    teacher_id: {
        type: String,
        required: true
    },

    student_id: {
        type: String,
        required: true
    },
     
    message: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});


module.exports = mongoose.model('Message', messageSchema)