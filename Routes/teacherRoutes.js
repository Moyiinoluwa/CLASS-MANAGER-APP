const express = require('express')
const Controller = require('../Controlers/teacherController')
const router = express.Router()
const upload = require('../Middleware/uploadProfilePicture')

//get all registered teachers
router.get('/get', Controller.get_Teacher)

//get teacher by id
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



module.exports = router;