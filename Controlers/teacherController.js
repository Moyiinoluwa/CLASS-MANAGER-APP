const asyncHandler = require('express-async-handler');
const Teachers = require('../Models/teacherModel');
const students  = require('../Models/studentModel')
const teachOtp = require('../Models/teacherOtpModel')
const StudentScore = require('../Models/studentScore')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { registerTeacherValidator,  teacherLoginValidator, verifyTeacherOtpValidator, 
    resendTeacherOtp, resetTeacherPasswordLinkValidator, teacherPasswordlLinkValidator, 
    changePasswordValidator} = require('../Validator/teacherValidatorSchema');
const { verificationMail, verifyOtpMail,
     passwordResetLinkMail, teacherSendMailToStudents, teacherSendMailToAStudent } = require('../Shared/mailer');



//generate OTP code for verification
const verifyCode = () => {
    const max = 100000;
    const min = 999999;
    const otp = Math.floor(min + Math.random() * (max - min) + 1).toString()
    return otp;
}

//Get all tecahers
const get_Teacher = asyncHandler(async (req, res) => {
    const teacher = await Teachers.find()
    res.status(200).json(teacher)
});

//Get teacher by id
const get_Teacher_Id = asyncHandler(async (req, res) => {
    try {
        const teacher = await Teachers.findById(req.params.id)
        //check if teacher is registered
        if (!teacher) {
            res.status(400).json({ message: 'teacher not found' })
        }
        res.status(200).json(teacher)
    } catch (error) {
        throw error
    }
});

//Register new teacher
const register_Teacher = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await registerTeacherValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        };

        const { surname, name, subject, qualification, username, email, password } = req.body;

        //check if teacher has been registered
        const teacher = await Teachers.findOne({ email })
        if (teacher) {
            res.status(403).json({ message: 'Teacher has been registered' })
        }

        //hash password
        const hash = await bcrypt.hash(password, 10)

        //create a new teacher account
        const newTeacher = Teachers({
            surname,
            name,
            subject,
            qualification,
            username,
            email,
            password: hash
        })

        //save new account to the database
        await newTeacher.save()

        //generate 2fa code 
        const verificationCode = verifyCode()

        //Send it to the teacher via mail
        await verificationMail(email, verificationCode, username)

        //Set the expiration time for the verification code
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        //save the verification code to the otp table 
        const otpT = new teachOtp()
        otpT.otp = verificationCode
        otpT.email = newTeacher.email
        otpT.expirationTime = expirationTime

        await otpT.save()

        res.status(200).json({ message: 'teacher registered' })

    } catch (error) {
        throw error
    }
});

//login teacher
const login_Teacher  = asyncHandler(async(req, res) => {
try {
    //validate the teacher input
    const { error, value } = await teacherLoginValidator(req.body, { abortEarly: false })
    if(error) {
        res.status(400).json(error.message)
    }
    
    const { email, password } = req.body;

    //check if teacher has been registered
    const teacher = await Teachers.findOne({ email })
    if(!teacher) {
        res.status(404).json({ message: 'Teacher is not registered' })
    }

    //if teacher is registered, compare the password and grant access
    if(teacher && await bcrypt.compare(password, teacher.password)) {
        const accessToken = jwt.sign({
            teach: {
                username: teacher.username,
                email: teacher.email,
                id: teacher.id
            }
        }, process.env.ACCESS_KEY,
             { expiresIn: '1yr'}
        )
        res.status(200).json(accessToken)
    } else {
        res.status(400).json({ message: 'Incorrect email or password' })
    }
} catch (error) {
    throw error
}
});

//verify Otp
const verify_Otp = asyncHandler(async(req, res) => {
try {
    const { error, value } = await verifyTeacherOtpValidator(req.body, { abortEarly: false }) 
    if(error) {
        res.status(400).json(error.message)
    }

    const { email, otp } = req.body;
    //check if the teacher is registered
    const teacher = await Teachers.findOne({ email })
    if(!teacher) {
        res.status(404).json({ message: 'Teacher does not have access'})
    }

    //check if the otp is correct
    const teacherOtp = await teachOtp.findOne({ otp })
    if(!teacherOtp) {
        res.status(404).json({ message: 'Otp is not correct'})
    }

    // Check if the otp has expired
    if(teacherOtp.expirationTime <= new Date()) {
        res.status(403).json({ message: 'Otp has expired, try again'})
    }

    //find the teacher associated with the email the otp was sent to
    const teacherEmail = await Teachers.findOne({ email })
    if(!teacherEmail) {
        res.status(404).json({ message: 'This is not the email the otp was sent to'})
    }

    //verify teacher otp
    teacherOtp.isVerified = true

    //send verification mail to the teacher
    await verifyOtpMail(teacher.username)

    res.status(200).json({ message: 'Otp verified'})
} catch (error) {
    throw error
}
});


//resend otp
const resend_Otp = asyncHandler(async(req, res) => {
    try {
       // valaidate teacher input
        const { error, value } = await resendTeacherOtp(req.body, { abortEarly: false })
       if(error) {
        res.status(400).json(error.message)
       }

       const { email } = req.body;

       //Check if the email is registered 
       const teacher = await Teachers.findOne({ email })
       if(!teacher) {
        res.status(404).json({ message: 'This user is not registered'})
       }

       //generate a new otp
       const newCode = verifyCode()

       //send a new verification email to the user
       await verificationMail(newCode, teacher.username)

       //set exipration time
       const lateComer = new Date()
       lateComer.setMinutes(lateComer.getMinutes() + 5)

       //save the new otp to the otp table
       const otpNew = new teachOtp()
       otpNew.otp = newCode
       otpNew.email = teacher.email
       otpNew.expirationTime = lateComer

       //save to database
       await otpNew.save()

       res.status(200).json({ message: 'New otp sent' })

    } catch (error) {
        throw error
    }
});

//reset password link
const resetTeacherPasswordLink = asyncHandler(async(req, res) => {
    try {
        //valiadate input
        const { error, value } = await resetTeacherPasswordLinkValidator(req.body, { abortEarly: false })
        if(error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        // check if user is registered
        const teacher = await Teachers.findOne({ email })
        if(!teacher) {
            res.status(404).json({ message: 'User not registered'})
        }

        //generate password link
        const setPassword = verifyCode()

        //save the password link to the database
        teacher.resetLink = setPassword
        teacher.isResetPasswordLinkSent = true

        //save to database
        await teacher.save()

        //send it to the teacher 
        await passwordResetLinkMail(email, setPassword, teacher.username)

        res.status(200).json({ message: 'password reset link sent'})

    } catch (error) {
        throw error
    }
});

// reset password
const reset_Password = asyncHandler(async(req, res) => {
    try {
        const { error, value } = await teacherPasswordlLinkValidator(req.body, { abortEarly: false })
        if(error) {
            res.status(400).json(error.message)
        }

        const { email, password, resetLink } = req.body

        //if teacher is regsistered 
        const teacher = await Teachers.findOne({ email })
        if(!teacher) {
            res.status(404).json({ message: 'not found'})
        }

         //Check if the reset link matches
        if (teacher.resetLink !== resetLink) {
            res.status(400).json({ message: 'Invalid reset link' })
        }

        //set expiry time for link
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        //hash password
        const hashP = await bcrypt.hash(password, 10)

        // Save the updated password and reset link expiration time to the database
        teacher.password = hashP
        teacher.resetLinkExpirationTime = expirationTime
        teacher.isResetPasswordLinkSent = false

        await teacher.save()

        res.status(200).json({ message: 'Password reset' })

    } catch (error) {
        throw error
    }
});

//change password
const change_Password = asyncHandler(async(req, res) => {
    try {
        //validate the input
        const { error, value } = await changePasswordValidator(req.body, { abortEarly: false })
        if(error) {
            res.status(400).json(error.message)
        }

        const { email, oldPassword, newPassword } = req.body
        
        //check if the user is registered
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'teacher not registered'})
        }

        //compare the existing password with the one teacher entered
        if (oldPassword && await bcrypt.compare(oldPassword, teacher.password)) {

            //hash new password
        const hashPassword = await bcrypt.hash(newPassword, 10)

            //save new password to database
        teacher.newPassword = hashPassword,
        
        await teacher.save()

            res.status(200).json({ message: 'password changed'})
        } else {
            res.status(400).json({ message: 'incorrect password'})
        }
    } catch (error) {
        throw error
    }
});

//Update teacher information
const update_Teacher = asyncHandler(async (req, res) => {
    try {
        const { username } = req.body

        //check if teacher is registered
    const teacher = await Teachers.findById(req.params.id)
    if(!teacher) {
        res.status(400).json({ message: 'teacher not found' })
    }

     //update new value
    teacher.username = username

    //save new update to database
    await teacher.save()

    res.status(200).json({ message: 'Teacher updated successfully', teacher })

    } catch (error) {
        throw error
    }
});

//Delete teacher's account
const delete_Teacher = asyncHandler(async (req, res) => {
    try {
        //check if teacher is registered
        const teacher = await  Teachers.findById(req.params.id)
        if(!teacher) {
            res.status(404).json({ message: 'teacher id not found'})
        }

        const removeTeacher = await Teachers.deleteOne({ _id: req.params.id })
        res.status(200).json({ message: 'Teacher deleted'})
        
    } catch (error) {
        throw error
    }
});

// upload profile picture
const uploadPics = asyncHandler(async(req, res) => {
    try {
        const { id } = req.params

        //check if teacher is registered
        const teacher = await Teachers.findById(id)
        if(!teacher)
         res.status(404).json({ message: 'teacher not on the list'})


        const picture = req.file.filename
        teacher.profilepic = picture

        //save to database
        await teacher.save()

        res.status(200).json({ message: 'picture uploaded'})
    } catch (error) {
        throw error
    }
});


// Edit student's score
const editScore = asyncHandler(async(req, res) => {
    try {
        const { email, score, subject , id} = req.body

        //check if teacher is registered
        const teacher = await Teachers.findOne({ email }) 
        if(!teacher) {
            res.status(404).json({ message: 'teacher cant access'})
        }

        //if the student is registered
        const theStudent = await students.findById({ id })
        if(!theStudent) {
            res.status(404).json({ message: 'non student'})
        }

        //update the student score
         const updateScore = await StudentScore.findOne({ student })
         updateScore.student = theStudent.id
         updateScore.subject = subject
         updateScore.score = score

         //save to database 
         await updateScore.save()

    } catch (error) {
        throw error
    }
});

//Teacher sends a message to all students
const sendMessageToAll = asyncHandler(async(req, res) => {
    try {

        const student = await students.find()
        if(!student) {
            res.status(404).json({ message: 'student not in class' })
        }

        //send message to students email
        await teacherSendMailToStudents(student.email)

        res.status(200).json({ message: 'Email sent to all students' })
    } catch (error) {
        throw error
    }
});

//Teacher sends message to a student
const sendMessageToOne = asyncHandler(async(req, res) => {
    try {
        const { id } = req.params;

        //if student is registered
        const student = await students.findById({ id })
        if(!student) {
            res.status(404).json({ message: 'wrong student'})
        }

        //send message to the student via mail
        await teacherSendMailToAStudent(student.email)

        res.status(200).json({ message: 'Email sent to the student'})
    } catch (error) {
        throw error
    }
});

//Teacher uploads assignment
const postAssignment = asyncHandler(async(req, res) => {
    try {
        const  { id } = req.params

        //check if teacher is regsitered
        const teacher = await Teachers.findOne({ email })
        if(!teacher) {
            res.status(404).json({ message:'teacher cant upload'})
        }

        const assign = req.file.filename
        teacher.assignment = assign

        await teacher.save()

        res.status(200).json({ message: 'assignment uploaded'})
    } catch (error) {
        throw error
    }
});

//Teacher uploads each students score

//Teacher receives students message in the inbox




module.exports = {
    get_Teacher,
    get_Teacher_Id,
    register_Teacher,
    login_Teacher,
    verify_Otp,
    resend_Otp,
    resetTeacherPasswordLink,
    reset_Password,
    change_Password,
    update_Teacher,
    delete_Teacher,
    uploadPics,
    editScore,
    sendMessageToAll,
    sendMessageToOne,
    postAssignment
}