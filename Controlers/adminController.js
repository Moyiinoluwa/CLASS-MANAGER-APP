const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Admin = require('../Models/adminModel')
const Adminotp = require('../Models/adminOtpModel')
const { loginAdminValidator, registerAdminValidator, verifyOtpValidator} = require('../Validator/adminValidator')
const { verificationMail} = require('../Shared/mailer')


//generate OTP
const generateOtp = () => {
    const min = 100000;
    const max = 999999;
    const otp = Math.floor(min-Math.floor * (max - min) + 1).toString()
    return otp
} 


const registerAdmin = asyncHandler(async(req, res) => {
    try {
        
        const { error, value } = await registerAdminValidator(req.body, { abortEarly: false }) 
        if(error) {
            res.status(400).json(error.message)
        }

        const { username, email, password } = req.body;

        //check if admin has been registered
        const admin = await Admin.findOne({ email})
        if(admin) {
            res.status(403).json({ message: 'Admin has been registered'})
        }

        //hash the password
        const hashPassword = await bcrypt.hash(password, 10)

        //create new admin
        const newAdmin = new Admin({
            username,
            email,
            password: hashPassword
        })

        //save new admin to database
        await newAdmin.save()
        
        //send verification OTP via mail
        const verificationCode = generateOtp()
        await verificationMail(email, verificationCode, username)

        //set expiration time for the verification code
        const expire = new Date()
        expire.setMinutes(expire.getMinutes() + 5)

        //save new Otp to database
        const newOtp = new Adminotp()
        newOtp.otp = verificationCode
        newOtp.email = newAdmin.email
        newOtp.expirationTime = expire

        await newOtp.save()

        res.status(200).json(newAdmin)

    } catch (error) {
        throw error
    }
});

//admin login
const loginAdmin = asyncHandler(async(req, res) => {
    try {

        const {error, value } = await loginAdminValidator(req.body, { abortEarly: false })
        if(error) {
            res.status(400).json(error.message)
        }

        //check if admin is registered
        const admin = await Admin.findOne({ email })
        if(!admin) {
            res.status(404).json({ message: 'Admin not registered, please regsiter'})
        }

        //compare the password and grant access 
        if(admin && await bcrypt.compare(password, admin.password)) {
            const accessToken = jwt.sign({
                admiin: {
                    username: admin.username,
                    email: admin.email,
                    id: admin.id
                }
            }, process.env.ACCESS_KEY,
                {expiresIn: '1yr'}
            )
            res.status(200).json(accessToken)
        } else {
            res.status(404).json({ message: 'email or password incorrect'})
        }
        
    } catch (error) {
        throw error
    }
});

//get all registered admin
const getAllAdmin = asyncHandler(async(req, res) => {
    const admin = await Admin.find()
    res.status(200).json(admin)
});

//get a particular admin
const getAdmin = asyncHandler(async(req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)
    if(!admin) {
        res.status(404).json({ message: 'Admin not found'})
    } else {
        res.status(200).json(admin)
    }
    } catch (error) {
        throw error
    }
});

//verify otp
const verifyAdminOtp = asyncHandler(async(req, res) => {
    try {
        //validate the input
        const { error, value } = await verifyOtpValidator(req.body, { abortEarly: false })
        if(error) {
            res.status(400).json(error.message)
        }
         
        const { email, otp }  = req.body;
        //check if the email is registred
        const admin = await 
    } catch (error) {
        throw error
    }
});




module.exports = {
    registerAdmin,
    loginAdmin,
    getAllAdmin,
    getAdmin
}