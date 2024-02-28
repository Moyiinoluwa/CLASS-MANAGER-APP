const express = require('express');
const Controller = require('../Controlers/studentController')
const router = express.Router()
const upload = require('../Middleware/uploadProfilePicture')
const validate = require('../Middleware/validateToken')

//get all students
router.get('/get-students', Controller.getStudent )

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
router.post('/upload/:id', upload, validate, Controller.profilePic)

//student can view their score
router.get('/view-score', validate, Controller.studentScore)

//send message to teacher
router.post('/message-teacher', validate, Controller.messageTeacher)

//send message to fellow student
router.post('/message-student', validate, Controller.messageStudent)

//view student profile
router.get('/view-profile', validate, Controller.viewStudentProfile)

//search for a student
router.get('/student-page', validate, Controller.studentSearch)

//chatroom
router.post('/chatroom', validate, Controller.studentChatRoom)


module.exports = router;