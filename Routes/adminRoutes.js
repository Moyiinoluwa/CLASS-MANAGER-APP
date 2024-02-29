const express = require('express')
const router = express.Router()
const Controller = require('../Controlers/adminController')
const validate = require('../Middleware/validateToken')

//register
router.post('/register', Controller.registerAdmin)

//login
router.post('/login', Controller.loginAdmin)

//get all admin
router.get('/get', Controller.getAllAdmin)

//get an admin
router.get('/get/:id', Controller.getAdmin)

//verify otp 
router.post('/verify-otp', Controller.verifyAdminOtp)

//resend otp
router.post('/resend-otp', Controller.resendAdminOtp)

//send reset password link
router.post('/send-reset-password', Controller.resetAdminPasswordLink)

//reset password
router.post('/reset-password', Controller.resetAdminPassword)

//change password
router.patch('/change-password', validate, Controller.changeAdminPassword)

//delete admin profile
router.delete('/delete/:id', validate, Controller.deleteAdmin)

//admin deletes a teacher's account
router.delete('/delete-teacher/:id', validate, Controller.deleteTeacherAccount)

//admin deleted students account
router.delete('/delete-student/:id', validate, Controller.deleteStudentProfile)

//update teacher
router.put('/update/id', validate, Controller.updateTeacherProfile)

//send email to teacher
router.post('/send-email', validate, Controller.sendMailToTeachers)

//send email to student
router.post('/send-email-student', validate, Controller.sendMailToStudents)





module.exports = router;