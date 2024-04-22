const asyncHandler = require('express-async-handler')
const download = require('download')
const Student = require('../Models/studentModel')
const bcrypt = require('bcrypt')
const Otp = require('../Models/otpStudentModel')
const jwt = require('jsonwebtoken')
const Assignment = require('../Models/assignmentModel')
const Teachers = require('../Models/teacherModel')
const Message = require('../Models/messageModel')
const { signupValidator, loginValidator, verifyOtpValidator,
    resendOtpValidator, resetPasswordLinkValidator, setPasswordValidator,
    changePasswordValidator, updateStudentValidator, messageStudentVaildator, messageTeacherVaildator,
    studentScoreValidator, studentSearchValidator } = require('../Validator/validatorSchema')
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
    const student = await Student.find()
    res.status(200).json(student)
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

        const { surname, name, username, email, password } = req.body;

        //check if student already exists
        const student = await Student.findOne({ email })
        if (student) {
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

        //set expiration time for the verification code
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        //save otp to database
        const studentOtp = new Otp()
        studentOtp.otp = verifyCode
        studentOtp.email = newStudent.email
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

        const student = await Student.findOne({ email })
        if (!student) {
            res.status(404).json({ message: 'Student has not been registered' })
        }

        //compare the password and grant access
        if (student && await bcrypt.compare(password, student.password)) {
            const accessToken = jwt.sign({
                student: {
                    username: student.username,
                    email: student.email,
                    id: student.id
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
        const { otp } = req.body;

        //check if otp is correct 
        const studentOtp = await Otp.findOne({ otp })
        if (!studentOtp) {
            res.status(401).json({ message: 'The otp you entered is incorrect' })
        }

        //if otp has expired
        if (studentOtp.expirationTime <= new Date()) {
            res.status(403).json({ message: 'Otp has expired' })
        }

        // find the student associated with the email provided
        const studentEmail = await Student.findOne({ email: studentOtp.email })
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

        // save new otp to database
        const otpNew = new Otp()
        otpNew.otp = newOtp
        otpNew.email = student.email
        otpNew.expirationTime = expirationTime


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
        if (student && bcrypt.compare(oldPassword, student.password)) {

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
        const { error, value } = await updateStudentValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params;

        const { username, email, name, surname } = req.body;

        //check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'incorrect student details' })
        }

        //update student details with the new value
        student.username = username
        student.email = email
        student.name = name
        student.surname = surname

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
        const { id } = req.params

        const student = await Student.findById(id)
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

        //check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student error' })
        }

        //get the file name of the uploaded picture
        const image = req.file.filename

        //update the student profile picture property
        student.profilePicture = image

        //save to database 
        await student.save()

        res.status(200).json({ message: 'profile picture uploaded' })

    } catch (error) {
        throw error
    }
});

//The student downloads the assignment file.
const downloadAssignment = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        //if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student cant download' })
        }

        //student gets the file path or url of the assigment from their pofile
        const assignmentUrl = student.assignment

        //the folder the assignment will be downloaded to
        //const assigmentPath = `${__dirname}/downloadedAssignment`

       // await download(assignmentUrl, assigmentPath)

        res.status(200).json({ 
            message: 'Assignment downloaded successfully',
            downloadURL:  `http://locahost:3002/Assignment/${assignmentUrl}`
        })
         

    } catch (error) {
        throw error
    }
});

//student uploads the answer to the assignment
const uploadAnswer = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student cant upload answer' })
        }

        const answerQuestion = req.file.filename
        student.answer = answerQuestion

        await student.save()

        res.status(200).json({ message: 'answer uploaded' })

    } catch (error) {
        throw error
    }
});

//sumbit student assignment just once
const sumbitAssignment = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await sumbitAssignmentValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { suject } = req.body

        const student = await Student.findById(id)
        //check if student exists
        if (!student) {
            res.status(404).json({ message: 'not student' })
        }



    } catch (error) {
        throw error
    }
})


// Students can see the marks they got
const studentScore = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await studentScoreValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { subject } = req.body;

        //check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student cant see score' })
        }

        //student view score on profile

        student.score = student.score
        student.subject = subject

        res.status(200).json({ message: 'score viewed' })

    } catch (error) {
        throw error
    }
});

//Students can see the list of the teachers and can message them
const messageTeacher = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await messageTeacherVaildator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { student_id, teacher_id } = req.params

        const { message } = req.body

        //check if student is registred
        const student = await Student.findById({ _id: student_id })
        if (!student) {
            res.status(404).json({ message: 'unknown student' })
        }

        //send message to teacher's inbox
        const teacher = await Teachers.findById({ _id: teacher_id })
        if (!teacher) {
            res.status(404).json({ message: 'cant find teacher' })
        }

        //create a new message and send to the teacher
        const text = new Message()
        text.sender = student.name
        text.receiver = teacher.name
        text.content = message

        //save to database
        await text.save()

        res.status(200).json({ message: 'message sent to teacher' })

    } catch (error) {
        throw error
    }
});

//student can message each other
const messageStudent = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await messageStudentVaildator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }
        const { sender_id, receiver_id } = req.params

        const { message } = req.body

        //if student is registered
        const student = await Student.findById({ _id: sender_id })
        if (!student) {
            res.status(404).json({ message: 'void student' })
        }

        //find the other student
        const aStudent = await Student.findById({ _id: receiver_id })
        if (!aStudent) {
            res.status(404).json({ message: 'student not found by id' })
        }

        //student sends message to each other
        const newText = new Message()
        newText.sender = student.name
        newText.receiver = aStudent.name
        newText.content = message

        //save to database
        await newText.save()

        res.status(200).json({ message: 'student message sent' })

    } catch (error) {
        throw error
    }
});
//Student can see list of students and view their profile
const viewStudentProfile = asyncHandler(async (req, res) => {
    try {

        //find all the students
        const student = await Student.find()
        res.status(200).json(student)

        //view student's profile
        const { id } = req.params

        const viewStudent = await Student.findById(id)
        if (!viewStudent) {
            res.status(404).json({ message: 'cant get student profile' })
        }

        res.status(200).json(viewStudent)

    } catch (error) {
        throw error
    }
});


//student can search for each other
const studentSearch = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await studentSearchValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { username } = req.body;

        //search for student with username
        const searchStudent = await Student.findOne({ username })
        if (!searchStudent) {
            res.status(404).json({ messagea: 'student page not found' })
        }

        res.status(200).json(searchStudent)

    } catch (error) {
        throw error
    }
});





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
    profilePic,
    studentScore,
    messageTeacher,
    messageStudent,
    viewStudentProfile,
    studentSearch,
    downloadAssignment,
    uploadAnswer
}
