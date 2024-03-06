const asyncHandler = require('express-async-handler');
const Teachers = require('../Models/teacherModel');
const students = require('../Models/studentModel')
const teachOtp = require('../Models/teacherOtpModel')
const Assignment = require('../Models/assignmentModel')
const Message = require('../Models/messageModel')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { registerTeacherValidator, teacherLoginValidator, verifyTeacherOtpValidator,
    resendTeacherOtp, resetTeacherPasswordLinkValidator, teacherPasswordlLinkValidator,
    changePasswordValidator, uploadScoreValidator, sendEmailToAllValidator,
    sendEmailToOneValidator, replyTeacherValidator, sendAssignmentValidator,
    editScoreValidator, inboxMessageValidator, } = require('../Validator/teacherValidatorSchema');
const { verificationMail, verifyOtpMail, passwordResetLinkMail,
    teacherSendMailToStudents, teacherSendMailToAStudent } = require('../Shared/mailer');




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

        res.status(200).json(newTeacher)

    } catch (error) {
        throw error
    }
});

//login teacher
const login_Teacher = asyncHandler(async (req, res) => {
    try {
        //validate the teacher input
        const { error, value } = await teacherLoginValidator(req.body, { abortEarly: false })
        if (error) {
        return    res.status(400).json(error.message)
        }


        const { id, password } = req.body;

        //check if teacher has been registered
        const teacher = await Teachers.findById(req.params.id)
        if (!teacher) {
            res.status(404).json({ message: 'Teacher is not registered' })
        }

        //if teacher is registered, compare the password and grant access
        if (teacher && await bcrypt.compare(password, teacher.password)) {
            const accessToken = jwt.sign({
                teach: {
                    username: teacher.username,
                    email: teacher.email,
                    id: teacher.id
                }
            }, process.env.ACCESS_KEY,
                { expiresIn: '1yr' }
            )
          return  res.status(200).json(accessToken)
        } else {
          return  res.status(400).json({ message: 'Incorrect email or password' })
        }
    } catch (error) {
        throw error
    }
});

//verify Otp
const verify_Otp = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await verifyTeacherOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, otp } = req.body;
        //check if the teacher is registered
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'Teacher does not have access' })
        }

        //check if the otp is correct
        const teacherOtp = await teachOtp.findOne({ otp })
        if (!teacherOtp) {
            res.status(404).json({ message: 'Otp is not correct' })
        }

        // Check if the otp has expired
        if (teacherOtp.expirationTime <= new Date()) {
            res.status(403).json({ message: 'Otp has expired, try again' })
        }

        //find the teacher associated with the email the otp was sent to
        const teacherEmail = await Teachers.findOne({ email })
        if (!teacherEmail) {
            res.status(404).json({ message: 'This is not the email the otp was sent to' })
        }

        //verify teacher otp
        teacherOtp.isVerified = true

        //send verification mail to the teacher
        await verifyOtpMail(teacher.username)

        res.status(200).json({ message: 'Otp verified' })
    } catch (error) {
        throw error
    }
});


//resend otp
const resend_Otp = asyncHandler(async (req, res) => {
    try {
        // valaidate teacher input
        const { error, value } = await resendTeacherOtp(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        //Check if the email is registered 
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'This user is not registered' })
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
const resetTeacherPasswordLink = asyncHandler(async (req, res) => {
    try {
        //valiadate input
        const { error, value } = await resetTeacherPasswordLinkValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        // check if user is registered
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'User not registered' })
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

        res.status(200).json({ message: 'password reset link sent' })

    } catch (error) {
        throw error
    }
});

// reset password
const reset_Password = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await teacherPasswordlLinkValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, password, resetLink } = req.body

        //if teacher is regsistered 
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'not found' })
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
const change_Password = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await changePasswordValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, oldPassword, newPassword } = req.body

        //check if the user is registered
        const teacher = await Teachers.findOne({ email })
        if (!teacher) {
            res.status(404).json({ message: 'teacher not registered' })
        }

        //compare the existing password with the one teacher entered
        if (oldPassword && await bcrypt.compare(oldPassword, teacher.password)) {

            //hash new password
            const hashPassword = await bcrypt.hash(newPassword, 10)

            //save new password to database
            teacher.newPassword = hashPassword,

                await teacher.save()

            res.status(200).json({ message: 'password changed' })
        } else {
            res.status(400).json({ message: 'incorrect password' })
        }
    } catch (error) {
        throw error
    }
});

//Update teacher information
const update_Teacher = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await updateValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        //check if teacher is registered
        const teacher = await Teachers.findById(id)
        if (!teacher) {
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

        const { error, value } = await deleteValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        //check if teacher is registered
        const teacher = await Teachers.findById(id)
        if (!teacher) {
            res.status(404).json({ message: 'teacher id not found' })
        }

        const removeTeacher = await Teachers.deleteOne({ _id: req.params.id })
        res.status(200).json({ message: 'Teacher deleted' })

    } catch (error) {
        throw error
    }
});


// upload profile picture
const uploadPics = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        //check if teacher is registered
        const teacher = await Teachers.findById(id)
        if (!teacher)
            res.status(404).json({ message: 'teacher not on the list' })


        const picture = req.file.filename
        teacher.profilepic = picture

        //save to database
        await teacher.save()

        res.status(200).json({ message: 'picture uploaded' })

    } catch (error) {
        throw error
    }
});

const uploadAssignment = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        const student = await students.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student not found' })
        }

        const assignments = req.file.filename
        student.assignment = assignments

        res.status(200).json({ message: 'assignment uploaded' })

    } catch (error) {
        throw error
    }
});


//The teacher retrieves the student's answer file path or URL.
//The teacher downloads the answer file.
//The teacher grades the assignment.





const sendAssignment = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await sendAssignmentValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { klass, subject, assignment, student_id } = req.body

        //create new assignment
        const assignments = new Assignment({
            klass,
            subject,
            assignment,
            student_id
        })

        await assignments.save()

        res.status(200).json(assignments)

    } catch (error) {
        throw error
    }
});


//Teacher uploads each students score
const uploadStudentScore = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await uploadScoreValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        //find student by id
        const student = await students.findById(id)
        if (!student) {
            res.status(404).json({ message: 'no student' })
        }

        const { student_id, klass, subject, assignment } = req.body;

        //upload each student score
        const studentMark = new Assignment({
            klass,
            student_id,
            subject,
            assignment
        });

        //save to database
        await studentMark.save()

        res.status(200).json({ message: 'Student score uploaded' })

    } catch (error) {
        throw error
    }
});


// Edit student's score
const editStudentScore = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await editScoreValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { klass, student_id, subject, score, } = req.body;

        //if the student is registered
        const student = await students.findById(id)
        if (student) {
            res.status(404).json({ message: 'non student' })
        }

        //update score
        student.score = score
        student.klass = klass
        student.subject = subject
        student.student_id = student_id

        //save to database 
        await student.save()

        res.status(200).json({ message: 'student score updated' })

    } catch (error) {
        throw error
    }
});

//Teacher sends mail to all students
const sendEmailToAll = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await sendEmailToAllValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        //get all the students from the student database
        const studentList = await students.find()
        if (!studentList || studentList.length === 0) {
            res.status(404).json({ message: 'There are no students registered' })
        }

        //create an array and push all the email to the array
        const sendEmail = []
        studentList.forEach(student => {
            sendEmail.push(student.email)
        });

        //send email to student
        await teacherSendMailToStudents(sendEmail)

        res.status(200).json({ message: 'Email sent to all students' })

    } catch (error) {
        throw error
    }
});

//Teacher sends email to a student
const sendEmailToOne = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await sendEmailToOneValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params;

        //const { email } = req.body

        //if student is registered
        const student = await students.findById(id)
        if (!student) {
            res.status(404).json({ message: 'wrong student' })
        }

        //send message to the student via mail
        await teacherSendMailToAStudent(student.email)

        res.status(200).json({ message: 'Email sent to the student' })
    } catch (error) {
        throw error
    }
});


//Teacher receives students message in the inbox
const inboxMessage = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await inboxMessageValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { student_id, teacher_id } = req.params
        const { message } = req.body

        //if student is registered
        const student = await students.findById({ _id: student_id })
        if (!student) {
            res.status(404).json({ message: 'wrong student info' })
        }

        //if teacher is registered
        const teacher = await Teachers.findById({ _id: teacher_id })
        if (!teacher) {
            res.status(404).json({ message: 'no teacher' })
        }

        //create new message
        const sendMessage = new Message()
        sendMessage.sender = student.name
        sendMessage.receiver = teacher.name
        sendMessage.content = message

        //save to database
        await sendMessage.save()

        res.status(200).json({ message: 'message received' })

    } catch (error) {
        throw error
    }
});

//Teacher can send message to each other
const replyTeacher = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await replyTeacherValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { sender_id, receiver_id } = req.params
        const { message } = req.body;

        //if the teacher sending the message is registered
        const senderTeacher = await Teachers.findById({ _id: sender_id })
        if (!senderTeacher) {
            res.status(404).json({ message: 'teacher cannot send message' })
        }
        //check if the other teacher is regsitered
        const receiverTeacher = await Teachers.findById({ _id: receiver_id })
        if (!receiverTeacher) {
            res.status(404).json({ message: 'teacher cannot receive message' })
        }

        //send message
        const replyMessage = new Message()
        replyMessage.sender = senderTeacher.name
        replyMessage.receiver = receiverTeacher.name
        replyMessage.content = message

        //save to database
        await replyMessage.save()

        res.status(200).json({ message: 'amebo succesful' })

    } catch (error) {
        throw error
    }
});


//Teacher sends message to students inbox
// const messageStudent = asyncHandler(async (req, res) => {
//     try {

//         const { email, message } = req.body;

//         //check if teacher is registered 
//         const teacher = await Teachers.findOne({ email })
//         if (!teacher) {
//             res.status(404).json({ message: 'teacher cant message student' })
//         }

//         //search for student 
//         const student = await students.findById(req.params.id)
//         if (!student) {
//             res.status(404).json({ message: 'cant find student' })
//         }

//         //teacher sends a message to students
//         const theMessage = new Message()
//         theMessage.sender = teacher
//         theMessage.receiver = student
//         theMessage.content = message

//         //save to database
//         await theMessage.save()

//         res.status(200).json({ message: 'message sent to student' })
//     } catch (error) {
//         this
//     }
// })



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
    uploadAssignment,
    editStudentScore,
    sendEmailToAll,
    sendEmailToOne,
    uploadStudentScore,
    inboxMessage,
    replyTeacher,
    // messageStudent,
    sendAssignment
}