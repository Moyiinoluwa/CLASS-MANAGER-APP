const asyncHandler = require('express-async-handler')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const Admin = require('../Models/adminModel')
const Adminotp = require('../Models/adminOtpModel')
const Teacher = require('../Models/teacherModel')
const Student = require('../Models/studentModel')
const { v4: uuid } = require('uuid')
const { loginAdminValidator, registerAdminValidator, verifyAdminOtpValidator,
    changeAdminPasswordValidator, resendAdminOtpValidator, resetAdminPasswordLinkValidator,
    sendAdminPasswordValidator, updateAdminValidator, adminUpdateTeacherValidator, adminUpdateStudentValidator } = require('../Validator/adminValidator')
const { verificationMail, verifyOtpMail, passwordResetLinkMail, adminSendMailToTeachers, adminSendMailToStudents } = require('../Shared/mailer')


//generate OTP
const generateOtp = () => {
    const min = 100000;
    const max = 999999;
    const otp = Math.floor(min + Math.random() * (max - min) + 1).toString()
    return otp
}


//register a new admin
/**
 * @swagger
 * /api/admin/register:
 *   post:
 *     summary: Create a new admin
 *     description: Create a new admin profile
 *     tags:
 *       - Admin
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
 *               password:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Admin profile created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 username:
 *                   type: string
 *                 email:
 *                   type: string
 *       '400':
 *         description: Unable to create admin
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 */

const registerAdmin = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await registerAdminValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { username, email, password } = req.body;

        //check if admin has been registered
        const admin = await Admin.findOne({ email })
        if (admin) {
            res.status(403).json({ message: 'Admin has been registered' })
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
/** 
 * @swagger
 * /api/admin/login:
 *   post:
 *     summary: Admin login
 *     description: Admin logs in to a registered account
 *     tags:
 *       - Admin
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
 *         description: Admin logged in successfully
 *       '404':
 *         description: User not registered
 */
const loginAdmin = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await loginAdminValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, password } = req.body

        //check if admin is registered
        const admin = await Admin.findOne({ email })
        if (!admin) {
            res.status(404).json({ message: 'Admin not registered, please regsiter' })
        }

        //compare the password and grant access 
        if (admin && await bcrypt.compare(password, admin.password)) {
            const accessToken = jwt.sign({
                admiin: {
                    username: admin.username,
                    email: admin.email,
                    id: admin.id
                }
            }, process.env.ACCESS_KEY,
                { expiresIn: '1yr' }
            )
            res.status(200).json(accessToken)
        } else {
            res.status(404).json({ message: 'email or password incorrect' })
        }

    } catch (error) {
        throw error
    }
});

//get all registered admin
/**
 * @swagger
 * /api/admin/get:
 *   get:
 *     summary: Get all admin
 *     description: Get all registered admin
 *     tags:
 *       - Admin
 *     responses:
 *       '200':
 *         description: Admins returned
 *       '400':
 *         description: No admin found
 */

const getAllAdmin = asyncHandler(async (req, res) => {

    const admin = await Admin.find()

    res.status(200).json(admin)
});

//get one admin
/**
 * @swagger
 * /api/admin/get/{id}:
 *   get:
 *     summary: Get an admin
 *     description: Get an admin profile by id
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the admin to retrieve
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Admin profile
 *       '404':
 *         description: Admin profile not found
 */

//get a particular admin
const getAdmin = asyncHandler(async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)
        if (!admin) {
            res.status(404).json({ message: 'Admin not found' })
        } else {
            res.status(200).json(admin)
        }
    } catch (error) {
        throw error
    }
});

//verify otp
/**
 * @swagger
 * /api/admin/verify-otp:
 *   post:
 *     summary: Verify admin OTP
 *     description: Verify the registration OTP that was sent
 *     tags:
 *       - Admin
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
 *       '400':
 *         description: Wrong OTP
 */

const verifyAdminOtp = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await verifyAdminOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { otp } = req.body;

        //if the otp is correct
        const otpSent = await Adminotp.findOne({ otp })
        if (!otpSent) {
            res.status(404).json({ message: 'the otp is not corect' })
        }

        //if the otp has expired
        if (otpSent.expirationTime <= new Date()) {
            res.status(403).json({ message: 'the otp has expired' })
        }

        //find the user associated with the email
        const user = await Admin.findOne({ email: otpSent.email })
        if (!user) {
            res.status(404).json({ message: 'user and email does not match' })
        }

        //verify otp
        otpSent.verified = true

        //save to databse
        await otpSent.save()

        //sent otp verification mail
        await verifyOtpMail(user.email)

        res.status(200).json({ message: 'otp verified' })
    } catch (error) {
        throw error
    }
});

//resend otp
/**
 * @swagger
 * /api/admin/resend-otp:
 *   post:
 *     summary: Resend admin OTP
 *     description: Resend registration OTP to admin
 *     tags:
 *       - Admin
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
 *         description: Email not registered
 */

const resendAdminOtp = asyncHandler(async (req, res) => {
    try {

        //Validate the input
        const { error, value } = await resendAdminOtpValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body

        //if the email is registered
        const admin = await Admin.findOne({ email })
        if (!admin) {
            res.status(404).json({ message: 'admin not registered' })
        }

        //send otp via mail
        const verificationCode = generateOtp()
        await verificationMail(email, verificationCode, admin.username)

        //set expiration time
        const expiration = new Date()
        expiration.setMinutes(expiration.getMinutes() + 5)

        //save new otp to database
        const sendOtp = new Adminotp()
        sendOtp.otp = verificationCode
        sendOtp.expirationTime = expiration
        sendOtp.email = admin.email

        await sendOtp.save()

        res.status(200).json({ message: 'new otp sent' })

    } catch (error) {
        throw error
    }
});

//reset password link
/**
 * @swagger
 * /api/admin/send-reset-password:
 *   post:
 *     summary: Send reset password link
 *     description: Send a link to reset admin password
 *     tags:
 *       - Admin
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
 *         description: Wrong email
 */


const resetAdminPasswordLink = asyncHandler(async (req, res) => {
    try {

        //validate the input
        const { error, value } = await resetAdminPasswordLinkValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email } = req.body;

        //if email is registered
        const admin = await Admin.findOne({ email })
        if (!admin) {
            res.status(404).json({ message: 'email not correct' })
        }

        //generate the token
        const token = uuid()

        //craft the reset password link
        const adminPasswordLink = `http://localhost:3002/api/admin/reset-password?token=${token}&email=${email}`

        //save link to database
        admin.resetLink = adminPasswordLink
        admin.isResetPasswordLinkSent = true

        await admin.save()

        //send it to the admin via mail
        await passwordResetLinkMail(email, adminPasswordLink, admin.username)

        res.status(200).json({ message: 'reset password link sent' })

    } catch (error) {
        throw error
    }
});


//reset password
/**
 * @swagger
 * /api/admin/reset-password:
 *   post:
 *     summary: Reset password
 *     description: Admin reset password
 *     tags:
 *       - Admin
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
 *         description: Password reset successfully
 *       '403':
 *         description: Invalid reset link
 */

const resetAdminPassword = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await sendAdminPasswordValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, resetLink, password } = req.body;

        //check if the email is registered
        const admin = await Admin.findOne({ email })
        if (!admin) {
            res.status(404).json({ message: 'this is not the email the link was sent to' })
        }

        //valiadte the link that was sent
        if (admin.resetLink !== resetLink) {
            res.status(404).json({ message: 'wrong reset link' })
        }

        //set expiration time for link
        const expiryLink = new Date()
        expiryLink.setMinutes(expiryLink.getMinutes() + 5)

        //hash the new  password
        const hashResetPassword = await bcrypt.hash(password, 10)

        //save to database
        admin.password = hashResetPassword
        admin.expirationTime = expiryLink
        admin.isResetPasswordLinkSent = false

        res.status(200).json({ message: 'password reset successfully' })

    } catch (error) {
        throw error
    }
});

//change password
/**
 * @swagger
 * /api/admin/change-password:
 *   patch:
 *     summary: Change password
 *     description: Admin wants to change password
 *     tags:
 *       - Admin
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
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 format: password
 *     responses:
 *       '200':
 *         description: Password changed
 *       '400':
 *         description: Incorrect password
 */

const changeAdminPassword = asyncHandler(async (req, res) => {
    try {
        //validate the input
        const { error, value } = await changeAdminPasswordValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { email, oldPassword, newPassword } = req.body;

        //check if admin is registered
        const admin = await Admin.findOne({ email })
        if (!admin) {
            res.status(404).json({ message: 'wrong email' })
        }

        //if the  password entered matches the exixting password
        if (admin && bcrypt.compare(oldPassword, admin.password)) {

            //hash password
            const hashpass = await bcrypt.hash(newPassword, 10)

            //save new password to database
            admin.password = hashpass

            await admin.save()

        } else {
            res.status(404).json({ message: 'incorrect password' })
        }

        res.status(200).json({ message: 'password changed' })

    } catch (error) {
        throw error
    }
});

//update admin profile
/**
 * @swagger
 * /api/admin/update/{id}:
 *   put:
 *     summary: Update admin profile
 *     description: Update admin profile
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the admin to update
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
 *     responses:
 *       '200':
 *         description: Admin updated
 *       '404':
 *         description: Admin not found
 */

const updateAdmin = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await updateAdminValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { username, email} = req.body;

        const admin = await Admin.findById(id)
        if (!admin) {
            res.status.apply(404).json({ message: 'cant find admin' })
        }

        //update changes
        admin.username = username
        admin.email = email

        //save to database
        await admin.save()

        res.status(200).json({ message: 'admin updated' })

    } catch (error) {
        throw error
    }
});

//delete admin
/**
 * @swagger
 * /api/admin/delete/{id}:
 *   delete:
 *     summary: Delete admin
 *     description: Delete admin profile
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the admin to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Admin deleted
 *       '404':
 *         description: Can't delete admin profile
 */

const deleteAdmin = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params
        const admin = await Admin.findById(id)
        if (!admin) {
            res.status(400).json({ message: 'not admin' })
        }

        const removeAdmin = await Admin.deleteOne({ _id: req.params.id })
        res.status(200).json({ message: 'Admin deleted' })

    } catch (error) {
        throw error
    }
});

//delete teacher's account
/**
 * @swagger
 * /api/admin/delete-teacher/{id}:
 *   delete:
 *     summary: Admin delete teacher's profile
 *     description: Admin delete teacher's profile
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the teacher to delete
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Teacher profile deleted
 *       '404':
 *         description: Teacher profile not found
 */

const deleteTeacherAccount = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        //check if teacher is registered
        const teacher = await Teacher.findById(id)
        if (!teacher) {
            res.status(404).json({ message: 'admin cannot find teacher' })
        }

        const deleteTeacher = await Teacher.deleteOne({ _id: id })
        res.status(200).json({ message: 'teacher profile deleted' })

    } catch (error) {
        throw error
    }
});

//delete student account
/**
 * @swagger
 * /api/admin/delete-student/{id}:
 *   delete:
 *     summary: Admin deletes student's account
 *     description: Admin deletes student's account
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: ID of the student to be deleted
 *         schema:
 *           type: string
 *     responses:
 *       '200':
 *         description: Student account deleted
 *       '404':
 *         description: Student account not found
 */

const deleteStudentProfile = asyncHandler(async (req, res) => {
    try {

        const { id } = req.params

        //check if student is registered
        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'student not found' })
        }

        const deleteStudent = await Student.deleteOne({ _id: id })
        res.status(200).json({ message: 'Student account deleted' })

    } catch (error) {
        throw error
    }
});

//update teacher profile
/**
 * @swagger
 * /api/admin/update-teacher/{id}:
 *   put:
 *     summary: Admin updates a teacher's account
 *     description: Admin updates a registered teacher account
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id of the teacher to be updated
 *         schema:
 *           type: string
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
 *               qualification:
 *                 type: string
 *               subject:
 *                 type: string
 *               username:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Teacher profile updated
 *       '404':
 *         description: Teacher not registered
 */

const updateTeacherProfile = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await adminUpdateTeacherValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { surname, name, qualification, subject, username } = req.body;

        //if teacher is regsiterd
        const teacher = await Teacher.findById(id)
        if (!teacher) {
            res.status(404).json({ message: 'not teacher' })
        }

        //update the teacher profile
        teacher.subject = subject
        teacher.surname = surname
        teacher.name = name
        teacher.qualification = qualification
        teacher.username = username

        //save changes to database
        await teacher.save()

        res.status(200).json({ message: 'teacher profile updated' })

    } catch (error) {
        throw error
    }
});

//update student profile
/**
 * @swagger
 * /api/admin/update-student/{id}:
 *   put:
 *     summary: Admin updates student's profile
 *     description: Admin updates student's profile
 *     tags:
 *       - Admin
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Id of the student to be updated
 *         schema:
 *           type: string
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
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *     responses:
 *       '200':
 *         description: Student profile updated
 *       '404':
 *         description: Student not registered
 */

const updateStudentProfile = asyncHandler(async (req, res) => {
    try {

        const { error, value } = await adminUpdateStudentValidator(req.body, { abortEarly: false })
        if (error) {
            res.status(400).json(error.message)
        }

        const { id } = req.params

        const { surname, name, email, username } = req.body;

        const student = await Student.findById(id)
        if (!student) {
            res.status(404).json({ message: 'not student' })
        }

        //update student profile
        student.surname = surname
        student.email = email
        student.name = name
        student.username = username

        //save changes to database
        await student.save(

            res.status(200).json({ message: 'student profile updated' })
        )
    } catch (error) {
        throw error
    }
});
//Post Announcements for teachers and students
/**
 * @swagger
 * /api/admin/send-email:
 *   post:
 *     summary: Send email to teachers
 *     description: Admin sends email to all the teachers
 *     tags:
 *       - Admin
 *     responses:
 *       '200':
 *         description: Email sent to teachers
 *       '401':
 *         description: Emails not sent
 */

const sendMailToTeachers = asyncHandler(async (req, res) => {
    try {

        //find all teachers
        const teachers = await Teacher.find()
        if (!teachers || teachers.length === 0) {
            res.status(404).json({ message: 'no teacher found' })
        }

        //send message to them via mail
        const sendMails = []
        teachers.forEach((teacher) => {
            sendMails.push(teacher.email)
        })

        await adminSendMailToTeachers(sendMails)

        res.status(200).json({ message: 'email sent to teachers' })

    } catch (error) {
        throw error
    }
});

//send mails to students
/**
 * @swagger
 * /api/admin/send-email-student:
 *   post:
 *     summary: Admin sends email to students
 *     description: Admin sends email to all the students
 *     tags:
 *       - Admin
 *     responses:
 *       '200':
 *         description: Email sent to students
 *       '401':
 *         description: Can't send email to students
 */

const sendMailToStudents = asyncHandler(async (req, res) => {
    try {
        const students = await Student.find()
        if (!students || students.length === 0) {
            res.status(400).json({ message: 'no student found' })
        }

        const sendEmail = []
        students.forEach(student => {
            sendEmail.push(student.email)
        });

        await adminSendMailToStudents(sendEmail)

        res.status(200).json({ message: 'email sent to students' })
    } catch (error) {
        throw error
    }
});
//assign roles


module.exports = {
    registerAdmin,
    loginAdmin,
    getAllAdmin,
    getAdmin,
    verifyAdminOtp,
    resendAdminOtp,
    resetAdminPasswordLink,
    resetAdminPassword,
    changeAdminPassword,
    deleteAdmin,
    updateAdmin,
    deleteTeacherAccount,
    deleteStudentProfile,
    updateTeacherProfile,
    updateStudentProfile,
    sendMailToTeachers,
    sendMailToStudents
}