const asyncHandler = require('express-async-handler');
const download = require('download')
const Teachers = require('../Models/teacherModel');
const students = require('../Models/studentModel')
const teachOtp = require('../Models/teacherOtpModel')
const Assignment = require('../Models/assignmentModel')
const Message = require('../Models/messageModel')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken')
const { v4: uuidv4 } = require('uuid')
const { registerTeacherValidator, teacherLoginValidator, verifyTeacherOtpValidator,
    resendTeacherOtp, resetTeacherPasswordLinkValidator, teacherPasswordlLinkValidator,
    changePasswordValidator, uploadScoreValidator, sendEmailToAllValidator,
    sendEmailToOneValidator, replyTeacherValidator, sendAssignmentValidator,
    editScoreValidator, inboxMessageValidator, updateTeacherValidator } = require('../Validator/teacherValidatorSchema');
const { verificationMail,  passwordResetLinkMail,
    teacherSendMailToStudents, teacherSendMailToAStudent } = require('../Shared/mailer');




//generate OTP code for verification
const verifyCode = () => {
    const max = 100000;
    const min = 999999;
    const otp = Math.floor(min + Math.random() * (max - min) + 1).toString()
    return otp;
}

//Get all tecahers
/**
 * @swagger
 * /api/teachers/get:
 *   get:
 *     tags:
 *       - Teacher
 *     summary: Get all teachers
 *     description: Retrieve all teachers
 *     responses:
 *       '200':
 *         description: Teachers retrieved successfully
 *       '404':
 *         description: No teachers found
 */

const get_Teacher = asyncHandler(async (req, res) => {
    const teacher = await Teachers.find()
    res.status(200).json(teacher)
});

//Get teacher by id
/**
 * @swagger
 * /api/teachers/get/{id}:
 *   get:
 *     tags:
 *       - Teacher
 *     summary: Get a teacher by ID
 *     description: Retrieve a teacher by their ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the teacher to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Teacher retrieved successfully
 *       '400':
 *         description: Teacher not found
 */

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
/**
 * @swagger
 * /api/teachers/register:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Register a new teacher
 *     description: Register a new teacher account
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
 *               subject:
 *                 type: string
 *               qualification:
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
 *         description: Teacher registered successfully
 *       '403':
 *         description: Teacher has already been registered
 */

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
/**
 * @swagger
 * /api/teachers/login:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Login for teachers
 *     description: Login for registered teachers
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
 *     responses:
 *       '200':
 *         description: Successful login, returns access token
 *       '404':
 *         description: Teacher is not registered
 */

const login_Teacher = asyncHandler(async (req, res) => {
    try {
        //validate the teacher input
        const { error, value } = await teacherLoginValidator(req.body, { abortEarly: false })
        if (error) {
        return    res.status(400).json(error.message)
        }


        const { email, password } = req.body;

        //check if teacher has been registered
        const teacher = await Teachers.findOne({ email })
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
/**
 * @swagger
 * /api/teachers/verify-otp:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Verify OTP for teacher registration
 *     description: Verify the OTP sent to a teacher's email for registration
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
 *         description: OTP verified successfully
 *       '404':
 *         description: OTP is not correct or email associated with OTP not found
 *       '403':
 *         description: OTP has expired
 */

const verify_Otp = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await verifyTeacherOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { otp } = req.body;
         
        //check if the otp is correct
        const teacherOtp = await teachOtp.findOne({ otp })
        if (!teacherOtp) {
            res.status(404).json({ message: 'Otp is not correct' })
        }

        //Set the expiration time for the verification code
        const expirationTime = new Date()
        expirationTime.setMinutes(expirationTime.getMinutes() + 5)

        // Check if the otp has expired
        if (teacherOtp.expirationTime <= new Date()) {
            res.status(403).json({ message: 'Otp has expired, try again' })
        }

        //find the teacher associated with the email the otp was sent to
        const teacherEmail = await Teachers.findOne({ email: teacherOtp.email })
        if (!teacherEmail) {
            res.status(404).json({ message: 'This is not the email the otp was sent to' })
        }

        //verify teacher otp
        teacherOtp.isVerified = true
        teacherOtp.expirationTime = expirationTime

        //save otp to database
        await teacherOtp.save()

        res.status(200).json({ message: 'Otp verified' })
    } catch (error) {
        throw error
    }
});


//resend otp
/**
 * @swagger
 * /api/teachers/resend-otp:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Resend OTP
 *     description: Resend OTP to a registered teacher's email address.
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
 *         description: New OTP sent successfully
 *       '404':
 *         description: Not Found
 */

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
/**
 * @swagger
 * /api/teachers/reset-password-link:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Reset Password Link
 *     description: Reset the password for a registered teacher and send a password reset link via email.
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
 *         description: Password reset link sent successfully
 *       '404':
 *         description: Not Found
 */

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

        //generate password token
        const token = uuidv4()

        //craft reset password link 
        const setPassword = `http://localhost:3002/api/teachers/reset-link?token=${token}&email=${email}`

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
/**
 * @swagger
 * /api/teachers/reset-password:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Reset Password
 *     description: Reset the password for a registered teacher using a password reset link.
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
 *               resetLink:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Password reset successful
 *       '404':
 *         description: Teacher Not Found

 */

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
/**
 * @swagger
 * /api/teachers/change-password:
 *   patch:
 *     tags:
 *       - Teacher
 *     summary: Change Password
 *     description: Change the password for a registered teacher.
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
 *         description: Password changed successfully
 *       '404':
 *         description: Not Found
 */

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
/**
 * @swagger
 * /api/teachers/update/{id}:
 *   put:
 *     tags:
 *       - Teacher
 *     summary: Update Teacher
 *     description: Update information for a registered teacher.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the teacher to update.
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
 *               qualification:
 *                 type: string
 *               subject:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Teacher updated successfully
 *       '404':
 *         description: Teacher profile not found
 */

const update_Teacher = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await updateTeacherValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { surname, name, username, email, qualification, subject } = req.body;

        //check if teacher is registered
        const teacher = await Teachers.findById(id)
        if (!teacher) {
            res.status(400).json({ message: 'teacher not found' })
        }

        //update new value
        teacher.name = name
        teacher.username = username
        teacher.surname = surname
        teacher.subject = subject
        teacher.qualification = qualification
        teacher.email = email

        //save new update to database
        await teacher.save()

        res.status(200).json({ message: 'Teacher updated successfully' })

    } catch (error) {
        throw error
    }
});

//Delete teacher's account
/**
 * @swagger
 * /api/teachers/delete/{id}:
 *   delete:
 *     tags:
 *       - Teacher
 *     summary: Delete Teacher
 *     description: Delete a registered teacher.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: Id of the teacher to delete.
 *     responses:
 *       '200':
 *         description: Teacher deleted successfully
 *       '404':
 *         description:  Teacher profile Not Found
 */

const delete_Teacher = asyncHandler(async (req, res) => {
    try {

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
/**
 * @swagger
 * /api/teachers/upload/{id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Upload profile Picture
 *     description: Upload a profile picture for a registered teacher.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the teacher to upload the picture for.
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
 *     responses:
 *       '200':
 *         description: Picture uploaded successfully
 *       '404':
 *         description: Not Found
 */

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

//upload assignment for student
/**
 * @swagger
 * /api/teachers/upload-assignment{id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Upload Assignment
 *     description: Upload an assignment for a registered student.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student to upload the assignment for.
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
 *     responses:
 *       '200':
 *         description: Assignment uploaded successfully
 *       '404':
 *         description: Not Found
 */

const uploadAssignment = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        const student = await students.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student not found' })
        }

        const assignments = req.file.filename
        student.assignment = assignments

        await student.save()

        res.status(200).json({ message: 'assignment uploaded' })

    } catch (error) {
        throw error
    }
});


//The teacher retrieves the student's answer file path or URL and downloads the answer file.
/**
 * @swagger
 * /api/teachers/download-answer{id}:
 *   get:
 *     tags:
 *       - Teacher
 *     summary: Download Answer
 *     description: Download the answer submitted by a registered student.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student to download the answer for.
 *     responses:
 *       '200':
 *         description: Answer downloaded successfully
 *       '404':
 *         description: Not Found
 */

const downloadAnswer = asyncHandler(async(req, res) => {
    try {
        
        const { id } = req.params

        //check if student is registered
        const student = await students.findById(id)
        if(!student) {
            res.status(404).json({ message: 'cant download student answer'})
        }

        //get the answer URL from the students profile
        const answerUrl = student.answer

        //download the answer to the destinated folder and send a response
        res.status(200).json({ 
            message: 'Answer downloaded ',
            downloadURL:  `http://locahost:3002/Assignment/${answerUrl}`
        }) 

    } catch (error) {
        throw error
    }
});


// const sendAssignment = asyncHandler(async (req, res) => {
//     try {
//         const { error, value } = await sendAssignmentValidator(req.body, { abortEarly: false })
//         if (error) {
//             res.status(400).json(error.message)
//         }

//         const { id } = req.params

//         const { klass, subject, assignment, student_id } = req.body

//         //create new assignment
//         const assignments = new Assignment({
//             klass,
//             subject,
//             assignment,
//             student_id
//         })

//         await assignments.save()

//         res.status(200).json(assignments)

//     } catch (error) {
//         throw error
//     }
// });


//Teacher uploads each students score
/**
 * @swagger
 * /api/teachers/upload-score/{id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Upload Student Score
 *     description: Upload scores for a registered student.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student to upload scores for.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               student_id:
 *                 type: string
 *               klass:
 *                 type: string
 *               subject:
 *                 type: string
 *               assignment:
 *                 type: string
 *               score:
 *                 type: number
 *     responses:
 *       '200':
 *         description: Student score uploaded successfully
 *       '404':
 *         description: Not Found
 */

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
            assignment,
            score
        });

        //save to database
        await studentMark.save()

        res.status(200).json({ message: 'Student score uploaded' })

    } catch (error) {
        throw error
    }
});


// Edit student's score
/**
 * @swagger
 * /api/teacher/edit-score/{id}:
 *   put:
 *     tags:
 *       - Teacher
 *     summary: Edit Student Score
 *     description: Edit the score of a registered student.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student to edit the score for.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               klass:
 *                 type: string
 *               student_id:
 *                 type: string
 *               subject:
 *                 type: string
 *               score:
 *                 type: number
 *     responses:
 *       '200':
 *         description: Student score updated successfully
 *       '404':
 *         description: Not Found
 */

const editStudentScore = asyncHandler(async (req, res) => {
    try {
        const { error, value } = await editScoreValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params;
        const { klass, student_id, subject, score } = req.body;

        // Find the student by id
        const student = await students.findById(id);
        if (!student) {
            res.status(404).json({ message: 'Student not found' });
        }

        // Update the student's score
        student.score = score;
        student.klass = klass;
        student.subject = subject;
        student.student_id = student_id;

        // Save changes to the database 
        await student.save();

        res.status(200).json({ message: 'Student score updated' });
    } catch (error) {
        throw error;
    }
});


//Teacher sends mail to all students
/**
 * @swagger
 * /api/teachers/send-email-to-all:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Send Email to All Students
 *     description: Send an email to all registered students.
 *     responses:
 *       '200':
 *         description: Email sent to all students successfully
 *       '404':
 *         description:students email Not Found
 */

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
/**
 * @swagger
 * /api/teacher/send-email/{id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Send Email to One Student
 *     description: Send an email to a specific student.
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student to send the email to.
 *     responses:
 *       '200':
 *         description: Email sent to the student successfully
 *       '404':
 *         description: Student not found
 */

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


//Teacher receives students message 
/**
 * @swagger
 * /api/teachers/send-message/{student_id}/{teacher_id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Send Message to Teacher
 *     description: Send a message from a student to a teacher.
 *     parameters:
 *       - in: path
 *         name: student_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the student sending the message.
 *       - in: path
 *         name: teacher_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the teacher receiving the message.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Message received successfully
 *       '404':
 *         description: Student or teacher not found
 */

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

//Teachers can send message to each other
/**
 * @swagger
 * /api/teachers/reply-teacher/{sender_id}/{receiver_id}:
 *   post:
 *     tags:
 *       - Teacher
 *     summary: Reply to Teacher
 *     description: Reply to a message from one teacher to another teacher.
 *     parameters:
 *       - in: path
 *         name: sender_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the teacher sending the reply.
 *       - in: path
 *         name: receiver_id
 *         schema:
 *           type: string
 *         required: true
 *         description: The ID of the teacher receiving the reply.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Reply sent successfully
 *       '404':
 *         description: Sender or receiver teacher not found
 */

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
    downloadAnswer,
    //sendAssignment,
}