const asyncHandler = require('express-async-handler')
const Student = require('../Models/studentModel')
const bcrypt = require('bcrypt')
const Otp = require('../Models/otpStudentModel')
const jwt = require('jsonwebtoken')
const { signupValidator, loginValidator,
    verifyOtpValidator, resendOtpValidator,
    resetPasswordLinkValidator, setPasswordValidator,
    changePasswordValidator } = require('../Validator/validatorSchema')
const { verificationMail, verifyOtpMail, passwordResetLinkMail } = require('../Shared/mailer')


//Generate OTP code
const generateOtp = () => {
    const min = 100000;
    const max = 999999;
    const otp = Math.floor(min + Math.random() * (max - min) + 1).toString()
    return otp;
}

// Get all students
const getStudent = asyncHandler(async (req, res) => {
    //find all registered students
    const user = await Student.find()
    res.status(200).json(user)
});

//Get a student
const getStudentId = asyncHandler(async (req, res) => {
    //find the id in the database
    const user = await Student.findById(req.params.id)

    //check if student exists
    if (!user) {
        res.status(404).json({ message: 'Student not found' })
    } else {
        res.status(200).json(user)
    }
});

//Register a new student
const registerStudent = asyncHandler(async (req, res) => {
    try {
        //validate student input
        const { error, value } = await signupValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const {surname, name, username, email, password } = req.body;

        //check if student already exists
        const user = await Student.findOne({ email })
        if (user) {
            res.status(403).json({ message: 'Student already exists' })
        }

        //hash the password
        const hash = await bcrypt.hash(password, 10)

        //create a new account
        const newStudent = Student({
            surname,
            name,
            username,
            email,
            password: hash
        });

        //save the new account to the database
        await newStudent.save()

        //Generate 2FA otp code and send to student via email
        const verifyCode = generateOtp()
        await verificationMail(email, verifyCode, username)

        //set expiration time 
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        //save otp to database
        const studentOtp = new Otp()
        studentOtp.otp = verifyCode
        studentOtp.email = newStudent.email,
            studentOtp.expirationTime = expirationTime

        await studentOtp.save()

        res.status(200).json(newStudent)

    } catch (error) {
        throw error
    }
});

//student login
const loginStudent = asyncHandler(async (req, res) => {
    try {
        // validate input
        const { error, value } = await loginValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        //check if student has been registered 
        const { email, password } = req.body

        const user = await Student.findOne({ email })
        if (!user) {
            res.status(404).json({ message: 'Student has not been registered' })
        }

        //compare the password and grant access
        if (user && await bcrypt.compare(password, user.password)) {
            const accessToken = jwt.sign({
                user: {
                    username: user.username,
                    email: user.email,
                    id: user.id
                }
            }, process.env.ACCESS_KEY,
                { expiresIn: '1yr' }
            )
            res.status(201).json(accessToken)
        } else {
            res.status(400).json({ message: 'email or password incorrect' })
        }

    } catch (error) {
        throw error
    }
})

//verify otp
const verifyOtp = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await verifyOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        //check if the email match the email the otp was sent to
        const { email, otp } = req.body;

        const user = await Otp.findOne({ email })
        if (!user) {
            res.status(404).json({ message: 'the email you entered does not match the email the otp was sent to' })
        }

        //check if otp is correct 
        const studentOtp = await Otp.findOne({ otp })
        if (!studentOtp) {
            res.status(401).json({ message: 'The otp you entered is incorrect' })
        }

        //if otp has expired
        if (studentOtp.expirationTime <= new Date()) {
            res.status(403).json({ message: 'Otp has expired' })
            return;
        }

        // find the student associated with the email provided
        const studentEmail = await Student.findOne({ email })
        if (!studentEmail) {
            res.status(404).json({ message: 'user does not exists' })
        }

        //update the student record after the otp has been verified
        studentOtp.verified = true

        //save to database
        await studentOtp.save()

        //send a verification mail to the user
        await verifyOtpMail(studentEmail.email)

        res.status(200).json({ message: 'otp verified' })

    } catch (error) {
        throw error
    }
});

//resend otp
const resendOtp = asyncHandler(async (req, res) => {
    try {
        //validate input
        const { error, value } = await resendOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        //check if the student is registered
        const student = await Student.findOne({ email })
        if (!student) {
            res.status(404).json({ message: 'Incorrect email' })
        }

        // generate new otp
        const newOtp = generateOtp()

        // send the otp via email
        await verificationMail(email, newOtp, student.username)

        // set expiration time
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        // check if the previous OTP has expired
        const previousOtp = await Otp.findOne({ email: student.email }).sort({ createdAt: -1 })

        if (previousOtp && previousOtp.expirationTime <= new Date()) {
            res.status(401).json({ message: 'Previous OTP has expired, please request for a new one' })
            return;
        }

        // save new otp to database
        const otpNew = new Otp({
            otp: newOtp,
            email: student.email,
            expirationTime
        });

        await otpNew.save()

        res.status(200).json({ message: 'New otp sent' })

    } catch (error) {
        throw error
    }
});

//send reset password
const resetPasswordLink = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await resetPasswordLinkValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        //check if the email entered is registered
        const passMail = await Student.findOne({ email })
        if (!passMail) {
            res.status(404).json({ message: 'email not registered' })
        }

        //generate new password link
        const newLink = generateOtp()

        //save the password reset link in the database
        passMail.reSetLink = newLink;
        passMail.isResetPasswordLinkSent = true

        //save changes to student database
        await passMail.save()

        //send password reset link to the user via mail
        passwordResetLinkMail(email, newLink, passMail.username)

        res.status(200).json({ message: 'password reset link sent' })


    } catch (error) {
        throw error
    }
});


//Veriy Link to reset password
const resetPassword = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await setPasswordValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, password, resetLink } = req.body;

        //check if the email is registered
        const student = await Student.findOne({ email })
        if (!student) {
            res.status(404).json({ message: 'invalid email' })
        }

        //validate the link sent
        if (student.resetLink !== resetLink) {
            res.status(404).jaon({ message: 'wrong reset link' })
        }

        //set expiration time for the link
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        //hash the new password
        const hashNew = await bcrypt.hash(password, 10)

        //update the new password and save it to database
        student.password = hashNew
        student.isResetPasswordLinkSent = false
        student.expirationTime = expirationTime

        await student.save()

        res.status(200).json({ message: 'password reset successfully' })

    } catch (error) {
        throw error
    }
})


//change password
const changePassword = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await changePasswordValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, oldPassword, newPassword } = req.body;

        //check if the email is registered on the database
        const student = await Student.findOne({ email })
        if (!student) {
            res.status(404).json({ message: 'wrong student email' })
        }

        //compare the password
        if (student && await bcrypt.compare(oldPassword, student.password)) {
            res.status(200).json({ message: 'correct password' })


            //hash the new password 
            const hashN = await bcrypt.hash(newPassword, 10)

            //reset the student password in the database
            student.password = hashN;

            //save to the database
            await student.save()

            res.status(200).json({ message: 'password changed' })
        } else {
            res.status(400).json({ message: 'incorrect password' })
        }

    } catch (error) {
        throw error
    }
});

//Update student record
const updateStudent = asyncHandler(async (req, res) => {
    try {
        const { username } = req.body;

        //check if student is registered
        const student = await Student.findById(req.params.id)
        if (!student) {
            res.status(404).json({ message: 'incorrect student details' })
        }

        //update student details with the new value
        student.username = username

        //save new value to database
        await student.save()

        res.status(200).json({ message: 'student updated' })

    } catch (error) {
        throw error
    }
});

//Delete student
const deleteStudent = asyncHandler(async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)

        //if student does not exists
        if (!student) {
            res.status(404).json({ message: 'student details not found' })
        }

        const removeStudent = await Student.deleteOne({ _id: req.params.id })
        res.status(200).json({ message: 'student account deleted' })
    } catch (error) {
        throw error
    }
});

//upload student profile picture
const profilePic = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student error' })
        }

        const image = req.file.filename
        student.profilePicture = image

        //save to database 
        await student.save()

        res.status(200).json({ message: 'profile picture uploaded' })
    } catch (error) {
        throw error
    }
});

//sumbit student assignment just once
const sumbitAssignment = asyncHandler(async (req, res) => {
    try {
        const student = await Student.findOne({ email })
        //check if student exists
        if (!student) {
            res.status(404).json({ message: 'not student' })
        }


    } catch (error) {
        throw error
    }
})


// Studens can see the marks they got
//Students can see the list of the teachers and can message them
//student can message each other
//Student can see list of students and view their profile
//student can search for each other
module.exports = {
    getStudent,
    getStudentId,
    registerStudent,
    loginStudent,
    verifyOtp,
    resendOtp,
    resetPasswordLink,
    resetPassword,
    changePassword,
    updateStudent,
    deleteStudent,
    profilePic
}