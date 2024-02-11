const express = require('express')
const Controller = require('../Controlers/teacherController')
const router = express.Router()
const upload = require('../Middleware/uploadProfilePicture')
const homeWork = require('../Middleware/uploadAssignment')
const studentScore = require('../Middleware/uploadStudentScore')

//get all registered teachers
router.get('/get', Controller.get_Teacher)

//get teacher by id/
router.get('/get/:id', Controller.get_Teacher_Id)

//register new teacher
router.post('/register', Controller.register_Teacher)

//login teacher
router.post('/login', Controller.login_Teacher)

//verify Otp
router.post('/verify-otp', Controller.verify_Otp)

//resend otp
router.post('/resend-otp', Controller.resend_Otp)

//reset password link
router.post('/reset-password-link', Controller.resetTeacherPasswordLink)

//reset password
router.patch('/reset-password', Controller.reset_Password)

//change password 
router.patch('/change-password', Controller.change_Password)

//update teacher
router.put('/update/:id', Controller.update_Teacher)

//delete teacher 
router.delete('/delete/:id', Controller.delete_Teacher)

//upload profile picture
router.post('/upload/:id', upload, Controller.uploadPics)

//Edit student score
router.put('/update/:id/score', Controller.editScore)

//Teacher sends mail to all student
router.post('/send-mails', Controller.sendMessageToAll)

//Teacher sends mail to a student
router.post('/send-to-student', Controller.sendMessageToOne)

//teacher Uploads an assignment
router.post('/assignment', homeWork, Controller.postAssignment)

//teacher upload student's score
router.post('/upload-score', studentScore, Controller.uploadStudentScore)

//teacher receives students message in the inbox
router.post('/receive-message', Controller.inboxMessage)

//Teacher send message to each other
router.post('/reply-teacher', Controller.replyTeacher)

//teacher message student
router.post('/message-student', Controller.messageStudent)

module.exports = router;