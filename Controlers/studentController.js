const asyncHandler = require('express-async-handler')
const download = require('download')
const Student = require('../Models/studentModel')
const bcrypt = require('bcrypt')
const Otp = require('../Models/otpStudentModel')
const jwt = require('jsonwebtoken')
const Assignment = require('../Models/assignmentModel')
const Teachers = require('../Models/teacherModel')
const Message = require('../Models/messageModel')
const { v4:uuidv4 } = require('uuid')
const { signupValidator, loginValidator, verifyOtpValidator,
    resendOtpValidator, resetPasswordLinkValidator, setPasswordValidator,
    changePasswordValidator, updateStudentValidator, messageStudentVaildator, messageTeacherVaildator,
    studentScoreValidator, studentSearchValidator } = require('../Validator/validatorSchema')
const { verificationMail,  passwordResetLinkMail } = require('../Shared/mailer')

//Generate OTP code
const generateOtp = () => {
    const min = 100000;
    const max = 999999;
    const otp = Math.floor(min + Math.random() * (max - min) + 1).toString()
    return otp;
}

/**
 * @swagger
 * /api/students/get:
 *   get:
 *     summary: Get all students
 *     description: Get all registered students
 *     tags:
 *       - Student
 *     responses:
 *       '200':
 *         description: All students
 *       '404':
 *         description: No student found
 */

// Get all students
const getStudent = asyncHandler(async (req, res) => {
    //find all registered students
    const student = await Student.find()

    res.status(200).json(student)
});

//Get a student
/**
 * @swagger
 * /api/students/get/{id}:
 *   get:
 *     summary: Get a student profile
 *     description: Get a particular student profile
 *     tags:
 *       - Student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id of the student to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Student profile
 *       '404':
 *         description: Student not found
 */

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
/**
 * @swagger
 * /api/students/register:
 *   post:
 *     summary: Create a new account
 *     description: Create a new student account
 *     tags:
 *       - Student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               surname:
 *                 type: string
 *               name:
 *                 type: string
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: Student registered
 *       '403':
 *         description: Student already exists
 */

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
/**
 * @swagger
 * /api/students/login:
 *   post:
 *     summary: Student login
 *     description: Student logs in to a registered account
 *     tags:
 *       - Student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Login successful
 *       '404':
 *         description: Student has not been registered
 */

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
/**
 * @swagger
 * /api/students/verify-otp:
 *   post:
 *     summary: Verify student OTP
 *     description: Verify registration OTP
 *     tags:
 *       - Student
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               otp:
 *                 type: string
 *     responses:
 *       '200':
 *         description: OTP verified
 *       '401':
 *         description: Incorrect OTP
 */

const verifyOtp = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await verifyOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

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

        res.status(200).json({ message: 'otp verified' })

    } catch (error) {
        throw error
    }
});

//resend otp
/**
 * @swagger
 * /api/students/resend-otp:
 *   post:
 *     tags:
 *       - Student
 *     summary: Resend OTP
 *     description: Resend OTP to the student's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: New OTP sent
 *       '404':
 *         description: Incorrect email
 */

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
/**
 * @swagger
 * /api/students/reset-password-link:
 *   post:
 *     tags:
 *       - Student
 *     summary: Send reset password link
 *     description: Send reset password link to the student's email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       '200':
 *         description: Reset password link sent
 *       '404':
 *         description: Student not registered
 */

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

        //generate token
        const token = uuidv4()

        //set expiration time for link
        const expirationLink = new Date()
        expirationLink.setMinutes(expirationLink.getMinutes() + 5)

        //generate new password link
        const newLink = `http://localhost:3002/api/students/reset-password?token=${token}&email=${email}`

        //save the password reset link in the database
        passMail.reSetLink = newLink;
        passMail.isResetPasswordLinkSent = true
        passMail.resentLinkExpirationTime = expirationLink

        //save changes to student database
        await passMail.save()

        //send password reset link to the user via mail
        passwordResetLinkMail(email, newLink, passMail.username)

        res.status(200).json({ message: 'password reset link sent' })


    } catch (error) {
        throw error
    }
});


//Verify Link to reset password
/**
 * @swagger
 * /api/students/reset-password:
 *   post:
 *     tags:
 *       - Student
 *     summary: Reset password
 *     description: Reset student's password using the reset link
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *                 format: password
 *               resetLink:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Password reset successfully
 *       '404':
 *         description: Unregistered email or wrong reset link
 */

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
            res.status(404).json({ message: 'wrong reset link' })
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
});


//change password
/**
 * @swagger
 * /api/students/change-password:
 *   patch:
 *     tags:
 *       - Student
 *     summary: Change password
 *     description: Student changes password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               oldPassword:
 *                 type: string
 *               newPassword:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Password changed
 *       '400':
 *         description: Incorrect password
 */

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

//Update student profile
/**
 * @swagger
 * /api/students/update/{id}:
 *   put:
 *     tags:
 *       - Student
 *     summary: Update student
 *     description: Update student details
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id of the student to update
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               name:
 *                 type: string
 *               surname:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Student updated
 *       '404':
 *         description: Incorrect student details
 */

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

/**
 * @swagger
 * /api/students/delete/{id}:
 *   delete:
 *     tags:
 *       - Student
 *     summary: Delete student profile
 *     description: Delete student profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id of the student to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Student account deleted
 *       '400':
 *         description: Student account not deleted
 */

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
/**
 * @swagger
 * /api/students/upload/{id}:
 *   patch:
 *     summary: Students upload profile picture
 *     description: Endpoint for students to upload profile picture
 *     tags:
 *       - Student
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the student who wants to upload a profile picture
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Profile picture uploaded
 *       '400':
 *         description: Profile picture not uploaded
 */
const profilePic = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params

        // Check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'Student not found' })
        }

        // Get the file name of the uploaded picture
        const image = req.file.filename

        // Update the student's profile picture property
        student.profilePicture = image

        // Save to database 
        await student.save()

        res.status(200).json({ message: 'Profile picture uploaded' })

    } catch (error) {
        throw error
    }
});


// Students can see the marks they got
/**
 * @swagger
 * /api/students/check-score:
 *   get:
 *     tags:
 *       - Student
 *     summary: Student checks their score
 *     description: Students can check their score for each subject
 *     parameters:
 *       - in: query
 *         name: id
 *         required: true
 *         description: ID of the student who wants to check their score
 *         schema:
 *           type: string
 *       - in: query
 *         name: subject
 *         required: true
 *         description: Subject for which the student wants to check the score
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Score
 *       '404':
 *         description: Cannot view score
 */
const studentScore = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await studentScoreValidator(req.query, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id, subject } = req.query;

        // Check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'Student cannot view score' })
            return;
        }

        // Student views score on profile
        const score = student.score; 

        res.status(200).json({ score })

    } catch (error) {
        throw error
    }
});


//Students can see the list of the teachers and can message them
/**
 * @swagger
 * /api/students/message-teacher/{student_id}/{teacher_id}:
 *   post:
 *     tags:
 *       - Student
 *     summary: Send a message to a teacher
 *     description: Send a message from a student to a teacher
 *     parameters:
 *       - in: path
 *         name: student_id
 *         required: true
 *         description: ID of the student sending the message
 *         schema:
 *           type: string
 *       - in: path
 *         name: teacher_id
 *         required: true
 *         description: ID of the teacher receiving the message
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message content
 *     responses:
 *       '200':
 *         description: Message sent to teacher
 *       '404':
 *         description: Student or teacher not found
 */

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
/**
 * @swagger
 * /api/students/message-student/{sender_id}/{receiver_id}:
 *   post:
 *     tags:
 *       - Student
 *     summary: Send a message to another student
 *     description: Send a message from one student to another student
 *     parameters:
 *       - in: path
 *         name: sender_id
 *         required: true
 *         description: ID of the student sending the message
 *         schema:
 *           type: string
 *       - in: path
 *         name: receiver_id
 *         required: true
 *         description: ID of the student receiving the message
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 description: The message content
 *     responses:
 *       '200':
 *         description: Message sent to student
 *       '400':
 *         description: Bad request, invalid parameters
 *       '404':
 *         description: Sender or receiver student not found
 */

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
/**
 * @swagger
 * /api/students/view-profile:
 *   get:
 *     tags:
 *       - Student
 *     summary: View a student's profile
 *     description: Retrieve the profile of a specific student by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the student whose profile needs to be viewed
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Student profile retrieved successfully
 *       '404':
 *         description: Student profile not found
 */

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
/**
 * @swagger
 * /api/students/student-page:
 *   post:
 *     tags:
 *       - Student
 *     summary: Search for a student by username
 *     description: Search for a student by their username
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: The username of the student to search for
 *     responses:
 *       '200':
 *         description: Student found
 *       '400':
 *         description: Student not found
 */

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

//The student downloads the assignment file.
/**
 * @swagger
 * /api/students/download-assignment/{id}:
 *   get:
 *     tags:
 *       - Student
 *     summary: Download assignment
 *     description: Download assignment for a specific student by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the student who wants to download the assignment
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Assignment downloaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Confirmation message
 *                 downloadURL:
 *                   type: string
 *                   format: uri
 *                   description: URL to download the assignment
 *       '404':
 *         description: Student not found, assignment cannot be downloaded
 */

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
/**
 * @swagger
 * /api/students/upload-answer/{id}:
 *   post:
 *     tags:
 *       - Student
 *     summary: Upload answer
 *     description: Upload answer for a specific student by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the student who wants to upload the answer
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: The answer file to upload
 *     responses:
 *       '200':
 *         description: Answer uploaded successfully
 *       '404':
 *         description: Student not found, answer cannot be uploaded
 */

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
