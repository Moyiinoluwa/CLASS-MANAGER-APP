const express = require('express');
const Controller = require('../Controlers/studentController')
const router = express.Router()
const upload = require('../Middleware/uploadProfilePicture')

//get all students
router.get('/get-students',Controller.getStudent )

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
router.patch('/change-password', Controller.changePassword)

//update a student
router.put('/update/:id', Controller.updateStudent )

//delete student
router.delete('/delete/:id', Controller.deleteStudent )

//upload profile picture
router.post('/upload/:id', upload, Controller.profilePic)

//student can view their score
router.get('/view-score', Controller.studentScore)

//send message to teacher
router.post('/message-teacher',  Controller.messageTeacher)

//send message to fellow student
router.post('/message-student', Controller.messageStudent)

//view student profile
router.get('/view-profile', Controller.viewStudentProfile)

//search for a student
router.get('/student-page', Controller.studentSearch)

//chatroom
router.post('/chatroom', Controller.studentChatRoom)


module.exports = router;