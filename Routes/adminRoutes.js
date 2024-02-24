const express = require('express')
const router = express.Router()
const Controller = require('../Controlers/adminController')


//register
router.post('/register', Controller.registerAdmin)

//login
router.post('/login', Controller.loginAdmin)

//get all admin
router.get('/get', Controller.getAllAdmin)

//get an admin
router.get('/get/:id', Controller.getAdmin)






module.exports = router;