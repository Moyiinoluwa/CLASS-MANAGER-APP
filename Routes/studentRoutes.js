const express = require('express');
const Controller = require('../Controlers/studentController')
const router = express.Router()
const upload = require('../Middleware/uploadProfilePicture')
const validate = require('../Middleware/validateToken')
const sendAnswer = require('../Middleware/uploadAnswer')

//get all students
router.get('/get', Controller.getStudent )

//get student id
router.get('/get/:id', Controller.getStudentId )

//register a new student
router.post('/register', Controller.registerStudent)

//student login
router.post('/login', Controller.loginStudent)

//verify otp
router.post('/verify-otp', Controller.verifyOtp)

//resend otp
router.post('/resend-otp', Controller.resendOtp)

// send reset password link
router.post('/reset-password-link', Controller.resetPasswordLink)

//reset password
router.post('/reset-password', Controller.resetPassword)

//change password 
router.patch('/change-password', validate, Controller.changePassword)

//update a student
router.put('/update/:id', validate, Controller.updateStudent )

//delete student
router.delete('/delete/:id', validate, Controller.deleteStudent )

//upload profile picture
router.patch('/upload/:id', upload, validate, Controller.profilePic)

//student can check their score
router.get('/check-score', validate, Controller.studentScore)

//send message to teacher
router.post('/message-teacher/:student_id/:teacher_id', validate, Controller.messageTeacher)

//send message to fellow student
router.post('/message-student/:sender_id/:receiver_id', validate, Controller.messageStudent)

//view student profile
router.get('/view-profile', validate, Controller.viewStudentProfile)

//search for a student
router.get('/student-page', validate, Controller.studentSearch) 

//student downloads assignment
// router.get('/download-assignment/:id', validate, Controller.downloadAssignment)
router.get('/download-assignment/:id', validate, Controller.downloadAssignment)

//student uploads answer to the assignment
router.post('/upload-answer/:id', validate, sendAnswer, Controller.uploadAnswer)
 
module.exports = router;
